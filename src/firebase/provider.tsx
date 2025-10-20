
'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

interface FirebaseContextValue {
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}

const FirebaseContext = createContext<FirebaseContextValue>({
  app: null,
  auth: null,
  firestore: null,
});

export function FirebaseProvider({
  children,
  app,
  auth,
  firestore,
}: {
  children: ReactNode;
  app: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}) {
  return (
    <FirebaseContext.Provider value={{ app, auth, firestore }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebaseApp() {
  return useContext(FirebaseContext).app;
}

export function useAuth() {
  return useContext(FirebaseContext).auth;
}

export function useFirestore() {
  return useContext(FirebaseContext).firestore;
}

export function useUser() {
  const auth = useAuth();
  const [user, loading, error] = useAuthState(auth!);

  return { user, loading, error };
}
