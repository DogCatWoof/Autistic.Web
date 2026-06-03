import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.FIREBASE_API_KEY,
  authDomain: import.meta.env.FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.FIREBASE_APP_ID
};

export let app: ReturnType<typeof initializeApp> | null = null;
export let auth: ReturnType<typeof getAuth> | null = null;
export let db: ReturnType<typeof getFirestore> | null = null;
export let googleProvider: GoogleAuthProvider | null = null;

const hasConfig = firebaseConfig.apiKey && firebaseConfig.projectId;
console.log('[Firebase] config present:', !!hasConfig, 'project:', firebaseConfig.projectId);

if (hasConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    console.log('[Firebase] initialized OK');
  } catch (e) {
    console.error('[Firebase] init failed', e);
  }
} else {
  console.warn('[Firebase] missing config — set FIREBASE_* env vars');
}
