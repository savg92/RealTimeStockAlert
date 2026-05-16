// Stock-related types
export interface Stock {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: Date;
}

export interface StockPrice {
  symbol: string;
  price: number;
  timestamp: Date;
}

export interface AlertConfig {
  id: string;
  symbol: string;
  price: number;
  condition: 'above' | 'below';
  threshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Socket-related types
export interface SocketMessage {
  type: string;
  data: unknown;
  timestamp: Date;
}

export interface RealTimeUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: Date;
}

// App state types
export interface AppSettings {
  notifications: boolean;
  darkMode: boolean;
  autoRefresh: boolean;
  wifiOnly: boolean;
  currency: string;
  refreshInterval: number;
}

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}
