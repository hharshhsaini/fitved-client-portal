// Firebase is used only for TRAINER authentication — Google sign-in and
// email/password with real password-reset emails. Customers and admins keep
// their existing Supabase-based login. The web config below is public by
// design (Firebase gates access via its own console rules, not by secrecy).
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// getApps() guard so hot-reload / multiple imports don't re-initialize.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
