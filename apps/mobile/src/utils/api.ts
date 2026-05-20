import { Platform } from 'react-native';

// API configuration and endpoints
const LOCAL_API_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000'
  : 'http://localhost:3000';

export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || LOCAL_API_BASE_URL,
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || LOCAL_API_BASE_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

export const API_ENDPOINTS = {
  // Stock endpoints
  STOCKS: '/stocks',
  STOCK_BY_SYMBOL: (symbol: string) => `/stocks/${symbol}`,
  STOCK_PRICES: '/stocks/prices',
  STOCK_DETAILS: (symbol: string) => `/stocks/${symbol}/details`,
  STOCK_HISTORY: (symbol: string, range = '1D') => `/stocks/${symbol}/history?range=${encodeURIComponent(range)}`,
  
  // Alert endpoints
  ALERTS: '/alerts',
  ALERT_BY_ID: (id: string) => `/alerts/${id}`,

  // Notifications endpoints
  NOTIFICATION_TOKEN: '/notifications/token',
  NOTIFICATION_TOKEN_BY_VALUE: (token: string) => `/notifications/token/${encodeURIComponent(token)}`,
  NOTIFICATION_TEST: '/notifications/test',
  
  // Real-time endpoints
  REAL_TIME_STREAM: '/socket.io',
};

export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  
  // Price update events
  PRICE_UPDATE: 'price:update',
  PRICE_SUBSCRIBE: 'price:subscribe',
  PRICE_UNSUBSCRIBE: 'price:unsubscribe',
  
  // Alert events
  ALERT_TRIGGERED: 'alert:triggered',
  ALERT_UPDATE: 'alert:update',
  
  // Status events
  STATUS: 'status',
  ERROR: 'error',
};

// Socket reconnection config
export const SOCKET_CONFIG = {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  autoConnect: true,
};
