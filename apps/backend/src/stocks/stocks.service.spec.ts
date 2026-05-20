import { Test } from '@nestjs/testing';
import { FinnhubService } from '../finnhub/finnhub.service';
import { REDIS_PUBLISHER_CLIENT } from '../redis/redis.tokens';
import { StocksService } from './stocks.service';

describe('StocksService', () => {
  it('uses live Finnhub prices for watchlist snapshots', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        StocksService,
        {
          provide: FinnhubService,
          useValue: {
            fetchPriceViaRest: jest.fn(async (symbol: string) => {
              const livePrices: Record<string, number> = {
                AAPL: 191.25,
                MSFT: 413.4,
                GOOGL: 140.2,
                AMZN: 181.5,
                TSLA: 243.1,
              };

              const price = livePrices[symbol];

              return typeof price === 'number' ? { symbol, price, timestamp: 1710000000000 } : null;
            }),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(StocksService);
    const snapshot = await service.getWatchlistSnapshot();

    expect(snapshot).toHaveLength(5);
    expect(snapshot[0]).toMatchObject({
      id: 'AAPL',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 191.25,
      currency: 'USD',
    });
    expect(snapshot[1]).toMatchObject({
      id: 'MSFT',
      symbol: 'MSFT',
      price: 413.4,
    });
  });

  it('rejects history requests when candles are unavailable', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        StocksService,
        {
          provide: REDIS_PUBLISHER_CLIENT,
          useValue: {
            isOpen: false,
            isReady: false,
            connect: jest.fn(),
            get: jest.fn(),
            setEx: jest.fn(),
          },
        },
        {
          provide: FinnhubService,
          useValue: {
            fetchCandlesViaRest: jest.fn(async () => null),
            fetchPriceViaRest: jest.fn(async () => ({
              symbol: 'AAPL',
              price: 297.84,
              timestamp: 1710000000000,
            })),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(StocksService);
    await expect(service.getStockHistory('AAPL', '1D')).rejects.toThrow(
      'Live chart data is unavailable for AAPL right now.',
    );
  });

  it('returns cached history when Finnhub candles are unavailable', async () => {
    const cachedHistory = [
      { timestamp: '2026-01-01T00:00:00.000Z', price: 191.25 },
      { timestamp: '2026-01-01T00:15:00.000Z', price: 192.1 },
    ];

    const moduleRef = await Test.createTestingModule({
      providers: [
        StocksService,
        {
          provide: REDIS_PUBLISHER_CLIENT,
          useValue: {
            isOpen: true,
            isReady: true,
            connect: jest.fn(),
            get: jest.fn().mockResolvedValue(JSON.stringify(cachedHistory)),
            setEx: jest.fn(),
          },
        },
        {
          provide: FinnhubService,
          useValue: {
            fetchCandlesViaRest: jest.fn(async () => null),
            fetchPriceViaRest: jest.fn(async () => ({
              symbol: 'AAPL',
              price: 297.84,
              timestamp: 1710000000000,
            })),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(StocksService);

    await expect(service.getStockHistory('AAPL', '1D')).resolves.toEqual(cachedHistory);
  });
});
