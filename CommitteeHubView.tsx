import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Programme, Task } from '../types';
import { getTeacherInitial, formatSingaporeDateRange } from '../utils';
import { SteppedMilestoneBar } from './SteppedMilestoneBar';
import { OICWorkloadRadar } from './OICWorkloadRadar';
import { DateReschedulerModal } from './DateReschedulerModal';
import { ProgrammeReflectionModal } from './ProgrammeReflectionModal';
import { CreateProgrammeModal } from './CreateProgrammeModal';
import {
  FolderKanban,
  UserCheck,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  Filter,
  CheckCircle2,
  CalendarDays,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  MapPin,
  Users
} from 'lucide-react';

interface CommitteeHubViewProps {
  onOpenProgramme: (id: string) => void;
  onNavigateToActions: () => void;
}

export const CommitteeHubView: React.FC<CommitteeHubViewProps> = ({
  onOpenProgramme,
  onNavigateToActions,
}) => {
  const { currentUser, allowlistedUsers, isChair } = useAuth();
  const { programmes, tasks } = useData();

  // View Lens Toggle: 'my' (My Involvements) vs 'all' (All 13 Programmes)
  const [activeLens, setActiveLens] = useState<'my' | 'all'>('my');
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('All');
  const [showLaterTerms, setShowLaterTerms] = useState(false);

  // Modals state
  const [rescheduleProgramme, setRescheduleProgramme] = useState<Programme | null>(null);
  const [reflectionProgramme, setReflectionProgramme] = useState<Programme | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Helper to determine user's role in a programme
  const getUserRoleInProgramme = (p: Programme) => {
    if (p.firstIcId === currentUser.id) return { label: '1st IC (Lead)', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    if (p.secondIcId === currentUser.id) return { label: '2nd IC', color: 'bg-blue-100 text-blue-900 border-blue-300' };
    if (p.thirdIcId === currentUser.id) return { label: '3rd IC', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
    if (p.isAllHands) return { label: 'All-Hands Helper', color: 'bg-purple-100 text-purple-900 border-purple-300' };
    if (p.supportingTeacherIds?.includes(currentUser.id)) return { label: 'Supporting Teacher', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    return null;
  };

  // Filter programmes for Current User
  const myProgrammes = programmes.filter(p => {
    return (
      p.firstIcId === currentUser.id ||
      p.secondIcId === currentUser.id ||
      p.thirdIcId === currentUser.id ||
      p.isAllHands ||
      (p.supportingTeacherIds && p.supportingTeacherIds.includes(currentUser.id))
    );
  });

  // Sort chronological
  const sortedMyProgrammes = [...myProgrammes].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  // Split into: Active Current/Next (Terms 1 & 2 or first 2 uncompleted) vs Later (Terms 3 & 4)
  const activeUnfinishedMyProgrammes = sortedMyProgrammes.filter(p => p.status !== 'Completed' && p.status !== 'Archived');
  
  // High priority: First 2 active programmes for immediate focus
  const currentAndNextProgrammes = activeUnfinishedMyProgrammes.slice(0, 2);
  const laterProgrammes = activeUnfinishedMyProgrammes.slice(2);
  const completedProgrammes = sortedMyProgrammes.filter(p => p.status === 'Completed');

  // Filter for 'all' programmes tab
  const filteredAllProgrammes = programmes.filter(p => {
    if (selectedTermFilter !== 'All' && p.term !== selectedTermFilter) return false;
    return true;
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  // Personal task metrics
  const myTasks = tasks.filter(t => t.assignedTo === currentUser.id || t.ownerId === currentUser.id);
  const pendingMyTasks = myTasks.filter(t => t.status !== 'Completed');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Welcome / Staff Header (No Fluff) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-lg flex items-center justify-center shadow-xs">
            {getTeacherInitial(currentUser.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {currentUser.name}
              </h1>
              {isChair && (
                <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-amber-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  Overall-in-Charge (OIC)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {myProgrammes.length} assigned programme(s) in 2027 calendar
            </p>
          </div>
        </div>

        {/* Quick action bar */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onNavigateToActions}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition flex items-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>My Action Items ({pendingMyTasks.length})</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Programme</span>
          </button>
        </div>
      </div>

      {/* OIC-Only Peak Period Detection & Workload Tracker (Visible ONLY to Mr Johann / Committee Chair) */}
      <OICWorkloadRadar />

      {/* Primary Lens Switcher: "My Involvements" vs "All Events" */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Toggle Pills */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold max-w-fit">
          <button
            onClick={() => setActiveLens('my')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
              activeLens === 'my'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>My Involvements Lens</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-bold">
              {myProgrammes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveLens('all')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
              activeLens === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-4 h-4 text-slate-600" />
            <span>All 13 Programmes</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded font-bold">
              {programmes.length}
            </span>
          </button>
        </div>

        {/* Term filter if in "all" mode */}
        {activeLens === 'all' && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-semibold text-slate-600">Filter by Term:</span>
            <div className="flex space-x-1">
              {['All', 'Term 1', 'Term 2', 'Term 3', 'Term 4'].map(term => (
                <button
                  key={term}
                  onClick={() => setSelectedTermFilter(term)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    selectedTermFilter === term
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* LENS 1: MY INVOLVEMENTS (CENTER STAGE) */}
      {activeLens === 'my' && (
        <div className="space-y-6">
          {/* Section 1: Current & Next Active Programmes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Current & Next Active Programmes
                </h2>
              </div>
            </div>

            {currentAndNextProgrammes.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">No immediate active programmes pending.</p>
                <p className="text-xs text-slate-500 mt-1">All current priority programmes are completed or scheduled in later terms.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {currentAndNextProgrammes.map(prog => {
                  const role = getUserRoleInProgramme(prog);
                  const progTasks = tasks.filter(t => t.programmeId === prog.id);
                  const completedTasksCount = progTasks.filter(t => t.status === 'Completed').length;
                  const allTasksDone = progTasks.length > 0 && completedTasksCount === progTasks.length;

                  // Find teacher names for ICs
                  const firstIc = allowlistedUsers.find(u => u.id === prog.firstIcId);
                  const secondIc = allowlistedUsers.find(u => u.id === prog.secondIcId);
                  const thirdIc = allowlistedUsers.find(u => u.id === prog.thirdIcId);

                  return (
                    <div
                      key={prog.id}
                      className="bg-white rounded-2xl border-2 border-emerald-600/30 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 relative overflow-hidden"
                    >
                      {/* Term indicator ribbon */}
                      <div className="absolute top-0 right-0 bg-emerald-700 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider">
                        {prog.term || 'Term 1'}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2 pr-20">
                          <h3
                            onClick={() => onOpenProgramme(prog.id)}
                            className="font-bold text-lg text-slate-900 hover:text-emerald-700 cursor-pointer leading-tight transition"
                          >
                            {prog.title}
                          </h3>
                        </div>

                        {/* Badges: Role */}
                        <div className="flex flex-wrap items-center gap-2">
                          {role && (
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${role.color}`}>
                              Your Role: {role.label}
                            </span>
                          )}
                          {prog.isAllHands && (
                            <span className="bg-purple-50 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                              * All-Hands-On-Deck
                            </span>
                          )}
                        </div>

                        {/* Dates & Location */}
                        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-medium text-slate-900">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {formatSingaporeDateRange(prog.startDate, prog.endDate)}
                            </span>
                            <span className="text-slate-500 font-semibold">{prog.term}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{prog.venue}</span>
                          </div>
                          {/* Teacher team */}
                          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 flex items-center gap-1 flex-wrap">
                            <span className="font-semibold text-slate-700">Team:</span>
                            {firstIc && <span>1st: {firstIc.name}</span>}
                            {secondIc && <span>&bull; 2nd: {secondIc.name}</span>}
                            {thirdIc && <span>&bull; 3rd: {thirdIc.name}</span>}
                          </div>
                        </div>

                        {/* Stepped Milestone Progress Bar with Node Dots */}
                        <div className="pt-1">
                          <SteppedMilestoneBar
                            tasks={progTasks}
                            onTaskClick={() => onOpenProgramme(prog.id)}
                          />
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2">
                          {/* Reschedule Dates button */}
                          <button
                            type="button"
                            onClick={() => setRescheduleProgramme(prog)}
                            className="text-slate-600 hover:text-slate-900 font-medium py-1 px-2.5 rounded-md hover:bg-slate-100 transition flex items-center gap-1 border border-slate-200"
                          >
                            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                            <span>Reschedule</span>
                          </button>

                          {/* Complete & Reflect Button */}
                          <button
                            type="button"
                            onClick={() => setReflectionProgramme(prog)}
                            className={`font-semibold py-1 px-2.5 rounded-md transition flex items-center gap-1 border ${
                              allTasksDone
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Complete & Reflect</span>
                          </button>
                        </div>

                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => onOpenProgramme(prog.id)}
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 hover:underline ml-auto"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Later Terms (Expandable Collapsible Drawer) */}
          {laterProgrammes.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <button
                type="button"
                onClick={() => setShowLaterTerms(!showLaterTerms)}
                className="w-full flex items-center justify-between text-left group"
              >
                <div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 flex items-center gap-2">
                    <span>Upcoming Later Programmes (Terms 3 & 4)</span>
                    <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                      {laterProgrammes.length} events
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click to {showLaterTerms ? 'collapse' : 'view'} events occurring later in the academic year
                  </p>
                </div>

                <div className="p-1 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-200">
                  {showLaterTerms ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showLaterTerms && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {laterProgrammes.map(prog => {
                    const role = getUserRoleInProgramme(prog);
                    const progTasks = tasks.filter(t => t.programmeId === prog.id);

                    return (
                      <div
                        key={prog.id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50/50 hover:bg-white transition space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <h4
                            onClick={() => onOpenProgramme(prog.id)}
                            className="font-bold text-sm text-slate-900 hover:text-emerald-700 cursor-pointer"
                          >
                            {prog.title}
                          </h4>
                          <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                            {prog.term}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 flex items-center justify-between">
                          <span>🗓️ {formatSingaporeDateRange(prog.startDate, prog.endDate)}</span>
                          {role && <span className="font-semibold text-slate-800">{role.label}</span>}
                        </div>

                        <SteppedMilestoneBar tasks={progTasks} compact onTaskClick={() => onOpenProgramme(prog.id)} />

                        <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-200/60">
                          <button
                            onClick={() => setRescheduleProgramme(prog)}
                            className="text-slate-600 hover:text-slate-900 text-[11px] underline"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => onOpenProgramme(prog.id)}
                            className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                          >
                            View Details &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Completed Programmes Summary */}
          {completedProgrammes.length > 0 && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Completed Programmes & Institutional Memory ({completedProgrammes.length})</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {completedProgrammes.map(cp => (
                  <div
                    key={cp.id}
                    onClick={() => onOpenProgramme(cp.id)}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 cursor-pointer text-xs space-y-1.5 transition"
                  >
                    <div className="font-semibold text-slate-900">{cp.title}</div>
                    <div className="text-slate-500 text-[11px]">
                      {cp.term} &bull; {cp.startDate}
                    </div>
                    {cp.reflection && (
                      <div className="text-[10px] text-emerald-700 font-medium bg-emerald-50 p-1.5 rounded border border-emerald-200 line-clamp-1">
                        AAR Reflection: "{cp.reflection.whatWorked}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LENS 2: ALL 13 PROGRAMMES (ORGANIZED BY ACADEMIC TERM) */}
      {activeLens === 'all' && (
        <div className="space-y-8">
          {(['Term 1', 'Term 2', 'Term 3', 'Term 4'] as const).map(term => {
            const termProgrammes = filteredAllProgrammes.filter(p => p.term === term);
            if (termProgrammes.length === 0) return null;

            return (
              <div key={term} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <h3 className="font-bold text-sm text-slate-900 tracking-wide uppercase">{term}</h3>
                    <span className="text-xs text-slate-500 font-medium">({termProgrammes.length} programmes)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {termProgrammes.map(prog => {
                    const role = getUserRoleInProgramme(prog);
                    const progTasks = tasks.filter(t => t.programmeId === prog.id);

                    const firstIc = allowlistedUsers.find(u => u.id === prog.firstIcId);
                    const secondIc = allowlistedUsers.find(u => u.id === prog.secondIcId);
                    const thirdIc = allowlistedUsers.find(u => u.id === prog.thirdIcId);

                    return (
                      <div
                        key={prog.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md hover:border-emerald-500 transition flex flex-col justify-between space-y-4 group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              onClick={() => onOpenProgramme(prog.id)}
                              className="font-bold text-base text-slate-900 group-hover:text-emerald-700 cursor-pointer leading-snug"
                            >
                              {prog.title}
                            </h4>
                            {prog.isAllHands && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap bg-purple-50 text-purple-800 border border-purple-200">
                                All-Hands
                              </span>
                            )}
                          </div>

                          {/* IC Team Roster */}
                          <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between text-slate-700 font-medium">
                              <span>🗓️ {formatSingaporeDateRange(prog.startDate, prog.endDate)}</span>
                            </div>
                            <div className="text-slate-600">📍 {prog.venue}</div>
                            <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60 flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-700">ICs:</span>
                              {firstIc && <span className="font-medium text-slate-800">1st: {firstIc.name}</span>}
                              {secondIc && <span>&bull; 2nd: {secondIc.name}</span>}
                              {thirdIc && <span>&bull; 3rd: {thirdIc.name}</span>}
                            </div>
                          </div>

                          {/* Stepped Milestone Progress Bar */}
                          <SteppedMilestoneBar tasks={progTasks} onTaskClick={() => onOpenProgramme(prog.id)} />
                        </div>

                        {/* Card footer */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => setRescheduleProgramme(prog)}
                              className="text-slate-500 hover:text-slate-800 text-[11px] underline"
                            >
                              Reschedule
                            </button>
                            {prog.status !== 'Completed' && (
                              <button
                                type="button"
                                onClick={() => setReflectionProgramme(prog)}
                                className="text-emerald-700 hover:text-emerald-900 text-[11px] font-semibold"
                              >
                                Complete
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => onOpenProgramme(prog.id)}
                            className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                          >
                            <span>View Details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule Dates Modal */}
      {rescheduleProgramme && (
        <DateReschedulerModal
          programme={rescheduleProgramme}
          isOpen={!!rescheduleProgramme}
          onClose={() => setRescheduleProgramme(null)}
        />
      )}

      {/* Reflection & Completion Modal */}
      {reflectionProgramme && (
        <ProgrammeReflectionModal
          programme={reflectionProgramme}
          isOpen={!!reflectionProgramme}
          onClose={() => setReflectionProgramme(null)}
        />
      )}

      {/* Create Programme Modal (available to any teacher) */}
      <CreateProgrammeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newId) => onOpenProgramme(newId)}
      />
    </div>
  );
};
