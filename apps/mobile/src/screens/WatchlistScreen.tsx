import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAppStore } from '../store/appStore';
import { useSocket } from '../hooks/useSocket';

const MOCK_STOCKS = [
  { id: '1', symbol: 'AAPL', name: 'Apple Inc.', price: 189.5, change: 2.5 },
  { id: '2', symbol: 'MSFT', name: 'Microsoft Corp.', price: 412.3, change: 1.8 },
  { id: '3', symbol: 'GOOGL', name: 'Alphabet Inc.', price: 138.75, change: -0.5 },
  { id: '4', symbol: 'AMZN', name: 'Amazon.com Inc.', price: 180.2, change: 3.2 },
  { id: '5', symbol: 'TSLA', name: 'Tesla Inc.', price: 242.5, change: -2.1 },
];

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
    <View testID="watchlist-container">
      <View>
        <Text>My Watchlist</Text>
        <Text>{liveStocks.length} stocks tracked</Text>
        <Text>
          {statusMessage} {isOnline ? '• Online' : '• Offline'}
        </Text>
      </View>

      {(isLoading || error) && (
        <View>
          <Text>{isLoading ? 'Loading live prices…' : `Error: ${error}`}</Text>
        </View>
      )}

      {connectionStatus !== 'connected' && (
        <View>
          <Text>Connection: {connectionStatus}</Text>
        </View>
      )}

      {liveStocks.map((item: any) => (
        <TouchableOpacity
          key={item.id}
          testID={`stock-item-${item.symbol}`}
          onPress={() => navigation && navigation.navigate('StockDetail', { symbol: item.symbol })}
        >
          <Text>{item.symbol}</Text>
          <Text>{item.name}</Text>
          <Text>${item.price.toFixed(2)}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity testID="add-stock-button">
        <Text>+ Add Stock</Text>
      </TouchableOpacity>
    </View>
  );
}
