import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { User } from '../types';
import { ALLOWLISTED_USERS } from '../data/mockData';
import { auth } from '../lib/firebase';
import { installAuthFetch } from '../lib/authFetch';

installAuthFetch();

// Committee members sign in with a link emailed to their moe.edu.sg address (Firebase email
// link sign-in). Only emails on the committee list can sign in; the server checks each request.

const EMAIL_KEY = 'hh_signin_email';

export const committeeMemberByEmail = (email?: string | null) => {
  const wanted = String(email || '').trim().toLowerCase();
  return wanted ? ALLOWLISTED_USERS.find(u => u.active && u.email.toLowerCase() === wanted) : undefined;
};

const friendlyError = (code: string) =>
  code === 'auth/invalid-action-code' || code === 'auth/expired-action-code'
    ? 'This sign-in link has expired or was already used. Ask for a new one.'
    : code === 'auth/invalid-email'
    ? 'That does not look like an email address.'
    : code === 'auth/operation-not-allowed'
    ? 'Email link sign-in is not switched on in Firebase yet.'
    : code === 'auth/unauthorized-continue-uri' || code === 'auth/unauthorized-domain'
    ? 'This website address is not authorised in Firebase yet.'
    : code === 'auth/too-many-requests' || code === 'auth/quota-exceeded'
    ? 'Too many sign-in emails were sent. Please try again later.'
    : code === 'auth/network-request-failed'
    ? 'No connection. Check your internet and try again.'
    : 'Sign-in did not work. Please try again.';

interface AuthContextType {
  currentUser: User;
  allowlistedUsers: User[];
  isSignedIn: boolean;
  authReady: boolean; // false until Firebase has said whether someone is signed in
  signOut: () => void;
  // Email link sign-in
  sendSignInLink: (email: string) => Promise<{ ok: boolean; error?: string }>;
  pendingLinkNeedsEmail: boolean; // the link was opened on another device, so confirm the email
  completeSignInWithEmail: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signInError: string | null;
  isChair: boolean;
  // Committee OIC or 2IC: can see the Committee Hub
  isCommitteeLead: boolean;
  canEditProgramme: (firstIcId: string, secondIcId?: string, thirdIcId?: string) => boolean;
  isAssignedToProgramme: (firstIcId: string, secondIcId?: string, supportingIds?: string[], thirdIcId?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const allowlistedUsers = ALLOWLISTED_USERS;
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [pendingLinkNeedsEmail, setPendingLinkNeedsEmail] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const finishLink = async (email: string) => {
    try {
      if (!committeeMemberByEmail(email)) return { ok: false, error: 'This email is not on the committee list.' };
      await signInWithEmailLink(auth, email.trim(), window.location.href);
      window.localStorage.removeItem(EMAIL_KEY);
      window.history.replaceState(null, '', window.location.pathname);
      setPendingLinkNeedsEmail(false);
      setSignInError(null);
      return { ok: true };
    } catch (err: any) {
      const error = friendlyError(err?.code || '');
      setSignInError(error);
      if (err?.code === 'auth/invalid-action-code' || err?.code === 'auth/expired-action-code') {
        window.history.replaceState(null, '', window.location.pathname);
        setPendingLinkNeedsEmail(false);
      }
      return { ok: false, error };
    }
  };

  useEffect(() => {
    // Opening the link from the email finishes signing in
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const saved = window.localStorage.getItem(EMAIL_KEY);
      if (saved) finishLink(saved);
      else setPendingLinkNeedsEmail(true);
    }
    return onAuthStateChanged(auth, user => {
      // Someone signed in with an email that is not on the committee list is signed out again
      if (user && !committeeMemberByEmail(user.email)) {
        setSignInError('This email is not on the committee list.');
        firebaseSignOut(auth);
        setFirebaseUser(null);
      } else {
        setFirebaseUser(user);
      }
      setAuthReady(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendSignInLink = async (email: string) => {
    const trimmed = email.trim();
    if (!committeeMemberByEmail(trimmed)) {
      return { ok: false, error: 'This email is not on the committee list. Use your moe.edu.sg email.' };
    }
    try {
      await sendSignInLinkToEmail(auth, trimmed, { url: `${window.location.origin}/`, handleCodeInApp: true });
      window.localStorage.setItem(EMAIL_KEY, trimmed);
      setSignInError(null);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: friendlyError(err?.code || '') };
    }
  };

  const signOut = () => {
    firebaseSignOut(auth);
  };

  const member = committeeMemberByEmail(firebaseUser?.email);
  const isSignedIn = !!(firebaseUser && member);
  const currentUser = member || allowlistedUsers[0];

  const isChair = isSignedIn && (currentUser.isChair || currentUser.role === 'Committee Chair');
  const isCommitteeLead = isChair || (isSignedIn && !!currentUser.isCommittee2IC);

  const canEditProgramme = (firstIcId: string, secondIcId?: string, thirdIcId?: string) => {
    if (isChair) return true; // Chair has oversight & editing capabilities
    return currentUser.id === firstIcId || currentUser.id === secondIcId || currentUser.id === thirdIcId;
  };

  const isAssignedToProgramme = (firstIcId: string, secondIcId?: string, supportingIds: string[] = [], thirdIcId?: string) => {
    if (isChair) return true;
    return (
      currentUser.id === firstIcId ||
      currentUser.id === secondIcId ||
      currentUser.id === thirdIcId ||
      supportingIds.includes(currentUser.id)
    );
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allowlistedUsers,
        isSignedIn,
        authReady,
        signOut,
        sendSignInLink,
        pendingLinkNeedsEmail,
        completeSignInWithEmail: finishLink,
        signInError,
        isChair,
        isCommitteeLead,
        canEditProgramme,
        isAssignedToProgramme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
