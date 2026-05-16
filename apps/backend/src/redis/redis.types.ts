export interface PriceTick {
  symbol: string;
  price: number;
  timestamp: number;
  volume?: number;
}

export interface ChannelHealth {
  channel: string;
  connected: boolean;
  subscribed: boolean;
  lastPublishedAt?: string;
  lastMessageAt?: string;
  publishedCount: number;
  receivedCount: number;
  suppressedDuplicateCount: number;
  lastError?: string;
}
