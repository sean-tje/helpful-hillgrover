import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, FileText, LogIn, ArrowLeft, ChevronRight, ShieldCheck, Mail, Loader2, MailCheck, X } from 'lucide-react';
import { HillgroveGPTView } from './HillgroveGPTView';
import { ConsentFormGeneratorView } from './ConsentFormGeneratorView';
import { RamsWriterView } from './RamsWriterView';

type PublicTool = 'rams' | 'pg-letter' | 'social';

const TOOL_TITLES: Record<PublicTool, string> = {
  rams: 'RAMS Writer',
  'pg-letter': 'PG Letter Writer',
  social: 'Social Media Writer',
};

// Public landing page: anyone can use the RAMS, PG Letter and Social Media writers without
// signing in. Student Leadership Committee members log in for the full planner.
// Committee members sign in with a link emailed to their moe.edu.sg address.
export const LoginScreen: React.FC = () => {
  const { sendSignInLink, pendingLinkNeedsEmail, completeSignInWithEmail, signInError } = useAuth();
  const [activeTool, setActiveTool] = useState<PublicTool | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A link opened on another device, or a failed link, opens the sign-in panel
  useEffect(() => {
    if (pendingLinkNeedsEmail || signInError) setSignInOpen(true);
    if (signInError) setError(signInError);
  }, [pendingLinkNeedsEmail, signInError]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = pendingLinkNeedsEmail ? await completeSignInWithEmail(email) : await sendSignInLink(email);
    setBusy(false);
    if (!result.ok) setError(result.error || 'Sign-in did not work. Please try again.');
    else if (!pendingLinkNeedsEmail) setSentTo(email.trim());
  };

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
          {activeTool === 'rams' && <RamsWriterView />}
          {activeTool === 'pg-letter' && <ConsentFormGeneratorView />}
          {activeTool === 'social' && <HillgroveGPTView />}
        </main>
      </div>
    );
  }

  const choices = [
    { key: 'rams', label: 'RAMS Writer', hint: 'Risk assessments for programmes', icon: ShieldCheck, onClick: () => setActiveTool('rams') },
    { key: 'pg-letter', label: 'PG Letter Writer', hint: 'Parents Gateway letters on the school template', icon: FileText, onClick: () => setActiveTool('pg-letter') },
    { key: 'social', label: 'Social Media Writer', hint: 'Posts and captions for school channels', icon: Sparkles, onClick: () => setActiveTool('social') },
    { key: 'login', label: 'Login', hint: 'For committee members, with your moe.edu.sg email', icon: LogIn, onClick: () => setSignInOpen(true) },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl text-center">
        {/* Helpful Hillgrover brand (bear and name) is the page heading */}
        <h1>
          <img
            src="/helpful_hillgrover_brand.png"
            alt="Helpful Hillgrover, Programme Planner"
            className="w-full max-w-md sm:max-w-lg mx-auto"
          />
        </h1>
        <p className="mt-3 text-sm text-slate-600 max-w-md mx-auto">
          Helping Hillgrove teachers to write risk assessments, parent letters and social media posts.
        </p>

        <div className="mt-8 space-y-3 max-w-md mx-auto">
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
      {signInOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="signin-title">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-7 text-left relative">
            <button
              type="button"
              onClick={() => { setSignInOpen(false); setError(null); }}
              className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            {sentTo ? (
              <div className="space-y-3">
                <span className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <MailCheck className="w-6 h-6 text-emerald-700" />
                </span>
                <h2 id="signin-title" className="text-xl font-bold text-slate-900">Check your inbox</h2>
                <p className="text-[15px] text-slate-600 leading-relaxed">
                  We sent a sign-in link to <span className="font-semibold text-slate-900 break-all">{sentTo}</span>. Open it on this device to sign in.
                </p>
                <p className="text-[13px] text-slate-500">It can take a minute to arrive. Check your spam folder if you do not see it.</p>
                <button type="button" onClick={() => { setSentTo(null); setError(null); }} className="text-[14px] font-semibold text-emerald-700 hover:text-emerald-900">
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1">
                  <h2 id="signin-title" className="text-xl font-bold text-slate-900">
                    {pendingLinkNeedsEmail ? 'Confirm your email' : 'Committee sign-in'}
                  </h2>
                  <p className="text-[14px] text-slate-600">
                    {pendingLinkNeedsEmail
                      ? 'You opened the sign-in link on a different device. Enter your email again to finish signing in.'
                      : 'Enter your moe.edu.sg email and we will email you a link to sign in. No password needed.'}
                  </p>
                </div>
                <label className="block">
                  <span className="block text-[14px] font-semibold text-slate-800 mb-1.5">Email</span>
                  <div className="relative">
                    <Mail className="w-[18px] h-[18px] text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@moe.edu.sg"
                      className="w-full h-12 pl-10 pr-3.5 rounded-xl border border-slate-300 text-[15px] focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                    />
                  </div>
                </label>
                {error && <p className="text-[14px] text-rose-700" role="alert">{error}</p>}
                <button
                  type="submit"
                  disabled={busy || !email.trim()}
                  className="w-full h-12 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {busy && <Loader2 className="w-5 h-5 animate-spin" />}
                  {pendingLinkNeedsEmail ? 'Sign in' : 'Email me a sign-in link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
