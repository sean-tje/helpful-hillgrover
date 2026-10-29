import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mountain, Sparkles, FileText } from 'lucide-react';
import { HillgroveGPTView } from './HillgroveGPTView';
import { ConsentFormGeneratorView } from './ConsentFormGeneratorView';

type PublicTool = 'social' | 'pg-letter';

const TOOLS: { id: PublicTool; label: string; icon: React.ElementType }[] = [
  { id: 'social', label: 'Social Media Writer', icon: Sparkles },
  { id: 'pg-letter', label: 'PG Letter Writer', icon: FileText },
];

// Public landing page: anyone can use the Social Media Writer and PG Letter Writer without
// signing in. Committee members sign in (top right) for the full planner.
// Prototype sign-in: the Google button does not check anything yet; real Google sign-in
// will be connected closer to launch.
export const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [activeTool, setActiveTool] = useState<PublicTool>('social');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-950/30 border border-emerald-400/30 shrink-0">
              <Mountain className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="font-bold tracking-tight text-lg text-slate-100 truncate block">HELPFUL HILLGROVER</span>
              <p className="text-xs text-slate-400 hidden sm:block">
                Hillgrove Secondary School &bull; Student Leadership Committee
              </p>
            </div>
          </div>

          <button
            onClick={signIn}
            title="Committee members: sign in for the programme planner. Prototype: sign-in is not checked yet."
            className="shrink-0 inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white text-sm font-semibold text-slate-800 hover:bg-slate-100 transition shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            <span className="hidden sm:inline">Sign in with Google</span>
            <span className="sm:hidden">Sign in</span>
          </button>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 shadow-2xs w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {TOOLS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTool === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTool(id)}
                  className={`flex items-center justify-center space-x-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-900 font-semibold shadow-2xs border border-emerald-300 ring-1 ring-emerald-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500">
            No sign-in needed for these tools. Committee members sign in for the programme planner.
          </p>
        </div>
      </nav>

      <main className="flex-1">
        {activeTool === 'social' ? <HillgroveGPTView /> : <ConsentFormGeneratorView />}
      </main>
    </div>
  );
};
