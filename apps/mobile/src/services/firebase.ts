import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAlWOSo38QafST4DZhlR9Lg_VUuZw6Y51U",
  authDomain: "real-time-stock-alert.firebaseapp.com",
  projectId: "real-time-stock-alert",
  storageBucket: "real-time-stock-alert.firebasestorage.app",
  messagingSenderId: "808352326081",
  appId: "1:808352326081:android:e98548e87a02da2cf44f40"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export { app, auth };
