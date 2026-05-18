// API configuration and endpoints
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || 'ws://localhost:3000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

export const API_ENDPOINTS = {
  // Stock endpoints
  STOCKS: '/stocks',
  STOCK_BY_SYMBOL: (symbol: string) => `/stocks/${symbol}`,
  STOCK_PRICES: '/stocks/prices',
  
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
