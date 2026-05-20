import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { WatchlistService } from './watchlist/watchlist.service';
import { FinnhubService } from './finnhub/finnhub.service';

@Injectable()
export class AppInitializerService implements OnModuleInit {
  private readonly logger = new Logger(AppInitializerService.name);

  constructor(
    private readonly watchlist: WatchlistService,
    @Optional() private readonly finnhub?: FinnhubService,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    try {
      // Ensure Finnhub is connected before loading watchlist
      if (this.finnhub) {
        await this.finnhub.connect();
      }

      // Load all watchlisted symbols and subscribe to Finnhub
      const symbols = await this.watchlist.loadAllWatchlistedSymbols();
      this.logger.log(`Initialized watchlist with ${symbols.size} symbols`);
    } catch (error) {
      this.logger.error('Failed to initialize app', error instanceof Error ? error.message : error);
    }
  }
}
