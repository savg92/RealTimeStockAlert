import React from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppStore } from '../store/appStore';
import { useSocket } from '../hooks/useSocket';
import type { RootStackParamList } from '../../App';

const MOCK_STOCKS = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', price: 189.50, change: 2.5 },
  { id: '2', symbol: 'MSFT', name: 'Microsoft Corp.', price: 412.30, change: 1.8 },
  { id: '3', symbol: 'GOOGL', name: 'Alphabet Inc.', price: 138.75, change: -0.5 },
  { id: '4', symbol: 'AMZN', name: 'Amazon.com Inc.', price: 180.20, change: 3.2 },
  { id: '5', symbol: 'TSLA', name: 'Tesla Inc.', price: 242.50, change: -2.1 },
];

interface StockItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
}

export default function WatchlistScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Watchlist'>) {
  const { stocks, isLoading, error } = useAppStore();
  const { connectionStatus, statusMessage, lastKnownState, isOnline } = useSocket();

  const liveStocks = React.useMemo<StockItem[]>(() => {
    if (stocks.length > 0) {
      return stocks.map((stock) => ({
        id: stock.id,
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        change: stock.change,
      }));
    }

    if (Array.isArray(lastKnownState)) {
      return lastKnownState as StockItem[];
    }

    return MOCK_STOCKS;
  }, [lastKnownState, stocks]);

  const renderStockItem = ({ item }: { item: StockItem }) => (
    <TouchableOpacity
      className="bg-background-secondary rounded-lg p-4 mb-3 border border-border flex-row justify-between items-center"
      onPress={() => navigation.navigate('StockDetail', {
        symbol: item.symbol,
        name: item.name,
      })}
    >
      <View className="flex-1">
        <Text className="font-bold text-text text-lg mb-1">
          {item.symbol}
        </Text>
        <Text className="text-sm text-text-secondary mb-2">
          {item.name}
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-lg font-bold text-text">
          ${item.price.toFixed(2)}
        </Text>
        <Text
          className="text-sm mt-1"
          style={{ color: item.change >= 0 ? '#10B981' : '#EF4444' }}
        >
          {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}>
        <View className="mb-6">
          <Text className="text-2xl font-bold text-text mb-1">
            My Watchlist
          </Text>
          <Text className="text-sm text-text-secondary">
            {liveStocks.length} stocks tracked
          </Text>
          <Text className="text-xs text-text-secondary mt-1">
            {statusMessage} {isOnline ? '• Online' : '• Offline'}
          </Text>
        </View>

        {(isLoading || error) && (
          <View className="mb-4 rounded-lg border border-border bg-background-secondary p-3">
            <Text className="text-sm text-text">
              {isLoading ? 'Loading live prices…' : `Error: ${error}`}
            </Text>
          </View>
        )}

        {connectionStatus !== 'connected' && (
          <View className="mb-4 rounded-lg border border-border bg-background-secondary p-3">
            <Text className="text-sm text-text-secondary">
              Connection: {connectionStatus}
            </Text>
          </View>
        )}

        {liveStocks.length > 0 ? (
          <FlatList
            data={liveStocks}
            renderItem={renderStockItem}
            keyExtractor={(item: StockItem) => item.id}
            scrollEnabled={false}
          />
        ) : (
          <View className="flex-1 items-center justify-center py-12">
            <Text className="text-text-secondary text-lg">
              No stocks in your watchlist
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={{ padding: 16, paddingBottom: 32 }}>
        <TouchableOpacity className="bg-primary rounded-lg px-4 py-3 items-center justify-center">
          <Text className="text-white font-semibold">
            + Add Stock
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
