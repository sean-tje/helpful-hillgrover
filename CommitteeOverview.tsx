import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Users, ShieldCheck, AlertTriangle, BookOpen, UserX, UserCheck, Sparkles, FolderKanban } from 'lucide-react';
import { YearEndInsightsModal } from './YearEndInsightsModal';
import { formatSingaporeDateRange } from '../utils';

interface CommitteeOverviewProps {
  onOpenProgramme: (id: string) => void;
}

export const CommitteeOverview: React.FC<CommitteeOverviewProps> = ({ onOpenProgramme }) => {
  const { currentUser, allowlistedUsers, isChair } = useAuth();
  const { programmes, tasks, documents, auditLogs } = useData();

  const [showInsightsModal, setShowInsightsModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <span>Committee Overview</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cross-committee visibility for all teachers &bull; Chair governance and workload administration.
          </p>
        </div>

        {isChair && (
          <button
            onClick={() => setShowInsightsModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-2xs flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Chair Year-End AI Insights</span>
          </button>
        )}
      </div>

      {/* Cross-Committee Programmes Table (Visible to All) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-emerald-600" />
          <span>Committee Programmes Schedule & Status</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-50 text-slate-800 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Programme Title</th>
                <th className="p-3">Type</th>
                <th className="p-3">Event Dates</th>
                <th className="p-3">1st & 2nd ICs</th>
                <th className="p-3 text-center">Overdue Tasks</th>
                <th className="p-3 text-center">Incomplete Required Docs</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programmes.map(p => {
                const firstIc = allowlistedUsers.find(u => u.id === p.firstIcId);
                const secondIc = allowlistedUsers.find(u => u.id === p.secondIcId);

                const prgTasks = tasks.filter(t => t.programmeId === p.id);
                const overdueTasks = prgTasks.filter(t => t.dueDate < todayStr && t.status !== 'Completed').length;

                const prgDocs = documents.filter(d => d.programmeId === p.id);
                const approvedDocs = prgDocs.filter(d => d.status === 'Approved' || d.status === 'Current').length;
                const incompleteDocs = Math.max(0, 4 - approvedDocs);

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-900">{p.title}</td>
                    <td className="p-3 font-semibold text-slate-600">{p.type}</td>
                    <td className="p-3 text-slate-600">{formatSingaporeDateRange(p.startDate, p.endDate, 'numeric')}</td>
                    <td className="p-3 text-slate-700">
                      {firstIc?.name || 'Unassigned'} & {secondIc?.name || 'Unassigned'}
                    </td>
                    <td className="p-3 text-center font-bold">
                      {overdueTasks > 0 ? (
                        <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {overdueTasks} overdue
                        </span>
                      ) : (
                        <span className="text-emerald-700">0</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold">
                      {incompleteDocs > 0 ? (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {incompleteDocs} missing
                        </span>
                      ) : (
                        <span className="text-emerald-700">0</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onOpenProgramme(p.id)}
                        className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline"
                      >
                        Read-Only &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chair-Only Administrative Section */}
      {isChair ? (
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl border border-slate-800">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Committee Chair Governance & Workload Controls</h2>
              <p className="text-xs text-slate-400">Privileged administration panel visible only to Chair account.</p>
            </div>
          </div>

          {/* Teacher Workload Counts */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Teacher Workload Distribution (7 Staff)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {allowlistedUsers.map(u => {
                const assignedPrgs = programmes.filter(p => p.firstIcId === u.id || p.secondIcId === u.id);
                const assignedTasks = tasks.filter(t => t.ownerId === u.id && t.status !== 'Completed');

                return (
                  <div key={u.id} className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1 text-xs">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>{u.name}</span>
                      {u.isChair && <span className="text-[9px] bg-amber-400/20 text-amber-400 px-1.5 py-0.2 rounded font-bold">CHAIR</span>}
                    </div>
                    <div className="text-slate-400">IC Programmes: <strong className="text-slate-200">{assignedPrgs.length}</strong></div>
                    <div className="text-slate-400">Active Tasks: <strong className="text-slate-200">{assignedTasks.length}</strong></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Allowlist Management */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Authorised Staff Allowlist (Restricted to 7 Emails)</h3>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span>7 committee teacher accounts authorized in Firestore security rules. Open public registration disabled.</span>
                <span className="text-emerald-400 font-bold">100% Enforced</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-100 rounded-xl text-center text-xs text-slate-500 border border-slate-200">
          🔒 Chair administrative controls (workload distribution, template governance, user allowlist) are hidden from non-Chair users.
        </div>
      )}

      {/* Year-End Insights Modal */}
      <YearEndInsightsModal
        isOpen={showInsightsModal}
        onClose={() => setShowInsightsModal(false)}
      />
    </div>
  );
};
