import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { useSocket } from '../hooks/useSocket';

const MOCK_STOCKS = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', price: 189.5, change: 2.5 },
  { id: '2', symbol: 'MSFT', name: 'Microsoft Corp.', price: 412.3, change: 1.8 },
  { id: '3', symbol: 'GOOGL', name: 'Alphabet Inc.', price: 138.75, change: -0.5 },
  { id: '4', symbol: 'AMZN', name: 'Amazon.com Inc.', price: 180.2, change: 3.2 },
  { id: '5', symbol: 'TSLA', name: 'Tesla Inc.', price: 242.5, change: -2.1 },
];

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
    padding: 16,
    marginBottom: 12,
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  symbolContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  priceColumn: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
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
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 12,
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f1f2',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007bff',
  },
  addStockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  addStockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
});

export default function WatchlistScreen({ navigation }: any) {
  const store = useAppStore() as any;
  const socket = useSocket() as any;

  const stocks = store ? store.stocks : [];
  const isLoading = store ? store.isLoading : false;
  const error = store ? store.error : null;

  const connectionStatus = socket ? socket.connectionStatus : 'unknown';
  const statusMessage = socket ? socket.statusMessage : '';
  const isOnline = socket ? socket.isOnline : false;

  const liveStocks = stocks && stocks.length > 0 ? stocks : MOCK_STOCKS;

  return (
    <View style={styles.container} testID="watchlist-container">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Watchlist</Text>
        <Text style={styles.headerSubtitle}>{liveStocks.length} stocks tracked</Text>
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
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={{ marginTop: 12, color: '#6c757d' }}>Loading live prices…</Text>
          </View>
        )}

        {!isLoading &&
          liveStocks.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              testID={`stock-item-${item.symbol}`}
              onPress={() => navigation && navigation.navigate('StockDetail', { symbol: item.symbol })}
              style={styles.stockCard}
              activeOpacity={0.7}
            >
              <View style={styles.stockCardHeader}>
                <View style={styles.symbolContainer}>
                  <Ionicons name="trending-up" size={18} color="#007bff" />
                  <Text style={styles.symbol}>{item.symbol}</Text>
                </View>
                <View style={styles.priceColumn}>
                  <Text style={styles.price}>${item.price.toFixed(2)}</Text>
                  <Text
                    style={[
                      styles.change,
                      item.change >= 0 ? styles.changePositive : styles.changeNegative,
                    ]}
                  >
                    {item.change >= 0 ? '+' : ''}
                    {item.change.toFixed(2)}%
                  </Text>
                </View>
              </View>
              <Text style={styles.companyName}>{item.name}</Text>
              <TouchableOpacity style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View Details →</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

        <TouchableOpacity style={styles.addStockButton} testID="add-stock-button">
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.addStockButtonText}>Add Stock</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
