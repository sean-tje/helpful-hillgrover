import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Bell, ChevronDown, ChevronRight, CheckCircle2, Check, Clock, AlertCircle, LogOut, Calendar as CalendarIcon, Settings, Users } from 'lucide-react';
import { getTeacherInitial, formatSingaporeDate } from '../utils';
import { NavTab } from './Navigation';

const USER_MENU: { tab: NavTab; label: string; icon: React.ElementType }[] = [
  { tab: 'calendar', label: 'Overview Calendar', icon: CalendarIcon },
  { tab: 'settings', label: 'Settings', icon: Settings },
];

export const Header: React.FC<{
  onNavigateToTarget?: (type: string, id: string) => void;
  onSelectTab: (tab: NavTab) => void;
}> = ({ onNavigateToTarget, onSelectTab }) => {
  const { currentUser, allowlistedUsers, switchUser, isChair, signOut } = useAuth();
  const { notifications, resolveNotification } = useData();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showSwitchUser, setShowSwitchUser] = useState(false);

  const activeNotifs = notifications.filter(n => n.userId === currentUser.id && !n.resolvedAt);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand logo & tagline */}
        <div className="flex items-center space-x-3">
          <img src="/helpful_hillgrover_brand.png" alt="Helpful Hillgrover, Programme Planner" className="h-12 w-auto" />
          <p className="text-xs text-slate-400 hidden md:block border-l border-slate-700 pl-3">
            Hillgrove Secondary School<br />Student Leadership Committee
          </p>
        </div>

        {/* Right side controls: Notification Bell & User Menu */}
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

          {/* Signed-in user & menu */}
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
              <div className="absolute right-0 mt-2 w-64 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 z-50 p-2">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                    {currentUser.name}
                    {isChair && <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-bold">CHAIR</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                </div>
                {USER_MENU.map(({ tab, label, icon: Icon }) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setShowUserDropdown(false);
                      onSelectTab(tab);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{label}</span>
                  </button>
                ))}

                {/* Temporary: remove once real Google sign-in is connected */}
                <button
                  onClick={() => setShowSwitchUser(!showSwitchUser)}
                  aria-expanded={showSwitchUser}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="flex-1">Switch user</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Temporary</span>
                  <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showSwitchUser ? 'rotate-90' : ''}`} />
                </button>
                {showSwitchUser && (
                  <div className="ml-4 mb-1 max-h-60 overflow-y-auto border-l border-slate-200 pl-2">
                    {allowlistedUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setShowSwitchUser(false);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition ${
                          u.id === currentUser.id ? 'bg-emerald-50 text-emerald-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {getTeacherInitial(u.name)}
                        </span>
                        <span className="flex-1 truncate">{u.name}</span>
                        {u.isChair && <span className="bg-amber-100 text-amber-800 text-[9px] px-1 rounded font-bold">CHAIR</span>}
                        {u.id === currentUser.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    signOut();
                  }}
                  className="w-full mt-1 pt-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 border-t border-slate-100 transition"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
