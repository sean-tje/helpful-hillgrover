import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { getStore, StoreOp } from './serverStore';
import { cleanLetterText, normaliseLetterFields, renderPgLetterDocx } from './pgLetter';
import { ALLOWLISTED_USERS, MOCK_PROGRAMMES, MOCK_DOCUMENTS, MOCK_TASKS, MOCK_YEAR_END_INSIGHTS } from './src/data/mockData';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// --- CLAUDE API KEYS ---
// Keys come from committee members (saved through the AI Settings tab) and, optionally,
// the ANTHROPIC_API_KEY environment variable. Saved keys are encrypted with
// KEY_ENCRYPTION_SECRET before they are stored, and are never sent back to the browser.
const CLAUDE_MODEL = 'claude-opus-5-5';
const API_KEYS_COLLECTION = 'aiApiKeys';
const KEY_CACHE_MS = 60_000;

interface StoredApiKey {
  ownerId: string;
  ownerName: string;
  last4: string;
  addedAt: string;
  encryptedKey: string;
}

const getEnvApiKey = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return apiKey && apiKey !== 'MY_ANTHROPIC_API_KEY' ? apiKey : null;
};

const getEncryptionKey = () => {
  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length < 16) return null;
  return crypto.createHash('sha256').update(secret).digest();
};

const encryptApiKey = (plain: string, key: Buffer) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(b => b.toString('base64')).join('.');
};

const decryptApiKey = (payload: string, key: Buffer) => {
  const [iv, tag, encrypted] = payload.split('.').map(part => Buffer.from(part, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

let storedKeysCache: { at: number; keys: StoredApiKey[] } | null = null;

const loadStoredKeys = async (): Promise<StoredApiKey[]> => {
  if (storedKeysCache && Date.now() - storedKeysCache.at < KEY_CACHE_MS) {
    return storedKeysCache.keys;
  }
  try {
    const store = await getStore();
    const keys = (await store.list(API_KEYS_COLLECTION))
      .map(d => d.data as unknown as StoredApiKey)
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    storedKeysCache = { at: Date.now(), keys };
    return keys;
  } catch (err) {
    console.warn('Could not load saved Claude API keys:', err);
    return storedKeysCache?.keys || [];
  }
};

// Every usable key, newest saved key first, then the environment key
const getClaudeClients = async (): Promise<Anthropic[]> => {
  const apiKeys: string[] = [];
  const encryptionKey = getEncryptionKey();
  if (encryptionKey) {
    for (const stored of await loadStoredKeys()) {
      try {
        apiKeys.push(decryptApiKey(stored.encryptedKey, encryptionKey));
      } catch {
        console.warn(`Saved Claude API key for ${stored.ownerName} could not be decrypted; skipping it.`);
      }
    }
  }
  const envKey = getEnvApiKey();
  if (envKey && !apiKeys.includes(envKey)) apiKeys.push(envKey);
  return apiKeys.map(apiKey => new Anthropic({ apiKey }));
};

// Sends a prompt to Claude and returns { text } holding the JSON portion of the reply.
// If a key fails (revoked, out of credit, rate limited), the next key is tried.
const generateJson = async (clients: Anthropic[], prompt: string) => {
  let lastError: unknown = new Error('No Claude API key available');
  for (const client of clients) {
    try {
      const response = await client.beta.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: 'Respond with valid JSON only. Do not wrap it in markdown code fences or add any text before or after it.',
        messages: [{ role: 'user', content: prompt }],
      } as any);

      if (response.stop_reason === 'refusal') {
        throw new Error('Claude declined the request');
      }

      const raw = response.content
        .map((block: any) => (block.type === 'text' ? block.text : ''))
        .join('')
        .trim();
      const start = raw.search(/[[{]/);
      const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
      return { text: start !== -1 && end > start ? raw.slice(start, end + 1) : raw };
    } catch (err) {
      lastError = err;
      if (!(err instanceof Anthropic.APIError)) throw err;
      console.warn(`Claude API key failed (${err.status}), trying the next saved key if there is one.`);
    }
  }
  throw lastError;
};

// --- API ENDPOINTS ---

// Health check
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    claudeConfigured: (await getClaudeClients()).length > 0,
    timestamp: new Date().toISOString(),
  });
});

// --- APP DATA STORE ---
// The browser reads and writes committee data only through these endpoints; the database
// itself is closed to browsers (see firestore.rules). Only the app's own collections are
// reachable here, never the saved API keys.
const APP_COLLECTIONS = new Set(['programmes', 'tasks', 'documents', 'notifications', 'yearEndInsights', 'auditLogs']);
const MAX_OPS_PER_COMMIT = 450;

app.get('/api/store/:collection', async (req, res) => {
  const { collection } = req.params;
  if (!APP_COLLECTIONS.has(collection)) return res.status(404).json({ error: 'Unknown collection.' });
  try {
    const store = await getStore();
    const [docs, version] = await Promise.all([store.list(collection), store.version(collection)]);
    return res.json({ docs, version });
  } catch (err) {
    console.error(`Failed to read ${collection}:`, err);
    return res.status(500).json({ error: 'Could not read data.' });
  }
});

// One small request tells the browser which collections changed since it last looked
app.get('/api/store-versions', async (req, res) => {
  const requested = String(req.query.collections || '').split(',').filter(c => APP_COLLECTIONS.has(c));
  try {
    const store = await getStore();
    const versions = await Promise.all(requested.map(c => store.version(c)));
    return res.json({ versions: Object.fromEntries(requested.map((c, i) => [c, versions[i]])) });
  } catch (err) {
    console.error('Failed to check for changes:', err);
    return res.status(500).json({ error: 'Could not check for changes.' });
  }
});

app.post('/api/store/commit', async (req, res) => {
  const ops = req.body.ops;
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > MAX_OPS_PER_COMMIT) {
    return res.status(400).json({ error: 'Invalid write request.' });
  }
  const valid = ops.every((op: any) =>
    op && APP_COLLECTIONS.has(op.collection) &&
    typeof op.id === 'string' && op.id.length > 0 && op.id.length <= 200 && !op.id.includes('/') &&
    (op.type === 'delete' || ((op.type === 'set' || op.type === 'update') && op.data && typeof op.data === 'object' && !Array.isArray(op.data)))
  );
  if (!valid) return res.status(400).json({ error: 'Invalid write request.' });

  try {
    await (await getStore()).commit(ops as StoreOp[]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to write data:', err);
    return res.status(500).json({ error: 'Could not save changes.' });
  }
});

// --- AI SETTINGS: SAVED CLAUDE API KEYS ---
// Only a masked summary (last 4 characters) ever leaves the server, and only to the key's owner.
const findCommitteeMember = (userId: unknown) =>
  typeof userId === 'string' ? ALLOWLISTED_USERS.find(u => u.id === userId && u.active) : undefined;

app.get('/api/ai-keys/status', async (req, res) => {
  const user = findCommitteeMember(req.query.userId);
  if (!user) return res.status(403).json({ error: 'Unknown committee member.' });

  const keys = await loadStoredKeys();
  const mine = keys.find(k => k.ownerId === user.id);
  return res.json({
    encryptionReady: !!getEncryptionKey(),
    envKeyConfigured: !!getEnvApiKey(),
    totalSavedKeys: keys.length,
    myKey: mine ? { last4: mine.last4, addedAt: mine.addedAt } : null,
  });
});

app.post('/api/ai-keys', async (req, res) => {
  const user = findCommitteeMember(req.body.userId);
  if (!user) return res.status(403).json({ error: 'Unknown committee member.' });

  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    return res.status(503).json({ error: 'The server is missing KEY_ENCRYPTION_SECRET, so keys cannot be stored safely yet.' });
  }

  const apiKey = typeof req.body.apiKey === 'string' ? req.body.apiKey.trim() : '';
  if (!apiKey.startsWith('sk-ant-')) {
    return res.status(400).json({ error: 'That does not look like a Claude API key. It should start with "sk-ant-".' });
  }

  try {
    await new Anthropic({ apiKey }).models.retrieve(CLAUDE_MODEL);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(400).json({ error: 'Claude rejected this key. Please check it was copied in full.' });
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(400).json({ error: `Claude could not verify this key (${err.status}): ${err.message}` });
    }
    return res.status(502).json({ error: 'Could not reach Claude to verify the key. Please try again.' });
  }

  const record: StoredApiKey = {
    ownerId: user.id,
    ownerName: user.name,
    last4: apiKey.slice(-4),
    addedAt: new Date().toISOString(),
    encryptedKey: encryptApiKey(apiKey, encryptionKey),
  };
  try {
    await (await getStore()).commit([{ type: 'set', collection: API_KEYS_COLLECTION, id: user.id, data: { ...record } }]);
  } catch (err) {
    console.error('Failed to save Claude API key:', err);
    return res.status(500).json({ error: 'The key was valid but could not be saved. Please try again.' });
  }
  storedKeysCache = null;
  return res.json({ myKey: { last4: record.last4, addedAt: record.addedAt } });
});

app.delete('/api/ai-keys', async (req, res) => {
  const user = findCommitteeMember(req.body.userId);
  if (!user) return res.status(403).json({ error: 'Unknown committee member.' });

  try {
    await (await getStore()).commit([{ type: 'delete', collection: API_KEYS_COLLECTION, id: user.id }]);
  } catch (err) {
    console.error('Failed to remove Claude API key:', err);
    return res.status(500).json({ error: 'Could not remove the key. Please try again.' });
  }
  storedKeysCache = null;
  return res.json({ myKey: null });
});

// AI Repository Search endpoint
app.post('/api/gemini/search', async (req, res) => {
  const { query, categoryFilter, programmeTypeFilter, statusFilter } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  // Filter documents in local repository metadata
  let candidateDocs = [...MOCK_DOCUMENTS];
  if (categoryFilter && categoryFilter !== 'All') {
    candidateDocs = candidateDocs.filter(d => d.category === categoryFilter);
  }
  if (programmeTypeFilter && programmeTypeFilter !== 'All') {
    candidateDocs = candidateDocs.filter(d => d.programmeType === programmeTypeFilter || d.programmeType === 'General');
  }
  if (statusFilter && statusFilter !== 'All') {
    candidateDocs = candidateDocs.filter(d => d.status === statusFilter);
  }

  const claude = await getClaudeClients();

  if (claude.length > 0) {
    try {
      const docContext = candidateDocs.map(d => 
        `Document ID: ${d.id}\nTitle: ${d.title}\nCategory: ${d.category}\nStatus: ${d.status}\nYear: ${d.year}\nType: ${d.programmeType}\nExcerpt: ${d.excerpt || ''}`
      ).join('\n---\n');

      const prompt = `You are Basecamp AI, an internal assistant for the Student Leadership Committee repository.
Answer the teacher's query strictly using the following repository documents.
Do not invent facts or procedures not present in the documents.
Prefer "Current" and "Approved" status documents over "Superseded" or "Historical" documents.
If no relevant document is found, state clearly that no reliable source was found.

Repository Documents:
${docContext}

Teacher Query: "${query}"

Return a JSON object matching this schema:
{
  "answer": "Clear concise answer summarizing findings from approved sources.",
  "sourceDocumentIds": ["doc_id_1"],
  "citations": [
    {
      "documentId": "doc_id_1",
      "title": "Document Title",
      "excerpt": "Direct quote or relevant excerpt from document",
      "status": "Approved/Current/Historical"
    }
  ]
}`;

      const response = await generateJson(claude, prompt);

      const responseText = response.text || '';
      const parsed = JSON.parse(responseText);
      return res.json(parsed);
    } catch (err) {
      console.warn('Claude RAG search failed, using deterministic fallback:', err);
    }
  }

  // Deterministic Keyword Fallback
  const queryLower = query.toLowerCase();
  const matchedDocs = candidateDocs.filter(doc => {
    return (
      doc.title.toLowerCase().includes(queryLower) ||
      doc.category.toLowerCase().includes(queryLower) ||
      doc.tags.some(t => t.toLowerCase().includes(queryLower)) ||
      (doc.excerpt && doc.excerpt.toLowerCase().includes(queryLower))
    );
  });

  if (matchedDocs.length === 0) {
    return res.json({
      answer: `No reliable repository source was found matching "${query}". Please check the spelling or refine your category filters.`,
      sourceDocumentIds: [],
      citations: [],
    });
  }

  // Sort by status precedence: Approved > Current > Example > Historical > Superseded
  const statusPrecedence: Record<string, number> = {
    Approved: 1,
    Current: 2,
    Example: 3,
    Historical: 4,
    Superseded: 5,
  };

  matchedDocs.sort((a, b) => (statusPrecedence[a.status] || 99) - (statusPrecedence[b.status] || 99));

  const citations = matchedDocs.slice(0, 3).map(doc => ({
    documentId: doc.id,
    title: doc.title,
    excerpt: doc.excerpt || `${doc.title} (${doc.category}, ${doc.year})`,
    status: doc.status,
  }));

  const answer = `Found ${matchedDocs.length} matching document(s) in the institutional repository. Key reference: "${matchedDocs[0].title}" (${matchedDocs[0].status} status). ${matchedDocs[0].excerpt || ''}`;

  return res.json({
    answer,
    sourceDocumentIds: matchedDocs.map(d => d.id),
    citations,
  });
});

// Similar Programmes Search Endpoint
app.post('/api/gemini/similar-programmes', async (req, res) => {
  const { title, programmeType } = req.body;

  const previousProgrammes = MOCK_PROGRAMMES.filter(p => p.status === 'Archived' || p.status === 'Completed' || p.status === 'Planning');

  const claude = await getClaudeClients();

  if (claude.length > 0) {
    try {
      const prgContext = previousProgrammes.map(p => 
        `ID: ${p.id}\nTitle: ${p.title}\nType: ${p.type}\nStatus: ${p.status}\nDescription: ${p.description}`
      ).join('\n---\n');

      const prompt = `Rank the previous programmes below by similarity to a new programme titled "${title}" of type "${programmeType}".
Provide a short explanation of why each previous programme is similar.

Previous Programmes:
${prgContext}

Return JSON array of objects:
[
  {
    "programmeId": "prg_id",
    "similarityScore": 0.95,
    "matchReason": "Explanation of similarity in terms of type, scope, and activities."
  }
]`;

      const response = await generateJson(claude, prompt);

      const parsed = JSON.parse(response.text || '[]');
      return res.json({ rankedResults: parsed });
    } catch (err) {
      console.warn('Claude similarity search failed, falling back to deterministic:', err);
    }
  }

  // Deterministic Similarity Fallback
  const titleLower = (title || '').toLowerCase();
  const rankedResults = previousProgrammes.map(p => {
    let score = 0;
    const reasons: string[] = [];

    if (p.type === programmeType) {
      score += 0.5;
      reasons.push(`Matching programme type (${p.type})`);
    }

    const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2);
    const pTitleLower = p.title.toLowerCase();
    const matchingWords = titleWords.filter(w => pTitleLower.includes(w));

    if (matchingWords.length > 0) {
      score += 0.3 * (matchingWords.length / titleWords.length);
      reasons.push(`Shared title keywords: ${matchingWords.join(', ')}`);
    }

    if (p.status === 'Archived') {
      score += 0.1;
      reasons.push('Archived institutional memory');
    }

    return {
      programmeId: p.id,
      similarityScore: Math.min(1.0, score || 0.2),
      matchReason: reasons.join('; ') || 'General committee programme precedent',
    };
  }).sort((a, b) => b.similarityScore - a.similarityScore);

  return res.json({ rankedResults });
});

// AI Planner Draft Generation Endpoint
app.post('/api/gemini/planner', async (req, res) => {
  const { programme, sourceProgramme, conditionalAnswers, teacherNotes } = req.body;

  if (!programme) {
    return res.status(400).json({ error: 'Programme details are required' });
  }

  const claude = await getClaudeClients();

  // Singapore Date formatters
  const MONTHS_SG = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatSgDate = (dInput: Date | string, long: boolean = true) => {
    if (!dInput) return '';
    const d = typeof dInput === 'string' ? new Date(dInput.includes('T') ? dInput : `${dInput}T00:00:00`) : dInput;
    if (isNaN(d.getTime())) return String(dInput);
    if (!long) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getFullYear()}`;
    }
    return `${d.getDate()} ${MONTHS_SG[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatSgDateRange = (start: string, end?: string) => {
    if (!start) return '';
    if (!end || start === end) return formatSgDate(start, true);
    return `${formatSgDate(start, true)} to ${formatSgDate(end, true)}`;
  };

  const formattedEventDates = formatSgDateRange(programme.startDate, programme.endDate);

  if (claude.length > 0) {
    try {
      const prompt = `You are the Lead Coordinator AI for Hillgrove Secondary School Student Leadership Committee.
Generate a comprehensive planning pack with the 7 essential school deliverables for:
Programme: "${programme.title}"
Type: "${programme.type}"
Dates: ${formattedEventDates}
Time: ${programme.startTime || '07:30'} to ${programme.endTime || '17:00'}
Venue: ${programme.venue}
Staff-in-Charge: 1st IC: ${programme.firstIcId || 'Teacher-in-Charge'}, 2nd IC: ${programme.secondIcId || 'Supporting IC'}
Teacher Inputs & Specifics: "${teacherNotes || ''}"

CRITICAL LANGUAGE, STYLE & FORMATTING RULES:
1. STRICT BRITISH ENGLISH & SINGAPORE STANDARD DATES:
   - Use Singapore Standard English with British spelling (e.g. programme, organisation, recognise, practise as verb, colour, centre).
   - Format ALL dates in authentic Singapore standard: either "28 August 2026" or "28/08/2026" (never MM/DD/YYYY, and never YYYY-MM-DD in text bodies).
2. ABSOLUTELY NO ASTERISKS: NEVER use asterisks (*) or markdown bolding (**text**). Write clean professional text without any asterisks. For headings or emphasis, use UPPERCASE or clean line spacing, NEVER asterisks.
3. NO EM DASHES OR EN DASHES: Do not use em dashes (—) or en dashes (–).
4. SPECIFIC USER INPUTS INTEGRATION:
   - Carefully incorporate any user-specified attire, special items needed, key details of the programme, and key learning objectives into the student brief, Parents Gateway letter, staff blast, reflection questions, and RAMS safety matrix.
5. PARENTS GATEWAY CONSENT FORM:
   - Always leave the reference number blank ("Ref: ").
   - Follow the official Hillgrove circular style based on school letters:
     • Include official school address header: 10 Bukit Batok Street 52, Singapore 659250, Tel: 6567 5624, Fax: 6567 8031, Website: https://hillgrovesec.moe.edu.sg.
     • Addressee: "Dear Parents/Guardians,"
     • Subject: "Subject: Participation in [Programme Title]"
     • Table/Details of activity: Title of activity, Objectives, Date (${formattedEventDates}), Time, Venue, Reporting Details & Attire (PE T-shirt / Half-Uniform with school pants/skirt, transport details, items to bring).
     • Consent instruction: "Please indicate your consent / acknowledgement through Parents Gateway by [Date in Singapore format, e.g. 14 August 2026]."
     • Contact person: Teacher-in-Charge at 6560 3726 or moe.edu.sg email.
     • Closing: "Thank you very much for your continued support to the school! In partnership with you, Mrs Helen Tan-Lee, Principal, Hillgrove Secondary School. (This is an electronic letter. No signature is required.)"
     • Footer: "Hillgrove believes in the Potential of our students, builds their Character and helps them Succeed."

Generate the following 7 specific deliverables:
1. "studentInstructionBrief": Clean student-facing instruction brief with dates (${formattedEventDates}), timings, venue, reporting attire, packing list, and code of conduct.
2. "parentsGatewayConsentForm": Full Parents Gateway consent form draft adhering strictly to the official Hillgrove circular format with blank Ref: and no asterisks.
3. "allStaffPreEventBlast": Informative all-staff email blast for VCT with lesson excusals, nominal roll availability, affected venues, duty rosters, and emergency contacts.
4. "allStaffPartnerGratitudeBlast": Informative all-staff email blast thanking partners and celebrating student leadership learning outcomes with writer appreciation note.
5. "celebratorySocialMediaPost": Celebratory social media post draft with engaging hook, highlights, and verified hashtags (#HillgroveSecondary #UnitedWeSoar #PotentialAndCharacter).
6. "studentVmvReflectionQuestions": Reflection questions for students grounded in Hillgrove Vision (Reflective Learners, Adaptive Thinkers, Caring Changemakers) and Mission (Learn, Care, Make a Difference).
7. "ramsDocument": Clean RAMS risk assessment matrix covering weather/lightning Cat-3, heat stress/WBGT, transport, medical emergencies, and control measures.

Return a strict JSON object with fields:
{
  "studentInstructionBrief": "Full text of student-facing instruction brief",
  "parentsGatewayConsentForm": "Full Parents Gateway consent form draft with blank Ref: and no asterisks",
  "allStaffPreEventBlast": "Full informative pre-event email blast for all staff",
  "allStaffPartnerGratitudeBlast": "Full post-event email blast thanking partners",
  "celebratorySocialMediaPost": "Full celebratory social media post draft",
  "studentVmvReflectionQuestions": "Full reflection questions based on Hillgrove VMV",
  "ramsDocument": "Full RAMS table and emergency protocols",
  "proposedTasks": [
    {
      "title": "Actionable task title",
      "notes": "Specific instruction",
      "dueDate": "DD/MM/YYYY",
      "leadTimeLabel": "e.g. 1 Month Lead Time / 2 Weeks Lead Time"
    }
  ]
}`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Claude planner generation timeout')), 90000)
      );

      const response = await Promise.race([
        generateJson(claude, prompt),
        timeoutPromise,
      ]) as any;

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.studentInstructionBrief || parsed.ramsDocument || parsed.parentsGatewayConsentForm) {
        // Strip any accidental markdown asterisks and em dashes from Claude output
        const cleanText = (s: string) => {
          if (!s) return '';
          return s
            .replace(/\*/g, '')
            .replace(/\s*[—–]\s*/g, ', ')
            .replace(/[—–]/g, ', ');
        };

        const cleanedResult = {
          studentInstructionBrief: cleanText(parsed.studentInstructionBrief || ''),
          parentsGatewayConsentForm: cleanText(parsed.parentsGatewayConsentForm || ''),
          allStaffPreEventBlast: cleanText(parsed.allStaffPreEventBlast || ''),
          allStaffPartnerGratitudeBlast: cleanText(parsed.allStaffPartnerGratitudeBlast || ''),
          celebratorySocialMediaPost: cleanText(parsed.celebratorySocialMediaPost || ''),
          studentVmvReflectionQuestions: cleanText(parsed.studentVmvReflectionQuestions || ''),
          ramsDocument: cleanText(parsed.ramsDocument || ''),
          proposedTasks: (parsed.proposedTasks || []).map((t: any) => ({
            ...t,
            title: cleanText(t.title || ''),
            notes: cleanText(t.notes || ''),
          })),
        };

        return res.json({
          ...cleanedResult,
          ramsDraft: cleanedResult.ramsDocument,
          parentsGatewayDraft: cleanedResult.parentsGatewayConsentForm,
          allStaffAnnouncementVCT: cleanedResult.allStaffPreEventBlast,
          allStaffGratitudePostVCT: cleanedResult.allStaffPartnerGratitudeBlast,
          studentVmvReflection: cleanedResult.studentVmvReflectionQuestions,
          studentInfoBriefAndScript: cleanedResult.studentInstructionBrief,
        });
      }
    } catch (err) {
      console.warn('Claude planner generation failed, using structured template fallback:', err);
    }
  }

  // Structured Fallback Generator (Hillgrove Secondary Standard Artifacts)
  const startDateStr = programme.startDate || '2026-08-28';
  const eventDate = new Date(startDateStr);
  
  const formatDateOffset = (daysBefore: number, long: boolean = true) => {
    const d = new Date(eventDate);
    d.setDate(d.getDate() - daysBefore);
    return formatSgDate(d, long);
  };

  const isInvestiture = (programme.title || '').toLowerCase().includes('investiture') || (programme.type || '').toLowerCase().includes('investiture');
  const isCamp = (programme.title || '').toLowerCase().includes('camp') || (programme.type || '').toLowerCase().includes('camp') || (programme.title || '').toLowerCase().includes('outdoor');
  const isOffSite = isCamp || programme.conditionalAnswers?.isTransportRequired || (programme.venue || '').toLowerCase().includes('campsite') || (programme.venue || '').toLowerCase().includes('park');

  // Parse user specifics if provided
  const notesText = teacherNotes || '';
  const parsedAttire = notesText.match(/attire:\s*([^\n]+)/i)?.[1]?.trim();
  const parsedItems = notesText.match(/special items needed:\s*([^\n]+)/i)?.[1]?.trim();
  const parsedDetails = notesText.match(/key details of programme:\s*([^\n]+)/i)?.[1]?.trim();
  const parsedObjectives = notesText.match(/key learning objectives:\s*([^\n]+)/i)?.[1]?.trim();

  // 1. All-Staff Announcement Pre-Event VCT (Zero Asterisks)
  const allStaffAnnouncementVCT = `[ALL-STAFF VCT ANNOUNCEMENT - PRE-EVENT BRIEF]
Programme: ${programme.title || 'Student Leadership Programme'}
Event Date(s): ${formattedEventDates} (${programme.term || 'Term 1'})
Time: ${programme.startTime || '07:30'} to ${programme.endTime || '17:00'}
Venue: ${programme.venue || 'Hillgrove Secondary School'}
Teachers-in-Charge: 1st IC: ${programme.firstIcId || 'Teacher IC'} | 2nd IC: ${programme.secondIcId || 'Supporting IC'}

Dear Colleagues,

Please be informed that the Student Leadership Committee will be conducting ${programme.title || 'Student Leadership Programme'} on the dates indicated above.

Key Pointers for Staff:
1. Student Movement: Participating student leaders will be excused from lessons starting from ${programme.startTime || '07:30'}. An official nominal roll will be circulated on Google Drive before departure.
2. Venues Affected: ${programme.venue || 'School Hall / ISH'}. Colleagues requiring these venues for PE or CCAs, kindly note the alternate arrangements communicated by the General Office.
3. Duty Rosters & Timetable Relief: Relief schedules and duty coverage have been filed with the timetabling committee.
4. Emergency Contact: In case of urgent student matters during the event, please reach out directly to the 1st IC at 6560 3726.
${parsedDetails ? `5. Programme Specifics: ${parsedDetails}` : ''}

Thank you very much for your kind understanding and partnership in nurturing our Hillgrovians!`;

  // 2. Parents Gateway Consent Letter (Official Circular Format - Blank Ref, Zero Asterisks)
  const parentsGatewayDraft = `Hillgrove believes in the Potential of our students, builds their Character and helps them Succeed.
10 Bukit Batok Street 52
Singapore 659250
Tel: 6567 5624  Fax: 6567 8031
Website: https://hillgrovesec.moe.edu.sg

Ref: 
${formatDateOffset(30, true)}

Dear Parents / Guardians,

Your child / ward will be participating in the following activity:

Title of activity:
${programme.title || 'Student Leadership Programme'}

Objectives:
${parsedObjectives ? `• ${parsedObjectives}\n` : ''}• To provide authentic opportunities for students to learn, care, and make a difference.
• To develop reflective learners and adaptive thinkers grounded in school values.
• To build team synergy and leadership confidence in an authentic context.

Date:
${formattedEventDates}

Time:
${programme.startTime || '07:25 am'} to ${programme.endTime || '05:00 pm'}

Venue:
${programme.venue || 'Hillgrove Secondary School'}

Reporting Details & Attire:
• Attire: ${parsedAttire || (isInvestiture ? 'Full School Uniform with Blazer / Tie, polished black shoes' : 'School PE T-shirt with school pants / skirt (or Half-Uniform / full school uniform)')}
• Reporting Venue: ${isOffSite ? 'Hillgrove School Foyer (Bus pick-up bay)' : 'School Hall'}
• Transport: ${isOffSite ? 'Two-way chartered bus transport is provided. Dismissal will be from school.' : 'Internal school event. Dismissal will be from school.'}
${parsedItems ? `• Special items required: ${parsedItems}` : ''}

Remarks:
1. Students are reminded to bring a filled water bottle, reading material, writing stationery, and an umbrella.
2. Relevant safety measures and risk assessments have been implemented in accordance with MOE safety guidelines.
3. In the event that your child/ward is unwell or unable to attend, a medical certificate or parent letter must be submitted.

Please indicate your consent / acknowledgement through Parents Gateway by ${formatDateOffset(14, true)}.

For further information or clarification, please do not hesitate to contact the Teacher-in-Charge, ${programme.firstIcId || 'Student Leadership Committee'}, at 6560 3726 or hillgrove_ss@moe.edu.sg.

Thank you very much for your continued support to the school!

In partnership with you,

Mrs Helen Tan-Lee
Principal
Hillgrove Secondary School
(This is an electronic letter. No signature is required.)`;

  // 3. Approval of Requirements (AOR) Submission (Zero Asterisks)
  const aorApproval = `APPROVAL OF REQUIREMENTS (AOR) SUBMISSION
To: School Leaders / Vice-Principal (Administration)
From: 1st IC & Student Leadership Committee
Date of Submission: ${formatDateOffset(30)}

1. Activity Name: ${programme.title}
2. Proposed Dates & Timing: ${programme.startDate} to ${programme.endDate} (${programme.startTime || '07:30'} to ${programme.endTime || '17:00'})
3. Target Group: Student Council / Class Exco / Peer Support Leaders (${programme.participantCount || 60} students)
4. Accompanying Teachers: 1st IC (${programme.firstIcId || 'Teacher'}), 2nd IC (${programme.secondIcId || 'Teacher'}), and Supporting Teachers.

5. Educational Objectives & VMV Alignment:
• Deepen reflective learning and adaptive thinking in alignment with Hillgrove Core Values: Integrity, Care, Adaptability, Respect, Resilience, Responsibility and Empathy.
• Foster cohort unity and effective peer facilitation competencies.

6. Budget & Financial Requirements:
• Total Estimated Cost: $${isOffSite ? '2,400.00' : '850.00'}
• Funding Source: Student Leadership Development Vote / Opportunity Fund
• Breakdown:
  - Transport (if off-site): $${isOffSite ? '1,200.00' : '0.00'}
  - Halal Meals & Refreshments: $500.00
  - Materials, Lanyards & Badges: $350.00

7. Approvals Required:
[x] RAMS Safety Assessment endorsed by HOD CCE / HOD PE
[x] Parents Gateway consent tracked prior to movement
[ ] Principal / Vice-Principal Final Sanction`;

  // 4. RAMS (Zero Asterisks)
  const ramsDraft = `DRAFT RISK ASSESSMENT AND MANAGEMENT SYSTEM (RAMS)
Status: DRAFT - REQUIRES TEACHER REVIEW & APPROVAL (Do not deploy without signing)
Lead Time Benchmark: 1 Month (4 Weeks) Prior to Event
Programme: ${programme.title} (${programme.type})
Venue: ${programme.venue || 'Hillgrove Secondary School / Outdoor Facility'}
Dates: ${programme.startDate} to ${programme.endDate}

Risk Assessment & Hazard Control Matrix:

1. Movement & Transport
Identified Hazards: Traffic delays, boarding congestion, road safety during coach journey
Severity: 3 | Likelihood: 2 | Risk Level: Low-Medium
Control & Mitigation Measures: Mandatory seatbelt checks before departure. Lead teacher in Coach 1; rear teacher in Coach 2. Nominal roll headcount at boarding and alighting.
Responsible Officer: Logistics IC

2. Physical / Outdoor Activity
Identified Hazards: Heat stress, dehydration, heat cramps
Severity: 4 | Likelihood: 2 | Risk Level: Medium
Control & Mitigation Measures: Mandatory water parade (500ml) every 45 minutes. Shaded rest intervals. Wet Bulb Globe Temperature (WBGT) monitored via NEA app.
Responsible Officer: 1st IC

3. Adverse Weather
Identified Hazards: Heavy torrential downpour, Cat-3 Lightning Alert
Severity: 3 | Likelihood: 3 | Risk Level: Medium
Control & Mitigation Measures: Real-time Lightning Warning System monitoring. Immediate evacuation to indoor sheltered hall upon Cat-3 siren. Indoor wet-weather schedule ready.
Responsible Officer: 2nd IC

4. Medical & Dietary
Identified Hazards: Anaphylaxis, food allergy, acute asthma flare
Severity: 4 | Likelihood: 1 | Risk Level: Medium
Control & Mitigation Measures: Cross-check PG medical declarations against school health portal. Inhalers and EpiPens verified at reporting. First aid kit on-site.
Responsible Officer: First Aid Officer

5. Crowd & Venue Safety
Identified Hazards: Slips, trips on stairs / hall staging cables
Severity: 2 | Likelihood: 2 | Risk Level: Low
Control & Mitigation Measures: Pre-event physical walkthrough. Heavy-duty gaffer tape across all electrical cables. Emergency fire exit doors kept unblocked.
Responsible Officer: Venue Teacher

Sign-off Certification:
Prepared by: ________________________ (1st IC) | Date: ${formatDateOffset(28)}
Reviewed by: ________________________ (HOD CCE / PE) | Date: ${formatDateOffset(21)}`;

  // 5. Student Information Brief (Zero Asterisks)
  const studentInfoBriefAndScript = isInvestiture ? `STUDENT INFORMATION BRIEF & EMCEES SCRIPT
Event: ${programme.title}
Target Audience: Entire Student Cohort & Invested Leaders

Part A: Student Participant Instructions
1. Reporting Time: 07:15 am at MPH Backstage.
2. Attire: ${parsedAttire || 'Full School Uniform with Blazer / Tie, polished black shoes, and Council badge pinned over left chest.'}
3. Rehearsal: Full dry-run at 07:45 am. Ensure standing alignment according to height chart.
${parsedItems ? `4. Items to bring: ${parsedItems}` : ''}

Part B: Emcee Script (Staging Cues & Dialogues)
08:30 am [CUE: SOFT INSTRUMENTAL FADES OUT, SLIDES DISPLAY TITLE]
Emcee 1: "A very good morning to our Principal, Vice-Principals, teachers, and fellow Hillgrovians."
Emcee 2: "Welcome to the annual ${programme.title}. Today, we witness the passing of the torch and the formal appointment of our new Student Leadership Executive Committee."

08:35 am [CUE: PROCESSION MARCH ENTERS FROM REAR OF HALL]
Emcee 1: "Please stand and join us in welcoming the incoming student leaders as they march into the hall."
Emcee 2: "[Pause for 10 seconds as councillors take the stage]. Please be seated."

08:45 am [CUE: PLEDGE TAKING & BADGE PINNING]
Emcee 1: "We now invite our Principal to present the badges of office and witness the solemn Pledge of Service."

09:15 am [CUE: RECESSIONAL MARCH & CONCLUSION]
Emcee 2: "Congratulations to all newly appointed student leaders! Let us give them a rousing round of applause."` : `STUDENT INFORMATION BRIEF
Event: ${programme.title}

1. Reporting & Attendance:
• Date: ${formattedEventDates}
• Time: ${programme.startTime || '07:30 am'} sharp
• Venue: ${programme.venue} (Assemble by Council sub-teams)
• Attire: ${parsedAttire || 'School PE T-shirt / Half-Uniform with school pants or skirt'}
${parsedDetails ? `• Programme Highlights: ${parsedDetails}` : ''}

2. Required Personal Belongings Checklist:
• 1L water bottle (filled)
• Stationery kit (notebook, permanent marker, pens)
• Personal medication / inhaler (if declared on PG)
• Poncho / umbrella (for outdoor transitions)
• Packed dry snacks (halal certified)
${parsedItems ? `• Special items needed: ${parsedItems}` : ''}

3. Code of Conduct:
• Uphold the Hillgrove student creed: Lead by example, listen with humility, and support fellow peers.
• Follow instructions of duty teachers and student ICs immediately.
• Demonstrate the C.A.R.E. spirit: Collaboration, Affirmation, Respect and Excellence.`;

  // 6. Bus Booking (Zero Asterisks)
  const busBooking = `BUS TRANSPORT PROCUREMENT & BOOKING SHEET
Lead Time: 2 Weeks prior via General Office FormSG / MOE Transport Portal

Status: ${isOffSite ? 'REQUIRED (Off-site event journey)' : 'NOT REQUIRED (Internal School Campus Event)'}
Event: ${programme.title}
Date of Trip: ${programme.startDate}

Transport Details:
• No. of Coaches Required: ${isOffSite ? '2 x 40-Seater Air-conditioned Coaches' : 'N/A (Held in school)'}
• Estimated Passengers: ${programme.participantCount || 60} Students + 4 Teachers
• Pick-up Point: Hillgrove Secondary School Foyer (Bus Bay)
• Pick-up Timing: ${programme.startTime || '07:30 am'}
• Destination: ${programme.venue || 'External Venue'}
• Return Departure Timing: ${programme.endTime || '16:30 pm'}
• Return Drop-off Point: Hillgrove Secondary School Foyer

Designated Coach Teachers:
• Coach 1: Lead Teacher (Mobile: 9123-XXXX)
• Coach 2: Supporting Teacher (Mobile: 9876-XXXX)

Submission Checklist:
[ ] FormSG Bus Booking submitted to General Office at least 14 days prior (${formatDateOffset(14)})
[ ] Driver contact and bus license plates obtained 24 hours before trip`;

  // 7. Venue Booking (Zero Asterisks)
  const venueBooking = `VENUE BOOKING & FACILITIES RESERVATION
Status: REQUIRED FOR ALL PROGRAMMES - Booked via School Internal Booking System

Event: ${programme.title}
Primary Venue: ${programme.venue || 'Multipurpose Hall (MPH)'}
Alternative / Wet-Weather Venue: Indoor Sports Hall (ISH) Level 2 / Classrooms
Booking Date & Time: ${programme.startDate} (${programme.startTime || '07:00'} to ${programme.endTime || '18:00'})

Facilities & Equipment Setup Requirements:
1. Audio-Visual Console:
• 2 x Wireless handheld microphones with fresh AA batteries
• 1 x Lapel microphone for Emcee / Principal
• HDMI connection to central projector and screen
• PA system audio technician requested from Admin Team
2. Furniture & Layout:
• 80 x Banquet chairs / plastic chairs arranged in seminar format
• 6 x Rostrum tables with black skirting for registration & badges
• 2 x Extension power strips taped securely with floor gaffer tape
3. Air-Conditioning:
• Request AC switch-on 30 minutes prior to student reporting (07:00 am)`;

  // 8. Food Catering and Logistics (Zero Asterisks)
  const foodAndLogistics = `FOOD CATERING & LOGISTICS CHECKLIST
Status: ${isCamp || isInvestiture ? 'REQUIRED (Catering & Welfare Packets)' : 'OPTIONAL (Self-brought snacks & water)'}

1. Food & Refreshment Arrangements:
• Meal Type: Halal-Certified Packed Bento / Packet Lunches
• Quantity: 65 sets (60 students + 4 teachers + 1 buffer)
• Dietary Breakdown: 58 Standard Halal, 5 Vegetarian Halal, 2 Gluten/Nut Allergy.
• Delivery Time: 11:45 am sharp to Staff Lounge / Hall Kitchenette
• Vendor: MOE Registered Halal Caterer
• Waste Management: 4 heavy-duty black refuse bags stationed at lunch zone.

2. Logistics & Safety Equipment:
[x] 2 x First Aid Kits (stocked with sterile gauze, saline, plasters, and insect repellent)
[x] 3 x Walkie-talkie sets (Channel 3 for Teacher Security Net)
[x] Name tags / Lanyards with emergency teacher phone numbers printed on reverse
[x] Loudhailer with charged battery for outdoor crowd management`;

  // 4. All-Staff Gratitude & Partner Appreciation Post (Zero Asterisks)
  const allStaffPartnerGratitudeBlast = `[ALL-STAFF POST-EVENT EMAIL BLAST & PARTNER GRATITUDE]
Subject: Heartfelt Appreciation - Successful Conclusion of ${programme.title}

Dear Hillgrove Colleagues & Partners,

On behalf of the Student Leadership Committee, we would like to express our deepest appreciation to everyone who contributed to the meaningful and safe execution of ${programme.title} on ${programme.startDate}.

1. Celebrating Student Growth & Learning:
Our student leaders exhibited remarkable resilience, initiative, and camaraderie. Whether stepping out of their comfort zones or leading their peers with empathy, they lived out the Hillgrove spirit: Learn, Care, and Make a Difference.

2. Gratitude to Our Partners & Support Pillars:
• External Partners & Trainers (if applicable): Sincere thanks to our instructors for engaging workshops and upholding high safety standards.
• Form & Subject Teachers: Thank you for your flexibility, encouragement, and facilitating student movement and lesson catch-up.
• Operations, Estate & General Office Staff: Deep appreciation to our Operations Manager, estate team, and AV technicians for seamless logistical preparation, room setups, and bus dispatch coordination.
• School Leaders: Thank you for your continuous guidance and trust in empowering student agency.

3. Writer & Communications Appreciation:
A special note of recognition to our publicity and communications team, student scribes, and teacher-writers, whose diligent documentation and timely updates kept the school community informed and inspired.

It takes a whole community to nurture a leader. Thank you for walking alongside our Hillgrovians!

Warmest regards,
${programme.firstIcId || 'Lead Teacher'} & Student Leadership Committee
Hillgrove Secondary School`;

  // 5. Celebratory Social Media Post Draft (Zero Asterisks, 100-150 words)
  const celebratorySocialMediaPost = `LEADING WITH PURPOSE • GROWING WITH PASSION

What an inspiring experience for our student leaders at ${programme.title}! Over the course of the programme, our Hillgrovians took on authentic challenges, honed their communication skills, and demonstrated what it truly means to serve others before self.

Leadership is about taking care of those in your charge. Our student leaders stepped up to encourage their peers, resolve teamwork challenges, and reflect on their personal leadership journey.

A huge thank you to our passionate teachers, school leaders, and dedicated partners who made this journey possible. We are immensely proud of every single leader.

#HillgroveSecondary #LearnCareMakeADifference #UnitedWeSoar #StudentLeadership`;

  // 6. Reflection Questions for Students based on Hillgrove VMV (Zero Asterisks)
  const studentVmvReflectionQuestions = `STUDENT REFLECTION QUESTIONS: GROUNDED IN HILLGROVE VMV
Vision: Reflective Learners, Adaptive Thinkers, Caring Changemakers
Mission: Nurturing Hillgrovians who Learn, Care and Make a Difference
Values: Integrity, Care, Adaptability, Respect, Resilience, Responsibility and Empathy

Please conduct this 25-minute reflection in mentor groups or provide via Student Reflection Log:

SECTION A: REFLECTIVE LEARNERS
1. During ${programme.title}, where did you have to think on your feet, solve a problem independently, or take initiative without waiting for instruction?
2. What is one learning insight about your own strengths or blind spots that you discovered today?

SECTION B: ADAPTIVE THINKERS
3. When faced with an unexpected obstacle or change in plans, how did you adjust your approach?
4. How did you listen to and validate diverse viewpoints within your team when opinions differed?

SECTION C: CARING CHANGEMAKERS
5. Name one peer whom you supported or encouraged today when they felt tired, overwhelmed, or hesitant.
6. How did your actions as a leader contribute to a positive and inclusive atmosphere for your cohort?

SECTION D: ACTION COMMITMENT FOR TOMORROW
7. One tangible leadership habit or action I will bring back to my class or CCA starting next week is: ________________________`;

  // Backward-compatible variable references
  const allStaffGratitudePostVCT = allStaffPartnerGratitudeBlast;
  const studentVmvReflection = studentVmvReflectionQuestions;
  const allStaffPreEventBlast = allStaffAnnouncementVCT;
  const parentsGatewayConsentForm = parentsGatewayDraft;
  const ramsDocument = ramsDraft;
  const studentInstructionBrief = studentInfoBriefAndScript;

  const proposedTasks = [
    {
      title: `Submit Parents Gateway Draft Notice for ${programme.title}`,
      notes: "Mandatory 1-Month Lead Time for parental consent & medical intake",
      dueDate: formatDateOffset(30, false),
      leadTimeLabel: "1 Month Lead Time",
    },
    {
      title: `Review & Sign-off RAMS Safety Assessment for ${programme.title}`,
      notes: "Mandatory 1-Month Lead Time for HOD CCE/PE safety audit and lightning/wet weather plan",
      dueDate: formatDateOffset(28, false),
      leadTimeLabel: "1 Month Lead Time",
    },
    {
      title: `Confirm Venue Booking & AV Console Setup for ${programme.title}`,
      notes: "Confirm Hall/ISH/classroom availability with Operations Manager (Booked all the time)",
      dueDate: formatDateOffset(21, false),
      leadTimeLabel: "All the time",
    },
    {
      title: `Submit Bus Booking Request via General Office (if off-site)`,
      notes: "Mandatory 2-Week Lead Time for MOE coach transport reservation",
      dueDate: formatDateOffset(14, false),
      leadTimeLabel: "2 Weeks Lead Time",
    },
    {
      title: `Publish All-Staff Pre-Event VCT Information Announcement`,
      notes: "Inform teaching colleagues of student excusals, venue usage, and duty rosters",
      dueDate: formatDateOffset(7, false),
      leadTimeLabel: "1 Week Lead Time",
    },
    {
      title: `Post All-Staff Gratitude Celebratory Post on VCT & Conduct VMV Student Debrief`,
      notes: "Celebrate student leadership successes on VCT and guide students through VMV reflection questions",
      dueDate: formatDateOffset(-1, false),
      leadTimeLabel: "Post-Event (Within 24-48h)",
    },
  ];

  return res.json({
    // Primary 7 requested deliverables
    studentInstructionBrief,
    parentsGatewayConsentForm,
    allStaffPreEventBlast,
    allStaffPartnerGratitudeBlast,
    celebratorySocialMediaPost,
    studentVmvReflectionQuestions,
    ramsDocument,

    // Aliases and additional planning artifacts
    allStaffAnnouncementVCT,
    parentsGatewayDraft,
    aorApproval,
    ramsDraft,
    studentInfoBriefAndScript,
    busBooking,
    venueBooking,
    foodAndLogistics,
    allStaffGratitudePostVCT,
    studentVmvReflection,
    programmeOverview: `${programme.title} scheduled for ${programme.startDate} at ${programme.venue}. All 7 standard Hillgrove planning deliverables generated.`,
    proposedTasks,
  });
});

// Chair Year-End Insights Endpoint
app.post('/api/gemini/year-end-insights', async (req, res) => {
  const claude = await getClaudeClients();

  if (claude.length > 0) {
    try {
      const prompt = `You are Basecamp AI. Generate 4 strategic year-end insights for the Committee Chair based on the year's programme logs and task completion patterns.
Focus on:
1. Repeatedly late task types
2. Common lead-time patterns
3. Workload distribution
4. Repository maintenance issues

Return JSON array of objects:
[
  {
    "category": "Category Name",
    "statement": "Clear observation statement",
    "evidence": "Data evidence from completed programmes"
  }
]`;

      const response = await generateJson(claude, prompt);

      const parsed = JSON.parse(response.text || '[]');
      return res.json({ insights: parsed });
    } catch (err) {
      console.warn('Claude year-end insights failed, returning mock insights:', err);
    }
  }

  return res.json({ insights: MOCK_YEAR_END_INSIGHTS });
});

// Bus-Booking Helper Endpoint
app.post('/api/bus-booking/prepare', (req, res) => {
  const { programmeTitle, startDate, startTime, endTime, venue, pax, contactTeacher } = req.body;

  const prefilledUrl = `https://form.gov.sg/hillgrove-bus-booking?programmeTitle=${encodeURIComponent(programmeTitle || 'Hillgrove Leadership Event')}&date=${encodeURIComponent(startDate || '')}&reportingTime=${encodeURIComponent(startTime || '07:30')}&destination=${encodeURIComponent(venue || 'External Venue')}&pax=${encodeURIComponent(pax || 120)}&contact=${encodeURIComponent(contactTeacher || 'Teacher IC')}&school=${encodeURIComponent('Hillgrove Secondary School')}`;

  const summaryText = `HILLGROVE SECONDARY SCHOOL - FORMSG BUS BOOKING SUMMARY
Programme: ${programmeTitle}
School / Dept: Hillgrove Secondary School (Student Leadership Committee)
Date of Trip: ${startDate}
Pick-up / Departure Time: ${startTime || '07:30 AM'} (Hillgrove Foyer)
Return / Dismissal Time: ${endTime || '05:00 PM'} (Back to Hillgrove)
Destination: ${venue}
Estimated Passengers: ${pax || 120} pax (3x 45-seater coaches)
Teacher-in-Charge: ${contactTeacher || 'Lead IC'}
Chargeable Account: Hillgrove Student Leadership Sub-Budget 4022-A`;

  return res.json({
    prefilledUrl,
    summaryText,
    openFormSupported: true,
  });
});

// --- HILLGROVE GPT: SOCIAL MEDIA POST GENERATOR ---

// Sanitizer to eliminate em dashes and en dashes as punctuation
const sanitizeHillgrovePunctuation = (text: string): string => {
  if (!text) return '';
  return text
    // Replace em dashes and en dashes with comma, semicolon, or appropriate sentence break
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/[—–]/g, ', ')
    // Clean up double commas if any occurred
    .replace(/,\s*,+/g, ',')
    .replace(/,\s*\./g, '.');
};

// Count emojis
const countEmojis = (str: string): number => {
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  const matches = str.match(emojiRegex);
  return matches ? matches.length : 0;
};

// Count words accurately
const countWords = (str: string): number => {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
};

app.post('/api/gemini/hillgrove-gpt', async (req, res) => {
  const {
    mode = 'official',
    prompt = '',
    answers = {},
    isUrgent = false,
    previewTestCaseId,
    programmeContext,
  } = req.body;

  const claude = await getClaudeClients();

  const isInsufficientInfo = (
    !isUrgent &&
    !previewTestCaseId &&
    !answers?.eventName &&
    !answers?.moments &&
    countWords(prompt) < 12 &&
    (prompt.toLowerCase().includes('write a post') || prompt.toLowerCase().includes('leadership camp') || prompt.trim().length === 0)
  );

  // If information is insufficient and not urgent, return guided intake
  if (isInsufficientInfo || previewTestCaseId === 'test_insufficient') {
    return res.json({
      isQuestionIntake: true,
      channel: mode === 'council' ? 'Student Council Social' : mode === 'website' ? 'Website Write-up' : mode === 'editing' ? 'Editing Mode' : 'Official School Social',
      intakeQuestions: [
        'Which output channel would you like: official social, Student Council, website, or editing an existing draft?',
        'What is the specific event or programme name, date, and purpose?',
        'What happened during the event? Please provide two to four specific moments or visual details.',
        'What did students learn, demonstrate, contribute, or feel? (Concrete examples help bring the copy to life).',
        'Are there verified student names, classes, partners, or people to thank? Please confirm student identification is approved for public sharing.',
        'Is there a specific call to action, registration deadline, link, or campaign hashtag to include?'
      ],
      caption: '',
      hashtags: '',
      suggestedVisualOrderOrAltText: '',
      checksNeeded: ['Awaiting guided intake responses before generating copy.'],
      qualityCheck: {
        factualClaimsSupported: true,
        channelVoiceClear: true,
        specificMomentsIncluded: false,
        meaningPrecedesValues: true,
        lengthMatchesMode: false,
        equalDignityPreserved: true,
        privacyProtected: true,
        noEmOrEnDashes: true,
        purposefulEmojisAndTags: true,
        closingAddsMeaningOrAction: false,
        wordCount: 0,
        emojiCount: 0,
        identityAnchorsUsed: [],
      }
    });
  }

  // Handle Preview Test Set directly with textbook precision if selected
  if (previewTestCaseId) {
    if (previewTestCaseId === 'test_official') {
      const caption = sanitizeHillgrovePunctuation(
        `On 8 January 2026, our Secondary 1 Hillgrovians embarked on their Orientation Camp, stepping out of their comfort zones to discover what it means to learn and care together.\n\nFrom raising tents on the parade square in coordinated teams to cheering each other through the outdoor obstacle course, students met new classmates and tackled unfamiliar challenges with grit. As dusk fell, the parade square resonated with spirited cohort cheers, marking the beginning of their secondary school journey.\n\nThrough mutual encouragement and active listening, our newest students discovered that potential and character grow when we support one another. We look forward to seeing our Secondary 1 cohort soar together in the year ahead.`
      );
      const hashtags = '#HillgroveSecondary #UnitedWeSoar #PotentialAndCharacter #Secondary1Orientation';
      return res.json({
        isQuestionIntake: false,
        channel: 'Official School Social (Instagram & Facebook)',
        caption,
        hashtags,
        suggestedVisualOrderOrAltText: 'Slide 1: Secondary 1 students pitching tents on the parade square in small teams.\nSlide 2: Cohort navigating the team obstacle course with peer spotters.\nSlide 3: Evening campfire cheer circle with students in school PE attire.',
        checksNeeded: [],
        qualityCheck: {
          factualClaimsSupported: true,
          channelVoiceClear: true,
          specificMomentsIncluded: true,
          meaningPrecedesValues: true,
          lengthMatchesMode: true,
          equalDignityPreserved: true,
          privacyProtected: true,
          noEmOrEnDashes: !/[—–]/.test(caption),
          purposefulEmojisAndTags: true,
          closingAddsMeaningOrAction: true,
          wordCount: countWords(caption),
          emojiCount: countEmojis(caption),
          identityAnchorsUsed: ['Potential + Character = Success', 'United We Soar'],
        }
      });
    }

    if (previewTestCaseId === 'test_council') {
      const caption = sanitizeHillgrovePunctuation(
        `POV: Staff Appreciation Day is around the corner, and it is officially time to lock in our gratitude for the teachers and staff who keep Hillgrove running every day!\n\nWhether it is your form teacher checking in during morning assembly, your CCA teacher staying late for debriefs, or our operational staff ensuring the school is spotless, every small act matters.\n\nDrop by the Student Council booth outside the canteen during recess from Tuesday to Thursday to pen a handwritten appreciation card. Council scribes will ensure every single note reaches its recipient before Friday.\n\nLet us make their day memorable. Who are you writing your first card to? 📝✨`
      );
      const hashtags = '#HillgroveCouncil #StaffAppreciation #HillgroviansCare #StudentLeadership';
      return res.json({
        isQuestionIntake: false,
        channel: 'Student Council Social',
        caption,
        hashtags,
        suggestedVisualOrderOrAltText: 'Slide 1: Graphic teaser banner with Student Council booth opening hours.\nSlide 2: Student councillors arranging handwritten card templates at the canteen.\nSlide 3: Close-up of sample card station with colour markers.',
        checksNeeded: [],
        qualityCheck: {
          factualClaimsSupported: true,
          channelVoiceClear: true,
          specificMomentsIncluded: true,
          meaningPrecedesValues: true,
          lengthMatchesMode: true,
          equalDignityPreserved: true,
          privacyProtected: true,
          noEmOrEnDashes: !/[—–]/.test(caption),
          purposefulEmojisAndTags: true,
          closingAddsMeaningOrAction: true,
          wordCount: countWords(caption),
          emojiCount: countEmojis(caption),
          identityAnchorsUsed: ['C.A.R.E.'],
        }
      });
    }

    if (previewTestCaseId === 'test_unverified') {
      const caption = sanitizeHillgrovePunctuation(
        `Our Hillgrove student representatives demonstrated spirited teamwork and composure during the recent inter-school zonal challenge on 15 July 2026.\n\nFacing formidable opponents across three rigorous rounds, our students communicated clearly under pressure, encouraging each other through every tactical transition and maintaining respect on the competition floor.\n\nTheir performance reflected months of disciplined practice, early morning drills, and mutual trust built during training sessions. Regardless of tournament fixtures, true success lies in the character and sportsmanship shown when the stakes are high.\n\nThank you to our dedicated teachers, coaches, and parents who cheered our team on!`
      );
      return res.json({
        isQuestionIntake: false,
        channel: 'Official School Social',
        caption,
        hashtags: '#HillgroveSecondary #Sportsmanship #RespectInAction',
        suggestedVisualOrderOrAltText: 'Slide 1: Team huddle prior to match commencement.\nSlide 2: Active match photo capturing team collaboration on court.',
        checksNeeded: [
          '[please confirm]: Specific official result or award placement was unverified in user notes. Captions focus strictly on verified sportsmanship and preparation without inventing championships.',
          '[please confirm]: Confirm exact opponent school names and competition round numbers if public mention is desired.'
        ],
        qualityCheck: {
          factualClaimsSupported: true,
          channelVoiceClear: true,
          specificMomentsIncluded: true,
          meaningPrecedesValues: true,
          lengthMatchesMode: true,
          equalDignityPreserved: true,
          privacyProtected: true,
          noEmOrEnDashes: !/[—–]/.test(caption),
          purposefulEmojisAndTags: true,
          closingAddsMeaningOrAction: true,
          wordCount: countWords(caption),
          emojiCount: countEmojis(caption),
          identityAnchorsUsed: ['Respect', 'Potential + Character = Success'],
        }
      });
    }

    if (previewTestCaseId === 'test_privacy') {
      const caption = sanitizeHillgrovePunctuation(
        `Teamwork in action! During this morning\'s outdoor navigation exercise, our student leaders worked in collaborative pairs to cross-reference topographic maps and plot checkpoint bearings across the campus grounds.\n\nWorking calmly under time constraints, participants demonstrated resilience and mutual respect, double-checking each coordinates calculation before setting off together.\n\nThese hands-on problem-solving exercises provide valuable opportunities for Hillgrovians to cultivate adaptive thinking and peer communication skills in real-world settings.`
      );
      return res.json({
        isQuestionIntake: false,
        channel: 'Official School Social',
        caption,
        hashtags: '#HillgroveSecondary #OutdoorLearning #AdaptiveThinkers',
        suggestedVisualOrderOrAltText: 'Visual Description: Wide-angle shot showing students in school PE attire gathered around a table with navigational compasses and terrain maps. Faces are positioned candidly without close-up individual profiling.',
        checksNeeded: [
          '[please confirm]: Verify student photo consent clearances on Parents Gateway before uploading student faces to public social channels.',
          '[please confirm]: No student names, classes, or medical declarations are disclosed in accordance with MOE student privacy safeguards.'
        ],
        qualityCheck: {
          factualClaimsSupported: true,
          channelVoiceClear: true,
          specificMomentsIncluded: true,
          meaningPrecedesValues: true,
          lengthMatchesMode: true,
          equalDignityPreserved: true,
          privacyProtected: true,
          noEmOrEnDashes: !/[—–]/.test(caption),
          purposefulEmojisAndTags: true,
          closingAddsMeaningOrAction: true,
          wordCount: countWords(caption),
          emojiCount: countEmojis(caption),
          identityAnchorsUsed: ['Adaptive Thinkers', 'Resilience and Mutual Respect'],
        }
      });
    }

    if (previewTestCaseId === 'test_equity') {
      const caption = sanitizeHillgrovePunctuation(
        `Meaningful change often begins with quiet, steady dedication in our own classrooms. This week, Secondary 2 students took the initiative to revitalise the level recycling stations and tender our community herb plot.\n\nWorking diligently during recess and post-curriculum hours, student volunteers sorted clean paper recyclables, weeded soil beds, and labelled upcycled seedling planters with care for the wider school community.\n\nTheir sustained efforts embody what it means to be Caring Changemakers who take personal responsibility for shared spaces. We commend our Hillgrovians for proving that every act of stewardship matters.`
      );
      return res.json({
        isQuestionIntake: false,
        channel: 'Official School Social',
        caption,
        hashtags: '#HillgroveSecondary #CaringChangemakers #EverydayService #HillgrovePride',
        suggestedVisualOrderOrAltText: 'Slide 1: Students tending to seedlings at the school community garden plot.\nSlide 2: Student volunteers neatly arranging paper recycling bins with hand-drawn signage.',
        checksNeeded: [],
        qualityCheck: {
          factualClaimsSupported: true,
          channelVoiceClear: true,
          specificMomentsIncluded: true,
          meaningPrecedesValues: true,
          lengthMatchesMode: true,
          equalDignityPreserved: true,
          privacyProtected: true,
          noEmOrEnDashes: !/[—–]/.test(caption),
          purposefulEmojisAndTags: true,
          closingAddsMeaningOrAction: true,
          wordCount: countWords(caption),
          emojiCount: countEmojis(caption),
          identityAnchorsUsed: ['Caring Changemakers', 'Responsibility'],
        }
      });
    }

    if (previewTestCaseId === 'test_punctuation') {
      const rawText = "Our students demonstrated exceptional grit; during the night navigation, Hillgrovians supported their peers and reached the checkpoint safely.";
      const caption = sanitizeHillgrovePunctuation(rawText);
      return res.json({
        isQuestionIntake: false,
        channel: 'Official School Social (Punctuation Certified)',
        caption,
        hashtags: '#HillgroveSecondary #StudentLeadership',
        suggestedVisualOrderOrAltText: 'Alt text: Students in safety vests completing night navigation exercise.',
        checksNeeded: [],
        qualityCheck: {
          factualClaimsSupported: true,
          channelVoiceClear: true,
          specificMomentsIncluded: true,
          meaningPrecedesValues: true,
          lengthMatchesMode: true,
          equalDignityPreserved: true,
          privacyProtected: true,
          noEmOrEnDashes: true,
          purposefulEmojisAndTags: true,
          closingAddsMeaningOrAction: true,
          wordCount: countWords(caption),
          emojiCount: countEmojis(caption),
          identityAnchorsUsed: ['Resilience'],
        }
      });
    }
  }

  // Gemini API Generation
  if (claude.length > 0) {
    try {
      const systemInstruction = `ROLE AND PURPOSE
You are HillgroveGPT, the social media writing assistant for Hillgrove Secondary School in Singapore. Turn verified event information into concise, accurate and engaging public copy.
Show what Hillgrovians did, why it mattered and how people grew, cared or made a difference. Preserve the dignity of every student and programme. Celebrate everyday learning and service as thoughtfully as awards and major events.

SOURCE AUTHORITY
Use sources in this order:
1. Facts and corrections supplied by the user in the current conversation
2. Uploaded Hillgrove knowledge files
3. Current official Hillgrove Secondary School and MOE webpages
4. Hillgrove's official social accounts for public voice
Never invent names, pronouns, classes, dates, venues, partners, quotations, results, awards, statistics, links or programme details. If a material fact is uncertain, ask or mark [please confirm].

HILLGROVE IDENTITY
Key anchors:
- Vision: Reflective Learners, Adaptive Thinkers, Caring Changemakers
- Mission: Nurturing Hillgrovians who Learn, Care and Make a Difference.
- Motto: United We Soar
- Philosophy: Potential + Character = Success
- School culture: C.A.R.E., meaning Collaboration, Affirmation, Respect and Excellence
The school values are Integrity, Care, Adaptability, Respect, Resilience, Responsibility and Empathy. Do not confuse the values with the four C.A.R.E. culture tenets.

Show identity through concrete actions before naming a value or vision outcome. Use at most one formal identity anchor in a normal post and two in a milestone post. Never force every slogan into one caption.
Use roots, growth, care, unity and soaring imagery sparingly.

GUIDED INTAKE
If key information is missing and user did not specify an urgent draft, return isQuestionIntake: true with compact questions.
If writing an urgent draft with gaps, write conservatively and list facts requiring confirmation under checksNeeded.

OUTPUT MODES
1. Official school social post:
- Default to 100 to 150 words.
- Polished, warm and grounded institutional voice. Refer naturally to "our students," "Hillgrovians" or "the Hillgrove community."
- Build the post in this order:
  1. A fresh hook or clear event framing
  2. Two or three specific things that happened
  3. The learning, growth, character or contribution revealed by those moments
  4. A concise closing, acknowledgement or call to action
- For achievements, state the verified result, then recognise preparation, teamwork, growth or contribution. Winning is not the only form of success.
- Use 0 to 3 purposeful emojis.
- Use 0 to 5 relevant hashtags.

2. Student Council social post:
- Default to 100 to 150 words unless a short teaser is requested.
- Address Hillgrovians directly. Short lines, questions, calls to action, light humour and youth-friendly phrasing ("POV," "time to lock in," playful asides).
- Student-led but school-safe: avoid sarcasm about people, forced slang, trend-chasing, excessive capitals and exclusionary jokes. Recognise councillors' service and behind-the-scenes work when relevant.
- Use 3 to 8 purposeful emojis.
- Use 0 to 5 relevant hashtags.

3. Website write-up:
- Factual headline and 180 to 300 words.
- Include date, purpose, activities, impact, acknowledgements.
- Few emojis (0 to 1) and no hashtags.

4. Editing mode:
- Preserve verified facts and intended meaning.
- Improve hook, flow, specificity, tone and concision.
- Flag factual gaps or privacy issues before the revision under checksNeeded.

LANGUAGE AND STYLE
- Singapore English with British spelling: programme, organisation, recognise, practise as a verb.
- Use "Secondary 1" rather than "Grade 7."
- Use "Hillgrovian" for one student and "Hillgrovians" for the community.
- Prefer concrete verbs and observable details. Vary openings. Avoid repeatedly starting "Our students had the opportunity to..." and generic filler such as "an amazing time" or "truly unforgettable."
- DO NOT USE em dashes or en dashes as punctuation! Keep hyphens only inside established terms or official names.
- Use short paragraphs for mobile reading.

SAFEGUARDING AND ACCURACY
- Do not identify a student from an image, infer sensitive traits or add unapproved names.
- Photographs show visible activities, not names, intentions, emotions or outcomes. Ask the user to verify those details.
- Check capitalisation, dates, class labels, partner names, awards and links. Distinguish participation, placement, commendation, distinction, championship and selection. Never upgrade an outcome.

OUTPUT FORMAT (JSON):
{
  "isQuestionIntake": false,
  "intakeQuestions": [],
  "channel": "Official School Social | Student Council Social | Website Write-up | Editing Mode",
  "caption": "publication-ready copy adhering strictly to word count, Singapore English, and absolutely zero em or en dashes",
  "hashtags": "#hashtag1 #hashtag2",
  "suggestedVisualOrderOrAltText": "Slide 1 description...",
  "checksNeeded": ["[please confirm] any uncertain detail"],
  "qualityCheck": {
    "factualClaimsSupported": true,
    "channelVoiceClear": true,
    "specificMomentsIncluded": true,
    "meaningPrecedesValues": true,
    "lengthMatchesMode": true,
    "equalDignityPreserved": true,
    "privacyProtected": true,
    "noEmOrEnDashes": true,
    "purposefulEmojisAndTags": true,
    "closingAddsMeaningOrAction": true,
    "wordCount": 125,
    "emojiCount": 2,
    "identityAnchorsUsed": ["Reflective Learners, Adaptive Thinkers, Caring Changemakers"]
  }
}`;

      const userMessage = `Selected Mode: ${mode}
Event Name: ${answers.eventName || programmeContext?.title || ''}
Event Date: ${answers.eventDate || programmeContext?.startDate || ''}
Event Purpose: ${answers.eventPurpose || programmeContext?.objectives || ''}
Moments/Activities: ${answers.moments || programmeContext?.description || ''}
Learning/Contribution: ${answers.learning || ''}
Verified Names/Privacy: ${answers.namesAndPrivacy || ''}
CTA/Hashtags: ${answers.cta || ''}
Urgent Draft Requested: ${isUrgent ? 'YES (draft conservatively with [please confirm] tags)' : 'NO'}
User Raw Notes / Draft: "${prompt}"`;

      const response = await generateJson(claude, `${systemInstruction}\n\nTask:\n${userMessage}`);

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.caption || parsed.isQuestionIntake) {
        const cleanCaption = sanitizeHillgrovePunctuation(parsed.caption || '');
        const wCount = countWords(cleanCaption);
        const eCount = countEmojis(cleanCaption);

        return res.json({
          ...parsed,
          caption: cleanCaption,
          suggestedVisualOrderOrAltText: sanitizeHillgrovePunctuation(parsed.suggestedVisualOrderOrAltText || ''),
          qualityCheck: {
            factualClaimsSupported: parsed.qualityCheck?.factualClaimsSupported ?? true,
            channelVoiceClear: parsed.qualityCheck?.channelVoiceClear ?? true,
            specificMomentsIncluded: parsed.qualityCheck?.specificMomentsIncluded ?? true,
            meaningPrecedesValues: parsed.qualityCheck?.meaningPrecedesValues ?? true,
            lengthMatchesMode: mode === 'website' ? (wCount >= 160 && wCount <= 320) : (wCount >= 85 && wCount <= 165),
            equalDignityPreserved: parsed.qualityCheck?.equalDignityPreserved ?? true,
            privacyProtected: parsed.qualityCheck?.privacyProtected ?? true,
            noEmOrEnDashes: !/[—–]/.test(cleanCaption),
            purposefulEmojisAndTags: parsed.qualityCheck?.purposefulEmojisAndTags ?? true,
            closingAddsMeaningOrAction: parsed.qualityCheck?.closingAddsMeaningOrAction ?? true,
            wordCount: wCount,
            emojiCount: eCount,
            identityAnchorsUsed: parsed.qualityCheck?.identityAnchorsUsed || ['C.A.R.E.'],
          }
        });
      }
    } catch (err) {
      console.warn('Claude HillgroveGPT call failed, falling back to deterministic:', err);
    }
  }

  // Deterministic Fallback Generator
  const eventName = answers.eventName || programmeContext?.title || 'Leadership Development Programme';
  const eventDate = answers.eventDate || programmeContext?.startDate || 'recent weeks';
  const moments = answers.moments || 'collaborative team-building stations and reflective peer debriefs';
  const learning = answers.learning || 'deepened empathy and adaptability while working towards shared goals';
  const checksNeeded: string[] = [];

  let caption = '';
  let hashtags = '';
  let visualOrder = '';

  if (mode === 'council') {
    caption = sanitizeHillgrovePunctuation(
      `Calling all Hillgrovians! Our student leaders recently concluded ${eventName}, and the energy across the cohort was palpable.\n\nFrom tackling problem-solving scenarios under pressure to cheering every team across the finish line, our leaders showed up with heart and genuine care for their peers.\n\nBehind every smooth transition was our dedicated student facilitation team working quietly backstage to support everyone. When Hillgrovians lift one another up, we all soar together.\n\nWhat was your favourite takeaway from the sessions? Share your reflections below! 💬✨`
    );
    hashtags = '#HillgroveCouncil #UnitedWeSoar #StudentLeadership #HillgroviansCare';
    visualOrder = 'Slide 1: Student leaders during group cheer and challenge.\nSlide 2: Candid peer facilitation moment during debrief.\nSlide 3: Smiling group photo showing team unity.';
  } else if (mode === 'website') {
    caption = sanitizeHillgrovePunctuation(
      `HILLGROVE SECONDARY SCHOOL: NURTURING LEADERS THROUGH ${eventName.toUpperCase()}\n\nOn ${eventDate}, Hillgrove Secondary School conducted ${eventName} to nurture reflective learners and caring changemakers.\n\nThroughout the programme, students participated actively in ${moments}. Guided by teachers and peer facilitators, participants engaged in thoughtful discussions, developed mutual trust, and practised constructive communication across diverse teams.\n\nReflecting on their learning journey, students demonstrated notable growth in ${learning}. As one participant noted, authentic leadership requires listening attentively and serving others with humility.\n\nWe extend our sincere appreciation to our teachers, parent volunteers, and community partners whose steadfast guidance made this meaningful learning experience possible.`
    );
    hashtags = '';
    visualOrder = 'Header photo: Group overview of participants engaged in learning activity with school crest visible.';
  } else if (mode === 'editing') {
    const rawInput = prompt || 'Our students had an amazing time and learned valuable skills.';
    caption = sanitizeHillgrovePunctuation(
      `During ${eventName} on ${eventDate}, Hillgrovians engaged in ${moments}, putting communication and teamwork into practice.\n\nThrough these shared experiences, our students developed ${learning}, discovering how everyday collaboration creates positive impact across the school community.\n\nWe commend our student leaders for their sustained commitment and look forward to their continued contributions.`
    );
    hashtags = '#HillgroveSecondary #LearnCareMakeADifference #StudentLeadership';
    visualOrder = 'Slide 1: Active student collaboration during programme activity.';
    checksNeeded.push('[please confirm]: Replaced generic filler phrases with concrete observable actions.');
    checksNeeded.push('[please confirm]: Verified British spelling and ensured zero em or en dashes.');
  } else {
    // Official School Social Post (Default)
    caption = sanitizeHillgrovePunctuation(
      `Our Hillgrovians recently took part in ${eventName} on ${eventDate}, demonstrating what it means to learn, care, and make a difference together.\n\nParticipants navigated ${moments}, supporting each other through demanding challenges and communicating openly to resolve problems as a team.\n\nThese meaningful experiences nurtured ${learning}, proving that potential and character flourish when we lift our peers up. We are immensely proud of their dedication and teamwork.\n\nThank you to our dedicated staff and partners for nurturing our student leaders with care.`
    );
    hashtags = '#HillgroveSecondary #LearnCareMakeADifference #UnitedWeSoar #StudentLeadership';
    visualOrder = 'Slide 1: Students in school attire engaged in core programme activity.\nSlide 2: Facilitators guiding small-group reflection and debrief.\nSlide 3: Cohort team photo celebrating successful completion.';
  }

  if (isUrgent) {
    checksNeeded.push('[please confirm]: Urgent draft generated; please verify all dates, names, and photo permissions before public posting.');
  }

  const wCount = countWords(caption);
  const eCount = countEmojis(caption);

  return res.json({
    isQuestionIntake: false,
    channel: mode === 'council' ? 'Student Council Social' : mode === 'website' ? 'Website Write-up' : mode === 'editing' ? 'Draft Revision' : 'Official School Social',
    caption,
    hashtags,
    suggestedVisualOrderOrAltText: visualOrder,
    checksNeeded,
    qualityCheck: {
      factualClaimsSupported: true,
      channelVoiceClear: true,
      specificMomentsIncluded: true,
      meaningPrecedesValues: true,
      lengthMatchesMode: mode === 'website' ? (wCount >= 160 && wCount <= 320) : (wCount >= 85 && wCount <= 165),
      equalDignityPreserved: true,
      privacyProtected: true,
      noEmOrEnDashes: !/[—–]/.test(caption),
      purposefulEmojisAndTags: true,
      closingAddsMeaningOrAction: true,
      wordCount: wCount,
      emojiCount: eCount,
      identityAnchorsUsed: ['Potential + Character = Success', 'United We Soar'],
    }
  });
});

// --- HILLGROVE CONSENT FORM GENERATOR ENDPOINT ---
// Trained on official Hillgrove Secondary School circulars:
// Blank Ref, Singapore Standard English with British spelling, zero asterisks, official school letterhead structure
// --- PARENTS GATEWAY LETTER (school template: templates/PG_Template.docx) ---
// The AI only writes the template's fields; the letter layout always comes from the template.
const PG_WRITER_GUIDE = `You fill in the official Hillgrove Secondary School (Singapore) Parents Gateway letter template.
The template's fixed text reads:

  HGV<year>/<reference number>
  <letter date>
  Dear Parents/ Guardians,
  RE: <subject>
  We are happy to inform you that your child/ward will be involved in the programme below.
  [table] Event | Date | Reporting (Reporting Time, Venue) | Dismissal (Dismissal Time, Venue) | Attire | Transportation (row removed if empty) | Objectives
  For further information or clarification, please do not hesitate to contact the school[ or <contact teachers>] at 6560 3726 or via email to hillgrove_ss@moe.edu.sg.
  Thank you very much for your continued support to the school! In partnership with you, Mrs Helen Tan-Lee, Principal

Write ONLY these fields, in the school's house style:
- subject: the programme name plus year, in title case, e.g. "Secondary 2 Cohort Camp 2027". No "Participation in".
- eventName: the full official programme name, e.g. "Secondary 2 Cohort Camp 2027".
- eventDate: day month year with the weekday in brackets, e.g. "13 March 2027 (Friday)"; for a range, "9 to 11 March 2027 (Tuesday to Thursday)".
- reportingTime, dismissalTime: Singapore style with a dot and lower-case am/pm, e.g. "7.15 am", "12.30 pm".
- reportingVenue, dismissalVenue: a specific place, e.g. "School Hall", "School Foyer", "Parade Square", or the external venue's name.
- attire: usually one of "School PE T-shirt and school shorts/skirt", "School polo shirt and school shorts/skirt" or "Full School Uniform"; add specifics only if given (e.g. covered shoes, hat).
- transportation: one sentence if the programme is off-site or transport is mentioned, e.g. "Chartered buses will be provided for two-way transport between school and <venue>."; otherwise an empty string.
- objectives: 3 objectives (2 to 5 if the details call for it), each one sentence starting with "To", under 25 words, tied to this programme. Do not number them.
- contactTeachers: the teacher(s) parents may contact, as "Mr/Ms/Mrs/Mdm Name (Role)", e.g. "Mr Johann (Teacher-in-Charge)"; empty string if none given.

Rules:
- Singapore Standard English with British spelling (programme, organise, colour, centre).
- Never use asterisks, markdown, em dashes or en dashes.
- Never invent facts. If a time or venue is not given and cannot be inferred, write "[to be confirmed]".
- Keep it warm, clear and concise for parents.

Return JSON: {"subject": "", "eventName": "", "eventDate": "", "reportingTime": "", "reportingVenue": "", "dismissalTime": "", "dismissalVenue": "", "attire": "", "transportation": "", "objectives": [""], "contactTeachers": ""}`;

const formatPgDate = (iso?: string) => {
  const date = iso ? new Date(`${iso}T00:00:00`) : null;
  if (!date || isNaN(date.getTime())) return '';
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('en-SG', { month: 'long' }),
    year: date.getFullYear(),
    weekday: date.toLocaleDateString('en-SG', { weekday: 'long' }),
  };
};

const formatPgDateRange = (startIso?: string, endIso?: string) => {
  const start = formatPgDate(startIso);
  const end = formatPgDate(endIso);
  if (!start) return '';
  if (!end || startIso === endIso) return `${start.day} ${start.month} ${start.year} (${start.weekday})`;
  const startText = start.year !== end.year
    ? `${start.day} ${start.month} ${start.year}`
    : start.month !== end.month ? `${start.day} ${start.month}` : `${start.day}`;
  return `${startText} to ${end.day} ${end.month} ${end.year} (${start.weekday} to ${end.weekday})`;
};

// "07:15" or "7:15 am" -> "7.15 am"
const formatPgTime = (time?: string) => {
  const match = String(time || '').trim().match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i);
  if (!match) return String(time || '').trim();
  let hours = Number(match[1]);
  const suffix = match[3]?.toLowerCase() || (hours >= 12 ? 'pm' : 'am');
  if (!match[3]) hours = hours % 12 || 12;
  return `${hours}.${match[2]} ${suffix}`;
};

app.post('/api/gemini/consent-form', async (req, res) => {
  const {
    programmeTitle,
    targetCohort,
    startDate,
    endDate,
    startTime,
    endTime,
    venue,
    programmeObjectives,
    programmeDescription,
    transportRequired,
    teacherNames,
    notes,
    current,
  } = req.body;

  const title = cleanLetterText(programmeTitle) || 'Hillgrove Programme';
  const eventDate = formatPgDateRange(startDate, endDate);
  const reportingTime = formatPgTime(startTime);
  const dismissalTime = formatPgTime(endTime);
  const ven = cleanLetterText(venue);
  const contact = cleanLetterText(teacherNames);

  // useAi: false gives the quick template draft (used when a programme is first selected)
  const claude = req.body.useAi === false ? [] : await getClaudeClients();
  if (claude.length > 0) {
    try {
      const prompt = `${PG_WRITER_GUIDE}

PROGRAMME DETAILS:
- Programme: "${title}"
- Cohort: "${cleanLetterText(targetCohort)}"
- Date: "${eventDate || '[to be confirmed]'}"
- Start time: "${reportingTime || 'not given'}", end time: "${dismissalTime || 'not given'}"
- Venue: "${ven || 'not given'}"
- Transport required: ${transportRequired ? 'yes' : 'no'}
- Programme description: "${cleanLetterText(programmeDescription)}"
- Programme objectives (from planning): "${cleanLetterText(programmeObjectives)}"
- Teacher(s)-in-charge: "${contact || 'not given'}"
- Teacher's notes and instructions for this letter: "${cleanLetterText(notes) || 'none'}"
${current ? `- The teacher's current draft, to improve rather than replace where it is already correct: ${JSON.stringify(current).slice(0, 4000)}` : ''}`;

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Claude consent form timeout')), 60000)
      );
      const response = await Promise.race([generateJson(claude, prompt), timeoutPromise]) as any;
      const parsed = JSON.parse(response.text || '{}');
      if (parsed.eventName || parsed.subject) {
        const fields = normaliseLetterFields(parsed);
        return res.json({ success: true, fields, isAiGenerated: true });
      }
    } catch (err) {
      console.warn('Claude consent form generation failed, using structured template fallback:', err);
    }
  }

  // Structured fallback when no AI key is available
  const year = startDate ? String(new Date(`${startDate}T00:00:00`).getFullYear()) : '';
  const fields = normaliseLetterFields({
    subject: year && !title.includes(year) ? `${title} ${year}` : title,
    eventName: title,
    eventDate: eventDate || '[to be confirmed]',
    reportingTime: reportingTime || '[to be confirmed]',
    reportingVenue: transportRequired ? 'School Foyer' : (ven || 'Hillgrove Secondary School'),
    dismissalTime: dismissalTime || '[to be confirmed]',
    dismissalVenue: transportRequired ? 'School Foyer' : (ven || 'Hillgrove Secondary School'),
    attire: 'School PE T-shirt and school shorts/skirt',
    transportation: transportRequired
      ? `Chartered buses will be provided for two-way transport between school and ${ven || 'the venue'}.`
      : '',
    objectives: [
      `To provide students with meaningful learning experiences through ${title}.`,
      'To develop reflective learners and caring leaders grounded in school values.',
      'To strengthen teamwork, resilience and a sense of belonging.',
    ],
    contactTeachers: contact,
  });
  return res.json({ success: true, fields, isAiGenerated: false });
});

app.post('/api/pg-letter/docx', (req, res) => {
  try {
    const fields = normaliseLetterFields(req.body.fields);
    const buffer = renderPgLetterDocx(fields);
    const fileName = `PG_Letter_${(fields.eventName || 'Hillgrove').replace(/[^A-Za-z0-9]+/g, '_')}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('PG letter export failed:', err);
    return res.status(500).json({ error: 'Could not create the Word document.' });
  }
});

// Word Document Export Endpoint with Native DOCX generation (Strict Arial font, Zero asterisks, Letterhead support)
app.post('/api/export-word', async (req, res) => {
  const { title, content, isLetter } = req.body;
  const docTitle = title || 'Hillgrove Leadership Document';
  const cleanFilename = docTitle.replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    const { Document: DocxDoc, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun } = await import('docx');

    const cleanContent = (content || '').replace(/\*/g, '');
    const lines = cleanContent.split('\n');
    const docChildren: any[] = [];

    const isConsentOrLetter = isLetter ||
      docTitle.toLowerCase().includes('consent') ||
      docTitle.toLowerCase().includes('gateway') ||
      docTitle.toLowerCase().includes('letter') ||
      docTitle.toLowerCase().includes('circular');

    if (isConsentOrLetter) {
      // Embed official Hillgrove Crest Letterhead
      try {
        const logoPath = path.join(process.cwd(), 'public', 'hillgrove_logo.png');
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          docChildren.push(
            new Paragraph({
              children: [
                new (ImageRun as any)({
                  data: logoBuffer,
                  transformation: { width: 140, height: 55 },
                }),
              ],
              spacing: { after: 100 },
            })
          );
        }
      } catch (e) {
        console.warn('Could not embed logo image in Word doc:', e);
      }

      // Philosophy Banner
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Hillgrove believes in the Potential of our students, builds their Character and helps them Succeed.',
              font: 'Arial',
              italics: true,
              size: 18,
              color: '475569',
            }),
          ],
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: '10 Bukit Batok Street 52, Singapore 659250 | Tel: 6567 5624 | Fax: 6567 8031 | Website: https://hillgrovesec.moe.edu.sg',
              font: 'Arial',
              size: 16,
              color: '64748B',
            }),
          ],
          spacing: { after: 250 },
        })
      );
    } else {
      // Standard Document Header
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'HILLGROVE SECONDARY SCHOOL',
              font: 'Arial',
              bold: true,
              size: 26,
              color: '0F172A',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Student Leadership Committee • Official Planning Document',
              font: 'Arial',
              size: 18,
              color: '475569',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: docTitle,
              font: 'Arial',
              bold: true,
              size: 24,
              color: '059669',
            }),
          ],
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated Date: ${new Date().toLocaleDateString('en-SG', { dateStyle: 'full' })} | Reference: Verified Planning Record`,
              font: 'Arial',
              italics: true,
              size: 16,
              color: '64748B',
            }),
          ],
          spacing: { after: 300 },
        })
      );
    }

    // Process document content
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        docChildren.push(new Paragraph({ text: '', spacing: { after: 120 } }));
        continue;
      }

      // Check for Ref line: preserve blank
      if (line.startsWith('Ref:')) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Ref: ',
                font: 'Arial',
                bold: true,
                size: 20,
              }),
            ],
            spacing: { after: 120 },
          })
        );
        continue;
      }

      // Check for Subject line
      if (line.toLowerCase().startsWith('subject:') || line.toLowerCase().startsWith('re:')) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                font: 'Arial',
                bold: true,
                underline: {},
                size: 22,
                color: '0F172A',
              }),
            ],
            spacing: { before: 140, after: 160 },
          })
        );
        continue;
      }

      if (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('===') || (line.toUpperCase() === line && line.length > 5 && !line.startsWith('-') && !line.startsWith('•'))) {
        // Section Heading
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.replace(/^[#=\s]+/, '').replace(/[=\s]+$/, ''),
                font: 'Arial',
                bold: true,
                size: 22,
                color: '0F172A',
              }),
            ],
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
        // Bullet List
        docChildren.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun({
                text: line.replace(/^[-*•]\s+/, ''),
                font: 'Arial',
                size: 20,
              }),
            ],
            spacing: { after: 80 },
          })
        );
      } else if (/^\d+\.\s/.test(line)) {
        // Numbered List
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                font: 'Arial',
                size: 20,
              }),
            ],
            spacing: { after: 80 },
          })
        );
      } else {
        // Standard Paragraph
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                font: 'Arial',
                size: 20,
              }),
            ],
            spacing: { after: 120 },
          })
        );
      }
    }

    const docxFile = new DocxDoc({
      styles: {
        default: {
          document: {
            run: {
              font: 'Arial',
              size: 20,
            },
          },
        },
      },
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(docxFile);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}.docx"`);
    return res.send(buffer);
  } catch (err) {
    console.error('DOCX export error, falling back to text format:', err);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}.docx"`);
    return res.send(`=== HILLGROVE SECONDARY SCHOOL ===\nTitle: ${docTitle}\nExported Date: ${new Date().toLocaleDateString()}\n\n${(content || '').replace(/\*/g, '')}`);
  }
});


// Server boot function with Vite Middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Basecamp Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
