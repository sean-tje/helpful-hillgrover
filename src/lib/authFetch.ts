import { auth } from './firebase';

// Adds the signed-in member's Firebase ID token to every request to the app's own API, so the
// server can check who is asking. Installed once at start-up; requests elsewhere are untouched.
let installed = false;

export const installAuthFetch = () => {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const sameOriginApi = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
    const user = auth.currentUser;
    if (!sameOriginApi || !user) return originalFetch(input, init);
    const token = await user.getIdToken();
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);
    return originalFetch(input, { ...init, headers });
  };
};
