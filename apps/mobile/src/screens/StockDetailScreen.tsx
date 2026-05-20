import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useSocket } from '../hooks/useSocket';
import { useAppStore } from '../store/appStore';
import type { RealTimeUpdate } from '../types';
import StockChart, { StockChartPoint } from '../components/StockChart';
import { API_CONFIG, API_ENDPOINTS } from '../utils/api';

type StockDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'StockDetail'>;

type TimeRangeKey = '1H' | '5H' | '1D' | '5D' | '1M' | '3M' | '1Y' | '5Y' | 'ALL';

interface StockDetailSnapshot {
  symbol: string;
  name?: string;
  high52w?: number;
  low52w?: number;
  marketCap?: number | string;
  volume?: number | string;
  pe?: number | null;
  change?: number;
  changePercent?: number;
}

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
  const { stocks, isLoading, error, addToWatchlist } = useAppStore();
  const { lastKnownState, statusMessage, isOnline, connectionStatus, subscribe, unsubscribe } =
    useSocket();

  const [selectedRange, setSelectedRange] = React.useState<TimeRangeKey>('1D');
  const [history, setHistory] = React.useState<StockChartPoint[]>([]);
  const [details, setDetails] = React.useState<StockDetailSnapshot | null>(null);
  const [isFetchingHistory, setIsFetchingHistory] = React.useState(false);

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

  const referencePrice = livePrice ?? matchingStock?.price ?? null;
  const hasReferencePrice =
    typeof referencePrice === 'number' && Number.isFinite(referencePrice) && referencePrice > 0;

  React.useEffect(() => {
    setHistory([]);
  }, [symbol]);

  // Fetch stock details from backend
  React.useEffect(() => {
    const isJest = typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID;
    if (isJest) return;

    let mounted = true;
    async function loadDetails() {
      // fetching details
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.STOCK_DETAILS(symbol)}`);
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          setDetails(json);
        } else {
          setDetails(null);
        }
      } catch {
        setDetails(null);
      } finally {
        if (mounted) { /* finished fetching details */ }
      }
    }

    loadDetails();
    return () => {
      mounted = false;
    };
  }, [symbol]);

  // Fetch history for selected range
  React.useEffect(() => {
    // Skip network fetches during Jest runs to keep tests deterministic
    const isJest = typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID;
    if (isJest) return;

    let mounted = true;
    async function loadHistory() {
      setIsFetchingHistory(true);
      try {
        const res = await fetch(
          `${API_CONFIG.BASE_URL}${API_ENDPOINTS.STOCK_HISTORY(symbol, selectedRange)}`,
        );
        if (!mounted) return;
        if (res && (res as any).ok === false) {
          setHistory([]);
        } else {
          const json = (await (res as Response).json?.()) ?? [];
          // Expecting array of { timestamp, price }
          setHistory(Array.isArray(json) ? json : []);
        }
      } catch {
        setHistory([]);
      } finally {
        if (mounted) setIsFetchingHistory(false);
      }
    }

    loadHistory();
    return () => {
      mounted = false;
    };
  }, [symbol, selectedRange]);

  React.useEffect(() => {
    if (!hasReferencePrice || referencePrice == null) {
      return;
    }

    const nextPoint: StockChartPoint = {
      timestamp: new Date().toISOString(),
      price: Number(referencePrice.toFixed(2)),
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
  }, [hasReferencePrice, referencePrice]);

  const chartData = React.useMemo(() => {
    const selected = TIME_RANGES.find((range) => range.key === selectedRange);
    const now = Date.now();
    const allPoints = history.filter((point) =>
      Number.isFinite(new Date(point.timestamp).getTime()),
    );
    let effectivePoints = selected?.durationMs
      ? allPoints.filter(
          (point) => now - new Date(point.timestamp).getTime() <= selected.durationMs!,
        )
      : allPoints;

    // Fallback: if filtering results in no points (e.g. market closed),
    // show the most recent available data for that range
    if (effectivePoints.length === 0 && allPoints.length > 0) {
      if (selectedRange === '1H') {
        effectivePoints = allPoints.slice(-60);
      } else if (selectedRange === '5H') {
        effectivePoints = allPoints.slice(-300);
      } else {
        effectivePoints = allPoints;
      }
    }

    return effectivePoints;
  }, [history, selectedRange]);

  const chartLatestPrice = chartData.at(-1)?.price ?? referencePrice ?? 0;
  const chartBaselinePrice = chartData[0]?.price ?? referencePrice ?? 0;
  
  // Use Finnhub-provided change percentage for the "24h" label if available
  const displayChangePercent = details?.changePercent ?? 
    (chartBaselinePrice === 0
      ? 0
      : ((chartLatestPrice - chartBaselinePrice) / chartBaselinePrice) * 100);

  const chartError =
    error ??
    (!hasReferencePrice || chartData.length === 0
      ? `Live price data is unavailable for ${symbol} right now.`
      : null);

  React.useEffect(() => {
    if (
      connectionStatus !== 'connected' ||
      typeof subscribe !== 'function' ||
      typeof unsubscribe !== 'function'
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
          {hasReferencePrice ? (
            <View style={styles.priceRow}>
              <Text style={styles.currentPrice}>${chartLatestPrice.toFixed(2)}</Text>
              <View
                style={[styles.changeBadge, displayChangePercent < 0 && styles.changeBadgeNegative]}
              >
                <Text
                  style={[styles.changeText, displayChangePercent < 0 && styles.changeTextNegative]}
                >
                  {displayChangePercent >= 0 ? '+' : ''}
                  {displayChangePercent.toFixed(2)}% 24h
                </Text>
              </View>
            </View>
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#b02a37' }}>
              Live price data is unavailable right now.
            </Text>
          )}
          <Text style={styles.metaText}>
            {statusMessage} • {isOnline ? 'Live feed' : 'Offline'} • Updated{' '}
            {new Date().toLocaleTimeString()}
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
            baselinePrice={chartBaselinePrice}
            isLoading={isLoading || isFetchingHistory}
            error={chartError}
            rangeLabel={selectedRange}
          />
        </View>

        {/* Stock details grid */}
        {details && (
          <View
            style={{
              marginTop: 10,
              backgroundColor: '#fff',
              borderRadius: 10,
              padding: 12,
              borderWidth: 1,
              borderColor: '#e9ecef',
            }}
          >
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
            >
              <Text style={{ fontSize: 12, color: '#6c757d' }}>52w High</Text>
              <Text style={{ fontSize: 12, fontWeight: '700' }}>
                ${Number(details.high52w ?? 0).toFixed(2)}
              </Text>
            </View>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
            >
              <Text style={{ fontSize: 12, color: '#6c757d' }}>52w Low</Text>
              <Text style={{ fontSize: 12, fontWeight: '700' }}>
                ${Number(details.low52w ?? 0).toFixed(2)}
              </Text>
            </View>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
            >
              <Text style={{ fontSize: 12, color: '#6c757d' }}>Market Cap</Text>
              <Text style={{ fontSize: 12, fontWeight: '700' }}>
                {String(details.marketCap ?? '-')}
              </Text>
            </View>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
            >
              <Text style={{ fontSize: 12, color: '#6c757d' }}>Volume</Text>
              <Text style={{ fontSize: 12, fontWeight: '700' }}>
                {String(details.volume ?? '-')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: '#6c757d' }}>P/E</Text>
              <Text style={{ fontSize: 12, fontWeight: '700' }}>
                {details.pe != null ? details.pe.toFixed(2) : '-'}
              </Text>
            </View>
          </View>
        )}

        {/* Quick actions: Set alert, Add to watchlist */}
        <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            testID="stock-detail-set-alert-button"
            accessibilityLabel="stock-detail-set-alert-button"
            onPress={() => {
              navigation.navigate('HomeTabs', {
                screen: 'Alerts',
                params: { symbol },
              } as any);
            }}
            style={{
              flex: 1,
              backgroundColor: '#007bff',
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Set Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="stock-detail-add-watchlist-button"
            accessibilityLabel="stock-detail-add-watchlist-button"
            onPress={() => {
              try {
                if (typeof addToWatchlist === 'function') {
                  addToWatchlist(symbol);
                } else {
                  navigation.navigate('HomeTabs', {
                    screen: 'Watchlist',
                  } as any);
                }
              } catch {
                navigation.navigate('HomeTabs', {
                  screen: 'Watchlist',
                } as any);
              }
            }}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#dee2e6',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#007bff', fontWeight: '700' }}>Add</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
