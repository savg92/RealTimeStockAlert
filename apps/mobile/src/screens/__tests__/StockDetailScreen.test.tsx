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

  beforeEach(() => {
    lastStockChartProps = undefined;

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
    });
  });

  it('renders live data from the socket feed', () => {
    const { getByText } = render(
      <StockDetailScreen route={{ params: { symbol: 'AAPL', name: 'Apple Inc.' } }} navigation={{}} />,
    );

    expect(getByText('AAPL')).toBeTruthy();
    expect(getByText('Apple Inc.')).toBeTruthy();
    expect(getByText('Connected • Online feed')).toBeTruthy();
    expect(lastStockChartProps.symbol).toBe('AAPL');
    expect(lastStockChartProps.baselinePrice).toBe(188.5);
    expect(lastStockChartProps.isLoading).toBe(false);
    expect(lastStockChartProps.error).toBeNull();
    expect(lastStockChartProps.data[0].price).toBe(Number((191 * 0.992).toFixed(2)));
  });

  it('uses stock-list cache data and falls back to the stored name', () => {
    mockedUseSocket.mockReturnValue({
      lastKnownState: [
        { symbol: 'AAPL', price: 204 },
        { symbol: 'MSFT', price: 250 },
      ],
      statusMessage: 'Disconnected',
      isOnline: false,
    });

    const { getByText } = render(
      <StockDetailScreen route={{ params: { symbol: 'MSFT' } }} navigation={{}} />,
    );

    expect(getByText('Microsoft Corp.')).toBeTruthy();
    expect(getByText('Disconnected • Fallback data')).toBeTruthy();
    expect(lastStockChartProps.baselinePrice).toBe(409.8);
    expect(lastStockChartProps.data[0].price).toBe(Number((250 * 0.992).toFixed(2)));
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
    });

    const { getByText } = render(<StockDetailScreen route={{ params: { symbol: 'XYZ' } }} navigation={{}} />);

    expect(getByText('Stock details')).toBeTruthy();
    expect(getByText('Offline • Fallback data')).toBeTruthy();
    expect(lastStockChartProps.baselinePrice).toBe(100);
    expect(lastStockChartProps.isLoading).toBe(true);
    expect(lastStockChartProps.error).toBe('Network down');
    expect(lastStockChartProps.data[0].price).toBe(Number((100 * 0.992).toFixed(2)));
  });

  it('falls back to the store price when stock list cache has no matching symbol', () => {
    mockedUseSocket.mockReturnValue({
      lastKnownState: [
        { symbol: 'GOOGL', price: 400 },
        { symbol: 'TSLA', price: 300 },
      ],
      statusMessage: 'Disconnected',
      isOnline: false,
    });

    const { getByText } = render(
      <StockDetailScreen route={{ params: { symbol: 'AAPL', name: 'Apple Inc.' } }} navigation={{}} />,
    );

    expect(getByText('Disconnected • Fallback data')).toBeTruthy();
    expect(lastStockChartProps.baselinePrice).toBe(188.5);
    expect(lastStockChartProps.data[0].price).toBe(Number((189 * 0.992).toFixed(2)));
  });
});
