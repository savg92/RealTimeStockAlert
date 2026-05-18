import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useSocket } from '../hooks/useSocket';
import { useAppStore } from '../store/appStore';
import type { RealTimeUpdate } from '../types';
import StockChart, { StockChartPoint } from '../components/StockChart';

type StockDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'StockDetail'>;

type TimeRangeKey = '1H' | '5H' | '1D' | '5D' | '1M' | '3M' | '1Y' | '5Y' | 'ALL';

const TIME_RANGES: Array<{ key: TimeRangeKey; label: string; durationMs?: number }> = [
  { key: '1H', label: '1H', durationMs: 60 * 60 * 1000 },
  { key: '5H', label: '5H', durationMs: 5 * 60 * 60 * 1000 },
  { key: '1D', label: '1D', durationMs: 24 * 60 * 60 * 1000 },
  { key: '5D', label: '5D', durationMs: 5 * 24 * 60 * 60 * 1000 },
  { key: '1M', label: '1M', durationMs: 30 * 24 * 60 * 60 * 1000 },
  { key: '3M', label: '3M', durationMs: 90 * 24 * 60 * 60 * 1000 },
  { key: '1Y', label: '1Y', durationMs: 365 * 24 * 60 * 60 * 1000 },
  { key: '5Y', label: '5Y', durationMs: 5 * 365 * 24 * 60 * 60 * 1000 },
  { key: 'ALL', label: 'ALL' },
];

const isRealTimeUpdate = (value: unknown): value is RealTimeUpdate => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const maybeUpdate = value as Partial<RealTimeUpdate>;
  return typeof maybeUpdate.symbol === 'string' && typeof maybeUpdate.price === 'number';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  symbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  companyName: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 1,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  priceSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  metaText: {
    fontSize: 11,
    color: '#6c757d',
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#d4edda',
  },
  changeBadgeNegative: {
    backgroundColor: '#f8d7da',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e7e34',
  },
  changeTextNegative: {
    color: '#b02a37',
  },
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rangeButton: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  rangeButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  rangeButtonText: {
    fontSize: 11,
    color: '#495057',
    fontWeight: '600',
  },
  rangeButtonTextActive: {
    color: '#fff',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
});

export default function StockDetailScreen({ route, navigation }: StockDetailScreenProps) {
  const { symbol, name } = route.params;
  const { stocks, isLoading, error } = useAppStore();
  const {
    lastKnownState,
    statusMessage,
    isOnline,
    connectionStatus,
    subscribe,
    unsubscribe,
  } = useSocket();

  const [selectedRange, setSelectedRange] = React.useState<TimeRangeKey>('1D');
  const [history, setHistory] = React.useState<StockChartPoint[]>([]);

  const matchingStock = React.useMemo(
    () => stocks.find((stock) => stock.symbol === symbol),
    [stocks, symbol],
  );

  const livePrice = React.useMemo(() => {
    if (isRealTimeUpdate(lastKnownState) && lastKnownState.symbol === symbol) {
      return lastKnownState.price;
    }
    return null;
  }, [lastKnownState, symbol]);

  const resolvedPrice = livePrice ?? matchingStock?.price ?? 0;
  const intradayChange = typeof matchingStock?.change === 'number' ? matchingStock.change : 0;
  const intradayChangePercent = typeof matchingStock?.changePercent === 'number' ? matchingStock.changePercent : 0;
  const baselinePrice = resolvedPrice - intradayChange;

  React.useEffect(() => {
    setHistory([]);
  }, [symbol]);

  React.useEffect(() => {
    if (!Number.isFinite(resolvedPrice) || resolvedPrice <= 0) {
      return;
    }

    const nextPoint: StockChartPoint = {
      timestamp: new Date().toISOString(),
      price: Number(resolvedPrice.toFixed(2)),
    };

    setHistory((previous) => {
      if (previous.length === 0) {
        return [nextPoint];
      }

      const last = previous[previous.length - 1];
      if (last.price === nextPoint.price) {
        return previous;
      }

      return [...previous, nextPoint].slice(-1500);
    });
  }, [resolvedPrice]);

  const chartData = React.useMemo(() => {
    const selected = TIME_RANGES.find((range) => range.key === selectedRange);
    const now = Date.now();
    const allPoints = history.filter((point) => Number.isFinite(new Date(point.timestamp).getTime()));
    const effectivePoints = selected?.durationMs
      ? allPoints.filter((point) => (now - new Date(point.timestamp).getTime()) <= selected.durationMs!)
      : allPoints;

    if (effectivePoints.length >= 2) {
      return effectivePoints;
    }

    if (resolvedPrice <= 0) {
      return [];
    }

    const startTime = selected?.durationMs ? now - selected.durationMs : now - (60 * 60 * 1000);
    return [
      { timestamp: new Date(startTime).toISOString(), price: Number(resolvedPrice.toFixed(2)) },
      { timestamp: new Date(now).toISOString(), price: Number(resolvedPrice.toFixed(2)) },
    ];
  }, [history, selectedRange, resolvedPrice]);

  React.useEffect(() => {
    if (
      connectionStatus !== 'connected'
      || typeof subscribe !== 'function'
      || typeof unsubscribe !== 'function'
    ) {
      return undefined;
    }

    subscribe(symbol);

    return () => {
      unsubscribe(symbol);
    };
  }, [connectionStatus, subscribe, symbol, unsubscribe]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.symbol}>{symbol}</Text>
          <Text style={styles.companyName}>{name ?? matchingStock?.name ?? 'Stock details'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6 }}>
          <Ionicons name="close-circle-outline" size={22} color="#6c757d" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>${resolvedPrice.toFixed(2)}</Text>
            <View
              style={[
                styles.changeBadge,
                intradayChangePercent < 0 && styles.changeBadgeNegative,
              ]}
            >
              <Text
                style={[
                  styles.changeText,
                  intradayChangePercent < 0 && styles.changeTextNegative,
                ]}
              >
                {intradayChangePercent >= 0 ? '+' : ''}
                {intradayChangePercent.toFixed(2)}% 24h
              </Text>
            </View>
          </View>
          <Text style={styles.metaText}>
            {statusMessage} • {isOnline ? 'Online feed' : 'Fallback data'} • Updated {new Date().toLocaleTimeString()}
          </Text>
        </View>

        <View style={styles.rangeRow}>
          {TIME_RANGES.map((range) => {
            const isActive = selectedRange === range.key;
            return (
              <TouchableOpacity
                key={range.key}
                style={[styles.rangeButton, isActive && styles.rangeButtonActive]}
                onPress={() => setSelectedRange(range.key)}
              >
                <Text style={[styles.rangeButtonText, isActive && styles.rangeButtonTextActive]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.chartContainer}>
          <StockChart
            symbol={symbol}
            data={chartData}
            baselinePrice={baselinePrice}
            isLoading={isLoading}
            error={error}
            rangeLabel={selectedRange}
          />
        </View>
      </ScrollView>
    </View>
  );
}
