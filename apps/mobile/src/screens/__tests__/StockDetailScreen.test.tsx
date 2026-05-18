import React from 'react';
import { render } from '@testing-library/react-native';
import StockDetailScreen from '../StockDetailScreen';
import { useAppStore } from '../../store/appStore';
import { useSocket } from '../../hooks/useSocket';

let lastStockChartProps: any;

jest.mock('../../store/appStore');
jest.mock('../../hooks/useSocket');
jest.mock('../../components/StockChart', () => {
  return function MockStockChart(props: any) {
    lastStockChartProps = props;
    const ReactNative = require('react-native');
    return <ReactNative.Text>Mock StockChart</ReactNative.Text>;
  };
});

describe('StockDetailScreen', () => {
  const mockedUseAppStore = useAppStore as jest.Mock;
  const mockedUseSocket = useSocket as jest.Mock;
  let subscribe: jest.Mock;
  let unsubscribe: jest.Mock;

  beforeEach(() => {
    lastStockChartProps = undefined;
    subscribe = jest.fn();
    unsubscribe = jest.fn();

    mockedUseAppStore.mockReturnValue({
      stocks: [
        {
          id: '1',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 189,
        },
        {
          id: '2',
          symbol: 'MSFT',
          name: 'Microsoft Corp.',
          price: 412.3,
        },
      ],
      isLoading: false,
      error: null,
    });

    mockedUseSocket.mockReturnValue({
      lastKnownState: { symbol: 'AAPL', price: 191, change: 0, changePercent: 0, timestamp: new Date() },
      statusMessage: 'Connected',
      isOnline: true,
      connectionStatus: 'connected',
      subscribe,
      unsubscribe,
    });
  });

  it('renders live data from the socket feed', () => {
    const { getByText, unmount } = render(
      <StockDetailScreen route={{ params: { symbol: 'AAPL', name: 'Apple Inc.' } }} navigation={{}} />,
    );

    expect(getByText('AAPL')).toBeTruthy();
    expect(getByText('Apple Inc.')).toBeTruthy();
    expect(getByText(/\+0\.00% 24h/)).toBeTruthy();
    expect(subscribe).toHaveBeenCalledWith('AAPL');
    expect(lastStockChartProps.symbol).toBe('AAPL');
    expect(lastStockChartProps.baselinePrice).toBe(191);
    expect(lastStockChartProps.isLoading).toBe(false);
    expect(lastStockChartProps.error).toBeNull();
    expect(lastStockChartProps.rangeLabel).toBe('1D');
    expect(lastStockChartProps.data.length).toBeGreaterThanOrEqual(2);

    unmount();

    expect(unsubscribe).toHaveBeenCalledWith('AAPL');
  });

  it('uses stock-list cache data and falls back to the stored name', () => {
    mockedUseSocket.mockReturnValue({
      lastKnownState: null,
      statusMessage: 'Disconnected',
      isOnline: false,
      connectionStatus: 'disconnected',
      subscribe,
      unsubscribe,
    });

    const { getByText } = render(
      <StockDetailScreen route={{ params: { symbol: 'MSFT' } }} navigation={{}} />,
    );

    expect(getByText('Microsoft Corp.')).toBeTruthy();
    expect(getByText(/\+0\.00% 24h/)).toBeTruthy();
    expect(lastStockChartProps.baselinePrice).toBe(412.3);
    expect(lastStockChartProps.data.length).toBeGreaterThanOrEqual(2);
  });

  it('falls back to the default baseline when no stock matches', () => {
    mockedUseAppStore.mockReturnValue({
      stocks: [],
      isLoading: true,
      error: 'Network down',
    });
    mockedUseSocket.mockReturnValue({
      lastKnownState: { unexpected: true },
      statusMessage: 'Offline',
      isOnline: false,
      connectionStatus: 'offline',
      subscribe,
      unsubscribe,
    });

    const { getByText } = render(<StockDetailScreen route={{ params: { symbol: 'XYZ' } }} navigation={{}} />);

    expect(getByText('Stock details')).toBeTruthy();
    expect(getByText('+0.00% 24h')).toBeTruthy();
    expect(lastStockChartProps.baselinePrice).toBe(0);
    expect(lastStockChartProps.isLoading).toBe(true);
    expect(lastStockChartProps.error).toBe('Network down');
    expect(lastStockChartProps.data).toEqual([]);
  });

  it('falls back to the store price when no live update exists', () => {
    mockedUseSocket.mockReturnValue({
      lastKnownState: null,
      statusMessage: 'Disconnected',
      isOnline: false,
      connectionStatus: 'disconnected',
      subscribe,
      unsubscribe,
    });

    const { getByText } = render(
      <StockDetailScreen route={{ params: { symbol: 'AAPL', name: 'Apple Inc.' } }} navigation={{}} />,
    );

    expect(getByText('+0.00% 24h')).toBeTruthy();
    expect(lastStockChartProps.baselinePrice).toBe(189);
    expect(lastStockChartProps.data.length).toBeGreaterThanOrEqual(2);
  });
});
