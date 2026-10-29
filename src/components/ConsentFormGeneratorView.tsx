import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Document, PgLetterFields } from '../types';
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  Check,
  Save,
  CheckCircle2,
  Edit3,
  Bus,
  Plus,
  Trash2,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ConsentFormGeneratorProps {
  initialProgrammeId?: string | null;
  onNavigateToProgramme?: (programmeId: string) => void;
}

const ATTIRE_OPTIONS = [
  'School PE T-shirt and school shorts/skirt',
  'School polo shirt and school shorts/skirt',
  'Full School Uniform',
];

const MAX_OBJECTIVES = 6;

const todayLong = () => new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });

const emptyFields = (): PgLetterFields => ({
  year: String(new Date().getFullYear()),
  referenceNumber: '',
  letterDate: todayLong(),
  subject: '',
  eventName: '',
  eventDate: '',
  reportingTime: '',
  reportingVenue: '',
  dismissalTime: '',
  dismissalVenue: '',
  attire: ATTIRE_OPTIONS[0],
  transportation: '',
  objectives: [],
  contactTeachers: '',
});

// Plain-text version of the letter, for pasting into Parents Gateway
const buildLetterText = (f: PgLetterFields) =>
  [
    `HGV${f.year}/${f.referenceNumber}`,
    '',
    f.letterDate,
    '',
    'Dear Parents/ Guardians,',
    '',
    `RE: ${f.subject}`,
    '',
    'We are happy to inform you that your child/ward will be involved in the programme below.',
    '',
    `Event: ${f.eventName}`,
    `Date: ${f.eventDate}`,
    `Reporting Time: ${f.reportingTime}, Venue: ${f.reportingVenue}`,
    `Dismissal Time: ${f.dismissalTime}, Venue: ${f.dismissalVenue}`,
    `Attire: ${f.attire}`,
    ...(f.transportation ? [`Transportation: ${f.transportation}`] : []),
    'Objectives:',
    ...f.objectives.filter(Boolean).map(o => `- ${o}`),
    '',
    `For further information or clarification, please do not hesitate to contact the school${f.contactTeachers ? ` or ${f.contactTeachers}` : ''} at 6560 3726 or via email to hillgrove_ss@moe.edu.sg.`,
    '',
    'Thank you very much for your continued support to the school!',
    '',
    'In partnership with you',
    '',
    'Mrs Helen Tan-Lee',
    'Principal',
    '',
    'This is a computer-generated email. No signature is required.',
  ].join('\n');

const Placeholder: React.FC<{ value: string; label: string }> = ({ value, label }) =>
  value ? <>{value}</> : <span className="text-rose-500">&lt;&lt;{label}&gt;&gt;</span>;

export const ConsentFormGeneratorView: React.FC<ConsentFormGeneratorProps> = ({
  initialProgrammeId,
  onNavigateToProgramme,
}) => {
  const { currentUser, isChair, allowlistedUsers } = useAuth();
  const { programmes, addDocument } = useData();

  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>(
    initialProgrammeId || programmes[0]?.id || ''
  );
  const selectedProgramme = programmes.find(p => p.id === selectedProgrammeId);

  const [fields, setFields] = useState<PgLetterFields>(emptyFields);
  const [includeTransport, setIncludeTransport] = useState(false);
  const [notes, setNotes] = useState('');

  const [isDrafting, setIsDrafting] = useState(false);
  const [draftSource, setDraftSource] = useState<'ai' | 'template' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const setField = <K extends keyof PgLetterFields>(key: K, value: PgLetterFields[K]) =>
    setFields(prev => ({ ...prev, [key]: value }));

  const teacherNamesFor = (ids: (string | undefined)[]) =>
    ids
      .map(id => allowlistedUsers.find(u => u.id === id)?.name)
      .filter(Boolean)
      .join(' / ');

  const requestDraft = async (useAi: boolean) => {
    if (!selectedProgramme) return;
    setIsDrafting(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/consent-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useAi,
          programmeTitle: selectedProgramme.title,
          targetCohort: (selectedProgramme as any).targetCohort,
          startDate: selectedProgramme.startDate,
          endDate: selectedProgramme.endDate,
          startTime: selectedProgramme.startTime,
          endTime: selectedProgramme.endTime,
          venue: selectedProgramme.venue,
          programmeObjectives: selectedProgramme.objectives,
          programmeDescription: selectedProgramme.description,
          transportRequired: includeTransport || selectedProgramme.conditionalAnswers?.isTransportRequired,
          teacherNames: teacherNamesFor([selectedProgramme.firstIcId, selectedProgramme.secondIcId]),
          notes: useAi ? notes : '',
          current: useAi ? fields : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.fields) throw new Error(data.error || 'Could not draft the letter.');
      setFields(prev => ({
        ...data.fields,
        // Keep the reference details the teacher entered
        year: prev.year,
        referenceNumber: prev.referenceNumber,
        letterDate: prev.letterDate,
      }));
      setIncludeTransport(!!data.fields.transportation);
      setDraftSource(data.isAiGenerated ? 'ai' : 'template');
      if (useAi && !data.isAiGenerated) {
        setError('AI is not available right now (no working Claude key in AI Settings), so a standard template draft was used.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDrafting(false);
    }
  };

  // Start each programme from a quick template draft (no AI call)
  useEffect(() => {
    if (selectedProgramme) {
      setIncludeTransport(!!selectedProgramme.conditionalAnswers?.isTransportRequired);
      requestDraft(false);
    }
  }, [selectedProgrammeId]);

  const letterFields = (): PgLetterFields => ({
    ...fields,
    transportation: includeTransport ? fields.transportation : '',
    objectives: fields.objectives.map(o => o.trim()).filter(Boolean),
  });

  const handleCopyText = () => {
    navigator.clipboard.writeText(buildLetterText(letterFields()));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleExportWord = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const response = await fetch('/api/pg-letter/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: letterFields() }),
      });
      if (!response.ok) throw new Error('Could not create the Word document.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PG_Letter_${(fields.eventName || 'Hillgrove').replace(/[^A-Za-z0-9]+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToRepository = () => {
    const text = buildLetterText(letterFields());
    const name = fields.eventName || selectedProgramme?.title || 'Programme';
    const newDoc: Document = {
      id: `doc_pg_${Date.now()}`,
      title: `Parents Gateway Letter: ${name}`,
      filePath: `/repository/PG_${name.replace(/\s+/g, '_')}.docx`,
      fileType: 'docx',
      category: 'Parents Gateway Letters',
      year: Number(fields.year) || new Date().getFullYear(),
      programmeType: selectedProgramme?.type || 'Cohort Camp',
      programmeId: selectedProgramme?.id,
      status: isChair ? 'Approved' : 'Current',
      ownerId: currentUser.id,
      tags: ['parents-gateway', 'consent-form', 'official-circular', fields.year],
      templateFlag: isChair,
      uploadedBy: currentUser.name,
      uploadedAt: new Date().toISOString(),
      indexingStatus: 'Searchable',
      fileSize: `${Math.max(120, Math.round(text.length / 10))} KB`,
      excerpt: text.slice(0, 320) + '...',
    };
    addDocument(newDoc);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const updateObjective = (index: number, value: string) =>
    setField('objectives', fields.objectives.map((o, i) => (i === index ? value : o)));

  const inputClass = 'w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300';
  const labelClass = 'block text-[11px] font-bold text-slate-700 mb-1';
  const preview = letterFields();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Hillgrove Official Communication Suite</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Parents Gateway Letter Writer</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Uses the school's official PG letter template. The AI fills in the template's fields; the layout, letterhead and footer always stay exactly as the template.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportWord}
            disabled={isExporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isExporting ? 'Creating Word file...' : 'Download Word (.docx)'}</span>
          </button>

          <button
            onClick={handleCopyText}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition border border-slate-300 flex items-center gap-1.5"
            title="Copy the letter as plain text for the Parents Gateway portal"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
          </button>

          <button
            onClick={handleSaveToRepository}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4 text-emerald-600" />}
            <span>{isSaved ? 'Saved to Repo!' : 'Save to Repo'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: programme, AI drafting and fields */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Programme</label>
            <select
              value={selectedProgrammeId}
              onChange={e => setSelectedProgrammeId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              {programmes.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            {selectedProgramme && onNavigateToProgramme && (
              <button
                onClick={() => onNavigateToProgramme(selectedProgramme.id)}
                className="text-[11px] text-emerald-600 font-semibold hover:underline flex items-center gap-1"
              >
                <span>Open Programme Workspace</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}

            <div>
              <label className={labelClass}>Notes for the AI (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="e.g. Students report at the School Hall at 7.15 am. Bring a water bottle and cap. Dismissal at the School Foyer."
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                {draftSource === 'ai' && 'Drafted by AI. Please check every field.'}
                {draftSource === 'template' && 'Standard template draft.'}
              </span>
              <button
                onClick={() => requestDraft(true)}
                disabled={isDrafting || !selectedProgramme}
                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 px-3 py-2 rounded-lg transition disabled:opacity-50"
              >
                {isDrafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isDrafting ? 'Drafting...' : 'Draft with AI'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-emerald-600" />
              <span>Letter Fields</span>
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Year</label>
                <input value={fields.year} onChange={e => setField('year', e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Reference number</label>
                <input
                  value={fields.referenceNumber}
                  onChange={e => setField('referenceNumber', e.target.value)}
                  className={inputClass}
                  placeholder="From the school's reference register"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Letter date</label>
                <input value={fields.letterDate} onChange={e => setField('letterDate', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Event date</label>
                <input value={fields.eventDate} onChange={e => setField('eventDate', e.target.value)} className={inputClass} placeholder="13 March 2027 (Friday)" />
              </div>
            </div>

            <div>
              <label className={labelClass}>Subject (RE:)</label>
              <input value={fields.subject} onChange={e => setField('subject', e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Event</label>
              <input value={fields.eventName} onChange={e => setField('eventName', e.target.value)} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Reporting time</label>
                <input value={fields.reportingTime} onChange={e => setField('reportingTime', e.target.value)} className={inputClass} placeholder="7.15 am" />
              </div>
              <div>
                <label className={labelClass}>Reporting venue</label>
                <input value={fields.reportingVenue} onChange={e => setField('reportingVenue', e.target.value)} className={inputClass} placeholder="School Hall" />
              </div>
              <div>
                <label className={labelClass}>Dismissal time</label>
                <input value={fields.dismissalTime} onChange={e => setField('dismissalTime', e.target.value)} className={inputClass} placeholder="12.30 pm" />
              </div>
              <div>
                <label className={labelClass}>Dismissal venue</label>
                <input value={fields.dismissalVenue} onChange={e => setField('dismissalVenue', e.target.value)} className={inputClass} placeholder="School Foyer" />
              </div>
            </div>

            <div>
              <label className={labelClass}>Attire</label>
              <input list="pg-attire-options" value={fields.attire} onChange={e => setField('attire', e.target.value)} className={inputClass} />
              <datalist id="pg-attire-options">
                {ATTIRE_OPTIONS.map(option => <option key={option} value={option} />)}
              </datalist>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="text-[11px] font-bold text-slate-800 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5 text-emerald-600" />
                  Include Transportation row
                </span>
                <input
                  type="checkbox"
                  checked={includeTransport}
                  onChange={e => setIncludeTransport(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
              </label>
              {includeTransport && (
                <textarea
                  value={fields.transportation}
                  onChange={e => setField('transportation', e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800"
                  placeholder="Chartered buses will be provided for two-way transport between school and the venue."
                />
              )}
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Objectives</label>
              {fields.objectives.map((objective, index) => (
                <div key={index} className="flex items-start gap-2">
                  <textarea
                    value={objective}
                    onChange={e => updateObjective(index, e.target.value)}
                    rows={2}
                    className={inputClass}
                  />
                  <button
                    onClick={() => setField('objectives', fields.objectives.filter((_, i) => i !== index))}
                    className="p-2 text-slate-400 hover:text-rose-600"
                    title="Remove objective"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {fields.objectives.length < MAX_OBJECTIVES && (
                <button
                  onClick={() => setField('objectives', [...fields.objectives, 'To '])}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add objective
                </button>
              )}
            </div>

            <div>
              <label className={labelClass}>Teachers parents may contact (optional)</label>
              <input
                value={fields.contactTeachers}
                onChange={e => setField('contactTeachers', e.target.value)}
                className={inputClass}
                placeholder="e.g. Mr Johann (Teacher-in-Charge)"
              />
              <p className="text-[10px] text-slate-500 mt-1">Leave empty to say "contact the school".</p>
            </div>
          </div>
        </div>

        {/* Right: preview laid out like the school's template */}
        <div className="lg:col-span-7">
          <div className="sticky top-4 bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-10 text-slate-900 text-[13px] leading-relaxed max-w-3xl mx-auto space-y-4" style={{ fontFamily: 'Arial, sans-serif' }}>
            <img src="/pg_letter_logo.png" alt="Hillgrove Secondary School" className="h-14 object-contain" />

            <p>HGV<Placeholder value={preview.year} label="year" />/<Placeholder value={preview.referenceNumber} label="reference number" /></p>
            <p><Placeholder value={preview.letterDate} label="date" /></p>
            <p>Dear Parents/ Guardians,</p>
            <p className="font-bold underline">RE: <Placeholder value={preview.subject} label="subject" /></p>
            <p>We are happy to inform you that your child/ward will be involved in the programme below.</p>

            <table className="w-full border-collapse border border-slate-800 text-[13px]">
              <tbody>
                {[
                  ['Event', <Placeholder value={preview.eventName} label="Event Name" />],
                  ['Date', <Placeholder value={preview.eventDate} label="date" />],
                  ['Reporting', <>Reporting Time: <Placeholder value={preview.reportingTime} label="reporting time" /><br />Venue: <Placeholder value={preview.reportingVenue} label="reporting venue" /></>],
                  ['Dismissal', <>Dismissal Time: <Placeholder value={preview.dismissalTime} label="dismissal time" /><br />Venue: <Placeholder value={preview.dismissalVenue} label="dismissal venue" /></>],
                  ['Attire', <Placeholder value={preview.attire} label="attire" />],
                  ...(preview.transportation ? [['Transportation', preview.transportation] as [string, React.ReactNode]] : []),
                  ['Objectives', preview.objectives.length > 0
                    ? <div className="space-y-2">{preview.objectives.map((o, i) => <p key={i}>{o}</p>)}</div>
                    : <Placeholder value="" label="objectives" />],
                ].map(([label, value], index) => (
                  <tr key={index} className="border border-slate-800">
                    <td className="border border-slate-800 px-2 py-1.5 align-top w-28">{label}</td>
                    <td className="border border-slate-800 px-2 py-1.5 align-top">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p>
              For further information or clarification, please do not hesitate to contact the school
              {preview.contactTeachers ? ` or ${preview.contactTeachers}` : ''} at 6560 3726 or via email to{' '}
              <span className="text-blue-700 underline">hillgrove_ss@moe.edu.sg</span>.
            </p>
            <p>Thank you very much for your continued support to the school!</p>
            <p>In partnership with you</p>
            <p>Mrs Helen Tan-Lee<br />Principal</p>
            <p className="text-center font-bold italic">This is a computer-generated email. No signature is required.</p>

            <div className="border-t border-slate-200 pt-3 flex items-end justify-between gap-4 text-[9px] italic text-slate-500">
              <span>Hillgrove believes in the Potential of our students, builds their Character and helps them Succeed.</span>
              <span className="text-right not-italic shrink-0 border-l border-slate-400 pl-2 leading-tight">
                10 Bukit Batok Street 52<br />Singapore 659250<br />Tel: 6560-3726<br />www.hillgrovesec.moe.edu.sg
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
