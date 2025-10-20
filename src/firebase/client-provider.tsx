
'use client';

import { app, auth, firestore } from '@/firebase/config';
import { FirebaseProvider } from '@/firebase/provider';
import { ReactNode } from 'react';

// This provider is responsible for initializing Firebase on the client side.
// It should be used as a wrapper around the root of your application.
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
    return (
        <FirebaseProvider app={app} auth={auth} firestore={firestore}>
            {children}
        </FirebaseProvider>
    )
}
