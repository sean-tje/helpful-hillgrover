// Committee sign-in on the server. Members sign in in the browser with a Firebase email link;
// every request to a committee-only route carries their Firebase ID token, which is checked
// here against the committee list. Routes for the public writers on the cover page stay open.
import type { NextFunction, Request, Response } from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from './firebase-applet-config.json';
import { ALLOWLISTED_USERS } from './src/data/mockData';
import type { User } from './src/types';

const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;

// A separate Firebase app for checking sign-ins: it only needs the project ID
const authApp = getApps().find(a => a.name === 'committee-auth') || initializeApp({ projectId }, 'committee-auth');

// The cover page's writers (RAMS, PG letter, social media) are for any Hillgrove teacher
const PUBLIC_API = new Set([
  '/api/health',
  '/api/gemini/rams',
  '/api/rams/docx',
  '/api/gemini/consent-form',
  '/api/pg-letter/docx',
  '/api/gemini/hillgrove-gpt',
  '/api/export-word',
]);

export const committeeMemberByEmail = (email?: string | null): User | undefined => {
  const wanted = String(email || '').trim().toLowerCase();
  return wanted ? ALLOWLISTED_USERS.find(u => u.active && u.email.toLowerCase() === wanted) : undefined;
};

export interface CommitteeRequest extends Request {
  committeeUser?: User;
}

export const requireCommitteeSignIn = async (req: CommitteeRequest, res: Response, next: NextFunction) => {
  if (!req.path.startsWith('/api/') || PUBLIC_API.has(req.path)) return next();
  const token = (req.headers.authorization || '').match(/^Bearer (.+)$/)?.[1];
  if (!token) return res.status(401).json({ error: 'Please sign in.' });
  try {
    const decoded = await getAuth(authApp).verifyIdToken(token);
    const user = decoded.email_verified ? committeeMemberByEmail(decoded.email) : undefined;
    if (!user) return res.status(403).json({ error: 'This email is not on the committee list.' });
    req.committeeUser = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Your sign-in has expired. Please sign in again.' });
  }
};
