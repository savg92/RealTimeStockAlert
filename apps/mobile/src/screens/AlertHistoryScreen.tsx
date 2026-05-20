import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveAuthBearerToken } from '../services/authToken';
import { useAppStore } from '../store/appStore';
import type { AlertConfig } from '../types';

interface AlertDispatch {
  id: string;
  alertId: string;
  userId: string;
  symbol: string;
  triggerPrice: number;
  triggerAt: string;
  deliveryStatus: 'sent' | 'failed' | 'pending' | 'skipped';
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  alert?: {
    id: string;
    symbol: string;
    condition: string;
    threshold: number;
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  filterContainer: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
  },
  filterButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  dispatchItem: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dispatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dispatchSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  dispatchStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '600',
  },
  statusSent: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  statusFailed: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  statusPending: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  statusSkipped: {
    backgroundColor: '#e2e3e5',
    color: '#383d41',
  },
  dispatchDetail: {
    fontSize: 13,
    color: '#6c757d',
    marginVertical: 4,
  },
  dispatchTime: {
    fontSize: 12,
    color: '#adb5bd',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#adb5bd',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});

export default function AlertHistoryScreen() {
  const { error, setError } = useAppStore();
  const [dispatches, setDispatches] = React.useState<AlertDispatch[]>([]);
  const [summary, setSummary] = React.useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedSymbol, setSelectedSymbol] = React.useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = React.useState<string | null>(null);
  const [allSymbols, setAllSymbols] = React.useState<string[]>([]);

  const token = React.useMemo(() => resolveAuthBearerToken(), []);

  const loadDispatchHistory = React.useCallback(async () => {
    if (!token) {
      setError('Missing auth token. Set EXPO_PUBLIC_AUTH_BEARER_TOKEN.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3000/dev/dispatch-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({
          symbol: selectedSymbol || undefined,
          status: selectedStatus || undefined,
          limit: 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setDispatches(data.dispatches || []);
      setSummary(data.summary || {});

      const symbols = Object.keys(data.summary || {}).sort();
      setAllSymbols(symbols);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load dispatch history.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSymbol, selectedStatus, token, setError]);

  React.useEffect(() => {
    void loadDispatchHistory();
  }, [loadDispatchHistory]);

  const statuses = ['sent', 'failed', 'pending', 'skipped'];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'sent':
        return styles.statusSent;
      case 'failed':
        return styles.statusFailed;
      case 'pending':
        return styles.statusPending;
      case 'skipped':
        return styles.statusSkipped;
      default:
        return {};
    }
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (isLoading && dispatches.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Alert History</Text>
        <Text style={styles.subtitle}>View triggered alerts and delivery status</Text>
      </View>

      {/* Summary */}
      {Object.keys(summary).length > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            {allSymbols.map((sym) => (
              <View key={sym} style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{sym}</Text>
                <Text style={styles.summaryCount}>
                  {Object.values(summary[sym] || {}).reduce((a, b) => a + b, 0)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Filters - Symbol */}
      {allSymbols.length > 0 && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by Symbol</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              onPress={() => setSelectedSymbol(null)}
              style={[styles.filterButton, !selectedSymbol && styles.filterButtonActive]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  !selectedSymbol && styles.filterButtonTextActive,
                ]}
              >
                All Symbols
              </Text>
            </TouchableOpacity>
            {allSymbols.map((sym) => (
              <TouchableOpacity
                key={sym}
                onPress={() => setSelectedSymbol(sym)}
                style={[styles.filterButton, selectedSymbol === sym && styles.filterButtonActive]}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedSymbol === sym && styles.filterButtonTextActive,
                  ]}
                >
                  {sym}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Filters - Status */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Status</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            onPress={() => setSelectedStatus(null)}
            style={[styles.filterButton, !selectedStatus && styles.filterButtonActive]}
          >
            <Text
              style={[
                styles.filterButtonText,
                !selectedStatus && styles.filterButtonTextActive,
              ]}
            >
              All Statuses
            </Text>
          </TouchableOpacity>
          {statuses.map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setSelectedStatus(status)}
              style={[styles.filterButton, selectedStatus === status && styles.filterButtonActive]}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedStatus === status && styles.filterButtonTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Dispatch List */}
      {dispatches.length > 0 ? (
        <FlatList
          data={dispatches}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.dispatchItem}>
              <View style={styles.dispatchHeader}>
                <Text style={styles.dispatchSymbol}>{item.symbol}</Text>
                <Text style={[styles.dispatchStatus, getStatusStyle(item.deliveryStatus)]}>
                  {item.deliveryStatus.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.dispatchDetail}>
                Trigger Price: ${item.triggerPrice.toFixed(2)}
              </Text>

              {item.alert && (
                <Text style={styles.dispatchDetail}>
                  Alert: {item.alert.condition} ${item.alert.threshold.toFixed(2)}
                </Text>
              )}

              {item.failureReason && (
                <Text style={[styles.dispatchDetail, { color: '#721c24' }]}>
                  Reason: {item.failureReason}
                </Text>
              )}

              <Text style={styles.dispatchTime}>{formatTime(item.createdAt)}</Text>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
          </View>
          <Text style={styles.emptyStateText}>No dispatches found</Text>
          <Text style={styles.emptyStateSubtext}>
            {selectedSymbol || selectedStatus ? 'Try adjusting your filters' : 'Create alerts and trigger prices to see history'}
          </Text>
        </View>
      )}

      {error && (
        <View
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            backgroundColor: '#f8d7da',
            borderWidth: 1,
            borderColor: '#f5c6cb',
          }}
        >
          <Text style={{ color: '#721c24', fontSize: 13, fontWeight: '600' }}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );
}
