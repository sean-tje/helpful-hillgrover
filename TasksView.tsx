import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Task, TaskStatus } from '../types';
import { CheckSquare, CheckCircle2, Clock, AlertTriangle, Send, Filter, User, Check, Undo2 } from 'lucide-react';

interface TasksViewProps {
  onOpenProgramme?: (id: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onOpenProgramme }) => {
  const { currentUser, allowlistedUsers } = useAuth();
  const { tasks, programmes, updateTaskStatus, handoverTask } = useData();

  const [activeFilter, setActiveFilter] = useState<'MyTasks' | 'DueSoon' | 'Overdue' | 'AwaitingMyInput' | 'AllProgrammes'>('MyTasks');
  const [showCompleted, setShowCompleted] = useState(false);
  const [recentAction, setRecentAction] = useState<{ taskId: string; title: string; action: 'completed' | 'reopened' } | null>(null);

  // Handover state
  const [handoverTaskItem, setHandoverTaskItem] = useState<Task | null>(null);
  const [toUserId, setToUserId] = useState('');
  const [handoverNote, setHandoverNote] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const next7DaysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  const handleToggleTask = async (task: Task) => {
    if (task.status === 'Completed') {
      await updateTaskStatus(task.id, 'In Progress', currentUser.id);
      setRecentAction({ taskId: task.id, title: task.title, action: 'reopened' });
    } else {
      await updateTaskStatus(task.id, 'Completed', currentUser.id);
      setRecentAction({ taskId: task.id, title: task.title, action: 'completed' });
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (!showCompleted && t.status === 'Completed') return false;

    if (activeFilter === 'MyTasks') {
      return t.ownerId === currentUser.id;
    }
    if (activeFilter === 'DueSoon') {
      return t.ownerId === currentUser.id && t.dueDate >= todayStr && t.dueDate <= next7DaysStr;
    }
    if (activeFilter === 'Overdue') {
      return t.dueDate < todayStr && t.status !== 'Completed';
    }
    if (activeFilter === 'AwaitingMyInput') {
      return t.ownerId === currentUser.id && t.status === 'Awaiting Input';
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-emerald-600" />
            <span>Tasks & Handover Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Trust-based completion model &bull; Clear task ownership and handover history.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              showCompleted ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{showCompleted ? 'Hide Completed' : 'Show Completed'}</span>
            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {completedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Undo & Feedback Banner */}
      {recentAction && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {recentAction.action === 'completed'
                ? `Task "${recentAction.title}" marked as Completed!`
                : `Task "${recentAction.title}" reopened as In Progress.`}
            </span>
            {!showCompleted && recentAction.action === 'completed' && (
              <button
                type="button"
                onClick={() => setShowCompleted(true)}
                className="text-emerald-700 underline font-semibold cursor-pointer ml-1"
              >
                (View in Completed)
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={async () => {
              const targetTask = tasks.find(t => t.id === recentAction.taskId);
              if (targetTask) {
                await handleToggleTask(targetTask);
              }
            }}
            className="text-emerald-800 font-bold hover:underline flex items-center gap-1 ml-3 shrink-0 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex space-x-2 overflow-x-auto text-xs font-medium">
        {[
          { id: 'MyTasks', label: 'My Tasks' },
          { id: 'DueSoon', label: 'Due Soon (7 Days)' },
          { id: 'Overdue', label: 'Overdue Tasks' },
          { id: 'AwaitingMyInput', label: 'Awaiting My Input' },
          { id: 'AllProgrammes', label: 'All Programme Tasks' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-3.5 py-2 rounded-lg whitespace-nowrap transition ${
              activeFilter === tab.id
                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-2xs">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No tasks match the selected view filter.
          </div>
        ) : (
          filteredTasks.map(t => {
            const prg = programmes.find(p => p.id === t.programmeId);
            const owner = allowlistedUsers.find(u => u.id === t.ownerId);
            const isOverdue = t.dueDate < todayStr && t.status !== 'Completed';

            return (
              <div
                key={t.id}
                className={`p-4 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs ${
                  isOverdue ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{t.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                      t.status === 'Awaiting Input' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  {t.notes && <p className="text-slate-600">{t.notes}</p>}

                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 pt-1">
                    <span>Programme: <strong className="text-slate-700">{prg?.title || 'General'}</strong></span>
                    <span>Owner: <strong className="text-slate-700">{owner?.name || 'Unassigned'}</strong></span>
                    <span>Due: <strong className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>{t.dueDate}</strong></span>
                  </div>

                  {/* Handover History Log */}
                  {t.handovers && t.handovers.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Handover History:</span>
                      {t.handovers.map(h => {
                        const fromUser = allowlistedUsers.find(u => u.id === h.fromUserId);
                        const toUser = allowlistedUsers.find(u => u.id === h.toUserId);
                        return (
                          <div key={h.id} className="italic text-slate-600 mt-0.5">
                            &bull; {fromUser?.name} &rarr; {toUser?.name}: "{h.note}"
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {t.status === 'Completed' ? (
                    <button
                      type="button"
                      onClick={() => handleToggleTask(t)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Click to reopen task"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Completed ✓</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleTask(t)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      title="Mark task completed"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Done</span>
                    </button>
                  )}

                  {t.ownerId === currentUser.id && t.status !== 'Completed' && (
                    <button
                      type="button"
                      onClick={() => setHandoverTaskItem(t)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Request Input</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Handover Dialog */}
      {handoverTaskItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">Request Input / Handover</h3>
            <p className="text-xs text-slate-600">
              "My part is complete - request input". Transfers current ownership while preserving handover history.
            </p>

            <form onSubmit={handleHandoverSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Transfer Ownership To:</label>
                <select
                  value={toUserId}
                  onChange={e => setToUserId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                >
                  <option value="">Select teacher...</option>
                  {allowlistedUsers.filter(u => u.id !== currentUser.id).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Handover Note:</label>
                <textarea
                  value={handoverNote}
                  onChange={e => setHandoverNote(e.target.value)}
                  placeholder="e.g. Please verify bus dispatch timing."
                  className="w-full p-2 border border-slate-300 rounded-lg h-20"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHandoverTaskItem(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
                >
                  Submit Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
