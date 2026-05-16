import { create } from 'zustand';
import type { Stock, AlertConfig, AppSettings } from '../types';

interface AppStore {
  // State
  stocks: Stock[];
  alerts: AlertConfig[];
  settings: AppSettings;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setStocks: (stocks: Stock[]) => void;
  updateStock: (stock: Stock) => void;
  setAlerts: (alerts: AlertConfig[]) => void;
  addAlert: (alert: AlertConfig) => void;
  removeAlert: (alertId: string) => void;
  setSettings: (settings: AppSettings) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  darkMode: false,
  autoRefresh: true,
  wifiOnly: false,
  currency: 'USD',
  refreshInterval: 30000,
};

export const useAppStore = create<AppStore>((set) => ({
  // Initial state
  stocks: [],
  alerts: [],
  settings: DEFAULT_SETTINGS,
  isConnected: false,
  isLoading: false,
  error: null,

  // Actions
  setStocks: (stocks) => set({ stocks }),
  updateStock: (stock) =>
    set((state) => ({
      stocks: state.stocks.map((s) => (s.id === stock.id ? stock : s)),
    })),
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) =>
    set((state) => ({
      alerts: [...state.alerts, alert],
    })),
  removeAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== alertId),
    })),
  setSettings: (settings) => set({ settings }),
  updateSettings: (settings) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...settings,
      },
    })),
  setConnected: (connected) => set({ isConnected: connected }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      stocks: [],
      alerts: [],
      settings: DEFAULT_SETTINGS,
      isConnected: false,
      isLoading: false,
      error: null,
    }),
}));
