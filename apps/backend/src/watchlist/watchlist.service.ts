import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { FinnhubService } from '../finnhub/finnhub.service';

@Injectable()
export class WatchlistService {
  private readonly logger = new Logger(WatchlistService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly finnhub: FinnhubService,
  ) {}

  async addItem(userId: string, symbol: string, name?: string) {
    try {
      // Ensure the user exists (dev helper)
      try {
        await this.prisma.user.upsert({
          where: { id: userId },
          create: { id: userId, email: `dev+${userId}@test.local`, firebaseId: `dev-firebase-id-${userId}` },
          update: { firebaseId: `dev-firebase-id-${userId}` },
        });
      } catch (e) {
        // ignore user creation errors; will surface on watchlist upsert if real problem
      }

      // Upsert by composite unique (userId + symbol)
      const item = await this.prisma.watchlistItem.upsert({
        where: { userId_symbol: { userId, symbol } },
        create: { userId, symbol, name },
        update: { name },
      });

      // Subscribe to price updates in Finnhub
      this.finnhub.subscribe(symbol);
      this.logger.debug(`Subscribed to ${symbol} in Finnhub`);

      return item;
    } catch (error) {
      this.logger.error('Failed to add watchlist item', error as any);
      // Also print to stdout/stderr for visibility in the dev log
      // eslint-disable-next-line no-console
      console.error('Failed to add watchlist item', error);
      throw error;
    }
  }

  async removeItem(userId: string, symbol: string) {
    try {
      const result = await this.prisma.watchlistItem.deleteMany({ where: { userId, symbol } });

      // Check if any other users are watching this symbol
      const stillWatched = await this.prisma.watchlistItem.count({
        where: { symbol },
      });

      // If no one is watching this symbol anymore, unsubscribe
      if (stillWatched === 0) {
        this.finnhub.unsubscribe(symbol);
        this.logger.debug(`Unsubscribed from ${symbol} in Finnhub (no more watchers)`);
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to remove watchlist item', error as any);
      throw error;
    }
  }

  async listForUser(userId: string) {
    try {
      return await this.prisma.watchlistItem.findMany({ where: { userId } });
    } catch (error) {
      this.logger.error('Failed to list watchlist items', error as any);
      throw error;
    }
  }

  async loadAllWatchlistedSymbols() {
    try {
      const items = await this.prisma.watchlistItem.findMany();
      const symbols = new Set<string>(items.map((item: any) => item.symbol));

      for (const symbol of symbols) {
        this.finnhub.subscribe(symbol);
        this.logger.debug(`Loaded watchlist subscription for ${symbol}`);
      }

      this.logger.log(`Loaded ${symbols.size} unique symbols from watchlist`);
      return symbols;
    } catch (error) {
      this.logger.error('Failed to load watchlist symbols', error as any);
      throw error;
    }
  }
}
