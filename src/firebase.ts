import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigData from '../firebase-applet-config.json';

const firebaseConfig = {
  projectId: firebaseConfigData.projectId || "gen-lang-client-0059892999",
  appId: firebaseConfigData.appId || "1:136711344940:web:de9de48dd370889cff9289",
  apiKey: firebaseConfigData.apiKey || "AIzaSyAz2FH8FdW9l7p3ljBVLWFrlryaswcQAYQ",
  authDomain: firebaseConfigData.authDomain || "gen-lang-client-0059892999.firebaseapp.com",
  storageBucket: firebaseConfigData.storageBucket || "gen-lang-client-0059892999.firebasestorage.app",
  messagingSenderId: firebaseConfigData.messagingSenderId || "136711344940",
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

// The user's firestore db is ai-studio-2393e0b8-d441-4216-b613-7f344aa1d098
export const db = getFirestore(app, "ai-studio-2393e0b8-d441-4216-b613-7f344aa1d098");

export const OAUTH_CLIENT_ID = firebaseConfigData.oAuthClientId || "136711344940-h78e5sgptmj7p52bdbv0iaohhq3lkcvt.apps.googleusercontent.com";

// Google Workspace Scopes
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents'
];

export const createGoogleAuthProvider = () => {
  const provider = new GoogleAuthProvider();
  WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
};
