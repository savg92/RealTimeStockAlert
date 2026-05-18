import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import WatchlistScreen from '../WatchlistScreen';
import { useAppStore } from '../../store/appStore';
import { useSocket } from '../../hooks/useSocket';

jest.mock('../../store/appStore');
jest.mock('../../hooks/useSocket');

describe('WatchlistScreen', () => {
  const mockedUseAppStore = useAppStore as jest.Mock;
  const mockedUseSocket = useSocket as jest.Mock;
  let subscribe: jest.Mock;
  let unsubscribe: jest.Mock;
  let fetchPricesViaRest: jest.Mock;
  let storeState: any;

  beforeEach(() => {
    jest.clearAllMocks();
    subscribe = jest.fn();
    unsubscribe = jest.fn();
    fetchPricesViaRest = jest.fn().mockResolvedValue([
      { id: 'AAPL', symbol: 'AAPL', name: 'Apple Inc.', price: 191.25, change: 1.75, changePercent: 0.92, currency: 'USD', lastUpdated: '2026-05-18T00:00:00.000Z' },
      { id: 'MSFT', symbol: 'MSFT', name: 'Microsoft Corp.', price: 413.4, change: 1.1, changePercent: 0.27, currency: 'USD', lastUpdated: '2026-05-18T00:00:00.000Z' },
      { id: 'GOOGL', symbol: 'GOOGL', name: 'Alphabet Inc.', price: 140.2, change: 1.45, changePercent: 1.05, currency: 'USD', lastUpdated: '2026-05-18T00:00:00.000Z' },
      { id: 'AMZN', symbol: 'AMZN', name: 'Amazon.com Inc.', price: 181.5, change: 1.3, changePercent: 0.72, currency: 'USD', lastUpdated: '2026-05-18T00:00:00.000Z' },
      { id: 'TSLA', symbol: 'TSLA', name: 'Tesla Inc.', price: 243.1, change: 0.6, changePercent: 0.25, currency: 'USD', lastUpdated: '2026-05-18T00:00:00.000Z' },
    ]);
    storeState = {
      stocks: [],
      isLoading: false,
      error: null,
      setStocks: jest.fn((stocks: unknown[]) => {
        storeState.stocks = stocks;
      }),
      setLoading: jest.fn((loading: boolean) => {
        storeState.isLoading = loading;
      }),
      setError: jest.fn((error: string | null) => {
        storeState.error = error;
      }),
      updateStock: jest.fn(),
    };

    mockedUseAppStore.mockImplementation((selector?: (state: any) => unknown) => (
      typeof selector === 'function' ? selector(storeState) : storeState
    ));

    mockedUseSocket.mockReturnValue({
      connectionStatus: 'connected',
      statusMessage: 'Connected',
      isOnline: true,
      subscribe,
      unsubscribe,
      fetchPricesViaRest,
    });
  });

  it('hydrates the watchlist from backend prices and subscribes live updates', async () => {
    const screen = render(
      <WatchlistScreen navigation={{ navigate: jest.fn() }} />,
    );

    const { getByText, getByTestId, unmount, rerender } = screen;

    expect(getByText('My Watchlist')).toBeTruthy();
    expect(getByText('0 stocks tracked')).toBeTruthy();
    await waitFor(() => expect(fetchPricesViaRest).toHaveBeenCalled());
    await waitFor(() => expect(storeState.setStocks).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ symbol: 'AAPL', price: 191.25 }),
        expect.objectContaining({ symbol: 'TSLA', price: 243.1 }),
      ]),
    ));
    rerender(<WatchlistScreen navigation={{ navigate: jest.fn() }} />);
    expect(getByText('5 stocks tracked')).toBeTruthy();
    expect(getByTestId('stock-item-AAPL')).toBeTruthy();
    expect(subscribe).toHaveBeenCalledWith('AAPL');
    expect(subscribe).toHaveBeenCalledWith('MSFT');

    unmount();

    expect(unsubscribe).toHaveBeenCalledWith('AAPL');
    expect(unsubscribe).toHaveBeenCalledWith('TSLA');
  });

  it('shows error and disconnected states while navigating to a stock', () => {
    const navigate = jest.fn();
    storeState = {
      stocks: [
        { id: '1', symbol: 'AAPL', name: 'Apple Inc.', price: 189.5 },
        { id: '2', symbol: 'MSFT', name: 'Microsoft Corp.', price: 412.3 },
      ],
      isLoading: true,
      error: 'Network down',
      setStocks: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      updateStock: jest.fn(),
    };
    mockedUseSocket.mockReturnValue({
      connectionStatus: 'reconnecting',
      statusMessage: 'Reconnecting',
      isOnline: false,
      subscribe,
      unsubscribe,
      fetchPricesViaRest,
    });

    const { getByText, getByTestId, queryByText } = render(<WatchlistScreen navigation={{ navigate }} />);

    expect(getByText('2 stocks tracked')).toBeTruthy();
    expect(getByText('Reconnecting • Offline')).toBeTruthy();
    expect(queryByText('Loading live prices…')).toBeNull();
    expect(getByText('Connection: reconnecting')).toBeTruthy();

    fireEvent.press(getByTestId('stock-item-AAPL'));
    expect(navigate).toHaveBeenCalledWith('StockDetail', { symbol: 'AAPL' });
  });
});
