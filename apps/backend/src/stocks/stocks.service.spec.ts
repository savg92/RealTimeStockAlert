import { Test } from '@nestjs/testing';
import { FinnhubService } from '../finnhub/finnhub.service';
import { PriceSimulatorService } from '../dev/price-simulator.service';
import { StocksService } from './stocks.service';

describe('StocksService', () => {
  it('prefers live Finnhub prices and falls back to simulator data', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        StocksService,
        {
          provide: PriceSimulatorService,
          useValue: {
            getCurrentPrices: jest.fn().mockReturnValue({
              AAPL: 190.1,
              MSFT: 413.4,
              GOOGL: 140.2,
              AMZN: 181.5,
              TSLA: 243.1,
            }),
          },
        },
        {
          provide: FinnhubService,
          useValue: {
            fetchPriceViaRest: jest.fn(async (symbol: string) => (
              symbol === 'AAPL' ? { symbol, price: 191.25, timestamp: 1710000000000 } : null
            )),
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
});
