import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Task, TaskStatus } from '../types';
import { getTeacherInitial, formatSingaporeDate, formatSingaporeDateRange } from '../utils';
import {
  CheckSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Calendar as CalendarIcon,
  FolderKanban,
  MapPin,
  ArrowRight,
  User,
  Users
} from 'lucide-react';

interface ActionsTimelineViewProps {
  onOpenProgramme: (id: string) => void;
}

export const ActionsTimelineView: React.FC<ActionsTimelineViewProps> = ({ onOpenProgramme }) => {
  const { currentUser, allowlistedUsers } = useAuth();
  const { tasks, programmes, updateTaskStatus, handoverTask } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'checklist' | 'timeline'>('checklist');
  const [activeFilter, setActiveFilter] = useState<'MyTasks' | 'DueSoon' | 'Overdue' | 'AwaitingMyInput' | 'AllProgrammes'>('MyTasks');
  const [showCompleted, setShowCompleted] = useState(false);
  const [timelineTerm, setTimelineTerm] = useState<string>('All');

  // Handover state
  const [handoverTaskItem, setHandoverTaskItem] = useState<Task | null>(null);
  const [toUserId, setToUserId] = useState('');
  const [handoverNote, setHandoverNote] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const next7DaysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const filteredTasks = tasks.filter(t => {
    if (!showCompleted && t.status === 'Completed') return false;

    if (activeFilter === 'MyTasks') {
      return t.ownerId === currentUser.id || t.assignedTo === currentUser.id;
    }
    if (activeFilter === 'DueSoon') {
      return (t.ownerId === currentUser.id || t.assignedTo === currentUser.id) && t.dueDate >= todayStr && t.dueDate <= next7DaysStr;
    }
    if (activeFilter === 'Overdue') {
      return t.dueDate < todayStr && t.status !== 'Completed';
    }
    if (activeFilter === 'AwaitingMyInput') {
      return (t.ownerId === currentUser.id || t.assignedTo === currentUser.id) && t.status === 'Awaiting Input';
    }
    return true; // AllProgrammes
  });

  const handleHandoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverTaskItem || !toUserId) return;
    const targetUser = allowlistedUsers.find(u => u.id === toUserId);
    handoverTask(handoverTaskItem.id, toUserId, handoverNote, currentUser.id, targetUser?.name || 'Teacher');
    setHandoverTaskItem(null);
    setHandoverNote('');
    setToUserId('');
  };

  // Timeline events sorted
  const sortedTimelineProgrammes = [...programmes]
    .filter(p => timelineTerm === 'All' || p.term === timelineTerm)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-emerald-600" />
            <span>My Action Items & Timeline</span>
          </h1>
        </div>

        {/* View Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('checklist')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeSubTab === 'checklist' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Action Checklist</span>
          </button>
          <button
            onClick={() => setActiveSubTab('timeline')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
              activeSubTab === 'timeline' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>Schedule & Timeline</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: ACTION CHECKLIST */}
      {activeSubTab === 'checklist' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex space-x-1 overflow-x-auto">
              {[
                { id: 'MyTasks', label: 'My Items' },
                { id: 'DueSoon', label: 'Due in 7 Days' },
                { id: 'Overdue', label: 'Overdue' },
                { id: 'AwaitingMyInput', label: 'Awaiting Input' },
                { id: 'AllProgrammes', label: 'All Tasks' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium ${
                    activeFilter === tab.id
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-slate-500 hover:text-slate-800 font-medium whitespace-nowrap text-right"
            >
              {showCompleted ? 'Hide completed' : 'Show completed'}
            </button>
          </div>

          {/* Checklist Items */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-2xs">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No tasks in this view!</p>
                <p className="text-slate-400 mt-0.5">Everything is on track or completed.</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const prg = programmes.find(p => p.id === task.programmeId);
                const isOverdue = task.dueDate < todayStr && task.status !== 'Completed';

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs ${
                      isOverdue ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateTaskStatus(task.id, task.status === 'Completed' ? 'In Progress' : 'Completed', currentUser.id)}
                          className="text-slate-400 hover:text-emerald-600 transition shrink-0"
                          title="Click to toggle status"
                        >
                          <CheckCircle2 className={`w-5 h-5 ${task.status === 'Completed' ? 'text-emerald-600 fill-emerald-100' : ''}`} />
                        </button>
                        <span className={`font-semibold text-sm ${task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {task.title}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                          task.status === 'Awaiting Input' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {task.status}
                        </span>
                      </div>

                      {/* Line 2: Programme on its own separate line */}
                      {prg && (
                        <div className="ml-7">
                          <span
                            onClick={() => onOpenProgramme(prg.id)}
                            className="text-emerald-700 font-semibold hover:text-emerald-900 hover:underline cursor-pointer"
                          >
                            📌 {prg.title} ({prg.term || 'Term 1'})
                          </span>
                        </div>
                      )}

                      {/* Line 3: Singapore formatted due date with term/week */}
                      <div className="text-slate-500 text-[11px] flex items-center gap-3 ml-7">
                        <span>Due: <strong className={isOverdue ? 'text-rose-600' : 'text-slate-700'}>{formatSingaporeDate(task.dueDate)}</strong></span>
                      </div>

                      {task.handoverHistory && task.handoverHistory.length > 0 && (
                        <div className="text-[11px] text-slate-400 ml-7 italic">
                          Latest Handover: {task.handoverHistory[task.handoverHistory.length - 1].note}
                        </div>
                      )}
                    </div>

                    {/* Actions on right */}
                    <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => setHandoverTaskItem(task)}
                        className="px-2.5 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-medium transition"
                        title="Handover to team member"
                      >
                        Handover
                      </button>

                      {prg && (
                        <button
                          onClick={() => onOpenProgramme(prg.id)}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: MASTER TIMELINE & SCHEDULE */}
      {activeSubTab === 'timeline' && (
        <div className="space-y-4">
          {/* Term selector */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-slate-600 mr-1">Filter by Academic Term:</span>
              {['All', 'Term 1', 'Term 2', 'Term 3', 'Term 4'].map(t => (
                <button
                  key={t}
                  onClick={() => setTimelineTerm(t)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    timelineTerm === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <span className="text-slate-400">{sortedTimelineProgrammes.length} events scheduled</span>
          </div>

          {/* Chronological Timeline Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="divide-y divide-slate-100">
              {sortedTimelineProgrammes.map(prog => {
                const progTasks = tasks.filter(t => t.programmeId === prog.id);
                const completedTasks = progTasks.filter(t => t.status === 'Completed').length;
                const firstIc = allowlistedUsers.find(u => u.id === prog.firstIcId);

                return (
                  <div key={prog.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{prog.title}</span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {prog.term || 'Term 1'}
                        </span>
                        {prog.isAllHands && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            All-Hands
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 flex items-center gap-3 flex-wrap">
                        <span>🗓️ {formatSingaporeDateRange(prog.startDate, prog.endDate)}</span>
                        <span>📍 {prog.venue}</span>
                        {firstIc && <span>Lead: {firstIc.name}</span>}
                        <span>Progress: {completedTasks}/{progTasks.length} tasks done</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenProgramme(prog.id)}
                      className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 self-start md:self-auto hover:underline"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Handover Modal */}
      {handoverTaskItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                Handover Task Ownership
              </h4>
              <button onClick={() => setHandoverTaskItem(null)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            <form onSubmit={handleHandoverSubmit} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-900">{handoverTaskItem.title}</div>
                <div className="text-slate-500 mt-0.5">Due: {formatSingaporeDate(handoverTaskItem.dueDate)}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Handover To Committee Member:</label>
                <select
                  required
                  value={toUserId}
                  onChange={e => setToUserId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select teacher...</option>
                  {allowlistedUsers
                    .filter(u => u.id !== currentUser.id)
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Handover Context / Status Note:</label>
                <textarea
                  required
                  rows={3}
                  value={handoverNote}
                  onChange={e => setHandoverNote(e.target.value)}
                  placeholder="Explain current progress, next action item, and any key links or vendors contacted..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setHandoverTaskItem(null)}
                  className="px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs"
                >
                  Confirm Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
