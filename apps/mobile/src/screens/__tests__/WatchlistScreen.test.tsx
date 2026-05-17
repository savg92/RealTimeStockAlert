import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import WatchlistScreen from '../WatchlistScreen';
import { useAppStore } from '../../store/appStore';
import { useSocket } from '../../hooks/useSocket';

jest.mock('../../store/appStore');
jest.mock('../../hooks/useSocket');

describe('WatchlistScreen', () => {
  const mockedUseAppStore = useAppStore as jest.Mock;
  const mockedUseSocket = useSocket as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseAppStore.mockReturnValue({
      stocks: [],
      isLoading: false,
      error: null,
    });

    mockedUseSocket.mockReturnValue({
      connectionStatus: 'connected',
      statusMessage: 'Connected',
      isOnline: true,
    });
  });

  it('renders fallback stocks when the store is empty', () => {
    const { getByText, getByTestId } = render(<WatchlistScreen navigation={{ navigate: jest.fn() }} />);

    expect(getByText('My Watchlist')).toBeTruthy();
    expect(getByText('5 stocks tracked')).toBeTruthy();
    expect(getByTestId('stock-item-AAPL')).toBeTruthy();
  });

  it('shows loading, error, and disconnected states while navigating to a stock', () => {
    const navigate = jest.fn();
    mockedUseAppStore.mockReturnValue({
      stocks: [
        { id: '1', symbol: 'AAPL', name: 'Apple Inc.', price: 189.5 },
        { id: '2', symbol: 'MSFT', name: 'Microsoft Corp.', price: 412.3 },
      ],
      isLoading: true,
      error: 'Network down',
    });
    mockedUseSocket.mockReturnValue({
      connectionStatus: 'reconnecting',
      statusMessage: 'Reconnecting',
      isOnline: false,
    });

    const { getByText, getByTestId } = render(<WatchlistScreen navigation={{ navigate }} />);

    expect(getByText('2 stocks tracked')).toBeTruthy();
    expect(getByText('Reconnecting • Offline')).toBeTruthy();
    expect(getByText('Loading live prices…')).toBeTruthy();
    expect(getByText('Connection: reconnecting')).toBeTruthy();

    fireEvent.press(getByTestId('stock-item-AAPL'));
    expect(navigate).toHaveBeenCalledWith('StockDetail', { symbol: 'AAPL' });
  });
});
