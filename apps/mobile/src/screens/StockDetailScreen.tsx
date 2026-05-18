import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const MOCK_DETAILS: Record<string, { high52w: number; low52w: number; marketCap: string; volume: string; pe: number }> = {
  AAPL: { high52w: 245.89, low52w: 165.23, marketCap: '3.2T', volume: '52.4M', pe: 28.5 },
  MSFT: { high52w: 445.23, low52w: 310.11, marketCap: '2.8T', volume: '24.8M', pe: 32.1 },
  GOOGL: { high52w: 198.34, low52w: 102.21, marketCap: '1.7T', volume: '18.2M', pe: 24.7 },
  AMZN: { high52w: 188.45, low52w: 101.26, marketCap: '1.9T', volume: '41.3M', pe: 45.2 },
  TSLA: { high52w: 299.29, low52w: 138.80, marketCap: '760B', volume: '93.5M', pe: 58.9 },
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  companyName: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 2,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  priceSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  priceContainer: {
    marginBottom: 12,
  },
  currentPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  priceSubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 6,
  },
  changeContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  changeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#d4edda',
  },
  changeBadgeNegative: {
    backgroundColor: '#f8d7da',
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#28a745',
  },
  changeTextNegative: {
    color: '#dc3545',
  },
  statusText: {
    fontSize: 12,
    color: '#6c757d',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  detailCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#007bff',
    gap: 6,
  },
  quickActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
});

export default function StockDetailScreen({ route, navigation }: StockDetailScreenProps) {
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
  const priceChange = resolvedPrice - baselinePrice;
  const priceChangePercent = (priceChange / baselinePrice) * 100;
  const chartData = createChartSeries(resolvedPrice);
  const details = MOCK_DETAILS[symbol];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.symbol}>{symbol}</Text>
          <Text style={styles.companyName}>{name ?? matchingStock?.name ?? 'Stock details'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="close-circle-outline" size={24} color="#6c757d" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Price Section */}
        <View style={styles.priceSection}>
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>${resolvedPrice.toFixed(2)}</Text>
            <Text style={styles.priceSubtext}>
              Current price {isOnline ? '(Live)' : '(Cached)'}
            </Text>
          </View>

          <View style={styles.changeContainer}>
            <View
              style={[
                styles.changeBadge,
                priceChange < 0 && styles.changeBadgeNegative,
              ]}
            >
              <Text
                style={[
                  styles.changeText,
                  priceChange < 0 && styles.changeTextNegative,
                ]}
              >
                {priceChange >= 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)} (
                {priceChangePercent.toFixed(2)}%)
              </Text>
            </View>
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        </View>

        {/* Chart */}
        {!isLoading && !error && (
          <View style={styles.chartContainer}>
            <StockChart
              symbol={symbol}
              data={chartData}
              baselinePrice={baselinePrice}
              isLoading={isLoading}
              error={error}
            />
          </View>
        )}

        {isLoading && (
          <View style={styles.chartContainer}>
            <ActivityIndicator size="large" color="#007bff" />
          </View>
        )}

        {error && (
          <View style={styles.chartContainer}>
            <Text style={{ color: '#dc3545', textAlign: 'center' }}>⚠️ {error}</Text>
          </View>
        )}

        {/* Details Grid */}
        {details && (
          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>52-Week High</Text>
              <Text style={styles.detailValue}>${details.high52w.toFixed(2)}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>52-Week Low</Text>
              <Text style={styles.detailValue}>${details.low52w.toFixed(2)}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Market Cap</Text>
              <Text style={styles.detailValue}>{details.marketCap}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Volume</Text>
              <Text style={styles.detailValue}>{details.volume}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>P/E Ratio</Text>
              <Text style={styles.detailValue}>{details.pe}</Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.quickActionButtonText}>Set Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Ionicons name="add-outline" size={16} color="#fff" />
            <Text style={styles.quickActionButtonText}>Add to Watchlist</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
