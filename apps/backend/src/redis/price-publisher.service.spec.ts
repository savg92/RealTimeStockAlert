import { Test } from '@nestjs/testing';
import { PricePublisherService, REDIS_PUBLISHER_CLIENT, REDIS_PRICE_CHANNEL } from './price-publisher.service';

describe('PricePublisherService', () => {
  const redis = {
    publish: jest.fn(),
    isReady: true,
    connect: jest.fn(),
    quit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes a unique tick to redis and updates health', async () => {
    redis.publish.mockResolvedValue(1);

    const moduleRef = await Test.createTestingModule({
      providers: [
        PricePublisherService,
        { provide: REDIS_PUBLISHER_CLIENT, useValue: redis },
        { provide: REDIS_PRICE_CHANNEL, useValue: 'price-updates' },
      ],
    }).compile();

    const service = moduleRef.get(PricePublisherService);

    await expect(
      service.publishPriceUpdate({
        symbol: 'AAPL',
        price: 150.25,
        timestamp: 1234567890,
        volume: 100,
      }),
    ).resolves.toBe(true);

    expect(redis.publish).toHaveBeenCalledWith(
      'price-updates',
      JSON.stringify({
        symbol: 'AAPL',
        price: 150.25,
        timestamp: 1234567890,
        volume: 100,
      }),
    );

    expect(service.getChannelHealth()).toMatchObject({
      channel: 'price-updates',
      connected: true,
      publishedCount: 1,
      suppressedDuplicateCount: 0,
    });
  });

  it('suppresses duplicate ticks for the same symbol payload', async () => {
    redis.publish.mockResolvedValue(1);

    const moduleRef = await Test.createTestingModule({
      providers: [
        PricePublisherService,
        { provide: REDIS_PUBLISHER_CLIENT, useValue: redis },
        { provide: REDIS_PRICE_CHANNEL, useValue: 'price-updates' },
      ],
    }).compile();

    const service = moduleRef.get(PricePublisherService);

    const tick = {
      symbol: 'AAPL',
      price: 150.25,
      timestamp: 1234567890,
      volume: 100,
    };

    await expect(service.publishPriceUpdate(tick)).resolves.toBe(true);
    await expect(service.publishPriceUpdate(tick)).resolves.toBe(false);

    expect(redis.publish).toHaveBeenCalledTimes(1);
    expect(service.getChannelHealth()).toMatchObject({
      publishedCount: 1,
      suppressedDuplicateCount: 1,
    });
  });
});
