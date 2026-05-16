import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { REDIS_PRICE_CHANNEL, REDIS_SUBSCRIBER_CLIENT } from './redis.tokens';
import type { ChannelHealth, PriceTick } from './redis.types';

export { REDIS_PRICE_CHANNEL, REDIS_SUBSCRIBER_CLIENT } from './redis.tokens';
export type { PriceTick } from './redis.types';

type PriceListener = (update: PriceTick) => void;

@Injectable()
export class PriceSubscriberService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriceSubscriberService.name);
  private readonly listeners: PriceListener[] = [];
  private readonly lastTickBySymbol = new Map<string, string>();
  private readonly health: ChannelHealth = {
    channel: '',
    connected: false,
    subscribed: false,
    publishedCount: 0,
    receivedCount: 0,
    suppressedDuplicateCount: 0,
  };
  private subscriptionHandler?: (message: string) => Promise<void>;

  constructor(
    @Inject(REDIS_SUBSCRIBER_CLIENT)
    private readonly redis: RedisClientType,
    @Inject(REDIS_PRICE_CHANNEL)
    private readonly channel: string,
  ) {
    this.health.channel = channel;
  }

  async onModuleDestroy(): Promise<void> {
    await this.stopListening();
    if (this.redis.isOpen) {
      await this.redis.quit();
    }
  }

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    try {
      await this.startListening();
    } catch (error) {
      this.health.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to start Redis subscription for ${this.channel}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  onPriceUpdate(listener: PriceListener): void {
    this.listeners.push(listener);
  }

  async startListening(): Promise<void> {
    if (this.health.subscribed) {
      return;
    }

    await this.ensureConnected();
    this.subscriptionHandler = async (message: string) => {
      this.handleRedisMessage(message);
    };

    await this.redis.subscribe(this.channel, this.subscriptionHandler);
    this.health.subscribed = true;
  }

  async stopListening(): Promise<void> {
    if (!this.health.subscribed || !this.subscriptionHandler) {
      return;
    }

    await this.redis.unsubscribe(this.channel, this.subscriptionHandler);
    this.health.subscribed = false;
    this.subscriptionHandler = undefined;
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

  private handleRedisMessage(message: string): void {
    try {
      const update = JSON.parse(message) as PriceTick;
      const fingerprint = this.createFingerprint(update);
      const previousFingerprint = this.lastTickBySymbol.get(update.symbol);

      if (previousFingerprint === fingerprint) {
        this.health.suppressedDuplicateCount += 1;
        return;
      }

      this.lastTickBySymbol.set(update.symbol, fingerprint);
      this.health.receivedCount += 1;
      this.health.lastMessageAt = new Date().toISOString();

      for (const listener of this.listeners) {
        try {
          listener(update);
        } catch (error) {
          this.logger.error(
            'Price listener failed',
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    } catch (error) {
      this.health.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to parse price message from ${this.channel}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private createFingerprint(update: PriceTick): string {
    return [update.symbol, update.price, update.timestamp, update.volume ?? ''].join(':');
  }
}
