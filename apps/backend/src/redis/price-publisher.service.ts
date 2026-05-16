import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { REDIS_PRICE_CHANNEL, REDIS_PUBLISHER_CLIENT } from './redis.tokens';
import type { ChannelHealth, PriceTick } from './redis.types';

export { REDIS_PRICE_CHANNEL, REDIS_PUBLISHER_CLIENT } from './redis.tokens';
export type { PriceTick } from './redis.types';

@Injectable()
export class PricePublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(PricePublisherService.name);
  private readonly lastTickBySymbol = new Map<string, string>();
  private readonly health: ChannelHealth = {
    channel: '',
    connected: false,
    subscribed: false,
    publishedCount: 0,
    receivedCount: 0,
    suppressedDuplicateCount: 0,
  };

  constructor(
    @Inject(REDIS_PUBLISHER_CLIENT)
    private readonly redis: RedisClientType,
    @Inject(REDIS_PRICE_CHANNEL)
    private readonly channel: string,
  ) {
    this.health.channel = channel;
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  async publishPriceUpdate(update: PriceTick): Promise<boolean> {
    await this.ensureConnected();

    const fingerprint = this.createFingerprint(update);
    const previousFingerprint = this.lastTickBySymbol.get(update.symbol);

    if (previousFingerprint === fingerprint) {
      this.health.suppressedDuplicateCount += 1;
      return false;
    }

    try {
      await this.redis.publish(this.channel, JSON.stringify(update));
      this.lastTickBySymbol.set(update.symbol, fingerprint);
      this.health.publishedCount += 1;
      this.health.lastPublishedAt = new Date().toISOString();
      return true;
    } catch (error) {
      this.health.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to publish price update to ${this.channel}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  getChannelHealth(): ChannelHealth {
    return {
      ...this.health,
      connected: this.redis.isReady,
    };
  }

  private async ensureConnected(): Promise<void> {
    if (this.redis.isOpen || this.redis.isReady) {
      this.health.connected = true;
      return;
    }

    await this.redis.connect();
    this.health.connected = true;
  }

  private async close(): Promise<void> {
    if (this.redis.isOpen) {
      await this.redis.quit();
    }
  }

  private createFingerprint(update: PriceTick): string {
    return [update.symbol, update.price, update.timestamp, update.volume ?? ''].join(':');
  }
}
