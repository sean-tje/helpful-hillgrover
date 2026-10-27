import React, { useState } from 'react';
import { Programme, Task } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, Sparkles, MessageSquareQuote, FileText, X } from 'lucide-react';
import { formatSingaporeDateRange } from '../utils';

interface ProgrammeReflectionModalProps {
  programme: Programme;
  isOpen: boolean;
  onClose: () => void;
}

export const ProgrammeReflectionModal: React.FC<ProgrammeReflectionModalProps> = ({
  programme,
  isOpen,
  onClose,
}) => {
  const { tasks, submitProgrammeReflection, updateTaskStatus } = useData();
  const { currentUser } = useAuth();

  const progTasks = tasks.filter(t => t.programmeId === programme.id);
  const incompleteTasks = progTasks.filter(t => t.status !== 'Completed');

  const [whatWorked, setWhatWorked] = useState(programme.reflection?.whatWorked || '');
  const [challenges, setChallenges] = useState(programme.reflection?.challenges || '');
  const [suggestions, setSuggestions] = useState(programme.reflection?.suggestions || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (incompleteTasks.length > 0) {
      setErrorMsg(
        `Cannot mark completed yet: ${incompleteTasks.length} milestone task(s) are still pending. Complete all tasks first.`
      );
      return;
    }

    if (!whatWorked.trim() || !suggestions.trim()) {
      setErrorMsg('Please fill in both what worked and suggestions for next year to preserve committee memory.');
      return;
    }

    setIsSubmitting(true);
    const res = await submitProgrammeReflection(
      programme.id,
      {
        whatWorked,
        challenges,
        suggestions,
      },
      currentUser.id
    );

    setIsSubmitting(false);

    if (!res.success && res.errors) {
      setErrorMsg(res.errors.join('. '));
    } else {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Programme Handover & Reflection</h4>
              <p className="text-[11px] text-slate-400">Institutional Memory for Incoming Committee</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div className="font-bold text-slate-900">{programme.title}</div>
            <div className="text-slate-500 mt-0.5">
              Term: {programme.term} &bull; {formatSingaporeDateRange(programme.startDate, programme.endDate, 'long')}
            </div>
          </div>

          {/* Task Status Check */}
          {incompleteTasks.length > 0 ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <strong className="text-rose-900">Incomplete Tasks Detected ({incompleteTasks.length}):</strong>
                  <button
                    type="button"
                    onClick={async () => {
                      for (const t of incompleteTasks) {
                        await updateTaskStatus(t.id, 'Completed', currentUser.id);
                      }
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Mark All as Done</span>
                  </button>
                </div>
                <p className="mt-1 text-rose-700 text-[11px]">
                  To preserve committee accountability, all milestone tasks must be completed before filing final sign-off.
                </p>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
                  {incompleteTasks.map(t => (
                    <div key={t.id} className="flex items-center justify-between text-[11px] bg-white/70 p-1.5 rounded border border-rose-100">
                      <span className="truncate pr-2">{t.title}</span>
                      <button
                        type="button"
                        onClick={() => updateTaskStatus(t.id, 'Completed', currentUser.id)}
                        className="text-emerald-700 hover:text-emerald-800 font-bold shrink-0 underline"
                      >
                        Mark Done
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All {progTasks.length} milestone tasks have been successfully completed!</span>
            </div>
          )}

          {/* Prompt 1 */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              1. What worked well? <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={whatWorked}
              onChange={e => setWhatWorked(e.target.value)}
              placeholder="E.g. Student councillors executed briefing cleanly; venue logistics setup completed 30 mins before start..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Prompt 2 */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              2. What 'broke'? <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={challenges}
              onChange={e => setChallenges(e.target.value)}
              placeholder="E.g. Wet weather contingency needed earlier; sound system in hall had static; bus departed 15 mins late..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Prompt 3 */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              3. What can we do next year? <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={suggestions}
              onChange={e => setSuggestions(e.target.value)}
              placeholder="E.g. Book bus 3 weeks early; brief emcees with updated script format; station 2 teachers at the foyer..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Programme marked completed and reflection archived to Repository!</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Auto-saves to Precedents Repository
            </span>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || incompleteTasks.length > 0}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition disabled:opacity-40"
              >
                {isSubmitting ? 'Archiving...' : 'Submit Reflection & Complete'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
