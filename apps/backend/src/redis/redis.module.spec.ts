import { Test } from '@nestjs/testing';
import { RedisModule } from './redis.module';
import { PricePublisherService } from './price-publisher.service';
import { PriceSubscriberService } from './price-subscriber.service';

describe('RedisModule', () => {
  it('exposes publisher and subscriber services', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RedisModule],
    }).compile();

    expect(moduleRef.get(PricePublisherService)).toBeDefined();
    expect(moduleRef.get(PriceSubscriberService)).toBeDefined();
  });
});
