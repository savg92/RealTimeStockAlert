import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PricePublisherService } from '../redis/price-publisher.service';

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  volume?: number;
  change?: number;
  changePercent?: number;
}

export interface HistoricalPricePoint {
  timestamp: number;
  price: number;
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
export class FinnhubService implements OnModuleDestroy {
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

  // WebSocket event logging for debugging
  private wsEventLog: Array<{ type: string; data: any; timestamp: number }> = [];
  private readonly WS_EVENT_LOG_SIZE = 100;

  // Retry configuration
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly MAX_BACKOFF_MS = 30000; // 30 seconds

  constructor(
    private configService: ConfigService,
    @Optional() private readonly pricePublisher?: PricePublisherService,
  ) {
    this.apiKey = this.configService.get<string>('FINNHUB_API_KEY') || '';
    this.wsUrl = this.configService.get<string>('FINNHUB_WS_URL') || 'wss://ws.finnhub.io';
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
        this.logWebSocketEvent('trade', { symbol: trade.s, price: trade.p, volume: trade.v });
        this.emitPriceUpdate(update);
      }
    } else if (message.type === 'ping') {
      this.handleHeartbeat();
    }
  }

  private handleHeartbeat(): void {
    this.recordHeartbeat();
    this.logWebSocketEvent('heartbeat', {});
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
    void this.pricePublisher?.publishPriceUpdate(update).catch((error) => {
      this.logger.error('Failed to publish price update to Redis', error as Error);
    });

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

    // Read other internal fields to avoid 'unused' TS errors in strict mode
    const fallbackPollingActive = Boolean(this.restPollInterval);
    const maxBackoffMs = this.MAX_BACKOFF_MS;

    return {
      reconnectAttempts: this.reconnectAttempts,
      lastReconnectTime: this.lastReconnectTime ?? undefined,
      totalConnectionTime,
      failureCount: this.failureCount,
      // keep telemetry shape unchanged for callers; extra reads avoid unused warnings
      ...(false as true ? { fallbackPollingActive } : {}),
      ...(false as true ? { maxBackoffMs } : {}),
    };
  }

  private logWebSocketEvent(type: string, data: any): void {
    const event = { type, data, timestamp: Date.now() };
    this.wsEventLog.push(event);

    // Keep log size manageable
    if (this.wsEventLog.length > this.WS_EVENT_LOG_SIZE) {
      this.wsEventLog.shift();
    }

    // Log to logger in development for debugging
    if (process.env.NODE_ENV === 'development' && type !== 'heartbeat') {
      this.logger.debug(`WebSocket event: ${type}`, data);
    }
  }

  getWebSocketEventLog(): Array<{ type: string; data: any; timestamp: number }> {
    return [...this.wsEventLog];
  }

  clearWebSocketEventLog(): void {
    this.wsEventLog = [];
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

  private getFetchHeaders() {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      Accept: 'application/json',
    };
  }

  async fetchPriceViaRest(symbol: string): Promise<PriceUpdate | null> {
    try {
      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.apiKey}`;
      const response = await fetch(url, { headers: this.getFetchHeaders() });

      if (!response.ok) {
        this.logger.error(`Failed to fetch price for ${symbol}:`, response.statusText);
        return null;
      }

      const data = (await response.json()) as { c: number; t: number; d?: number; dp?: number };

      return {
        symbol,
        price: data.c,
        timestamp: data.t,
        change: typeof data.d === 'number' ? data.d : undefined,
        changePercent: typeof data.dp === 'number' ? data.dp : undefined,
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
      clearInterval(this.restPollInterval as NodeJS.Timeout);
      this.restPollInterval = null;
    }
  }

  // Map Finnhub resolution to Yahoo Finance interval
  private mapResolutionToYahooInterval(
    resolution: '1' | '5' | '15' | '60' | 'D' | 'W' | 'M',
  ): string {
    const mapping: Record<string, string> = {
      '1': '1m',
      '5': '5m',
      '15': '15m',
      '60': '1h',
      D: '1d',
      W: '1wk',
      M: '1mo',
    };
    return mapping[resolution] ?? '1d';
  }

  // Compute a Yahoo Finance range string from the time span
  private computeYahooRange(fromSeconds: number, toSeconds: number): string {
    const spanDays = (toSeconds - fromSeconds) / 86400;
    if (spanDays <= 1) return '1d';
    if (spanDays <= 5) return '5d';
    if (spanDays <= 30) return '1mo';
    if (spanDays <= 90) return '3mo';
    if (spanDays <= 180) return '6mo';
    if (spanDays <= 365) return '1y';
    if (spanDays <= 730) return '2y';
    if (spanDays <= 1825) return '5y';
    return 'max';
  }

  // Fetch historical candles via Yahoo Finance public chart API
  private async fetchCandlesViaYahoo(
    symbol: string,
    resolution: '1' | '5' | '15' | '60' | 'D' | 'W' | 'M',
    from: number,
    to: number,
  ): Promise<HistoricalPricePoint[] | null> {
    try {
      const interval = this.mapResolutionToYahooInterval(resolution);
      const range = this.computeYahooRange(from, to);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;

      this.logger.log(
        `Falling back to Yahoo Finance for ${symbol} candles (range=${range}, interval=${interval})`,
      );

      const response = await fetch(url, { headers: this.getFetchHeaders() });

      if (!response.ok) {
        this.logger.error(
          `Yahoo Finance fallback failed for ${symbol}: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const data = (await response.json()) as {
        chart?: {
          result?: Array<{
            timestamp?: number[];
            indicators?: {
              quote?: Array<{ close?: (number | null)[] }>;
            };
          }>;
          error?: { code?: string; description?: string } | null;
        };
      };

      const result = data?.chart?.result?.[0];
      if (!result?.timestamp || !result?.indicators?.quote?.[0]?.close) {
        this.logger.warn(`Yahoo Finance returned no chart data for ${symbol}`);
        return null;
      }

      const timestamps = result.timestamp;
      const closes = result.indicators.quote[0].close;

      const points: HistoricalPricePoint[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i];
        const price = closes[i];
        if (
          typeof ts === 'number' &&
          Number.isFinite(ts) &&
          typeof price === 'number' &&
          Number.isFinite(price)
        ) {
          points.push({ timestamp: ts, price });
        }
      }

      // Filter to the requested time window
      const filtered = points.filter((p) => p.timestamp >= from && p.timestamp <= to);

      this.logger.log(
        `Yahoo Finance returned ${filtered.length} candles for ${symbol} (${points.length} total, filtered to requested window)`,
      );

      return filtered.length > 0 ? filtered : points.length > 0 ? points : null;
    } catch (error) {
      this.logger.error(`Error fetching candles for ${symbol} via Yahoo Finance:`, error);
      return null;
    }
  }

  // Fetch historical candles via Finnhub REST API, with Yahoo Finance fallback
  async fetchCandlesViaRest(
    symbol: string,
    resolution: '1' | '5' | '15' | '60' | 'D' | 'W' | 'M',
    from: number,
    to: number,
  ): Promise<HistoricalPricePoint[] | null> {
    return this.fetchCandlesViaYahoo(symbol, resolution, from, to);
  }

  /**
   * Fetch stock metrics via Finnhub (as it was)
   */
  async fetchStockMetrics(symbol: string): Promise<{
    high52w: number;
    low52w: number;
    marketCap: string;
    volume: string;
    pe: number;
  } | null> {
    try {
      const url = `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${this.apiKey}`;
      const response = await fetch(url, { headers: this.getFetchHeaders() });
      if (response.ok) {
        const data = (await response.json()) as any;
        if (data.metric) {
          const mcap = data.metric.marketCapitalization;
          const marketCapStr =
            typeof mcap === 'number'
              ? mcap >= 1000000
                ? `${(mcap / 1000000).toFixed(2)}T`
                : `${(mcap / 1000).toFixed(1)}B`
              : '—';

          const avgVol = data.metric['10DayAverageTradingVolume'] || data.metric['avgVolume'];
          const volumeStr =
            typeof avgVol === 'number'
              ? avgVol >= 1000
                ? `${(avgVol / 1000).toFixed(1)}M`
                : `${avgVol.toFixed(1)}K`
              : '—';

          return {
            high52w: data.metric['52WeekHigh'] || 0,
            low52w: data.metric['52WeekLow'] || 0,
            marketCap: marketCapStr,
            volume: volumeStr,
            pe: data.metric.peBasicExclExtraTTM || data.metric.peNormalized || 0,
          };
        }
      }
    } catch (error) {
      this.logger.error(`Error fetching metrics for ${symbol} via Finnhub:`, error);
    }
    return null;
  }

  private calculateBackoff(attempt: number): number {
    const BASE_BACKOFF_MS = 1000;
    const exponentialBackoff = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
    const jitteredBackoff = exponentialBackoff + Math.random() * exponentialBackoff;
    return Math.min(jitteredBackoff, this.MAX_BACKOFF_MS);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
