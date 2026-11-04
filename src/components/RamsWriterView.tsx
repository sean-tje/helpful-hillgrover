import React, { useEffect, useState } from 'react';
import { ShieldCheck, Sparkles, Download, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { VenueInput } from './VenueInput';

// RAMS Writer on the cover page. It drafts with the same server RAMS writer as deliverable 1
// of the programme planner (/api/gemini/rams), so there is only one RAMS writer.

const PROGRAMME_TYPES = ['Camp', 'Investiture', 'Exchange', 'Learning Journey', 'Training, Workshops & Meetings', 'School Event'];

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300';

export const RamsWriterView: React.FC = () => {
  const [details, setDetails] = useState({
    title: '',
    type: PROGRAMME_TYPES[0],
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    activities: '',
  });
  const setDetail = (key: keyof typeof details, value: string) => setDetails(prev => ({ ...prev, [key]: value }));
  const [venue, setVenue] = useState('');
  const [isOffSite, setIsOffSite] = useState(false);
  const [transportRequired, setTransportRequired] = useState(false);
  const [strenuous, setStrenuous] = useState(false);
  const [notes, setNotes] = useState('');

  const [isDrafting, setIsDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rams, setRams] = useState('');
  const [showRams, setShowRams] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Escape closes the pop-up; the page behind it does not scroll
  useEffect(() => {
    if (!showRams) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowRams(false);
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [showRams]);

  const canDraft = details.title.trim().length > 0;

  const handleDraft = async () => {
    setIsDrafting(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/rams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...details,
          endDate: details.endDate || details.startDate,
          venue,
          isOffSite,
          transportRequired: isOffSite && transportRequired,
          strenuous,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ramsDocument) throw new Error('Could not draft the RAMS. Please try again.');
      setRams(data.ramsDocument);
      if (!data.isAiGenerated) setError('AI is not available right now, so the standard RAMS template was used.');
      setShowRams(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleDownloadWord = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `${details.title || 'Programme'} - RAMS`, content: rams }),
      });
      if (!response.ok) throw new Error('Could not create the Word document.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RAMS_${(details.title || 'Programme').replace(/[^A-Za-z0-9]+/g, '_')}.docx`;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Hillgrove Official Communication Suite</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">RAMS Writer</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Drafts a Risk Assessment and Management System (RAMS) for a programme. Fill in the details and draft it with AI. The RAMS opens over this page: edit it there, then download the Word document.
        </p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Programme details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="space-y-1">
            <span className="block font-semibold text-slate-700">Programme name</span>
            <input value={details.title} onChange={e => setDetail('title', e.target.value)} placeholder="e.g. Secondary 2 Cohort Camp 2027" className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="block font-semibold text-slate-700">Programme type</span>
            <select value={details.type} onChange={e => setDetail('type', e.target.value)} className={inputClass}>
              {PROGRAMME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {([
            ['startDate', 'Start date', 'date'],
            ['endDate', 'End date', 'date'],
            ['startTime', 'Start time', 'time'],
            ['endTime', 'End time', 'time'],
          ] as const).map(([key, label, type]) => (
            <label key={key} className="space-y-1">
              <span className="block font-semibold text-slate-700">{label}</span>
              <input type={type} value={details[key]} onChange={e => setDetail(key, e.target.value)} className={inputClass} />
            </label>
          ))}
          <div className="sm:col-span-2 space-y-1">
            <span className="block font-semibold text-slate-700">Venue</span>
            <VenueInput value={venue} onChange={setVenue} />
          </div>
          <label className="sm:col-span-2 space-y-1">
            <span className="block font-semibold text-slate-700">Key activities</span>
            <input value={details.activities} onChange={e => setDetail('activities', e.target.value)} placeholder="e.g. Kayaking, high elements, night walk" className={inputClass} />
          </label>
          <div className="sm:col-span-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isOffSite}
                onChange={e => {
                  setIsOffSite(e.target.checked);
                  if (!e.target.checked) setTransportRequired(false);
                }}
              />
              <span>External venue</span>
            </label>
            {isOffSite && (
              <label className="flex items-center gap-2 font-semibold text-slate-700">
                <input type="checkbox" checked={transportRequired} onChange={e => setTransportRequired(e.target.checked)} />
                <span>Bus transport</span>
              </label>
            )}
            <label className="flex items-center gap-2 font-semibold text-slate-700">
              <input type="checkbox" checked={strenuous} onChange={e => setStrenuous(e.target.checked)} />
              <span>Strenuous physical activities</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        <div className="md:col-span-10 space-y-2">
          <label htmlFor="rams-notes" className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Notes for the AI (optional)</label>
          <textarea
            id="rams-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            placeholder="e.g. Two students with severe nut allergies. Activities near open water."
          />
        </div>
        <div className="md:col-span-2 flex flex-col gap-2 md:pt-6">
          <button
            onClick={handleDraft}
            disabled={isDrafting || !canDraft}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            {isDrafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isDrafting ? 'Drafting...' : 'Draft with AI'}</span>
          </button>
        </div>
      </div>

      {error && !showRams && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {showRams && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs overflow-y-auto" role="dialog" aria-modal="true" aria-label="Drafted RAMS">
          <div className="max-w-[860px] mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
            <div className="sticky top-2 z-10 bg-white rounded-xl border border-slate-200 shadow-md px-3 py-2 flex items-center justify-between gap-2">
              <button
                onClick={() => setShowRams(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go back</span>
              </button>
              <button
                onClick={handleDownloadWord}
                disabled={isExporting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isExporting ? 'Creating Word file...' : 'Download Word (.docx)'}</span>
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-slate-100 rounded-2xl p-3 sm:p-5 space-y-3">
              <p className="text-center text-[11px] text-slate-500">Check every hazard and control measure, then edit as needed before downloading.</p>
              <textarea
                value={rams}
                onChange={e => setRams(e.target.value)}
                rows={28}
                aria-label="RAMS text"
                className="w-full p-5 bg-white border border-slate-300 rounded-sm shadow-lg text-sm text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-400"
                style={{ fontFamily: 'Arial, sans-serif' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
