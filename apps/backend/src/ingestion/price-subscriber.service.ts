import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import * as redis from 'ioredis';

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

@Injectable()
export class PriceSubscriberService {
  private readonly logger = new Logger(PriceSubscriberService.name);
  private redisClient: Redis;
  private subscribers: Map<string, (update: PriceUpdate) => void> = new Map();
  private lastPrices: Map<string, number> = new Map();

  async onModuleInit() {
    this.redisClient = new redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis Subscriber Error:', err);
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Redis Subscriber connected');
    });

    this.startListening();
  }

  private async startListening() {
    const pubSub = this.redisClient.duplicate();

    pubSub.on('message', (channel: string, message: string) => {
      if (channel === 'price:updates') {
        try {
          const update: PriceUpdate = JSON.parse(message);
          this.handlePriceUpdate(update);
        } catch (error) {
          this.logger.error(`Failed to parse message: ${error}`);
        }
      }
    });

    await pubSub.subscribe('price:updates', (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe: ${err}`);
      } else {
        this.logger.log('Subscribed to price:updates channel');
      }
    });
  }

  private handlePriceUpdate(update: PriceUpdate) {
    const { symbol, price } = update;
    const lastPrice = this.lastPrices.get(symbol);

    // Suppress duplicate ticks (same price)
    if (lastPrice === price) {
      this.logger.debug(`Suppressed duplicate tick: ${symbol} @ $${price}`);
      return;
    }

    this.lastPrices.set(symbol, price);

    // Notify all subscribers
    const callback = this.subscribers.get(symbol);
    if (callback) {
      callback(update);
    }
  }

  subscribe(symbol: string, callback: (update: PriceUpdate) => void) {
    this.subscribers.set(symbol, callback);
    this.logger.log(`Subscribed to ${symbol} price updates`);
  }

  unsubscribe(symbol: string) {
    this.subscribers.delete(symbol);
    this.logger.log(`Unsubscribed from ${symbol} price updates`);
  }

  getLastPrice(symbol: string): number | undefined {
    return this.lastPrices.get(symbol);
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
