import { Injectable, Logger, Optional } from '@nestjs/common';
import { FinnhubService } from '../finnhub/finnhub.service';
import { PriceSimulatorService } from '../dev/price-simulator.service';
import {
  STOCK_DETAILS_BASE,
  type StockDetailSnapshot,
  type StockHistoryRange,
  WATCHLIST_BASE_PRICES,
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
  private readonly rangeConfigs: Record<StockHistoryRange, {
    durationMs: number;
    resolution: '1' | '5' | '15' | '60' | 'D' | 'W' | 'M';
    points: number;
  }> = {
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
    @Optional() private readonly priceSimulator?: PriceSimulatorService,
    @Optional() private readonly finnhub?: FinnhubService,
  ) {}

  async getWatchlistSnapshot(): Promise<StockSnapshot[]> {
    const simulatorPrices = this.priceSimulator?.getCurrentPrices() ?? {};

    return Promise.all(
      WATCHLIST_STOCKS.map(async ({ symbol, name }) => {
        const liveUpdate = await this.finnhub?.fetchPriceViaRest(symbol);
        const price = this.resolvePrice(symbol, liveUpdate?.price, simulatorPrices[symbol]);
        const fallbackBaseline = WATCHLIST_BASE_PRICES[symbol] ?? price;
        const change = typeof liveUpdate?.change === 'number'
          ? Number(liveUpdate.change.toFixed(2))
          : Number((price - fallbackBaseline).toFixed(2));
        const changePercent = typeof liveUpdate?.changePercent === 'number'
          ? Number(liveUpdate.changePercent.toFixed(2))
          : (fallbackBaseline === 0 ? 0 : Number(((change / fallbackBaseline) * 100).toFixed(2)));

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

  private resolvePrice(symbol: string, livePrice?: number, fallbackPrice?: number): number {
    const price = livePrice ?? fallbackPrice ?? WATCHLIST_BASE_PRICES[symbol];

    if (typeof price !== 'number' || Number.isNaN(price)) {
      this.logger.warn(`Missing price snapshot for ${symbol}; defaulting to zero`);
      return 0;
    }

    return Number(price.toFixed(2));
  }

  // Get a single stock snapshot by symbol
  async getStockSnapshot(symbol: string): Promise<StockSnapshot> {
    const normalizedSymbol = symbol.toUpperCase();
    const simulatorPrices = this.priceSimulator?.getCurrentPrices() ?? {};
    const matching = WATCHLIST_STOCKS.find((s) => s.symbol === normalizedSymbol);
    const name = matching?.name ?? normalizedSymbol;

    const liveUpdate = await this.finnhub?.fetchPriceViaRest(normalizedSymbol);
    const price = this.resolvePrice(normalizedSymbol, liveUpdate?.price, simulatorPrices[normalizedSymbol]);
    const fallbackBaseline = WATCHLIST_BASE_PRICES[normalizedSymbol] ?? price;
    const change = typeof liveUpdate?.change === 'number'
      ? Number(liveUpdate.change.toFixed(2))
      : Number((price - fallbackBaseline).toFixed(2));
    const changePercent = typeof liveUpdate?.changePercent === 'number'
      ? Number(liveUpdate.changePercent.toFixed(2))
      : (fallbackBaseline === 0 ? 0 : Number(((change / fallbackBaseline) * 100).toFixed(2)));

    return {
      id: normalizedSymbol,
      symbol: normalizedSymbol,
      name,
      price,
      change,
      changePercent,
      currency: 'USD',
      lastUpdated: liveUpdate?.timestamp ? new Date(liveUpdate.timestamp).toISOString() : new Date().toISOString(),
    };
  }

  async getStockDetails(symbol: string): Promise<StockDetailSnapshot> {
    const normalizedSymbol = symbol.toUpperCase();
    return STOCK_DETAILS_BASE[normalizedSymbol] ?? {
      high52w: 0,
      low52w: 0,
      marketCap: '—',
      volume: '—',
      pe: 0,
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

    const candles = await this.finnhub?.fetchCandlesViaRest(
      normalizedSymbol,
      config.resolution,
      fromSeconds,
      toSeconds,
    );

    if (candles && candles.length > 1) {
      return candles.map((point) => ({
        timestamp: new Date(point.timestamp * 1000).toISOString(),
        price: Number(point.price.toFixed(2)),
      }));
    }

    const simulatorPrices = this.priceSimulator?.getCurrentPrices() ?? {};
    const base = this.resolvePrice(
      normalizedSymbol,
      undefined,
      simulatorPrices[normalizedSymbol],
    );

    return this.buildSyntheticHistory(base, fromMs, nowMs, config.points);
  }

  private parseRange(requestedRange: string): StockHistoryRange {
    const normalizedRange = requestedRange.toUpperCase();
    if (normalizedRange in this.rangeConfigs) {
      return normalizedRange as StockHistoryRange;
    }
    return '1D';
  }

  private buildSyntheticHistory(
    basePrice: number,
    fromMs: number,
    toMs: number,
    pointCount: number,
  ): StockHistoryPoint[] {
    const safePoints = Math.max(2, pointCount);
    const span = Math.max(1, toMs - fromMs);
    const step = span / (safePoints - 1);

    return Array.from({ length: safePoints }, (_, index) => {
      const timestampMs = fromMs + (index * step);
      const drift = Math.sin(index / 6) * 0.01;
      const noise = Math.sin(index / 2.7) * 0.004;
      const price = basePrice * (1 + drift + noise);

      return {
        timestamp: new Date(timestampMs).toISOString(),
        price: Number(Math.max(0.01, price).toFixed(2)),
      };
    });
  }
}
