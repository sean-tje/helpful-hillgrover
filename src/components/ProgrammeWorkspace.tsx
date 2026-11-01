import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Task, PgLetterFields } from '../types';
import { PgLetterEditor } from './PgLetterEditor';
import { buildPgLetterText } from '../pgLetterText';
import { formatSingaporeDateRange, formatSingaporeDateLong, toIsoDate } from '../utils';
import { formatTimelineTime } from './TimelineTimePicker';
import { DELIVERABLES, DeliverableKey, deliverablesFromPlannerResponse } from './CreateProgrammeModal';
import {
  Archive,
  ArrowLeft,
  Sparkles,
  Send,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { BusBookingModal } from './BusBookingModal';
import { ArchiveValidationModal } from './ArchiveValidationModal';

interface ProgrammeWorkspaceProps {
  programmeId: string;
  onBack: () => void;
}

// "07:30" -> "7.30 am"; anything else is shown as stored
const formatTime = (time?: string) => {
  const match = (time || '').match(/^(\d{1,2}):(\d{2})$/);
  return match ? formatTimelineTime(Number(match[1]) * 60 + Number(match[2])) : time || '';
};

const byDueDate = (a: Task, b: Task) => toIsoDate(a.dueDate).localeCompare(toIsoDate(b.dueDate));

export const ProgrammeWorkspace: React.FC<ProgrammeWorkspaceProps> = ({ programmeId, onBack }) => {
  const { currentUser, allowlistedUsers, isChair } = useAuth();
  const { programmes, tasks, updateProgramme, updateTaskStatus, handoverTask } = useData();

  const programme = programmes.find(p => p.id === programmeId);

  const [showBusBooking, setShowBusBooking] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Handover modal state
  const [selectedTaskForHandover, setSelectedTaskForHandover] = useState<Task | null>(null);
  const [handoverToUserId, setHandoverToUserId] = useState<string>('');
  const [handoverNote, setHandoverNote] = useState<string>('');

  // The deliverable open in the pop-up, and its working copy
  const [openKey, setOpenKey] = useState<DeliverableKey | null>(null);
  const [draftText, setDraftText] = useState('');
  const [draftPgFields, setDraftPgFields] = useState<PgLetterFields | null>(null);
  const [draftPgTransport, setDraftPgTransport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape closes the pop-up; the page behind it does not scroll
  useEffect(() => {
    if (!openKey) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDeliverable();
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  });

  if (!programme) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-slate-500 text-sm">Programme not found.</p>
        <button onClick={onBack} className="mt-4 text-emerald-600 font-semibold underline text-sm">
          Return to Programmes
        </button>
      </div>
    );
  }

  const firstIc = allowlistedUsers.find(u => u.id === programme.firstIcId);
  const secondIc = allowlistedUsers.find(u => u.id === programme.secondIcId);
  const answers = programme.conditionalAnswers;
  const deliverables = programme.deliverables;

  // Checklist: open items first, then done items; each group by due date
  const prgTasks = tasks.filter(t => t.programmeId === programme.id);
  const openTasks = prgTasks.filter(t => t.status !== 'Completed').sort(byDueDate);
  const doneTasks = prgTasks.filter(t => t.status === 'Completed').sort(byDueDate);

  const pgLetterFor = (fields: PgLetterFields, includeTransport: boolean): PgLetterFields => ({
    ...fields,
    transportation: includeTransport ? fields.transportation : '',
    objectives: fields.objectives.map(o => o.trim()).filter(Boolean),
  });

  const openDeliverable = (key: DeliverableKey) => {
    setError(null);
    setOpenKey(key);
    setDraftText(deliverables?.[key] || '');
    setDraftPgFields(key === 'parentsGatewayConsentForm' ? programme.pgLetterFields || null : null);
    setDraftPgTransport(!!programme.pgIncludeTransport);
  };

  // Keep any edits with the programme when the pop-up closes
  const closeDeliverable = () => {
    if (openKey && deliverables) {
      const text = draftPgFields ? buildPgLetterText(pgLetterFor(draftPgFields, draftPgTransport)) : draftText;
      const changed =
        text !== deliverables[openKey] ||
        (draftPgFields && (draftPgFields !== programme.pgLetterFields || draftPgTransport !== !!programme.pgIncludeTransport));
      if (changed) {
        updateProgramme(programme.id, {
          deliverables: { ...deliverables, [openKey]: text },
          ...(draftPgFields ? { pgLetterFields: draftPgFields, pgIncludeTransport: draftPgTransport } : {}),
        });
      }
    }
    setOpenKey(null);
  };

  const handleDownloadWord = async () => {
    if (!openKey) return;
    const label = DELIVERABLES.find(d => d.key === openKey)?.label.replace(/^\d+\.\s*/, '') || 'Deliverable';
    setIsExporting(true);
    setError(null);
    try {
      const response = draftPgFields
        ? await fetch('/api/pg-letter/docx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: pgLetterFor(draftPgFields, draftPgTransport) }),
          })
        : await fetch('/api/export-word', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: `${programme.title} - ${label}`, content: draftText.replace(/\*/g, '') }),
          });
      if (!response.ok) throw new Error('Could not create the Word document.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${programme.title.replace(/[^A-Za-z0-9]+/g, '_')}_${label.replace(/[^A-Za-z0-9]+/g, '_')}.docx`;
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

  // Programmes planned before deliverables were kept: generate them once and keep them
  const handleGenerateOnce = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programme,
          conditionalAnswers: programme.conditionalAnswers,
          teacherNames: [firstIc?.name, secondIc?.name].filter(Boolean).join(' / '),
        }),
      });
      if (!res.ok) throw new Error('Could not generate the deliverables. Please try again.');
      const data = await res.json();
      await updateProgramme(programme.id, {
        deliverables: deliverablesFromPlannerResponse(data),
        ...(data.pgLetterFields
          ? { pgLetterFields: data.pgLetterFields, pgIncludeTransport: !!data.pgLetterFields.transportation }
          : {}),
      }, currentUser.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleHandoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForHandover || !handoverToUserId) return;
    const toUser = allowlistedUsers.find(u => u.id === handoverToUserId);
    handoverTask(selectedTaskForHandover.id, handoverToUserId, handoverNote, currentUser.id, toUser?.name || 'Teacher');
    setSelectedTaskForHandover(null);
    setHandoverNote('');
  };

  const timeText = programme.startTime && programme.endTime
    ? `${formatTime(programme.startTime)} to ${formatTime(programme.endTime)}`
    : '';

  const summaryRows: [string, React.ReactNode][] = [
    ['Dates', formatSingaporeDateRange(programme.startDate, programme.endDate)],
    ...(timeText ? [['Time', timeText] as [string, React.ReactNode]] : []),
    ['Venue', programme.venue],
    ...(programme.reportingVenue ? [['Reporting', programme.reportingVenue] as [string, React.ReactNode]] : []),
    ...(programme.dismissalVenue ? [['Dismissal', programme.dismissalVenue] as [string, React.ReactNode]] : []),
    ['First IC', firstIc?.name || 'Unassigned'],
    ...(secondIc ? [['Second IC', secondIc.name] as [string, React.ReactNode]] : []),
    ['External venue', answers?.isOffSite ? 'Yes' : 'No, in school'],
    ['Bus booking', answers?.isTransportRequired ? 'Required' : 'No'],
    ['Catering', answers?.areMealsRequired ? 'Required' : 'No'],
  ];

  const renderTask = (t: Task) => {
    const isDone = t.status === 'Completed';
    return (
      <li key={t.id} className="flex items-start gap-3 py-2.5">
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => updateTaskStatus(t.id, isDone ? 'In Progress' : 'Completed', currentUser.id)}
          aria-label={`${isDone ? 'Reopen' : 'Tick off'}: ${t.title}`}
          className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className={`text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-900 font-medium'}`}>{t.title}</div>
          <div className={`text-[11px] ${isDone ? 'text-slate-400' : 'text-slate-500'}`}>
            Due {formatSingaporeDateLong(toIsoDate(t.dueDate))}
          </div>
        </div>
        {!isDone && (
          <button
            type="button"
            onClick={() => setSelectedTaskForHandover(t)}
            className="text-[11px] font-semibold text-slate-500 hover:text-emerald-700 flex items-center gap-1 shrink-0"
          >
            <Send className="w-3 h-3" />
            <span>Hand over</span>
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <button
        onClick={onBack}
        className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Title, objectives and the 7 deliverables */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                programme.status === 'Archived' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {programme.status}
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                {programme.term || 'Term 1'}
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                {programme.type}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{programme.title}</h1>
            {programme.objectives && <p className="text-sm text-slate-600 leading-relaxed">{programme.objectives}</p>}
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Deliverables</h2>
            {deliverables ? (
              <div className="flex flex-wrap gap-2">
                {DELIVERABLES.map(d => {
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.key}
                      onClick={() => openDeliverable(d.key)}
                      className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-900 transition flex items-center gap-1.5"
                    >
                      <Icon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{d.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span>This programme was planned before deliverables were kept with it.</span>
                <button
                  onClick={handleGenerateOnce}
                  disabled={isGenerating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-semibold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{isGenerating ? 'Generating...' : 'Generate the 7 deliverables'}</span>
                </button>
              </div>
            )}
            {error && !openKey && (
              <p className="text-xs text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>
        </div>

        {/* Summary, top-aligned with the title */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-3 text-xs">
          <h2 className="font-bold text-sm text-slate-900">Summary</h2>
          <dl className="divide-y divide-slate-100">
            {summaryRows.map(([label, value]) => (
              <div key={label} className="py-2 flex items-start justify-between gap-3">
                <dt className="text-slate-500 shrink-0">{label}</dt>
                <dd className="font-semibold text-slate-900 text-right">{value}</dd>
              </div>
            ))}
          </dl>
          {(answers?.isTransportRequired || (isChair && programme.status !== 'Archived')) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {answers?.isTransportRequired && (
                <button
                  onClick={() => setShowBusBooking(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg font-semibold transition border border-slate-300 flex items-center gap-1.5"
                >
                  <span>🚌</span>
                  <span>Bus Booking Form</span>
                </button>
              )}
              {isChair && programme.status !== 'Archived' && (
                <button
                  onClick={() => setShowArchiveModal(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg font-semibold transition border border-slate-300 flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5 text-slate-600" />
                  <span>Archive Readiness Check</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task checklist */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-slate-900">Checklist</h2>
          <span className="text-xs text-slate-500">{doneTasks.length} of {prgTasks.length} done</span>
        </div>
        {prgTasks.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">No tasks for this programme yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {openTasks.map(renderTask)}
            {doneTasks.map(renderTask)}
          </ul>
        )}
      </div>

      {/* A deliverable, in a pop-up */}
      {openKey && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={DELIVERABLES.find(d => d.key === openKey)?.label}
        >
          <div className="max-w-[860px] mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
            <div className="sticky top-2 z-10 bg-white rounded-xl border border-slate-200 shadow-md px-3 py-2 flex items-center justify-between gap-2">
              <button
                onClick={closeDeliverable}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go back</span>
              </button>
              <span className="text-sm font-bold text-slate-900 truncate">
                {DELIVERABLES.find(d => d.key === openKey)?.label.replace(/^\d+\.\s*/, '')}
              </span>
              <button
                onClick={handleDownloadWord}
                disabled={isExporting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50 shrink-0"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isExporting ? 'Creating...' : 'Download Word (.docx)'}</span>
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-slate-100 rounded-2xl p-3 sm:p-5 space-y-4">
              {draftPgFields ? (
                <PgLetterEditor
                  fields={draftPgFields}
                  onChange={setDraftPgFields}
                  includeTransport={draftPgTransport}
                  onIncludeTransportChange={setDraftPgTransport}
                />
              ) : (
                <>
                  <p className="text-center text-[11px] text-slate-500">Edits are kept with this programme when you go back.</p>
                  <textarea
                    value={draftText}
                    onChange={e => setDraftText(e.target.value)}
                    rows={24}
                    aria-label="Deliverable text"
                    className="w-full p-5 bg-white border border-slate-300 rounded-sm shadow-lg text-sm text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    style={{ fontFamily: 'Arial, sans-serif' }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Handover Modal */}
      {selectedTaskForHandover && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">Hand Over Task</h3>
            <p className="text-xs text-slate-600">{selectedTaskForHandover.title}</p>

            <form onSubmit={handleHandoverSubmit} className="space-y-4 text-xs">
              <div>
                <label htmlFor="handover-to" className="block font-bold text-slate-700 mb-1">Hand over to</label>
                <select
                  id="handover-to"
                  value={handoverToUserId}
                  onChange={e => setHandoverToUserId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                >
                  <option value="">Select teacher...</option>
                  {allowlistedUsers.filter(u => u.id !== currentUser.id).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="handover-note" className="block font-bold text-slate-700 mb-1">Note</label>
                <textarea
                  id="handover-note"
                  value={handoverNote}
                  onChange={e => setHandoverNote(e.target.value)}
                  placeholder="e.g. Please confirm the bus booking timing."
                  className="w-full p-2 border border-slate-300 rounded-lg h-20"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForHandover(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
                >
                  Hand Over
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BusBookingModal
        isOpen={showBusBooking}
        onClose={() => setShowBusBooking(false)}
        programmeTitle={programme.title}
        startDate={programme.startDate}
        startTime={programme.startTime}
        endTime={programme.endTime}
        venue={programme.venue}
      />

      <ArchiveValidationModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        programmeId={programme.id}
      />
    </div>
  );
};
