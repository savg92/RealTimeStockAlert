import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createClient } from 'redis';
import { PricePublisherService } from './price-publisher.service';
import { PriceSubscriberService } from './price-subscriber.service';
import { REDIS_PRICE_CHANNEL, REDIS_PUBLISHER_CLIENT, REDIS_SUBSCRIBER_CLIENT } from './redis.tokens';

const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const DEFAULT_PRICE_CHANNEL = 'price-updates';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_PRICE_CHANNEL,
      useValue: process.env.REDIS_PRICE_CHANNEL || DEFAULT_PRICE_CHANNEL,
    },
    {
      provide: REDIS_PUBLISHER_CLIENT,
      useFactory: () => createClient({ url: process.env.REDIS_URL || DEFAULT_REDIS_URL }),
    },
    {
      provide: REDIS_SUBSCRIBER_CLIENT,
      useFactory: () => createClient({ url: process.env.REDIS_URL || DEFAULT_REDIS_URL }),
    },
    PricePublisherService,
    PriceSubscriberService,
  ],
  exports: [PricePublisherService, PriceSubscriberService, REDIS_PRICE_CHANNEL],
})
export class RedisModule {}
