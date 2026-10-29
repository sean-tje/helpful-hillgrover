import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { ALLOWLISTED_USERS } from '../data/mockData';

interface AuthContextType {
  currentUser: User;
  allowlistedUsers: User[];
  // Temporary, for testing as each member: remove once real Google sign-in is connected
  switchUser: (userId: string) => void;
  // Prototype sign-in: no real Google check yet, it only gates the app behind the sign-in screen
  isSignedIn: boolean;
  signIn: () => void;
  signOut: () => void;
  isChair: boolean;
  canEditProgramme: (firstIcId: string, secondIcId?: string, thirdIcId?: string) => boolean;
  isAssignedToProgramme: (firstIcId: string, secondIcId?: string, supportingIds?: string[], thirdIcId?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allowlistedUsers] = useState<User[]>(ALLOWLISTED_USERS);
  // Prototype: until real Google sign-in, the signed-in user is the saved one (default: the chair)
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('basecamp_user_id') || 'usr_johann';
  });

  const [isSignedIn, setIsSignedIn] = useState<boolean>(() => {
    return localStorage.getItem('basecamp_signed_in') === 'true';
  });

  const signIn = () => {
    localStorage.setItem('basecamp_signed_in', 'true');
    setIsSignedIn(true);
  };

  const signOut = () => {
    localStorage.removeItem('basecamp_signed_in');
    setIsSignedIn(false);
  };

  const currentUser = allowlistedUsers.find(u => u.id === currentUserId) || allowlistedUsers[0];

  useEffect(() => {
    localStorage.setItem('basecamp_user_id', currentUser.id);
  }, [currentUser]);

  const switchUser = (userId: string) => {
    if (allowlistedUsers.some(u => u.id === userId)) setCurrentUserId(userId);
  };

  const isChair = currentUser.isChair || currentUser.role === 'Committee Chair';

  const canEditProgramme = (firstIcId: string, secondIcId?: string, thirdIcId?: string) => {
    if (isChair) return true; // Chair has oversight & editing capabilities
    return (
      currentUser.id === firstIcId ||
      currentUser.id === secondIcId ||
      currentUser.id === thirdIcId
    );
  };

  const isAssignedToProgramme = (
    firstIcId: string,
    secondIcId?: string,
    supportingIds: string[] = [],
    thirdIcId?: string
  ) => {
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
        switchUser,
        isSignedIn,
        signIn,
        signOut,
        isChair,
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
