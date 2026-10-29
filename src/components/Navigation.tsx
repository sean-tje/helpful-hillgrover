import React from 'react';
import {
  FolderKanban,
  CheckSquare,
  BookOpen,
  Calendar as CalendarIcon,
} from 'lucide-react';

// hillgrove-gpt and consent-form are opened from a programme's deliverables;
// settings is opened from the user menu
export type NavTab =
  | 'hub'
  | 'hillgrove-gpt'
  | 'consent-form'
  | 'calendar'
  | 'actions'
  | 'repository'
  | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onSelectTab }) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'hub', label: 'Committee Hub', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'calendar', label: 'Overview Calendar', icon: <CalendarIcon className="w-4 h-4" /> },
    { id: 'actions', label: 'Action Items', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'repository', label: 'Repository', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 shadow-2xs w-full">
      {/* Same width as the header above, so tabs sit between the title and the user button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 py-2.5">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition border ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 font-semibold border-emerald-400 ring-1 ring-emerald-200/60 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-50 hover:border-emerald-500'
                }`}
              >
                <span className={isActive ? 'text-emerald-700' : 'text-slate-400'}>
                  {tab.icon}
                </span>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
