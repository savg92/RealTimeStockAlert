import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import CombinedStocksChart from '../components/CombinedStocksChart';

function HomeScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Welcome!</Text>
        <Text style={styles.description}>Use the tabs below to navigate through the app:</Text>

        <View style={styles.featureList}>
          <Text style={styles.feature}>📊 Home - Overview and quick stats</Text>
          <Text style={styles.feature}>📈 Watchlist - Track your favorite stocks</Text>
          <Text style={styles.feature}>🔔 Alerts - Create and manage price alerts</Text>
          <Text style={styles.feature}>⚙️ Settings - Customize your preferences</Text>
        </View>

        <TouchableOpacity
          testID="go-to-watchlist"
          onPress={() => navigation?.navigate('Watchlist')}
          style={styles.watchlistButton}
        >
          <Text style={styles.watchlistButtonText}>Open Watchlist</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Combined stock graph</Text>
        <Text style={styles.description}>
          Track the relative performance of all watched stocks in one view.
        </Text>
        <CombinedStocksChart />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={styles.statusText}>✅ Connected • Online</Text>
        <Text style={styles.statusDescription}>Backend connected and ready</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    lineHeight: 24,
  },
  featureList: {
    marginTop: 8,
  },
  feature: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
    lineHeight: 24,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
  },
  watchlistButton: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  watchlistButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
