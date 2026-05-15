import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  volume?: number;
}

export interface ReconnectTelemetry {
  reconnectAttempts: number;
  lastReconnectTime?: Date;
  totalConnectionTime: number;
  failureCount: number;
}

export interface FinnhubMessage {
  type: string;
  data?: Array<{
    s: string; // symbol
    p: number; // price
    t: number; // timestamp
    v?: number; // volume
  }>;
}

@Injectable()
export class FinnhubService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(FinnhubService.name);
  private ws: WebSocket | null = null;
  private wsConnected = false;
  private subscribedSymbols = new Set<string>();
  private apiKey: string;
  private wsUrl: string;
  private priceListeners: Array<(update: PriceUpdate) => void> = [];
  private reconnectAttempts = 0;
  private lastReconnectTime: Date | null = null;
  private reconnectStartTime: number = 0;
  private failureCount = 0;
  private lastHeartbeatTime = Date.now();
  private heartbeatTimeoutMs = 60000; // 60 seconds
  private heartbeatCheckInterval: NodeJS.Timeout | null = null;
  private useRestFallback = false;
  private restFallbackSymbols = new Set<string>();
  private restPollInterval: NodeJS.Timeout | null = null;

  // Retry configuration
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly BASE_BACKOFF_MS = 1000; // 1 second
  private readonly MAX_BACKOFF_MS = 30000; // 30 seconds

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('FINNHUB_API_KEY') || '';
    this.wsUrl = this.configService.get<string>('FINNHUB_WS_URL') || 'wss://ws.finnhub.io';
  }

  async onModuleInit(): Promise<void> {
    // Auto-connect on module initialization
    try {
      await this.connect();
    } catch (error) {
      this.logger.error('Failed to auto-connect on module init', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    if (this.wsConnected) {
      this.logger.debug('Already connected to Finnhub');
      return;
    }

    if (!this.apiKey) {
      throw new Error('FINNHUB_API_KEY is not configured');
    }

    this.reconnectStartTime = Date.now();
    this.reconnectAttempts = 0;

    await this.connectWithRetry();
  }

  private async connectWithRetry(): Promise<void> {
    while (this.reconnectAttempts < this.MAX_RETRY_ATTEMPTS) {
      try {
        await this.connectWebSocket();
        this.reconnectAttempts = 0; // Reset on successful connection
        this.startHeartbeatCheck();
        return;
      } catch (error) {
        this.reconnectAttempts++;
        this.failureCount++;
        this.logger.warn(`Connection attempt ${this.reconnectAttempts} failed:`, error);

        if (this.reconnectAttempts < this.MAX_RETRY_ATTEMPTS) {
          const backoffMs = this.calculateBackoff(this.reconnectAttempts);
          this.logger.debug(`Retrying in ${backoffMs}ms...`);
          await this.delay(backoffMs);
        }
      }
    }

    this.logger.error('Max retry attempts reached. Switching to REST fallback.');
    this.useRestFallback = true;
    this.startRestFallback();
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `${this.wsUrl}?token=${this.apiKey}`;
        this.ws = new WebSocket(url);

        const timeout = setTimeout(() => {
          this.logger.error('WebSocket connection timeout');
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.wsConnected = true;
          this.lastHeartbeatTime = Date.now();
          this.logger.log('Connected to Finnhub WebSocket');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.lastHeartbeatTime = Date.now();
          try {
            const message = this.parsePriceMessage(event.data);
            this.handlePriceMessage(message);
          } catch (error) {
            this.logger.error('Error processing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          this.logger.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.wsConnected = false;
          this.logger.warn('Disconnected from Finnhub WebSocket');
          this.stopHeartbeatCheck();
          // Attempt to reconnect
          if (!this.useRestFallback) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        this.logger.error('Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  private handlePriceMessage(message: FinnhubMessage): void {
    if (message.type === 'trade' && message.data) {
      for (const trade of message.data) {
        const update: PriceUpdate = {
          symbol: trade.s,
          price: trade.p,
          timestamp: trade.t,
          volume: trade.v,
        };
        this.emitPriceUpdate(update);
      }
    } else if (message.type === 'ping') {
      this.handleHeartbeat();
    }
  }

  private handleHeartbeat(): void {
    this.recordHeartbeat();
    this.sendMessage({ type: 'pong' });
  }

  private recordHeartbeat(): void {
    this.lastHeartbeatTime = Date.now();
  }

  private isConnectionAlive(): boolean {
    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeatTime;
    return timeSinceLastHeartbeat < this.heartbeatTimeoutMs;
  }

  private startHeartbeatCheck(): void {
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
    }

    this.heartbeatCheckInterval = setInterval(() => {
      if (!this.isConnectionAlive()) {
        this.logger.warn('Heartbeat timeout detected');
        this.closeWebSocket();
        this.attemptReconnect();
      }
    }, this.heartbeatTimeoutMs);
  }

  private stopHeartbeatCheck(): void {
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
      this.heartbeatCheckInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.wsConnected) {
      return;
    }

    this.recordReconnectAttempt();
    this.logger.log('Attempting to reconnect...');
    this.connectWithRetry().catch((error) => {
      this.logger.error('Reconnection failed:', error);
    });
  }

  private recordReconnectAttempt(): void {
    this.lastReconnectTime = new Date();
  }

  subscribe(symbol: string): void {
    if (this.subscribedSymbols.has(symbol)) {
      return;
    }

    this.subscribedSymbols.add(symbol);

    if (this.wsConnected) {
      this.sendMessage({ type: 'subscribe', symbol });
    } else if (this.useRestFallback) {
      this.restFallbackSymbols.add(symbol);
    }
  }

  unsubscribe(symbol: string): void {
    if (!this.subscribedSymbols.has(symbol)) {
      return;
    }

    this.subscribedSymbols.delete(symbol);

    if (this.wsConnected) {
      this.sendMessage({ type: 'unsubscribe', symbol });
    }

    this.restFallbackSymbols.delete(symbol);
  }

  private sendMessage(message: Record<string, any>): void {
    if (this.ws && this.wsConnected) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        this.logger.error('Failed to send message:', error);
      }
    }
  }

  private parsePriceMessage(data: string): FinnhubMessage {
    try {
      return JSON.parse(data);
    } catch (error) {
      this.logger.error('Failed to parse message:', error);
      throw error;
    }
  }

  private emitPriceUpdate(update: PriceUpdate): void {
    for (const listener of this.priceListeners) {
      try {
        listener(update);
      } catch (error) {
        this.logger.error('Error in price listener:', error);
      }
    }
  }

  onPrice(callback: (update: PriceUpdate) => void): void {
    this.priceListeners.push(callback);
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeatCheck();
    this.stopRestFallback();
    await this.closeWebSocket();
    this.subscribedSymbols.clear();
    this.restFallbackSymbols.clear();
    this.priceListeners = [];
    this.wsConnected = false;
  }

  private async closeWebSocket(): Promise<void> {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        this.logger.error('Error closing WebSocket:', error);
      }
      this.ws = null;
      this.wsConnected = false;
    }
  }

  isConnected(): boolean {
    return this.wsConnected;
  }

  getReconnectTelemetry(): ReconnectTelemetry {
    const totalConnectionTime = this.reconnectStartTime ? Date.now() - this.reconnectStartTime : 0;

    return {
      reconnectAttempts: this.reconnectAttempts,
      lastReconnectTime: this.lastReconnectTime ?? undefined,
      totalConnectionTime,
      failureCount: this.failureCount,
    };
  }

  async enableRestFallback(): Promise<void> {
    if (!this.useRestFallback) {
      this.logger.log('Enabling REST fallback mode');
      this.useRestFallback = true;
      this.closeWebSocket();
      this.startRestFallback();
    }
  }

  isUsingRestFallback(): boolean {
    return this.useRestFallback;
  }

  async fetchPriceViaRest(symbol: string): Promise<PriceUpdate | null> {
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        this.logger.error(`Failed to fetch price for ${symbol}:`, response.statusText);
        return null;
      }

      const data = await response.json() as { c: number; t: number };

      return {
        symbol,
        price: data.c,
        timestamp: data.t,
      };
    } catch (error) {
      this.logger.error(`Error fetching price for ${symbol} via REST:`, error);
      return null;
    }
  }

  private startRestFallback(): void {
    if (this.restPollInterval) {
      return;
    }

    // Poll every 5 seconds
    this.restPollInterval = setInterval(async () => {
      for (const symbol of this.restFallbackSymbols) {
        const update = await this.fetchPriceViaRest(symbol);
        if (update) {
          this.emitPriceUpdate(update);
        }
      }
    }, 5000);
  }

  private stopRestFallback(): void {
    if (this.restPollInterval) {
      clearInterval(this.restPollInterval);
      this.restPollInterval = null;
    }
  }

  private calculateBackoff(attempt: number): number {
    const exponentialBackoff = this.BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
    const jitteredBackoff = exponentialBackoff + Math.random() * exponentialBackoff;
    return Math.min(jitteredBackoff, this.MAX_BACKOFF_MS);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
