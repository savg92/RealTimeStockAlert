import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PriceSubscriberService,
  REDIS_PRICE_CHANNEL,
  REDIS_SUBSCRIBER_CLIENT,
} from './price-subscriber.service';

describe('PriceSubscriberService', () => {
  const handlers: Array<(message: string) => void> = [];
  const originalNodeEnv = process.env.NODE_ENV;
  const redis = {
    subscribe: jest.fn(async (_channel: string, handler: (message: string) => void) => {
      handlers.push(handler);
    }),
    unsubscribe: jest.fn(),
    connect: jest.fn(),
    quit: jest.fn(),
    isReady: true,
  };

  beforeEach(() => {
    handlers.length = 0;
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('subscribes to updates and emits unique ticks', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PriceSubscriberService,
        { provide: REDIS_SUBSCRIBER_CLIENT, useValue: redis },
        { provide: REDIS_PRICE_CHANNEL, useValue: 'price-updates' },
      ],
    }).compile();

    const service = moduleRef.get(PriceSubscriberService);
    const onUpdate = jest.fn();
    service.onPriceUpdate(onUpdate);

    await service.startListening();
    expect(redis.subscribe).toHaveBeenCalledWith('price-updates', expect.any(Function));

    const payload = JSON.stringify({
      symbol: 'AAPL',
      price: 150.25,
      timestamp: 1234567890,
      volume: 100,
    });

    handlers[0](payload);
    handlers[0](payload);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({
      symbol: 'AAPL',
      price: 150.25,
      timestamp: 1234567890,
      volume: 100,
    });
    expect(service.getChannelHealth()).toMatchObject({
      channel: 'price-updates',
      subscribed: true,
      receivedCount: 1,
      suppressedDuplicateCount: 1,
    });
  });

  it('stops listening and reports channel health', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PriceSubscriberService,
        { provide: REDIS_SUBSCRIBER_CLIENT, useValue: redis },
        { provide: REDIS_PRICE_CHANNEL, useValue: 'price-updates' },
      ],
    }).compile();

    const service = moduleRef.get(PriceSubscriberService);

    await service.startListening();
    await service.stopListening();

    expect(redis.unsubscribe).toHaveBeenCalledWith('price-updates', expect.any(Function));
    expect(service.getChannelHealth()).toMatchObject({
      subscribed: false,
    });
  });

  it('warns when startup subscription cannot connect but keeps the app booting', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        PriceSubscriberService,
        { provide: REDIS_SUBSCRIBER_CLIENT, useValue: redis },
        { provide: REDIS_PRICE_CHANNEL, useValue: 'price-updates' },
      ],
    }).compile();

    const service = moduleRef.get(PriceSubscriberService);
    const startListening = jest
      .spyOn(service, 'startListening')
      .mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(startListening).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Redis subscription for price-updates is unavailable at startup: ECONNREFUSED',
      ),
    );
    expect(errorSpy).not.toHaveBeenCalled();
    expect(service.getChannelHealth()).toMatchObject({
      subscribed: false,
      lastError: 'ECONNREFUSED',
    });
  });
});
