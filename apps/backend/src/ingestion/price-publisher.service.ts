import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import * as redis from 'ioredis';

@Injectable()
export class PricePublisherService {
  private readonly logger = new Logger(PricePublisherService.name);
  private redisClient: Redis;

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
      this.logger.error('Redis Publisher Error:', err);
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Redis Publisher connected');
    });
  }

  async publishPrice(symbol: string, price: number, timestamp: number) {
    try {
      const payload = JSON.stringify({
        symbol,
        price,
        timestamp,
      });

      await this.redisClient.publish('price:updates', payload);
      this.logger.debug(`Published price update: ${symbol} @ $${price}`);
    } catch (error) {
      this.logger.error(`Failed to publish price: ${error}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
