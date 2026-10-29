import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  KeyRound,
  ShieldCheck,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Users,
} from 'lucide-react';

interface KeyStatus {
  encryptionReady: boolean;
  envKeyConfigured: boolean;
  totalSavedKeys: number;
  myKey: { last4: string; addedAt: string } | null;
}

export const AiSettingsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai-keys/status?userId=${encodeURIComponent(currentUser.id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load AI settings.');
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setApiKeyInput('');
    setSuccess(null);
    loadStatus();
  }, [currentUser.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, apiKey: apiKeyInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save the key.');
      setApiKeyInput('');
      setSuccess('Key verified and saved. The AI features can now use it.');
      await loadStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove your Claude API key? The app will stop using it straight away.')) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/ai-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not remove the key.');
      setSuccess('Your key has been removed.');
      await loadStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const aiAvailable = !!status && (status.totalSavedKeys > 0 || status.envKeyConfigured);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
        <div className="flex items-start space-x-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Settings</div>
            <h1 className="text-xl font-bold text-slate-900">AI</h1>
            <p className="text-sm text-slate-600 mt-1">
              Add your own Claude API key to power the Social Media Writer, the PG Letter Writer, the Planner and Repository search.
              The app uses any committee member's saved key, so only one person needs to add one.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading AI settings...
        </div>
      ) : (
        <>
          {status && (
            <div className={`rounded-2xl border p-4 flex items-start space-x-3 ${
              aiAvailable ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}>
              {aiAvailable ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              )}
              <div className="text-sm">
                <p className={`font-semibold ${aiAvailable ? 'text-emerald-900' : 'text-amber-900'}`}>
                  {aiAvailable ? 'AI features are switched on' : 'AI features are using basic templates'}
                </p>
                <p className={aiAvailable ? 'text-emerald-800' : 'text-amber-800'}>
                  <Users className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                  {status.totalSavedKeys} committee member key{status.totalSavedKeys === 1 ? '' : 's'} saved
                  {status.envKeyConfigured ? ', plus a server key set by the host.' : '.'}
                </p>
              </div>
            </div>
          )}

          {status && !status.encryptionReady && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <p className="font-semibold">Key saving is not set up on the server yet</p>
              <p className="mt-1">
                Whoever hosts the app needs to add a <code className="font-mono bg-rose-100 px-1 rounded">KEY_ENCRYPTION_SECRET</code> setting
                (a long random password) so keys can be stored encrypted.
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Your Claude API key</h2>
              <span className="text-xs text-slate-500">Signed in as {currentUser.name}</span>
            </div>

            {status?.myKey ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <p className="font-mono text-sm text-slate-900">sk-ant-••••••••{status.myKey.last4}</p>
                    <p className="text-xs text-slate-500">
                      Added {new Date(status.myKey.addedAt).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemove}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Remove
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-600">You have not added a key.</p>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <label htmlFor="claude-api-key" className="block text-sm font-medium text-slate-700">
                {status?.myKey ? 'Replace with a new key' : 'Paste your key'}
              </label>
              <input
                id="claude-api-key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <a
                  href="https://platform.claude.com/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-sm text-emerald-700 hover:text-emerald-900"
                >
                  Get a key from the Claude Console <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>
                <button
                  type="submit"
                  disabled={isSaving || !apiKeyInput.trim() || !status?.encryptionReady}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Verify and save
                </button>
              </div>
            </form>

            {error && (
              <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>
            )}

            <ul className="text-xs text-slate-500 space-y-1 border-t border-slate-100 pt-4">
              <li>• Your key is checked with Claude, then stored encrypted on the server.</li>
              <li>• Nobody can view the full key after it is saved, including you. Only the last 4 characters are shown, and only to you.</li>
              <li>• Usage is billed to the Claude account the key belongs to.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
