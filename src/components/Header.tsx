import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Bell, ShieldCheck, UserCheck, ChevronDown, CheckCircle2, Clock, AlertCircle, Mountain } from 'lucide-react';
import { getTeacherInitial, formatSingaporeDate } from '../utils';

export const Header: React.FC<{ onNavigateToTarget?: (type: string, id: string) => void }> = ({ onNavigateToTarget }) => {
  const { currentUser, allowlistedUsers, switchUser, isChair } = useAuth();
  const { notifications, resolveNotification } = useData();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const activeNotifs = notifications.filter(n => n.userId === currentUser.id && !n.resolvedAt);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand logo & tagline */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-950/30 border border-emerald-400/30">
            <Mountain className="w-5 h-5 text-white stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-lg text-slate-100">HELPFUL HILLGROVER</span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Hillgrove Secondary School &bull; Student Leadership Committee
            </p>
          </div>
        </div>

        {/* Right side controls: Notification Bell & Persona Switcher */}
        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                setShowUserDropdown(false);
              }}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition relative"
              title="In-App Notifications"
            >
              <Bell className="w-5 h-5" />
              {activeNotifs.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeNotifs.length}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-sm">Actionable Notifications</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {activeNotifs.length} pending
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {activeNotifs.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">
                      No pending notifications. All tasks up to date!
                    </div>
                  ) : (
                    activeNotifs.map(n => (
                      <div key={n.id} className="p-3 hover:bg-slate-50 transition text-xs">
                        <div className="flex items-start justify-between">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {n.type === 'task_overdue' && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                            {n.type === 'input_requested' && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                            {n.title}
                          </span>
                          <button
                            onClick={() => resolveNotification(n.id)}
                            className="text-slate-400 hover:text-emerald-600 p-1"
                            title="Mark resolved"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-slate-600 mt-1">{n.message}</p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                          <span>{formatSingaporeDate(n.createdAt)}</span>
                          {onNavigateToTarget && (
                            <button
                              onClick={() => {
                                setShowNotifDropdown(false);
                                onNavigateToTarget(n.targetType, n.targetId);
                              }}
                              className="text-emerald-600 font-medium hover:underline"
                            >
                              View Item &rarr;
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User / Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowNotifDropdown(false);
              }}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm transition border border-slate-700"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                {getTeacherInitial(currentUser.name)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-medium text-xs leading-none text-white flex items-center gap-1.5">
                  {currentUser.name}
                  {isChair && (
                    <span className="bg-amber-400/20 text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-semibold border border-amber-400/30">
                      CHAIR
                    </span>
                  )}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 z-50 p-2">
                <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Committee Member Switcher (7 Staff)
                </div>
                <div className="max-h-72 overflow-y-auto mt-1 space-y-1">
                  {allowlistedUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                        u.id === currentUser.id
                          ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center">
                          {getTeacherInitial(u.name)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 flex items-center gap-1">
                            {u.name}
                            {u.isChair && <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.2 rounded font-bold">CHAIR</span>}
                          </div>
                          <div className="text-[10px] text-slate-500">{u.email}</div>
                        </div>
                      </div>
                      {u.id === currentUser.id && <UserCheck className="w-4 h-4 text-emerald-600" />}
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-100 mt-2 text-[10px] text-slate-500 bg-slate-50 rounded-lg">
                  💡 Open registration disabled. Access restricted to 7 allowlisted emails only.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
