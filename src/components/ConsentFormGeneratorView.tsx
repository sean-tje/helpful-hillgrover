import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
  Bus,
  Plus,
  X,
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

// Editable fields drawn inside the letter: they look like the letter's text, with a light
// highlight so teachers can see what they can change. Empty fields show the template's
// <<placeholder>> in red, as in the Word template.
const fieldClass =
  'bg-amber-50 hover:bg-amber-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-sm text-slate-900 placeholder:text-rose-500 transition-colors';

const InlineField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  maxLength?: number;
  inputMode?: 'numeric' | 'text';
  ariaLabel?: string;
}> = ({ value, onChange, placeholder, className = '', maxLength, inputMode, ariaLabel }) => (
  <input
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    maxLength={maxLength}
    inputMode={inputMode}
    aria-label={ariaLabel || placeholder}
    size={Math.max(value ? value.length + 1 : placeholder.length, 2)}
    className={`${fieldClass} px-0.5 max-w-full ${className}`}
  />
);

const BlockField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  ariaLabel?: string;
}> = ({ value, onChange, placeholder, className = '', ariaLabel }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={e => onChange(e.target.value.replace(/\n/g, ' '))}
      placeholder={placeholder}
      aria-label={ariaLabel || placeholder}
      className={`${fieldClass} block w-full resize-none overflow-hidden px-1 leading-relaxed ${className}`}
    />
  );
};

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

  const referenceIsValid = /^\d{3}$/.test(fields.referenceNumber);

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
            Uses the school's official PG letter template. Draft it with AI, then click any highlighted text in the letter to edit it before downloading the Word document.
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

      {/* Programme & AI drafting */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        <div className="md:col-span-4 space-y-2">
          <label htmlFor="pg-programme" className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Programme</label>
          <select
            id="pg-programme"
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
        </div>

        <div className="md:col-span-6 space-y-2">
          <label htmlFor="pg-notes" className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Notes for the AI (optional)</label>
          <textarea
            id="pg-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            placeholder="e.g. Students report at the School Hall at 7.15 am. Bring a water bottle and cap. Dismissal at the School Foyer."
          />
        </div>

        <div className="md:col-span-2 flex flex-col gap-2 md:pt-6">
          <button
            onClick={() => requestDraft(true)}
            disabled={isDrafting || !selectedProgramme}
            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {isDrafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isDrafting ? 'Drafting...' : 'Draft with AI'}</span>
          </button>
          <span className="text-[11px] text-slate-500 text-center">
            {draftSource === 'ai' && 'AI draft. Check every field.'}
            {draftSource === 'template' && 'Standard draft.'}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* The letter itself is the editor */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
        <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />
        <span>Highlighted text can be edited. Red text marks a field still to be filled in.</span>
      </div>

      <div
        className="bg-white rounded-sm border border-slate-300 shadow-lg mx-auto w-full max-w-[820px] px-6 py-8 sm:px-14 sm:py-12 text-slate-900 text-[14px] leading-relaxed space-y-5"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <img src="/pg_letter_logo.png" alt="Hillgrove Secondary School" className="h-16 object-contain" />

        <div>
          <p className="flex flex-wrap items-baseline">
            <span>HGV</span>
            <InlineField value={fields.year} onChange={v => setField('year', v.replace(/\D/g, '').slice(0, 4))} placeholder="<<year>>" inputMode="numeric" ariaLabel="Year" />
            <span>/</span>
            <InlineField
              value={fields.referenceNumber}
              onChange={v => setField('referenceNumber', v.replace(/\D/g, '').slice(0, 3))}
              placeholder="<<reference number>>"
              inputMode="numeric"
              ariaLabel="Reference number (3 digits)"
            />
          </p>
          {!referenceIsValid && (
            <p className="text-[11px] text-rose-600 mt-1">Enter the 3-digit reference number, e.g. 067.</p>
          )}
        </div>

        <p>
          <InlineField value={fields.letterDate} onChange={v => setField('letterDate', v)} placeholder="<<date>>" ariaLabel="Letter date" />
        </p>

        <p>Dear Parents/ Guardians,</p>

        <p className="flex flex-wrap items-baseline font-bold underline">
          <span className="mr-1">RE:</span>
          <span className="flex-1 min-w-[12rem]">
            <BlockField value={fields.subject} onChange={v => setField('subject', v)} placeholder="<<subject>>" className="font-bold underline" ariaLabel="Subject" />
          </span>
        </p>

        <p>We are happy to inform you that your child/ward will be involved in the programme below.</p>

        <table className="w-full border-collapse border border-slate-800">
          <tbody>
            <tr>
              <td className="border border-slate-800 px-2 py-1.5 align-top w-32">Event</td>
              <td className="border border-slate-800 px-2 py-1.5 align-top">
                <BlockField value={fields.eventName} onChange={v => setField('eventName', v)} placeholder="<<Event Name>>" ariaLabel="Event name" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-800 px-2 py-1.5 align-top">Date</td>
              <td className="border border-slate-800 px-2 py-1.5 align-top">
                <BlockField value={fields.eventDate} onChange={v => setField('eventDate', v)} placeholder="<<date>>" ariaLabel="Event date" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-800 px-2 py-1.5 align-top">Reporting</td>
              <td className="border border-slate-800 px-2 py-1.5 align-top space-y-0.5">
                <div className="flex flex-wrap items-baseline gap-x-1">
                  <span>Reporting Time:</span>
                  <InlineField value={fields.reportingTime} onChange={v => setField('reportingTime', v)} placeholder="<<reporting time>>" ariaLabel="Reporting time" />
                </div>
                <div className="flex items-baseline gap-x-1">
                  <span className="shrink-0">Venue:</span>
                  <BlockField value={fields.reportingVenue} onChange={v => setField('reportingVenue', v)} placeholder="<<reporting venue>>" ariaLabel="Reporting venue" />
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-800 px-2 py-1.5 align-top">Dismissal</td>
              <td className="border border-slate-800 px-2 py-1.5 align-top space-y-0.5">
                <div className="flex flex-wrap items-baseline gap-x-1">
                  <span>Dismissal Time:</span>
                  <InlineField value={fields.dismissalTime} onChange={v => setField('dismissalTime', v)} placeholder="<<dismissal time>>" ariaLabel="Dismissal time" />
                </div>
                <div className="flex items-baseline gap-x-1">
                  <span className="shrink-0">Venue:</span>
                  <BlockField value={fields.dismissalVenue} onChange={v => setField('dismissalVenue', v)} placeholder="<<dismissal venue>>" ariaLabel="Dismissal venue" />
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-800 px-2 py-1.5 align-top">Attire</td>
              <td className="border border-slate-800 px-2 py-1.5 align-top">
                <BlockField value={fields.attire} onChange={v => setField('attire', v)} placeholder="<<attire>>" ariaLabel="Attire" />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ATTIRE_OPTIONS.filter(option => option !== fields.attire).map(option => (
                    <button
                      key={option}
                      onClick={() => setField('attire', option)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
            {includeTransport && (
              <tr>
                <td className="border border-slate-800 px-2 py-1.5 align-top">
                  <div className="flex items-start justify-between gap-1">
                    <span>Transportation</span>
                    <button
                      onClick={() => setIncludeTransport(false)}
                      className="text-slate-400 hover:text-rose-600"
                      title="Remove the Transportation row"
                      aria-label="Remove the Transportation row"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="border border-slate-800 px-2 py-1.5 align-top">
                  <BlockField
                    value={fields.transportation}
                    onChange={v => setField('transportation', v)}
                    placeholder="<<transportation details>>"
                    ariaLabel="Transportation details"
                  />
                </td>
              </tr>
            )}
            <tr>
              <td className="border border-slate-800 px-2 py-1.5 align-top">Objectives</td>
              <td className="border border-slate-800 px-2 py-1.5 align-top space-y-3">
                {fields.objectives.map((objective, index) => (
                  <div key={index} className="flex items-start gap-1 group">
                    <BlockField
                      value={objective}
                      onChange={v => updateObjective(index, v)}
                      placeholder={`<<objective ${index + 1}>>`}
                      ariaLabel={`Objective ${index + 1}`}
                    />
                    <button
                      onClick={() => setField('objectives', fields.objectives.filter((_, i) => i !== index))}
                      className="mt-1 text-slate-300 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                      title="Remove objective"
                      aria-label={`Remove objective ${index + 1}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {fields.objectives.length < MAX_OBJECTIVES && (
                  <button
                    onClick={() => setField('objectives', [...fields.objectives, ''])}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add objective
                  </button>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {!includeTransport && (
          <button
            onClick={() => setIncludeTransport(true)}
            className="-mt-3 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
          >
            <Bus className="w-3.5 h-3.5" /> Add Transportation row
          </button>
        )}

        <p>
          For further information or clarification, please do not hesitate to contact the school{' '}
          {fields.contactTeachers && <span>or </span>}
          <InlineField
            value={fields.contactTeachers}
            onChange={v => setField('contactTeachers', v)}
            placeholder="+ teacher's name (optional)"
            className={fields.contactTeachers ? '' : 'placeholder:text-slate-400 italic'}
            ariaLabel="Teachers parents may contact (optional)"
          />{' '}
          at 6560 3726 or via email to <span className="text-blue-700 underline">hillgrove_ss@moe.edu.sg</span>.
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
  );
};
