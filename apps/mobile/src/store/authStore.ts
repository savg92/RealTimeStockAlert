import { create } from 'zustand';
import { 
  User as FirebaseUser, 
  signOut,
  onIdTokenChanged
} from 'firebase/auth';
import { auth } from '../services/firebase';
import type { AuthenticatedUser } from '@stock-alert/shared';

interface AuthState {
  user: AuthenticatedUser | null;
  idToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setUser: (user: AuthenticatedUser | null) => void;
  setIdToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  idToken: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  setUser: (user) => set({ user }),
  setIdToken: (idToken) => set({ idToken }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  setError: (error) => set({ error }),
  logout: async () => {
    await signOut(auth);
    set({ user: null, idToken: null });
  },
}));

// Listener for token changes (includes sign in/out)
onIdTokenChanged(auth, async (firebaseUser: FirebaseUser | null) => {
  const store = useAuthStore.getState();
  
  if (firebaseUser) {
    const idToken = await firebaseUser.getIdToken();
    store.setUser({
      id: '', // Will be mapped by backend if needed, but we mainly use firebaseId
      firebaseId: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || null,
    });
    store.setIdToken(idToken);
  } else {
    store.setUser(null);
    store.setIdToken(null);
  }
  
  store.setLoading(false);
  store.setInitialized(true);
});
