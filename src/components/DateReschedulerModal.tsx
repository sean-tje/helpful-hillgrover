import React, { useState } from 'react';
import { Programme } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, X, CheckCircle, AlertCircle } from 'lucide-react';
import { formatSingaporeDateRange } from '../utils';

interface DateReschedulerModalProps {
  programme: Programme;
  isOpen: boolean;
  onClose: () => void;
}

export const DateReschedulerModal: React.FC<DateReschedulerModalProps> = ({
  programme,
  isOpen,
  onClose,
}) => {
  const { updateProgramme } = useData();
  const { currentUser } = useAuth();

  const [startDate, setStartDate] = useState(programme.startDate);
  const [endDate, setEndDate] = useState(programme.endDate);
  const [term, setTerm] = useState(programme.term || 'Term 1');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateProgramme(
        programme.id,
        {
          startDate,
          endDate,
          term,
        },
        currentUser.id
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsSaving(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="font-semibold text-sm">Reschedule Programme & Term</h4>
              <p className="text-[11px] text-slate-400">Shift calendar window & institutional planning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div className="font-bold text-slate-900">{programme.title}</div>
            <div className="text-slate-500 mt-0.5">
              Current: {programme.term || 'Unassigned'} &bull; {formatSingaporeDateRange(programme.startDate, programme.endDate, 'long')}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Academic Term Assignment
            </label>
            <select
              value={term}
              onChange={e => setTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="Term 1">Term 1 (Jan - Mar)</option>
              <option value="Term 2">Term 2 (Mar - May)</option>
              <option value="Term 3">Term 3 (Jun - Aug)</option>
              <option value="Term 4">Term 4 (Sep - Nov)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {success && (
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Programme dates updated in timeline and calendar!</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition disabled:opacity-50"
            >
              {isSaving ? 'Updating...' : 'Save New Dates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
