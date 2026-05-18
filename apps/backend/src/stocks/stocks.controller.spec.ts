import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';

describe('StocksController', () => {
  it('returns the current watchlist snapshot', async () => {
    const service = {
      getWatchlistSnapshot: jest.fn().mockResolvedValue([
        { id: 'AAPL', symbol: 'AAPL', name: 'Apple Inc.', price: 191.25 },
      ]),
      getStockSnapshot: jest.fn().mockResolvedValue({ id: 'AAPL', symbol: 'AAPL', name: 'Apple Inc.', price: 191.25 }),
      getStockDetails: jest.fn().mockResolvedValue({ high52w: 245.89, low52w: 165.23, marketCap: '3.2T', volume: '52.4M', pe: 28.5 }),
      getStockHistory: jest.fn().mockResolvedValue([{ timestamp: '2026-01-01T00:00:00.000Z', price: 191.25 }]),
    } as unknown as StocksService;

    const controller = new StocksController(service);
    await expect(controller.getPrices()).resolves.toEqual([
      { id: 'AAPL', symbol: 'AAPL', name: 'Apple Inc.', price: 191.25 },
    ]);
  });

  it('returns stock details and history for requested symbol and range', async () => {
    const service = {
      getWatchlistSnapshot: jest.fn(),
      getStockSnapshot: jest.fn(),
      getStockDetails: jest.fn().mockResolvedValue({ high52w: 245.89, low52w: 165.23, marketCap: '3.2T', volume: '52.4M', pe: 28.5 }),
      getStockHistory: jest.fn().mockResolvedValue([{ timestamp: '2026-01-01T00:00:00.000Z', price: 191.25 }]),
    } as unknown as StocksService;
    const controller = new StocksController(service);

    await expect(controller.getStockDetails('AAPL')).resolves.toEqual({
      high52w: 245.89,
      low52w: 165.23,
      marketCap: '3.2T',
      volume: '52.4M',
      pe: 28.5,
    });
    await expect(controller.getStockHistory('AAPL', '1D')).resolves.toEqual([
      { timestamp: '2026-01-01T00:00:00.000Z', price: 191.25 },
    ]);
  });
});
