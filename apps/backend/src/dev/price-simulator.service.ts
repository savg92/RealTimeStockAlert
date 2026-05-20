import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { PricePublisherService, type PriceTick } from '../redis/price-publisher.service';

@Injectable()
export class PriceSimulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriceSimulatorService.name);
  private simulationInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
  private readonly BASE_PRICES: Record<string, number> = {
    AAPL: 189.5,
    MSFT: 412.3,
    GOOGL: 138.75,
    AMZN: 180.2,
    TSLA: 242.5,
  };
  private priceHistory: Record<string, number> = { ...this.BASE_PRICES };

  constructor(@Optional() private readonly pricePublisher?: PricePublisherService) {
    Object.assign(this.priceHistory, this.BASE_PRICES);
  }

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_PRICE_SIMULATOR !== 'true') {
      this.logger.log('Price simulator disabled (set ENABLE_PRICE_SIMULATOR=true to enable)');
      return;
    }

    if (!this.pricePublisher) {
      this.logger.warn('PricePublisherService not available; price simulation disabled');
      return;
    }

    this.logger.log('🎬 Starting price simulator (development mode)');
    this.isRunning = true;
    this.startSimulation();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopSimulation();
  }

  private startSimulation(): void {
    // Publish a random stock price update every 2-4 seconds
    this.simulationInterval = setInterval(
      () => {
        try {
          const randomSymbol = this.SYMBOLS[Math.floor(Math.random() * this.SYMBOLS.length)];
          const volatility = 0.0015; // 0.15% max change per update
          const changePercent = (Math.random() - 0.5) * 2 * volatility;
          const newPrice = this.priceHistory[randomSymbol] * (1 + changePercent);

          this.priceHistory[randomSymbol] = Number(newPrice.toFixed(2));

          const tick: PriceTick = {
            symbol: randomSymbol,
            price: this.priceHistory[randomSymbol],
            timestamp: Date.now(),
            volume: Math.floor(Math.random() * 5000000) + 1000000,
          };

          this.pricePublisher?.publishPriceUpdate(tick).catch((error) => {
            this.logger.error(
              'Failed to publish simulated price',
              error instanceof Error ? error.message : String(error),
            );
          });

          this.logger.debug(`📊 Simulated price: ${randomSymbol} = $${tick.price}`);
        } catch (error) {
          this.logger.error(
            'Price simulation error',
            error instanceof Error ? error.stack : String(error),
          );
        }
      },
      2000 + Math.random() * 2000,
    ); // 2-4 seconds
  }

  private stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
      this.isRunning = false;
      this.logger.log('⏹️ Stopped price simulator');
    }
  }

  getCurrentPrices(): Record<string, number> {
    return this.isRunning ? { ...this.priceHistory } : {};
  }

  resetPrices(): void {
    Object.assign(this.priceHistory, this.BASE_PRICES);
    if (!this.isRunning) {
      return;
    }
    this.logger.log('🔄 Reset prices to baseline');
  }
}
