import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useSocket } from '../hooks/useSocket';
import { useAppStore } from '../store/appStore';
import type { RealTimeUpdate } from '../types';
import StockChart, { StockChartPoint } from '../components/StockChart';

type StockDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'StockDetail'>;

interface StockListItem {
  symbol: string;
  price: number;
}

const MOCK_BASELINE: Record<string, number> = {
  AAPL: 188.5,
  MSFT: 409.8,
  GOOGL: 140.1,
  AMZN: 177.4,
  TSLA: 246.2,
};

const isRealTimeUpdate = (value: unknown): value is RealTimeUpdate => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const maybeUpdate = value as Partial<RealTimeUpdate>;
  return typeof maybeUpdate.symbol === 'string' && typeof maybeUpdate.price === 'number';
};

const isStockList = (value: unknown): value is StockListItem[] => (
  Array.isArray(value)
    && value.every((item) => (
      typeof item === 'object'
      && item !== null
      && 'symbol' in item
      && 'price' in item
      && typeof (item as StockListItem).symbol === 'string'
      && typeof (item as StockListItem).price === 'number'
    ))
);

const createChartSeries = (price: number): StockChartPoint[] => {
  const now = Date.now();
  const multipliers = [0.992, 0.998, 1.004, 1.001, 1.009, 1.012, 1.006, 1.01];

  return multipliers.map((factor, index) => ({
    price: Number((price * factor).toFixed(2)),
    timestamp: new Date(now - ((multipliers.length - index - 1) * 5 * 60_000)).toISOString(),
  }));
};

export default function StockDetailScreen({ route }: StockDetailScreenProps) {
  const { symbol, name } = route.params;
  const { stocks, isLoading, error } = useAppStore();
  const { lastKnownState, statusMessage, isOnline } = useSocket();

  const matchingStock = React.useMemo(
    () => stocks.find((stock) => stock.symbol === symbol),
    [stocks, symbol],
  );

  const livePrice = React.useMemo(() => {
    if (isRealTimeUpdate(lastKnownState) && lastKnownState.symbol === symbol) {
      return lastKnownState.price;
    }

    if (isStockList(lastKnownState)) {
      const matched = lastKnownState.find((stock) => stock.symbol === symbol);
      return matched?.price ?? null;
    }

    return null;
  }, [lastKnownState, symbol]);

  const baselinePrice = MOCK_BASELINE[symbol] ?? matchingStock?.price ?? 100;
  const resolvedPrice = livePrice ?? matchingStock?.price ?? baselinePrice;
  const chartData = createChartSeries(resolvedPrice);

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}>
      <View className="mb-6">
        <Text className="text-2xl font-bold text-text">{symbol}</Text>
        <Text className="text-sm text-text-secondary">{name ?? matchingStock?.name ?? 'Stock details'}</Text>
        <Text className="text-xs text-text-secondary mt-1">
          {statusMessage} {isOnline ? '• Online feed' : '• Fallback data'}
        </Text>
      </View>

      <StockChart
        symbol={symbol}
        data={chartData}
        baselinePrice={baselinePrice}
        isLoading={isLoading}
        error={error}
      />

      <View className="mt-6 rounded-lg border border-border bg-background-secondary p-4">
        <Text className="text-sm text-text-secondary mb-1">Baseline</Text>
        <Text className="text-lg font-semibold text-text">${baselinePrice.toFixed(2)}</Text>
      </View>
    </ScrollView>
  );
}
