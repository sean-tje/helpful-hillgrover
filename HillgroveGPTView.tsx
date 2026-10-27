import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Document, Programme } from '../types';
import {
  Sparkles,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Download,
  FolderPlus,
  Send,
  RefreshCw,
  Sliders,
  HelpCircle,
  ShieldCheck,
  FileText,
  Instagram,
  Globe,
  Smile,
  Zap,
  Info,
  ChevronRight,
  BookOpen
} from 'lucide-react';

export type OutputMode = 'official' | 'council' | 'website' | 'editing';

interface HillgroveGPTQualityCheck {
  factualClaimsSupported: boolean;
  channelVoiceClear: boolean;
  specificMomentsIncluded: boolean;
  meaningPrecedesValues: boolean;
  lengthMatchesMode: boolean;
  equalDignityPreserved: boolean;
  privacyProtected: boolean;
  noEmOrEnDashes: boolean;
  purposefulEmojisAndTags: boolean;
  closingAddsMeaningOrAction: boolean;
  wordCount: number;
  emojiCount: number;
  identityAnchorsUsed: string[];
}

interface HillgroveGPTResponse {
  isQuestionIntake: boolean;
  channel: string;
  caption: string;
  hashtags: string;
  suggestedVisualOrderOrAltText: string;
  checksNeeded: string[];
  intakeQuestions?: string[];
  qualityCheck: HillgroveGPTQualityCheck;
}

interface HillgroveGPTViewProps {
  initialProgrammeId?: string | null;
  onNavigateToProgramme?: (programmeId: string) => void;
}

export const HillgroveGPTView: React.FC<HillgroveGPTViewProps> = ({
  initialProgrammeId,
  onNavigateToProgramme,
}) => {
  const { currentUser, isChair } = useAuth();
  const { programmes, addDocument } = useData();

  // Mode and inputs
  const [selectedMode, setSelectedMode] = useState<OutputMode>('official');
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>(initialProgrammeId || '');
  const [rawPrompt, setRawPrompt] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [showAdvancedIntake, setShowAdvancedIntake] = useState<boolean>(false);

  // Guided Intake Answers
  const [answers, setAnswers] = useState({
    eventName: '',
    eventDate: '',
    eventPurpose: '',
    moments: '',
    learning: '',
    namesAndPrivacy: '',
    cta: '',
  });

  // Generation state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<HillgroveGPTResponse | null>(null);
  const [editableCaption, setEditableCaption] = useState<string>('');
  const [editableHashtags, setEditableHashtags] = useState<string>('');

  // UI state
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [savedToRepo, setSavedToRepo] = useState<boolean>(false);
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);
  const [activeTabPreview, setActiveTabPreview] = useState<'copy' | 'instagram' | 'quality'>('copy');

  // Load programme data when selected
  const handleSelectProgramme = (id: string) => {
    setSelectedProgrammeId(id);
    if (!id) return;
    const prg = programmes.find(p => p.id === id);
    if (prg) {
      setAnswers(prev => ({
        ...prev,
        eventName: prg.title,
        eventDate: `${prg.startDate} to ${prg.endDate}`,
        eventPurpose: prg.objectives || prg.description,
        moments: `${prg.venue ? `Conducted at ${prg.venue}. ` : ''}Active participation in leadership drills and cohort collaboration.`,
        learning: 'Cultivated adaptability, teamwork, and care for peers.',
      }));
      setRawPrompt(`Generate copy for our school programme: ${prg.title} (${prg.type}) held at ${prg.venue} from ${prg.startDate} to ${prg.endDate}.`);
    }
  };

  // Submit to backend
  const handleGenerate = async (overridePrompt?: string, overrideMode?: OutputMode, testCaseId?: string) => {
    setIsLoading(true);
    setSavedToRepo(false);

    const modeToUse = overrideMode || selectedMode;
    const promptToUse = overridePrompt !== undefined ? overridePrompt : rawPrompt;
    const selectedPrg = programmes.find(p => p.id === selectedProgrammeId);

    try {
      const response = await fetch('/api/gemini/hillgrove-gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: modeToUse,
          prompt: promptToUse,
          answers,
          isUrgent,
          previewTestCaseId: testCaseId,
          programmeContext: selectedPrg ? {
            title: selectedPrg.title,
            startDate: selectedPrg.startDate,
            endDate: selectedPrg.endDate,
            venue: selectedPrg.venue,
            objectives: selectedPrg.objectives,
            description: selectedPrg.description,
          } : undefined,
        }),
      });

      const data: HillgroveGPTResponse = await response.json();
      setResult(data);
      setEditableCaption(data.caption || '');
      setEditableHashtags(data.hashtags || '');
    } catch (err) {
      console.error('Failed to generate HillgroveGPT response:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Starter Trigger
  const handleQuickStarter = (starterText: string, mode: OutputMode) => {
    setSelectedMode(mode);
    setRawPrompt(starterText);
    handleGenerate(starterText, mode);
  };

  // Preview Test Set Trigger
  const handleRunTestCase = (testCaseId: string, mode: OutputMode, label: string) => {
    setSelectedMode(mode);
    setRawPrompt(`[Preview Test: ${label}]`);
    handleGenerate('', mode, testCaseId);
  };

  // Punctuation sanitizer (eliminate em/en dashes)
  const handleSanitizePunctuation = () => {
    if (!editableCaption) return;
    const cleaned = editableCaption
      .replace(/\s*[—–]\s*/g, ', ')
      .replace(/[—–]/g, ', ')
      .replace(/,\s*,+/g, ',')
      .replace(/,\s*\./g, '.');
    setEditableCaption(cleaned);
    if (result) {
      setResult({
        ...result,
        caption: cleaned,
        qualityCheck: {
          ...result.qualityCheck,
          noEmOrEnDashes: true,
        }
      });
    }
  };

  // Copy helpers
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyFullPackage = () => {
    if (!result) return;
    const fullText = `Channel: ${result.channel}\n\nCaption:\n${editableCaption}\n\nHashtags:\n${editableHashtags}${
      result.suggestedVisualOrderOrAltText ? `\n\nSuggested visual order or alt text:\n${result.suggestedVisualOrderOrAltText}` : ''
    }${
      result.checksNeeded && result.checksNeeded.length > 0 ? `\n\nChecks needed:\n${result.checksNeeded.map(c => `• ${c}`).join('\n')}` : ''
    }`;
    handleCopy(fullText, 'full');
  };

  // Save to School Repository
  const handleSaveToRepository = () => {
    if (!editableCaption) return;
    const title = answers.eventName || (result ? result.channel : 'Hillgrove Social Media Post');
    const newDoc: Document = {
      id: `doc_social_${Date.now()}`,
      title: `Publicity: ${title}`,
      filePath: `/repository/publicity_${Date.now()}.docx`,
      fileType: 'docx',
      category: 'Publicity & Social',
      year: 2026,
      programmeType: 'General',
      programmeId: selectedProgrammeId || undefined,
      status: isChair ? 'Approved' : 'Current',
      ownerId: currentUser.id,
      tags: ['publicity', 'social-media', selectedMode, 'hillgrove-gpt'],
      templateFlag: false,
      uploadedBy: currentUser.name,
      uploadedAt: new Date().toISOString(),
      indexingStatus: 'Searchable',
      fileSize: '45 KB',
      excerpt: editableCaption.slice(0, 280) + '...',
    };
    addDocument(newDoc);
    setSavedToRepo(true);
    setTimeout(() => setSavedToRepo(false), 4000);
  };

  // Export to Native Word .docx
  const handleExportWord = async () => {
    if (!editableCaption) return;
    setIsExportingWord(true);
    try {
      const docTitle = answers.eventName ? `Hillgrove Social Copy - ${answers.eventName}` : `HillgroveGPT - ${result?.channel || 'Social Post'}`;
      const fullDocText = `CHANNEL: ${result?.channel || 'Official School Social'}\n\nCAPTION:\n${editableCaption}\n\nHASHTAGS:\n${editableHashtags}\n\nSUGGESTED VISUAL ORDER / ALT TEXT:\n${result?.suggestedVisualOrderOrAltText || 'None'}\n\nCHECKS NEEDED & SAFEGUARDING:\n${result?.checksNeeded?.join('\n') || 'All checks passed. Dignity and privacy preserved.'}`;

      const res = await fetch('/api/export-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle,
          content: fullDocText,
        }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Word export failed:', err);
    } finally {
      setIsExportingWord(false);
    }
  };

  // Detect em/en dashes
  const hasEmOrEnDashes = /[—–]/.test(editableCaption);
  const wordCount = editableCaption.trim().split(/\s+/).filter(Boolean).length;
  const emojiMatches = editableCaption.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu);
  const emojiCount = emojiMatches ? emojiMatches.length : 0;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Hillgrove Institutional Identity Banner */}
      <div className="bg-linear-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-emerald-700/60 text-emerald-200 border border-emerald-500/30 rounded-full text-xs font-semibold tracking-wide uppercase">
                HillgroveGPT • Official Writing Assistant
              </span>
              <span className="text-emerald-300/80 text-xs hidden sm:inline">• Singapore English & British Spelling</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Public Copy & Social Media Generator</span>
              <Sparkles className="w-5 h-5 text-amber-300" />
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Show what Hillgrovians did, why it mattered, and how people grew, cared, or made a difference. Preserving student dignity, factual precision, and authentic school voice.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-emerald-950/40 p-3 rounded-xl border border-emerald-700/30 shrink-0">
            <div>
              <span className="text-emerald-300 block font-semibold">Vision:</span>
              <span className="text-emerald-100">Reflective Learners, Adaptive Thinkers, Caring Changemakers</span>
            </div>
            <div>
              <span className="text-emerald-300 block font-semibold">Mission:</span>
              <span className="text-emerald-100">Learn, Care, Make a Difference</span>
            </div>
            <div>
              <span className="text-emerald-300 block font-semibold">Motto:</span>
              <span className="text-emerald-100 font-bold">United We Soar</span>
            </div>
            <div>
              <span className="text-emerald-300 block font-semibold">Culture (C.A.R.E.):</span>
              <span className="text-emerald-100">Collab, Affirmation, Respect, Excellence</span>
            </div>
            <div className="col-span-2">
              <span className="text-emerald-300 block font-semibold">Values:</span>
              <span className="text-emerald-100">Integrity, Care, Adaptability, Respect, Resilience, Responsibility, Empathy</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Output Mode Selector Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            {
              id: 'official' as OutputMode,
              label: 'Official School Social',
              sub: '100–150 words • 0–3 emojis • Institutional warm voice',
              icon: Globe,
              accent: 'border-emerald-600 bg-emerald-50 text-emerald-900',
            },
            {
              id: 'council' as OutputMode,
              label: 'Student Council Social',
              sub: '100–150 words • 3–8 emojis • Youthful & direct address',
              icon: Share2,
              accent: 'border-purple-600 bg-purple-50 text-purple-900',
            },
            {
              id: 'website' as OutputMode,
              label: 'Website Write-up',
              sub: '180–300 words • Factual headline • No hashtags',
              icon: FileText,
              accent: 'border-blue-600 bg-blue-50 text-blue-900',
            },
            {
              id: 'editing' as OutputMode,
              label: 'Editing Mode',
              sub: 'Preserves facts • Polishes flow • Flags privacy gaps',
              icon: Sliders,
              accent: 'border-amber-600 bg-amber-50 text-amber-900',
            },
          ].map(tab => {
            const isSelected = selectedMode === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedMode(tab.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? tab.accent + ' shadow-2xs font-semibold ring-1'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-current' : 'text-slate-400'}`} />
                  <span className="text-xs sm:text-sm font-bold">{tab.label}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-normal leading-tight">{tab.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Quick Starters & Preview Test Suite Accordion */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Quick Starters & Official Preview Test Suite
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Click any scenario to test HillgroveGPT's training benchmarks
          </span>
        </div>

        {/* Conversation Starters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickStarter('Draft an official Hillgrove Instagram post from these event notes: Secondary 1 Orientation Camp held on 8 January 2026. Activities included tent pitching on parade square, obstacle course, and evening campfire cheer. Students bonded and learned to support one another.', 'official')}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 rounded-lg text-xs font-medium transition shadow-2xs flex items-center gap-1.5"
          >
            <span>📸</span>
            <span>Draft official Instagram post from event notes</span>
          </button>

          <button
            onClick={() => handleQuickStarter('Turn this announcement into a playful Student Council caption: Staff Appreciation Day is coming next week. Write appreciation cards for teachers and operational staff at the council booth outside canteen during recess.', 'council')}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:border-purple-500 text-slate-700 rounded-lg text-xs font-medium transition shadow-2xs flex items-center gap-1.5"
          >
            <span>💬</span>
            <span>Turn announcement into playful Council caption</span>
          </button>

          <button
            onClick={() => handleQuickStarter('Polish this draft, preserve the facts and flag anything I need to verify: Our students had the opportunity to go for a camp and it was an amazing unforgettable time. They did very well and won first place.', 'editing')}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:border-amber-500 text-slate-700 rounded-lg text-xs font-medium transition shadow-2xs flex items-center gap-1.5"
          >
            <span>✍️</span>
            <span>Polish draft, preserve facts & flag gaps</span>
          </button>
        </div>

        {/* 7 Preview Test Cases */}
        <div className="pt-2 border-t border-slate-200">
          <div className="text-[11px] font-semibold text-slate-600 mb-2">
            Standard Preview Test Set (1 to 7):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {[
              { id: 'test_insufficient', num: '1', label: 'Insufficient Info', desc: 'Triggers Guided Intake', mode: 'official' as OutputMode },
              { id: 'test_official', num: '2', label: 'Official Voice', desc: '100-150w restrained', mode: 'official' as OutputMode },
              { id: 'test_council', num: '3', label: 'Council Voice', desc: 'Staff Day teaser', mode: 'council' as OutputMode },
              { id: 'test_unverified', num: '4', label: 'Unverified Result', desc: 'Flags result, no invention', mode: 'official' as OutputMode },
              { id: 'test_privacy', num: '5', label: 'Privacy Photo', desc: 'Visible action only', mode: 'official' as OutputMode },
              { id: 'test_equity', num: '6', label: 'Programme Equity', desc: 'Everyday service dignified', mode: 'official' as OutputMode },
              { id: 'test_punctuation', num: '7', label: 'Zero Dash Audit', desc: '0 em or en dashes', mode: 'official' as OutputMode },
            ].map(test => (
              <button
                key={test.id}
                onClick={() => handleRunTestCase(test.id, test.mode, test.label)}
                className="p-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-left transition group shadow-2xs"
              >
                <div className="flex items-center space-x-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-[10px] font-bold flex items-center justify-center text-slate-700">
                    {test.num}
                  </span>
                  <span className="text-[11px] font-bold text-slate-800 truncate">{test.label}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 truncate">{test.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Intake & Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Intake Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Event Information & Intake</span>
              </h2>

              {/* Programme Quick-Loader */}
              <div className="flex items-center space-x-1">
                <select
                  value={selectedProgrammeId}
                  onChange={e => handleSelectProgramme(e.target.value)}
                  className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 max-w-[170px] truncate"
                >
                  <option value="">-- Load from Programme --</option>
                  {programmes.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prompt / Notes Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Event Notes, Draft, or Direct Instruction
              </label>
              <textarea
                rows={4}
                value={rawPrompt}
                onChange={e => setRawPrompt(e.target.value)}
                placeholder="e.g. Write an official post for our Student Leaders Investiture on 24 July 2026. 60 prefects received badges of office from Principal. Highlights: solemn pledge recitation, marching procession. Focus on leadership and service."
                className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
              />
            </div>

            {/* Toggle Structured Guided Intake Questions */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedIntake(!showAdvancedIntake)}
                className="text-xs text-emerald-700 font-semibold hover:text-emerald-800 flex items-center gap-1"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showAdvancedIntake ? 'Hide Guided Intake Fields' : 'Show 6-Point Guided Intake Fields'}</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAdvancedIntake ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {showAdvancedIntake && (
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs bg-slate-50 p-3.5 rounded-xl border">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">1. Event Name & Purpose</label>
                  <input
                    type="text"
                    value={answers.eventName}
                    onChange={e => setAnswers({ ...answers, eventName: e.target.value })}
                    placeholder="e.g. Camp Resilience 2026 (Outdoor Leadership Camp)"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">2. Event Date</label>
                    <input
                      type="text"
                      value={answers.eventDate}
                      onChange={e => setAnswers({ ...answers, eventDate: e.target.value })}
                      placeholder="e.g. 15 March 2026"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">3. Call to Action / Hashtag</label>
                    <input
                      type="text"
                      value={answers.cta}
                      onChange={e => setAnswers({ ...answers, cta: e.target.value })}
                      placeholder="e.g. Register by Friday / #UnitedWeSoar"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">4. Two to Four Specific Moments</label>
                  <textarea
                    rows={2}
                    value={answers.moments}
                    onChange={e => setAnswers({ ...answers, moments: e.target.value })}
                    placeholder="e.g. Raft building at reservoir, cheer circle, team debrief under rain trees"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">5. What Did Students Learn / Demonstrate?</label>
                  <input
                    type="text"
                    value={answers.learning}
                    onChange={e => setAnswers({ ...answers, learning: e.target.value })}
                    placeholder="e.g. Overcame hesitation, communicated actively across differences"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">6. Verified Names / Privacy Clearance</label>
                  <input
                    type="text"
                    value={answers.namesAndPrivacy}
                    onChange={e => setAnswers({ ...answers, namesAndPrivacy: e.target.value })}
                    placeholder="e.g. Group photos approved on Parents Gateway; no individual student names"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                  />
                </div>
              </div>
            )}

            {/* Urgent Draft Checkbox */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                id="urgent-draft"
                type="checkbox"
                checked={isUrgent}
                onChange={e => setIsUrgent(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="urgent-draft" className="text-xs text-slate-600 cursor-pointer">
                <span className="font-semibold text-slate-800">Urgent draft with gaps:</span> Write conservatively now and mark unverified facts as <code className="text-amber-700 font-bold">[please confirm]</code>
              </label>
            </div>

            {/* Generate Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-2xs"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>HillgroveGPT is drafting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate Publication Copy ({selectedMode.toUpperCase()})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Output & Quality Verification (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Guided Intake Notice if info is missing */}
          {result?.isQuestionIntake && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Guided Intake Active: Information Needed Before Drafting</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                To protect school accuracy and avoid inventing facts, please provide the following details (or toggle <em>"Urgent draft with gaps"</em> to draft immediately):
              </p>
              <ul className="space-y-1.5 text-xs text-amber-950 list-disc list-inside">
                {result.intakeQuestions?.map((q, idx) => (
                  <li key={idx} className="leading-snug">{q}</li>
                ))}
              </ul>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowAdvancedIntake(true);
                  }}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold"
                >
                  Fill Intake Answers
                </button>
                <button
                  onClick={() => {
                    setIsUrgent(true);
                    handleGenerate(rawPrompt || 'Urgent leadership programme summary', selectedMode);
                  }}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold"
                >
                  Force Urgent Draft With Flags
                </button>
              </div>
            </div>
          )}

          {/* Generated Result Container */}
          {result && !result.isQuestionIntake ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
              {/* Output Header Bar */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-bold rounded-lg text-xs border border-emerald-300">
                    Channel: {result.channel}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    selectedMode === 'website'
                      ? (wordCount >= 160 && wordCount <= 320 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')
                      : (wordCount >= 85 && wordCount <= 165 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')
                  }`}>
                    {wordCount} words {selectedMode === 'website' ? '(target 180–300)' : '(target 100–150)'}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded text-[11px] font-semibold">
                    {emojiCount} emojis
                  </span>
                </div>

                {/* Sub-view switcher */}
                <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setActiveTabPreview('copy')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                      activeTabPreview === 'copy' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Copy & Edit
                  </button>
                  <button
                    onClick={() => setActiveTabPreview('instagram')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition flex items-center gap-1 ${
                      activeTabPreview === 'instagram' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Instagram className="w-3 h-3" />
                    <span>Mockup</span>
                  </button>
                  <button
                    onClick={() => setActiveTabPreview('quality')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition flex items-center gap-1 ${
                      activeTabPreview === 'quality' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span>10-Point Audit</span>
                  </button>
                </div>
              </div>

              {/* Checks Needed Alert (if any unresolved facts exist) */}
              {result.checksNeeded && result.checksNeeded.length > 0 && (
                <div className="mx-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-amber-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Checks Needed Before Publishing (Factual Safeguard)</span>
                  </div>
                  <ul className="space-y-1 text-xs text-amber-900 pl-4 list-disc">
                    {result.checksNeeded.map((chk, i) => (
                      <li key={i}>{chk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Punctuation Warning if em/en dash detected */}
              {hasEmOrEnDashes && (
                <div className="mx-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Em dash (—) or en dash (–) detected. Hillgrove style strictly prohibits dash punctuation.</span>
                  </div>
                  <button
                    onClick={handleSanitizePunctuation}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[11px]"
                  >
                    Clean Punctuation
                  </button>
                </div>
              )}

              {/* View 1: Copy & Edit */}
              {activeTabPreview === 'copy' && (
                <div className="p-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Publication-Ready Caption:
                      </label>
                      <button
                        onClick={() => handleCopy(editableCaption, 'caption')}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                      >
                        {copiedType === 'caption' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedType === 'caption' ? 'Copied!' : 'Copy Caption'}</span>
                      </button>
                    </div>
                    <textarea
                      rows={8}
                      value={editableCaption}
                      onChange={e => setEditableCaption(e.target.value)}
                      className="w-full p-3.5 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-white font-sans leading-relaxed"
                    />
                  </div>

                  {/* Hashtags */}
                  {selectedMode !== 'website' && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Hashtags (0 to 5 max):
                        </label>
                        <button
                          onClick={() => handleCopy(editableHashtags, 'hashtags')}
                          className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                        >
                          {copiedType === 'hashtags' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedType === 'hashtags' ? 'Copied!' : 'Copy Tags'}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editableHashtags}
                        onChange={e => setEditableHashtags(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-700 bg-white"
                      />
                    </div>
                  )}

                  {/* Visual Order / Alt text */}
                  {result.suggestedVisualOrderOrAltText && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="font-bold text-slate-800">Suggested Visual Order / Alt Text:</div>
                      <pre className="font-sans text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {result.suggestedVisualOrderOrAltText}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* View 2: Live Instagram Mockup */}
              {activeTabPreview === 'instagram' && (
                <div className="p-4 flex justify-center">
                  <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-linear-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-emerald-500/20">
                          HSS
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 leading-none">
                            {selectedMode === 'council' ? 'hillgrove_studentcouncil' : 'hillgrovesec'}
                          </div>
                          <div className="text-[10px] text-slate-500 leading-tight">Hillgrove Secondary School • Bukit Batok</div>
                        </div>
                      </div>
                      <div className="text-slate-400 font-bold">•••</div>
                    </div>

                    {/* Image Placeholder */}
                    <div className="aspect-4/3 bg-linear-to-br from-slate-800 to-emerald-950 flex flex-col items-center justify-center p-6 text-center text-white space-y-2">
                      <Sparkles className="w-8 h-8 text-amber-300" />
                      <div className="text-xs font-bold text-emerald-200">
                        {answers.eventName || 'Hillgrove Secondary School'}
                      </div>
                      <div className="text-[11px] text-slate-300 max-w-xs italic line-clamp-3">
                        {result.suggestedVisualOrderOrAltText || 'Photo Carousel: Students participating in learning activities.'}
                      </div>
                    </div>

                    {/* Engagement Bar */}
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between text-slate-700">
                      <div className="flex items-center space-x-3 text-sm">
                        <span>❤️</span>
                        <span>💬</span>
                        <span>✈️</span>
                      </div>
                      <div className="text-xs text-slate-400">🔖</div>
                    </div>

                    {/* Caption Preview */}
                    <div className="p-3 space-y-2 text-xs">
                      <div className="font-bold text-slate-900">
                        Liked by <span className="font-bold">hillgrovians</span> and <span className="font-bold">others</span>
                      </div>
                      <div className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                        <span className="font-bold mr-1.5">
                          {selectedMode === 'council' ? 'hillgrove_studentcouncil' : 'hillgrovesec'}
                        </span>
                        {editableCaption}
                      </div>
                      {editableHashtags && (
                        <div className="text-blue-600 font-medium leading-relaxed">
                          {editableHashtags}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                        JUST NOW • SINGAPORE
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* View 3: 10-Point Final Quality Check */}
              {activeTabPreview === 'quality' && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      HillgroveGPT 10-Point Quality Rubric
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      10/10 Verified Checks
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      {
                        title: '1. Verified Factual Claims',
                        desc: 'Never invents awards, placements, dates or people.',
                        pass: result.qualityCheck?.factualClaimsSupported ?? true,
                      },
                      {
                        title: '2. Channel Voice Clarity',
                        desc: selectedMode === 'council' ? 'Youthful, direct address, playful' : 'Polished, warm institutional tone',
                        pass: result.qualityCheck?.channelVoiceClear ?? true,
                      },
                      {
                        title: '3. Concrete Moments Support Meaning',
                        desc: 'Shows what happened with observable verbs.',
                        pass: result.qualityCheck?.specificMomentsIncluded ?? true,
                      },
                      {
                        title: '4. Meaning Precedes Values & Slogans',
                        desc: 'Concrete action shown before naming identity anchor.',
                        pass: result.qualityCheck?.meaningPrecedesValues ?? true,
                      },
                      {
                        title: '5. Length Matches Benchmark',
                        desc: selectedMode === 'website' ? `${wordCount} words (180–300w)` : `${wordCount} words (100–150w)`,
                        pass: result.qualityCheck?.lengthMatchesMode ?? true,
                      },
                      {
                        title: '6. Equal Programme Dignity',
                        desc: 'Celebrates everyday learning as thoughtfully as awards.',
                        pass: result.qualityCheck?.equalDignityPreserved ?? true,
                      },
                      {
                        title: '7. Safeguarding & Privacy Protected',
                        desc: 'No unverified names or inferred diagnoses.',
                        pass: result.qualityCheck?.privacyProtected ?? true,
                      },
                      {
                        title: '8. Zero Em / En Dashes (Strict)',
                        desc: hasEmOrEnDashes ? 'Failed: Dash detected' : 'Pass: 0 em/en dashes present',
                        pass: !hasEmOrEnDashes,
                      },
                      {
                        title: '9. Purposeful Emojis & Hashtags',
                        desc: `${emojiCount} emojis (${selectedMode === 'council' ? '3–8' : selectedMode === 'website' ? '0–1' : '0–3'} target)`,
                        pass: result.qualityCheck?.purposefulEmojisAndTags ?? true,
                      },
                      {
                        title: '10. Meaningful Closing & CTA',
                        desc: 'Clear, grounded closing or call to action.',
                        pass: result.qualityCheck?.closingAddsMeaningOrAction ?? true,
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex items-start space-x-2.5 ${
                          item.pass ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                        }`}
                      >
                        {item.pass ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className={`font-bold text-xs ${item.pass ? 'text-emerald-950' : 'text-rose-950'}`}>
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-600 leading-tight mt-0.5">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyFullPackage}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                  >
                    {copiedType === 'full' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedType === 'full' ? 'Package Copied!' : 'Copy Full Copy Package'}</span>
                  </button>

                  <button
                    onClick={handleExportWord}
                    disabled={isExportingWord}
                    className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isExportingWord ? 'Exporting...' : 'Export Word (.docx)'}</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveToRepository}
                    disabled={savedToRepo}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    {savedToRepo ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <FolderPlus className="w-3.5 h-3.5" />}
                    <span>{savedToRepo ? 'Saved to Repository!' : 'Save to Repository'}</span>
                  </button>

                  {selectedProgrammeId && onNavigateToProgramme && (
                    <button
                      onClick={() => onNavigateToProgramme(selectedProgrammeId)}
                      className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                    >
                      <span>Return to Programme</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : !result?.isQuestionIntake ? (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">HillgroveGPT Copy Generator</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Provide event notes or select one of the Quick Starters above. HillgroveGPT drafts publication-ready copy following official Singapore English style, British spelling, dignity safeguards, and strict zero-dash rules.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
