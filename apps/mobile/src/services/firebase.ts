import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Read Firebase config from environment variables. Create a local `.env` from
// `.env.example` and restart the dev server when you change values.
// Prefer Expo public env vars when present (EXPO_PUBLIC_*). Fall back to
// top-level FIREBASE_* names as a secondary option.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.FIREBASE_MESSAGING_SENDER_ID ||
    '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export { app, auth };
