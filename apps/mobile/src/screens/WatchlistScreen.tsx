import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { useSocket } from '../hooks/useSocket';
import type { Stock } from '../types';

const normalizeStockSnapshot = (item: unknown, fallbackIndex: number): Stock => {
  const candidate = item as Partial<Stock> & { id?: string; lastUpdated?: string | Date };
  const symbol = typeof candidate.symbol === 'string' ? candidate.symbol : `STOCK-${fallbackIndex + 1}`;
  const price = typeof candidate.price === 'number' ? candidate.price : 0;
  const change = typeof candidate.change === 'number' ? candidate.change : 0;
  const changePercent = typeof candidate.changePercent === 'number' ? candidate.changePercent : 0;

  return {
    id: candidate.id ?? symbol,
    symbol,
    name: typeof candidate.name === 'string' ? candidate.name : symbol,
    price,
    change,
    changePercent,
    currency: typeof candidate.currency === 'string' ? candidate.currency : 'USD',
    lastUpdated: candidate.lastUpdated ? new Date(candidate.lastUpdated) : new Date(),
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#28a745',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#28a745',
  },
  statusOffline: {
    color: '#dc3545',
    backgroundColor: '#dc3545',
  },
  statusTextOffline: {
    color: '#dc3545',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  stockCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symbol: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  priceColumn: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  changePositive: {
    color: '#28a745',
    backgroundColor: '#d4edda',
  },
  changeNegative: {
    color: '#dc3545',
    backgroundColor: '#f8d7da',
  },
  companyName: {
    fontSize: 11,
    color: '#6c757d',
  },
  addStockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 4,
    gap: 8,
  },
  addStockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#721c24',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffc107',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default function WatchlistScreen({ navigation }: any) {
  const store = useAppStore() as any;
  const socket = useSocket() as any;
  const updateStock = store?.updateStock;
  const setStocks = store?.setStocks;
  const setLoading = store?.setLoading;
  const setError = store?.setError;

  const stocks = store ? store.stocks : [];
  const isLoading = store ? store.isLoading : false;
  const error = store ? store.error : null;

  const {
    connectionStatus,
    statusMessage,
    isOnline,
    subscribe,
    unsubscribe,
  } = socket ?? {};

  // Track which stocks were recently updated for visual feedback
  const [recentlyUpdated, setRecentlyUpdated] = React.useState<Set<string>>(new Set());
  const [hasHydrated, setHasHydrated] = React.useState(false);
  const [refreshTick, setRefreshTick] = React.useState(0);
  const hydratingRef = React.useRef(false);

  const liveStocks = Array.isArray(stocks) ? stocks : [];
  const shouldShowLoading = (isLoading || !hasHydrated) && liveStocks.length === 0;
  const watchSymbols = React.useMemo(
    () => liveStocks.map((item: any) => item.symbol),
    [liveStocks],
  );
  const watchSymbolsKey = watchSymbols.join('|');

  React.useEffect(() => {
    if (
      connectionStatus !== 'connected'
      || typeof subscribe !== 'function'
      || typeof unsubscribe !== 'function'
    ) {
      return undefined;
    }

    watchSymbols.forEach((symbol: string) => {
      subscribe(symbol);
    });

    return () => {
      watchSymbols.forEach((symbol: string) => {
        unsubscribe(symbol);
      });
    };
  }, [connectionStatus, subscribe, unsubscribe, watchSymbolsKey]);

  React.useEffect(() => {
    let isActive = true;

    const hydrateWatchlist = async () => {
      if (hydratingRef.current) {
        setLoading(false);
        return;
      }

      if (stocks.length > 0) {
        setLoading(false);
        setHasHydrated(true);
        return;
      }

      if (typeof socket?.fetchPricesViaRest !== 'function') {
        setError('Live prices are unavailable right now.');
        setLoading(false);
        setHasHydrated(true);
        return;
      }

      try {
        hydratingRef.current = true;
        setLoading(true);
        const snapshot = await socket.fetchPricesViaRest();

        if (!isActive) {
          return;
        }

        if (!Array.isArray(snapshot)) {
          setError('Unexpected live prices response.');
          return;
        }

        if (snapshot.length === 0) {
          setError('No live watchlist data is available right now.');
          return;
        }

        setStocks(snapshot.map(normalizeStockSnapshot));
        setError(null);
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load live prices.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
          setHasHydrated(true);
        }
        hydratingRef.current = false;
      }
    };

    void hydrateWatchlist();

    return () => {
      isActive = false;
    };
  }, [setError, setLoading, setStocks, socket, stocks.length, refreshTick]);

  // Subscribe to price updates on mount and handle them
  React.useEffect(() => {
    if (!socket || !socket.on) return;

    const handlePriceUpdate = (data: any) => {
      if (!data?.symbol || data.price === undefined) return;

      // Update the stock price in the store
      const existingStock = liveStocks.find((s: any) => s.symbol === data.symbol);
      if (existingStock) {
        const oldPrice = existingStock.price || 0;
        const newPrice = data.price;
        const intradayChange = typeof data.change === 'number' ? data.change : newPrice - oldPrice;
        const intradayChangePercent = typeof data.changePercent === 'number'
          ? data.changePercent
          : (oldPrice ? ((newPrice - oldPrice) / oldPrice) * 100 : 0);

        updateStock({
          ...existingStock,
          price: newPrice,
          change: intradayChange,
          changePercent: intradayChangePercent,
          lastUpdated: data.timestamp ? new Date(data.timestamp) : new Date(),
        });

        // Show update indicator
        setRecentlyUpdated((prev) => {
          const updated = new Set(prev);
          updated.add(data.symbol);
          setTimeout(() => {
            setRecentlyUpdated((current) => {
              const next = new Set(current);
              next.delete(data.symbol);
              return next;
            });
          }, 2000);
          return updated;
        });
      }
    };

    socket.on('price:update', handlePriceUpdate);

    return () => {
      socket.off?.('price:update', handlePriceUpdate);
    };
  }, [socket, liveStocks, updateStock]);

  return (
    <View style={styles.container} testID="watchlist-container">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Watchlist</Text>
        <Text style={styles.headerSubtitle}>{liveStocks.length} stocks tracked</Text>
        <Text style={{ fontSize: 12, color: '#6c757d' }}>
          Last update: {
            (() => {
              const timestamps = stocks
                .map((s: any) => (s && s.lastUpdated ? new Date(s.lastUpdated).getTime() : 0));
              const max = timestamps.length ? Math.max(...timestamps) : 0;
              return max ? new Date(max).toLocaleTimeString() : '—';
            })()
          }
        </Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, isOnline && styles.statusOffline]}>
            <View
              style={[
                { width: 8, height: 8, borderRadius: 4, backgroundColor: isOnline ? '#28a745' : '#dc3545' },
              ]}
            />
          </View>
          <Text style={[styles.statusText, !isOnline && styles.statusTextOffline]}>
            {statusMessage} • {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
          Connection: {connectionStatus}
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {shouldShowLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={{ marginTop: 12, color: '#6c757d' }}>Loading live prices…</Text>
          </View>
        )}

        {!shouldShowLoading && liveStocks.length === 0 && (
          <View style={styles.centerContainer}>
            <Text style={{ fontSize: 14, color: '#6c757d', textAlign: 'center' }}>
              No live watchlist data is available right now.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setHasHydrated(false);
                setRefreshTick((tick) => tick + 1);
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {liveStocks.map((item: any) => {
          const changePercent = typeof item.changePercent === 'number' ? item.changePercent : 0;

          return (
            <View key={item.id} style={{ position: 'relative' }}>
              {recentlyUpdated.has(item.symbol) && <View style={styles.updateIndicator} />}
              <TouchableOpacity
                testID={`stock-item-${item.symbol}`}
                onPress={() => navigation && navigation.navigate('StockDetail', { symbol: item.symbol })}
                style={styles.stockCard}
                activeOpacity={0.7}
              >
                <View style={styles.stockCardHeader}>
                  <View style={styles.symbolContainer}>
                    <Ionicons name="trending-up" size={18} color="#007bff" />
                    <Text style={styles.symbol}>{item.symbol}</Text>
                    <Text style={styles.companyName}>{item.name}</Text>
                  </View>
                  <View style={styles.priceColumn}>
                    <Text style={styles.price}>${item.price.toFixed(2)}</Text>
                    <Text
                      style={[
                        styles.change,
                        changePercent >= 0 ? styles.changePositive : styles.changeNegative,
                      ]}
                    >
                      {changePercent >= 0 ? '+' : ''}
                      {changePercent.toFixed(2)}% 24h
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.addStockButton}
          testID="add-stock-button"
          onPress={() => {
            Alert.alert('Watchlist editing', 'Custom stock management will be added in the next update.');
          }}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.addStockButtonText}>Add Stock</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
