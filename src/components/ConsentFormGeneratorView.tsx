import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOptionalData } from '../context/DataContext';
import { Document, PgLetterFields } from '../types';
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  Check,
  Save,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PgLetterEditor, emptyPgLetterFields } from './PgLetterEditor';
import { buildPgLetterText } from '../pgLetterText';

interface ConsentFormGeneratorProps {
  initialProgrammeId?: string | null;
  onNavigateToProgramme?: (programmeId: string) => void;
}

export const ConsentFormGeneratorView: React.FC<ConsentFormGeneratorProps> = ({
  initialProgrammeId,
  onNavigateToProgramme,
}) => {
  const { currentUser, isChair, allowlistedUsers } = useAuth();
  // Signed-out guests have no committee data: they type the programme details themselves
  const data = useOptionalData();
  const isGuest = !data;
  const programmes = data?.programmes ?? [];

  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>(
    initialProgrammeId || programmes[0]?.id || ''
  );
  const selectedProgramme = programmes.find(p => p.id === selectedProgrammeId);

  const [fields, setFields] = useState<PgLetterFields>(emptyPgLetterFields);
  const [includeTransport, setIncludeTransport] = useState(false);
  const [notes, setNotes] = useState('');
  const [guestDetails, setGuestDetails] = useState({
    title: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    venue: '',
    teacherNames: '',
    reportingVenue: '',
    dismissalVenue: '',
  });
  const [isExternalVenue, setIsExternalVenue] = useState(false);
  const setGuestDetail = (key: keyof typeof guestDetails, value: string) =>
    setGuestDetails(prev => ({ ...prev, [key]: value }));

  const [isDrafting, setIsDrafting] = useState(false);
  const [draftSource, setDraftSource] = useState<'ai' | 'template' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const teacherNamesFor = (ids: (string | undefined)[]) =>
    ids
      .map(id => allowlistedUsers.find(u => u.id === id)?.name)
      .filter(Boolean)
      .join(' / ');

  const programmeDetails = () =>
    isGuest
      ? {
          programmeTitle: guestDetails.title,
          startDate: guestDetails.startDate,
          endDate: guestDetails.endDate || guestDetails.startDate,
          startTime: guestDetails.startTime,
          endTime: guestDetails.endTime,
          venue: guestDetails.venue,
          transportRequired: includeTransport,
          teacherNames: guestDetails.teacherNames,
          reportingVenue: isExternalVenue ? guestDetails.reportingVenue : '',
          dismissalVenue: isExternalVenue ? guestDetails.dismissalVenue : '',
        }
      : selectedProgramme && {
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
        };

  // An external venue needs the reporting and dismissal venues
  const missingVenues = isGuest && isExternalVenue && (!guestDetails.reportingVenue.trim() || !guestDetails.dismissalVenue.trim());
  const canDraft = isGuest ? guestDetails.title.trim().length > 0 && !missingVenues : !!selectedProgramme;

  const requestDraft = async (useAi: boolean) => {
    const details = programmeDetails();
    if (!details || !canDraft) return;
    setIsDrafting(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/consent-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useAi,
          ...details,
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
        setError(isGuest
          ? 'AI is not available right now, so a standard template draft was used.'
          : 'AI is not available right now (no working Claude key in Settings), so a standard template draft was used.');
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
    navigator.clipboard.writeText(buildPgLetterText(letterFields()));
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
    const text = buildPgLetterText(letterFields());
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
    data?.addDocument(newDoc);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

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
            onClick={handleCopyText}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition border border-slate-300 flex items-center gap-1.5"
            title="Copy the letter as plain text for the Parents Gateway portal"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
          </button>

          {!isGuest && (
            <button
              onClick={handleSaveToRepository}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4 text-emerald-600" />}
              <span>{isSaved ? 'Saved to Repo!' : 'Save to Repo'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Guests type the programme details */}
      {isGuest && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Programme details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {([
              ['title', 'Programme name', 'text', 'e.g. Secondary 2 Cohort Camp 2027'],
              ['venue', 'Venue', 'text', 'e.g. School Hall'],
              ['startDate', 'Start date', 'date', ''],
              ['endDate', 'End date', 'date', ''],
              ['startTime', 'Start time', 'time', ''],
              ['endTime', 'End time', 'time', ''],
              ['teacherNames', 'Teacher(s) parents may contact', 'text', 'e.g. Mr Tan (Teacher-in-Charge)'],
            ] as const).map(([key, label, type, placeholder]) => (
              <label key={key} className={`space-y-1 ${key === 'teacherNames' ? 'sm:col-span-2' : ''}`}>
                <span className="block font-semibold text-slate-700">{label}</span>
                <input
                  type={type}
                  value={guestDetails[key]}
                  onChange={e => setGuestDetail(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </label>
            ))}

            <label className="sm:col-span-2 flex items-center gap-2 font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isExternalVenue}
                onChange={e => {
                  setIsExternalVenue(e.target.checked);
                  if (!e.target.checked) setIncludeTransport(false);
                }}
              />
              <span>External venue</span>
            </label>

            {isExternalVenue && (
              <>
                {([
                  ['reportingVenue', 'Reporting venue', 'e.g. School Foyer'],
                  ['dismissalVenue', 'Dismissal venue', 'e.g. School Foyer'],
                ] as const).map(([key, label, placeholder]) => (
                  <label key={key} className="space-y-1">
                    <span className="block font-semibold text-slate-700">
                      {label} <span className="text-rose-600">*</span>
                    </span>
                    <input
                      required
                      value={guestDetails[key]}
                      onChange={e => setGuestDetail(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </label>
                ))}
                <label className="sm:col-span-2 flex items-center gap-2 font-semibold text-slate-700">
                  <input type="checkbox" checked={includeTransport} onChange={e => setIncludeTransport(e.target.checked)} />
                  <span>Transport provided</span>
                </label>
                {missingVenues && (
                  <p className="sm:col-span-2 text-rose-600">Enter the reporting and dismissal venues for an external venue.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Programme & AI drafting */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {!isGuest && (
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
        )}

        <div className={`${isGuest ? 'md:col-span-10' : 'md:col-span-6'} space-y-2`}>
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
            disabled={isDrafting || !canDraft}
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

      <PgLetterEditor
        fields={fields}
        onChange={setFields}
        includeTransport={includeTransport}
        onIncludeTransportChange={setIncludeTransport}
        actions={
          <button
            onClick={handleExportWord}
            disabled={isExporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isExporting ? 'Creating Word file...' : 'Download Word (.docx)'}</span>
          </button>
        }
      />
    </div>
  );
};
