import { Inject, Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { FinnhubService } from '../finnhub/finnhub.service';
import { REDIS_PUBLISHER_CLIENT } from '../redis/redis.tokens';
import {
  STOCK_DETAILS_BASE,
  type StockDetailSnapshot,
  type StockHistoryRange,
  WATCHLIST_STOCKS,
} from './stocks.constants';

export interface StockSnapshot {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: string;
}

export interface StockHistoryPoint {
  timestamp: string;
  price: number;
}

@Injectable()
export class StocksService {
  private readonly logger = new Logger(StocksService.name);
  private readonly historyCachePrefix = 'stocks:history';
  private readonly historyCacheTtlSeconds = 24 * 60 * 60;
  private readonly rangeConfigs: Record<
    StockHistoryRange,
    {
      durationMs: number;
      resolution: '1' | '5' | '15' | '60' | 'D' | 'W' | 'M';
      points: number;
    }
  > = {
    '1H': { durationMs: 60 * 60 * 1000, resolution: '1', points: 60 },
    '5H': { durationMs: 5 * 60 * 60 * 1000, resolution: '5', points: 60 },
    '1D': { durationMs: 24 * 60 * 60 * 1000, resolution: '15', points: 96 },
    '5D': { durationMs: 5 * 24 * 60 * 60 * 1000, resolution: '60', points: 120 },
    '1M': { durationMs: 30 * 24 * 60 * 60 * 1000, resolution: 'D', points: 120 },
    '3M': { durationMs: 90 * 24 * 60 * 60 * 1000, resolution: 'D', points: 120 },
    '1Y': { durationMs: 365 * 24 * 60 * 60 * 1000, resolution: 'W', points: 104 },
    '5Y': { durationMs: 5 * 365 * 24 * 60 * 60 * 1000, resolution: 'M', points: 120 },
    ALL: { durationMs: 20 * 365 * 24 * 60 * 60 * 1000, resolution: 'M', points: 180 },
  };

  constructor(
    @Optional() @Inject(REDIS_PUBLISHER_CLIENT) private readonly cacheClient?: RedisClientType,
    @Optional() private readonly finnhub?: FinnhubService,
    @Optional() private readonly prisma?: any,
  ) {}

  async getWatchlistSnapshot(): Promise<StockSnapshot[]> {
    // If a Prisma watchlistItem model is available and contains rows, prefer that as the source
    try {
      if (this.prisma && typeof this.prisma.watchlistItem?.findMany === 'function') {
        const rows = await this.prisma.watchlistItem.findMany();
        if (Array.isArray(rows) && rows.length > 0) {
          return Promise.all(
            rows.map(async (r: any) => {
              const symbol = String(r.symbol).toUpperCase();
              const name = r.name ?? symbol;
              const liveUpdate = await this.finnhub?.fetchPriceViaRest(symbol);
              const price = this.requireLivePrice(symbol, liveUpdate?.price);
              const change = typeof liveUpdate?.change === 'number' ? Number(liveUpdate.change.toFixed(2)) : 0;
              const changePercent =
                typeof liveUpdate?.changePercent === 'number'
                  ? Number(liveUpdate.changePercent.toFixed(2))
                  : 0;

              return {
                id: symbol,
                symbol,
                name,
                price,
                change,
                changePercent,
                currency: 'USD',
                lastUpdated: liveUpdate?.timestamp
                  ? new Date(liveUpdate.timestamp).toISOString()
                  : new Date().toISOString(),
              };
            }),
          );
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load watchlist from DB, falling back to static list', error instanceof Error ? error.message : String(error));
      // fall through to static
    }

    return Promise.all(
      WATCHLIST_STOCKS.map(async ({ symbol, name }) => {
        const liveUpdate = await this.finnhub?.fetchPriceViaRest(symbol);
        const price = this.requireLivePrice(symbol, liveUpdate?.price);
        const change =
          typeof liveUpdate?.change === 'number' ? Number(liveUpdate.change.toFixed(2)) : 0;
        const changePercent =
          typeof liveUpdate?.changePercent === 'number'
            ? Number(liveUpdate.changePercent.toFixed(2))
            : 0;

        return {
          id: symbol,
          symbol,
          name,
          price,
          change,
          changePercent,
          currency: 'USD',
          lastUpdated: liveUpdate?.timestamp
            ? new Date(liveUpdate.timestamp).toISOString()
            : new Date().toISOString(),
        };
      }),
    );
  }

  private requireLivePrice(symbol: string, livePrice?: number): number {
    if (typeof livePrice !== 'number' || Number.isNaN(livePrice)) {
      this.logger.warn(`Missing live price snapshot for ${symbol}`);
      throw new ServiceUnavailableException(
        `Live price data is unavailable for ${symbol} right now.`,
      );
    }

    return Number(livePrice.toFixed(2));
  }

  // Get a single stock snapshot by symbol
  async getStockSnapshot(symbol: string): Promise<StockSnapshot> {
    const normalizedSymbol = symbol.toUpperCase();
    const matching = WATCHLIST_STOCKS.find((s) => s.symbol === normalizedSymbol);
    const name = matching?.name ?? normalizedSymbol;

    const liveUpdate = await this.finnhub?.fetchPriceViaRest(normalizedSymbol);
    const price = this.requireLivePrice(normalizedSymbol, liveUpdate?.price);
    const change =
      typeof liveUpdate?.change === 'number' ? Number(liveUpdate.change.toFixed(2)) : 0;
    const changePercent =
      typeof liveUpdate?.changePercent === 'number'
        ? Number(liveUpdate.changePercent.toFixed(2))
        : 0;

    return {
      id: normalizedSymbol,
      symbol: normalizedSymbol,
      name,
      price,
      change,
      changePercent,
      currency: 'USD',
      lastUpdated: liveUpdate?.timestamp
        ? new Date(liveUpdate.timestamp).toISOString()
        : new Date().toISOString(),
    };
  }

  async getStockDetails(symbol: string): Promise<StockDetailSnapshot> {
    const normalizedSymbol = symbol.toUpperCase();

    // Fetch live quote for the "24h Difference" from Finnhub
    const liveUpdate = await this.finnhub?.fetchPriceViaRest(normalizedSymbol);

    try {
      const liveMetrics = await this.finnhub?.fetchStockMetrics(normalizedSymbol);
      if (liveMetrics) {
        return {
          ...liveMetrics,
          change: liveUpdate?.change ?? 0,
          changePercent: liveUpdate?.changePercent ?? 0,
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch live metrics for ${normalizedSymbol}:`, error);
    }

    const base = STOCK_DETAILS_BASE[normalizedSymbol] ?? {
      high52w: 0,
      low52w: 0,
      marketCap: '—',
      volume: '—',
      pe: 0,
    };

    return {
      ...base,
      change: liveUpdate?.change ?? 0,
      changePercent: liveUpdate?.changePercent ?? 0,
    };
  }

  async getStockHistory(symbol: string, requestedRange: string): Promise<StockHistoryPoint[]> {
    const normalizedSymbol = symbol.toUpperCase();
    const range = this.parseRange(requestedRange);
    const config = this.rangeConfigs[range];
    const nowMs = Date.now();
    const fromMs = nowMs - config.durationMs;
    const toSeconds = Math.floor(nowMs / 1000);
    const fromSeconds = Math.floor(fromMs / 1000);

    const [candles, liveUpdate] = await Promise.all([
      this.finnhub?.fetchCandlesViaRest(
        normalizedSymbol,
        config.resolution,
        fromSeconds,
        toSeconds,
      ),
      this.finnhub?.fetchPriceViaRest(normalizedSymbol),
    ]);

    if (candles && candles.length > 1) {
      const history = candles.map((point) => ({
        timestamp: new Date(point.timestamp * 1000).toISOString(),
        price: Number(point.price.toFixed(2)),
      }));

      void this.cacheHistory(normalizedSymbol, range, history);
      return history;
    }

    const cachedHistory = await this.getCachedHistory(normalizedSymbol, range);
    if (cachedHistory) {
      this.logger.warn(
        `Using cached history for ${normalizedSymbol} (${range}) because Finnhub returned no candles.`,
      );
      return cachedHistory;
    }

    const reason = liveUpdate?.price
      ? 'Finnhub did not return candles for the requested range.'
      : 'No live price snapshot is available to build a chart.';

    this.logger.warn(`Unable to load history for ${normalizedSymbol} (${range}): ${reason}`);
    throw new ServiceUnavailableException(
      `Live chart data is unavailable for ${normalizedSymbol} right now.`,
    );
  }

  private historyCacheKey(symbol: string, range: StockHistoryRange): string {
    return `${this.historyCachePrefix}:${symbol}:${range}`;
  }

  private async getCachedHistory(
    symbol: string,
    range: StockHistoryRange,
  ): Promise<StockHistoryPoint[] | null> {
    if (!this.cacheClient) {
      return null;
    }

    try {
      if (!this.cacheClient.isOpen && !this.cacheClient.isReady) {
        await this.cacheClient.connect();
      }

      const cached = await this.cacheClient.get(this.historyCacheKey(symbol, range));
      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached) as StockHistoryPoint[];
      return Array.isArray(parsed)
        ? parsed.filter(
            (point) => typeof point?.timestamp === 'string' && typeof point?.price === 'number',
          )
        : null;
    } catch (error) {
      this.logger.warn(
        `Failed to read cached history for ${symbol} (${range})`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  private async cacheHistory(
    symbol: string,
    range: StockHistoryRange,
    history: StockHistoryPoint[],
  ): Promise<void> {
    if (!this.cacheClient) {
      return;
    }

    try {
      if (!this.cacheClient.isOpen && !this.cacheClient.isReady) {
        await this.cacheClient.connect();
      }

      await this.cacheClient.setEx(
        this.historyCacheKey(symbol, range),
        this.historyCacheTtlSeconds,
        JSON.stringify(history),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to cache history for ${symbol} (${range})`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private parseRange(requestedRange: string): StockHistoryRange {
    const normalizedRange = requestedRange.toUpperCase();
    if (normalizedRange in this.rangeConfigs) {
      return normalizedRange as StockHistoryRange;
    }
    return '1D';
  }
}
