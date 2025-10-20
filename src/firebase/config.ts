/**
 * This file is for the Firebase config object.
 */
import { FirebaseOptions, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * The Firebase config object. This is a public-facing config object, so it is safe to
 * check into source control.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBO8viINT-oIBOJYN6hRtwHpQkZCmysyBo",
  authDomain: "ganttastic-i1puu.firebaseapp.com",
  projectId: "ganttastic-i1puu",
  storageBucket: "ganttastic-i1puu.firebasestorage.app",
  messagingSenderId: "965667090680",
  appId: "1:965667090680:web:7fe3cc4666448b470b0b0d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

export { app, auth, firestore, firebaseConfig };
