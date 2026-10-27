import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Search, Sparkles, Calendar, Clock, ArrowRight, CheckCircle2, AlertTriangle, FileText, FolderKanban } from 'lucide-react';
import { Task, AISearchRecord } from '../types';
import { formatSingaporeDateRange } from '../utils';

interface DashboardViewProps {
  onOpenProgramme: (programmeId: string) => void;
  onOpenTask: (taskId: string) => void;
  onNavigateToRepository: (query?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenProgramme,
  onOpenTask,
  onNavigateToRepository,
}) => {
  const { currentUser } = useAuth();
  const { programmes, tasks, updateTaskStatus } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<AISearchRecord | null>(null);
  const [calendarTab, setCalendarTab] = useState<'Upcoming' | 'Month' | 'Week'>('Upcoming');

  // Filter programmes for current user
  const myProgrammes = programmes.filter(p => 
    p.firstIcId === currentUser.id ||
    p.secondIcId === currentUser.id ||
    p.supportingTeacherIds.includes(currentUser.id) ||
    currentUser.isChair
  );

  const upcomingEvents = myProgrammes
    .filter(p => p.status !== 'Archived' && p.status !== 'Completed')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  // Tasks assigned to current user
  const myTasks = tasks.filter(t => t.ownerId === currentUser.id && t.status !== 'Completed');

  const todayStr = new Date().toISOString().split('T')[0];
  const next7DaysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const overdueTasks = myTasks.filter(t => t.dueDate < todayStr);
  const dueSoonTasks = myTasks.filter(t => t.dueDate >= todayStr && t.dueDate <= next7DaysStr);
  const awaitingInputTasks = myTasks.filter(t => t.status === 'Awaiting Input');
  const newlyAssignedTasks = myTasks.filter(t => t.status === 'Not Started' && t.dueDate > next7DaysStr);

  const handleRepositorySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResult(null);

    try {
      const res = await fetch('/api/gemini/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      setSearchResult({
        id: `srch_${Date.now()}`,
        userId: currentUser.id,
        query: searchQuery,
        sourceDocumentIds: data.sourceDocumentIds || [],
        answer: data.answer || 'No results found.',
        citations: data.citations || [],
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Search request error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Institutional Memory Layer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            {currentUser.role} &bull; {myProgrammes.length} active programme(s) assigned. Reuse historical precedents, track task handovers, and plan efficiently.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700/60 text-center flex-1 md:flex-initial">
            <div className="text-xl font-bold text-amber-400">{overdueTasks.length}</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Overdue Tasks</div>
          </div>
          <div className="bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700/60 text-center flex-1 md:flex-initial">
            <div className="text-xl font-bold text-emerald-400">{myTasks.length}</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Pending Action</div>
          </div>
        </div>
      </div>

      {/* Prominent AI Repository Search Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <label htmlFor="repo-search" className="block text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>AI Institutional Knowledge & Repository Search</span>
        </label>
        <form onSubmit={handleRepositorySearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              id="repo-search"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Ask a natural question (e.g. "What did we include in previous overnight camp letters?" or search "2025 RAMS")'
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 placeholder-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-3 rounded-xl text-sm transition flex items-center justify-center space-x-2 shadow-2xs disabled:opacity-50"
          >
            {isSearching ? (
              <span>Searching Index...</span>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search Repository</span>
              </>
            )}
          </button>
        </form>

        {/* AI Answer Card */}
        {searchResult && (
          <div className="mt-6 p-5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
              <span className="font-semibold text-sm text-emerald-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                AI Repository Grounded Answer
              </span>
              <button
                onClick={() => onNavigateToRepository(searchQuery)}
                className="text-xs font-medium text-emerald-700 hover:underline flex items-center gap-1"
              >
                Open Full Repository &rarr;
              </button>
            </div>
            <p className="text-sm leading-relaxed text-slate-800">{searchResult.answer}</p>

            {searchResult.citations && searchResult.citations.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-600 mb-2">Grounded Source Citations:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {searchResult.citations.map((cite, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 text-xs shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 truncate">{cite.title}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${
                          cite.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {cite.status}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] line-clamp-2 italic">"{cite.excerpt}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: My Tasks & Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* My Tasks (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>My Tasks & Priorities</span>
                  <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                    {myTasks.length} pending
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Trust-based workflow: Mark completed when done</p>
              </div>
            </div>

            {myTasks.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">All assigned tasks completed!</p>
                <p className="text-xs text-slate-500 mt-1">No pending actions required for your account right now.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Overdue Section */}
                {overdueTasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Overdue Tasks ({overdueTasks.length})</span>
                    </div>
                    {overdueTasks.map(task => (
                      <TaskRow key={task.id} task={task} onOpenTask={onOpenTask} onComplete={(id) => updateTaskStatus(id, 'Completed', currentUser.id)} isOverdue />
                    ))}
                  </div>
                )}

                {/* Awaiting Input Section */}
                {awaitingInputTasks.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Awaiting My Input ({awaitingInputTasks.length})</span>
                    </div>
                    {awaitingInputTasks.map(task => (
                      <TaskRow key={task.id} task={task} onOpenTask={onOpenTask} onComplete={(id) => updateTaskStatus(id, 'Completed', currentUser.id)} />
                    ))}
                  </div>
                )}

                {/* Due Soon Section */}
                {dueSoonTasks.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Due Within 7 Days ({dueSoonTasks.length})
                    </div>
                    {dueSoonTasks.map(task => (
                      <TaskRow key={task.id} task={task} onOpenTask={onOpenTask} onComplete={(id) => updateTaskStatus(id, 'Completed', currentUser.id)} />
                    ))}
                  </div>
                )}

                {/* Newly Assigned Section */}
                {newlyAssignedTasks.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Upcoming Assigned ({newlyAssignedTasks.length})
                    </div>
                    {newlyAssignedTasks.map(task => (
                      <TaskRow key={task.id} task={task} onOpenTask={onOpenTask} onComplete={(id) => updateTaskStatus(id, 'Completed', currentUser.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Calendar Preview Widget */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900">Calendar & Planning Deadlines</h2>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium">
                {(['Upcoming', 'Month', 'Week'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setCalendarTab(tab)}
                    className={`px-3 py-1 rounded-md transition ${
                      calendarTab === tab ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {upcomingEvents.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No upcoming events scheduled.</div>
              ) : (
                upcomingEvents.map(p => (
                  <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>{p.title}</span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                          {p.type}
                        </span>
                      </div>
                      <div className="text-slate-500 mt-0.5 flex items-center gap-3">
                        <span>🗓️ {formatSingaporeDateRange(p.startDate, p.endDate, 'long')}</span>
                        <span>📍 {p.venue}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenProgramme(p.id)}
                      className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                    >
                      Workspace &rarr;
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Programmes & Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-emerald-600" />
              <span>Assigned Programmes</span>
            </h2>

            {upcomingEvents.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No active programmes assigned to your account.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(p => {
                  const pTasks = tasks.filter(t => t.programmeId === p.id);
                  const completedCount = pTasks.filter(t => t.status === 'Completed').length;

                  return (
                    <div
                      key={p.id}
                      onClick={() => onOpenProgramme(p.id)}
                      className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition cursor-pointer bg-slate-50/50 space-y-2 group"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">
                          {p.title}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.status === 'Planning' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {p.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <div>📅 {formatSingaporeDateRange(p.startDate, p.endDate, 'long')} &bull; {p.venue}</div>
                        <div className="text-[11px] text-slate-500">
                          IC Role: {p.firstIcId === currentUser.id ? '1st IC' : p.secondIcId === currentUser.id ? '2nd IC' : 'Supporting Staff'}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700 font-medium">
                        <span>{completedCount} of {pTasks.length} tasks complete</span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TaskRowProps {
  task: Task;
  onOpenTask: (id: string) => void;
  onComplete: (id: string) => void;
  isOverdue?: boolean;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, onOpenTask, onComplete, isOverdue }) => {
  return (
    <div
      className={`p-3 rounded-xl border transition flex items-center justify-between text-xs gap-3 ${
        isOverdue
          ? 'bg-rose-50/60 border-rose-200'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
      }`}
    >
      <div className="flex items-start space-x-3 flex-1 min-w-0">
        <button
          onClick={() => onComplete(task.id)}
          className="mt-0.5 text-slate-300 hover:text-emerald-600 transition"
          title="Mark complete (Trust-based)"
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-900 truncate cursor-pointer hover:text-emerald-700" onClick={() => onOpenTask(task.id)}>
            {task.title}
          </div>
          <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
            <span>Due: {task.dueDate}</span>
            {task.status === 'Awaiting Input' && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                Awaiting Input
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => onOpenTask(task.id)}
        className="text-slate-400 hover:text-slate-700 p-1 font-medium"
      >
        Details
      </button>
    </div>
  );
};
