import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Programme, User } from '../types';
import { getTeacherInitial, formatSingaporeDateRange } from '../utils';
import {
  ShieldCheck,
  AlertTriangle,
  Users,
  Edit3,
  Calendar,
  CheckCircle,
  X,
  ArrowRightLeft,
  Info
} from 'lucide-react';

interface ReassignModalState {
  programme: Programme | null;
  firstIcId: string;
  secondIcId: string;
  thirdIcId: string;
}

export const OICWorkloadRadar: React.FC = () => {
  const { allowlistedUsers, isChair, currentUser } = useAuth();
  const { programmes, tasks, reassignProgrammeICs } = useData();

  const [reassignModal, setReassignModal] = useState<ReassignModalState>({
    programme: null,
    firstIcId: '',
    secondIcId: '',
    thirdIcId: '',
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // If not Chair/OIC, do not render this executive section
  if (!isChair) {
    return null;
  }

  // Calculate stats per teacher
  const teacherStats = allowlistedUsers.map(user => {
    let oicCount = 0;
    let secondIcCount = 0;
    let thirdIcCount = 0;
    let allHandsCount = 0;

    // Term distribution (T1, T2, T3, T4)
    const termProgrammes: Record<string, Programme[]> = {
      'Term 1': [],
      'Term 2': [],
      'Term 3': [],
      'Term 4': [],
    };

    programmes.forEach(p => {
      let isUserInvolved = false;
      if (p.firstIcId === user.id) {
        oicCount++;
        isUserInvolved = true;
      }
      if (p.secondIcId === user.id) {
        secondIcCount++;
        isUserInvolved = true;
      }
      if (p.thirdIcId === user.id) {
        thirdIcCount++;
        isUserInvolved = true;
      }
      // Count as all-hands helper if all-hands/supporting and not an IC
      if (
        (p.isAllHands || (p.supportingTeacherIds && p.supportingTeacherIds.includes(user.id))) &&
        p.firstIcId !== user.id &&
        p.secondIcId !== user.id &&
        p.thirdIcId !== user.id
      ) {
        allHandsCount++;
        isUserInvolved = true;
      }

      if (isUserInvolved && p.term && termProgrammes[p.term]) {
        termProgrammes[p.term].push(p);
      }
    });

    // Count pending & total tasks assigned to this user
    const userTasks = tasks.filter(t => t.assignedTo === user.id || t.ownerId === user.id);
    const pendingTasks = userTasks.filter(t => t.status !== 'Completed');

    // Peak risk calculation: if user has >= 3 involvements in Term 1 or Term 2
    const isPeakRisk = (termProgrammes['Term 1']?.length >= 3) || (termProgrammes['Term 2']?.length >= 3);

    return {
      user,
      oicCount,
      secondIcCount,
      thirdIcCount,
      allHandsCount,
      totalInvolvements: oicCount + secondIcCount + thirdIcCount + allHandsCount,
      termProgrammes,
      totalTasks: userTasks.length,
      pendingTasks: pendingTasks.length,
      isPeakRisk,
    };
  });

  const handleOpenReassign = (programme: Programme) => {
    setReassignModal({
      programme,
      firstIcId: programme.firstIcId,
      secondIcId: programme.secondIcId || '',
      thirdIcId: programme.thirdIcId || '',
    });
    setSaveSuccess(false);
  };

  const handleSaveReassign = async () => {
    if (!reassignModal.programme || !reassignModal.firstIcId) return;

    await reassignProgrammeICs(
      reassignModal.programme.id,
      reassignModal.firstIcId,
      reassignModal.secondIcId || undefined,
      reassignModal.thirdIcId || undefined,
      reassignModal.programme.supportingTeacherIds,
      currentUser.id
    );

    setSaveSuccess(true);
    setTimeout(() => {
      setReassignModal({ programme: null, firstIcId: '', secondIcId: '', thirdIcId: '' });
      setSaveSuccess(false);
    }, 900);
  };

  // Helper for rendering Term density block in ribbon
  const renderTermDensityBlock = (termName: string, progs: Programme[]) => {
    const count = progs.length;
    let bg = 'bg-slate-100 text-slate-500 border-slate-200';
    let label = 'Quiet';

    if (count === 1) {
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
      label = '1 event (Optimal)';
    } else if (count === 2) {
      bg = 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
      label = '2 events (Moderate)';
    } else if (count >= 3) {
      bg = 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
      label = `${count} events (Peak Surge!)`;
    }

    return (
      <div className="group relative flex-1">
        <div
          className={`py-1 px-1.5 rounded text-center border text-[11px] transition-colors cursor-help ${bg}`}
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-500">{termName.replace('Term ', 'T')}</div>
          <div className="font-bold text-xs">{count}</div>
        </div>

        {/* Hover Popover showing involved events */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-30 pointer-events-none w-56">
          <div className="bg-slate-900 text-white text-[11px] p-2.5 rounded-lg shadow-xl border border-slate-700">
            <div className="font-semibold text-emerald-400 flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
              <span>{termName}</span>
              <span className="text-[10px] text-slate-300">{label}</span>
            </div>
            {count === 0 ? (
              <p className="text-slate-400 italic">No assigned programmes</p>
            ) : (
              <ul className="space-y-1">
                {progs.map(p => (
                  <li key={p.id} className="text-slate-200 leading-tight">
                    &bull; {p.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6">
      {/* Header bar */}
      <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-tight text-white">
                OIC Executive Radar: Workload & Peak Period Detection
              </h3>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-medium border border-amber-400/30">
                OIC Only
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px]">Balanced</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[11px]">Moderate (2)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-[11px]">Peak Surge (3+)</span>
          </div>
        </div>
      </div>

      {/* Peak Surge Advisory Note */}
      <div className="bg-amber-50 border-b border-amber-100 px-5 py-2.5 text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Term 1 & Term 2 Advisory:</strong> Camp, Leadership Training Modules, Sec 3 Campaign, and Investiture coincide between late February and April. Monitor multi-role teachers below.
          </span>
        </div>
      </div>

      {/* Staff Workload Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Committee Member</th>
              <th className="py-2.5 px-3 text-center">OIC (1st)</th>
              <th className="py-2.5 px-3 text-center">2IC</th>
              <th className="py-2.5 px-3 text-center">3IC</th>
              <th className="py-2.5 px-3 text-center">All-Hands</th>
              <th className="py-2.5 px-3 text-center">Active Tasks</th>
              <th className="py-2.5 px-4 w-52">4-Term Density Ribbon</th>
              <th className="py-2.5 px-4 text-right">Quick Reassign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {teacherStats.map(({ user, oicCount, secondIcCount, thirdIcCount, allHandsCount, pendingTasks, termProgrammes, isPeakRisk }) => (
              <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                {/* Member Info */}
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center border border-slate-200">
                      {getTeacherInitial(user.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {user.name}
                        {user.isChair && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.2 rounded font-semibold">
                            CHAIR
                          </span>
                        )}
                        {isPeakRisk && (
                          <span className="bg-rose-100 text-rose-700 text-[9px] px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> High Density
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Role Counts */}
                <td className="py-3 px-3 text-center font-semibold text-slate-900">
                  {oicCount > 0 ? (
                    <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-slate-900 font-bold">
                      {oicCount}
                    </span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>

                <td className="py-3 px-3 text-center font-medium">
                  {secondIcCount > 0 ? (
                    <span className="inline-block bg-slate-50 px-2 py-0.5 rounded text-slate-700">
                      {secondIcCount}
                    </span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>

                <td className="py-3 px-3 text-center font-medium">
                  {thirdIcCount > 0 ? (
                    <span className="inline-block bg-slate-50 px-2 py-0.5 rounded text-slate-700">
                      {thirdIcCount}
                    </span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>

                <td className="py-3 px-3 text-center font-medium">
                  {allHandsCount > 0 ? (
                    <span className="inline-block text-slate-600 bg-slate-100/60 px-1.5 py-0.5 rounded">
                      {allHandsCount}
                    </span>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>

                {/* Pending Tasks */}
                <td className="py-3 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded font-semibold ${pendingTasks > 3 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                    {pendingTasks} pending
                  </span>
                </td>

                {/* 4-Term Micro Density Ribbon */}
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-1.5 w-full">
                    {renderTermDensityBlock('Term 1', termProgrammes['Term 1'] || [])}
                    {renderTermDensityBlock('Term 2', termProgrammes['Term 2'] || [])}
                    {renderTermDensityBlock('Term 3', termProgrammes['Term 3'] || [])}
                    {renderTermDensityBlock('Term 4', termProgrammes['Term 4'] || [])}
                  </div>
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <div className="relative inline-block text-left">
                    <select
                      onChange={(e) => {
                        const progId = e.target.value;
                        if (progId) {
                          const prog = programmes.find(p => p.id === progId);
                          if (prog) handleOpenReassign(prog);
                        }
                        e.target.value = '';
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2 py-1 rounded-md border border-slate-300 cursor-pointer font-medium"
                      defaultValue=""
                    >
                      <option value="" disabled>Reassign Programme...</option>
                      {programmes.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.term || 'Term 1'})
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reassign IC Modal */}
      {reassignModal.programme && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="font-semibold text-sm">Reassign Programme IC Roles</h4>
                  <p className="text-[11px] text-slate-400">OIC Workload Rebalancing Tool</p>
                </div>
              </div>
              <button
                onClick={() => setReassignModal({ programme: null, firstIcId: '', secondIcId: '', thirdIcId: '' })}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="font-bold text-slate-900">{reassignModal.programme.title}</div>
                <div className="text-slate-500 mt-0.5">
                  Schedule: {reassignModal.programme.term} &bull; {formatSingaporeDateRange(reassignModal.programme.startDate, reassignModal.programme.endDate, 'long')}
                </div>
                {reassignModal.programme.isAllHands && (
                  <div className="text-emerald-700 font-medium mt-1">
                    &bull; All-Hands-On-Deck Programme (All committee teachers support)
                  </div>
                )}
              </div>

              {/* First IC selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1st IC (Lead Teacher-in-Charge) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reassignModal.firstIcId}
                  onChange={e => setReassignModal({ ...reassignModal, firstIcId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  {allowlistedUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Second IC selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2nd IC (Secondary Teacher-in-Charge)
                </label>
                <select
                  value={reassignModal.secondIcId}
                  onChange={e => setReassignModal({ ...reassignModal, secondIcId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="">-- None --</option>
                  {allowlistedUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Third IC selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3rd IC (Tertiary Teacher-in-Charge)
                </label>
                <select
                  value={reassignModal.thirdIcId}
                  onChange={e => setReassignModal({ ...reassignModal, thirdIcId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="">-- None --</option>
                  {allowlistedUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Roles updated and synced successfully!</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModal({ programme: null, firstIcId: '', secondIcId: '', thirdIcId: '' })}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveReassign}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition"
                >
                  Save & Update Workload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
