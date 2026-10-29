import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, FileText, LogIn, ArrowLeft, ChevronRight } from 'lucide-react';
import { HillgroveGPTView } from './HillgroveGPTView';
import { ConsentFormGeneratorView } from './ConsentFormGeneratorView';

type PublicTool = 'pg-letter' | 'social';

const TOOL_TITLES: Record<PublicTool, string> = {
  'pg-letter': 'PG Letter Writer',
  social: 'Social Media Writer',
};

// Public landing page: anyone can use the PG Letter Writer and Social Media Writer without
// signing in. Student Leadership Committee members log in for the full planner.
// Prototype sign-in: the login button does not check anything yet; real Google sign-in
// will be connected closer to launch.
export const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [activeTool, setActiveTool] = useState<PublicTool | null>(null);
  const [showMascot, setShowMascot] = useState(true);

  if (activeTool) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
            <button
              onClick={() => setActiveTool(null)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-emerald-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Helpful Hillgrover</span>
            </button>
            <span className="text-sm font-bold text-slate-900 truncate">{TOOL_TITLES[activeTool]}</span>
          </div>
        </header>
        <main className="flex-1">
          {activeTool === 'social' ? <HillgroveGPTView /> : <ConsentFormGeneratorView />}
        </main>
      </div>
    );
  }

  const choices = [
    { key: 'pg-letter', label: 'PG Letter Writer', hint: 'Parents Gateway letters on the school template', icon: FileText, onClick: () => setActiveTool('pg-letter') },
    { key: 'social', label: 'Social Media Writer', hint: 'Posts and captions for school channels', icon: Sparkles, onClick: () => setActiveTool('social') },
    { key: 'login', label: 'Log in for more', hint: 'SL Comm only', icon: LogIn, onClick: signIn },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <img src="/hillgrove_logo.png" alt="Hillgrove Secondary School" className="h-16 mx-auto object-contain" />

        {showMascot && (
          <img
            src="/hillgrove_bear.png"
            alt="Hillgrove bear mascot"
            onError={() => setShowMascot(false)}
            className="h-40 mx-auto mt-6 object-contain"
          />
        )}

        <h1 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight text-emerald-900">Helpful Hillgrover</h1>

        <div className="mt-8 space-y-3">
          {choices.map(({ key, label, hint, icon: Icon, onClick }) => {
            const isLogin = key === 'login';
            return (
              <button
                key={key}
                onClick={onClick}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-left transition shadow-2xs border ${
                  isLogin
                    ? 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-900 hover:border-emerald-400 hover:bg-emerald-50'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isLogin ? 'text-emerald-300' : 'text-emerald-600'}`} />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold">{label}</span>
                  <span className={`block text-xs ${isLogin ? 'text-slate-300' : 'text-slate-500'}`}>{hint}</span>
                </span>
                <ChevronRight className={`w-4 h-4 shrink-0 ${isLogin ? 'text-slate-400' : 'text-slate-300'}`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
