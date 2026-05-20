import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AlertCondition, CreateAlertInput } from '@stock-alert/shared';
import type { RootStackParamList, TabParamList } from '../../App';
import CreateAlertForm, { type CreateAlertFormPayload } from '../components/CreateAlertForm';
import { useAppStore } from '../store/appStore';
import type { AlertConfig } from '../types';
import { createAlert, deleteAlert, fetchAlerts } from '../services/alertsApi';
import { resolveAuthBearerToken } from '../services/authToken';

type AlertsListScreenProps = NativeStackScreenProps<TabParamList, 'Alerts'>;

export const authTokenResolver = {
  getAuthToken: (): string | null => {
    return resolveAuthBearerToken();
  },
};

const buildOptimisticAlert = (
  payload: CreateAlertFormPayload,
  condition: AlertCondition,
): AlertConfig => ({
  id: `temp-${Date.now()}`,
  symbol: payload.symbol,
  price: payload.threshold,
  condition,
  threshold: payload.threshold,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export default function AlertsListScreen({ route, navigation }: AlertsListScreenProps & { navigation: any }) {
  const {
    alerts,
    setAlerts,
    addAlert,
    removeAlert,
    error,
    setError,
  } = useAppStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const token = React.useMemo(() => authTokenResolver.getAuthToken(), []);
  const prefilledSymbol = route.params?.symbol;

  const loadAlerts = React.useCallback(async () => {
    if (!token) {
      setError('Missing auth token. Set EXPO_PUBLIC_AUTH_BEARER_TOKEN.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const activeAlerts = await fetchAlerts(token);
      setAlerts(activeAlerts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load alerts.');
    } finally {
      setIsLoading(false);
    }
  }, [setAlerts, setError, token]);

  // Load alerts when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      void loadAlerts();
    }, [loadAlerts]),
  );

  const handleCreateAlert = React.useCallback(
    async (payload: CreateAlertFormPayload, condition: AlertCondition) => {
      if (!token) {
        setError('Missing auth token. Set EXPO_PUBLIC_AUTH_BEARER_TOKEN.');
        return;
      }

      const optimisticAlert = buildOptimisticAlert(payload, condition);
      const input: CreateAlertInput = {
        symbol: payload.symbol,
        price: payload.threshold,
        condition,
        threshold: payload.threshold,
      };

      try {
        setIsSubmitting(true);
        setError(null);
        addAlert(optimisticAlert);
        const createdAlert = await createAlert(input, token);
        removeAlert(optimisticAlert.id);
        addAlert(createdAlert);
      } catch (createError) {
        removeAlert(optimisticAlert.id);
        setError(createError instanceof Error ? createError.message : 'Failed to create alert.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [addAlert, removeAlert, setError, token],
  );

  const handleDeleteAlert = React.useCallback(
    async (alertId: string) => {
      if (!token) {
        setError('Missing auth token. Set EXPO_PUBLIC_AUTH_BEARER_TOKEN.');
        return;
      }

      const existingAlert = alerts.find((alert) => alert.id === alertId);
      if (!existingAlert) {
        return;
      }

      removeAlert(alertId);

      try {
        setError(null);
        await deleteAlert(alertId, token);
      } catch (deleteError) {
        addAlert(existingAlert);
        setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete alert.');
      }
    },
    [addAlert, alerts, removeAlert, setError, token],
  );

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAlerts();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAlerts]);

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#f8f9fa' }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#1a1a1a' }}>
            Price Alerts
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AlertHistory')}
            style={{ paddingHorizontal: 8, paddingVertical: 4 }}
          >
            <Text style={{ color: '#007bff', fontWeight: '600', fontSize: 13 }}>History</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 14, color: '#6c757d' }}>
          Create, view, and remove active price alerts.
        </Text>
      </View>

      {/* Create Alert Form */}
      <CreateAlertForm 
        isSubmitting={isSubmitting} 
        onSubmit={handleCreateAlert}
        prefilledSymbol={prefilledSymbol}
      />

      {/* Active Alerts Section */}
      <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1a1a1a' }}>
          Active Alerts
        </Text>
        <TouchableOpacity onPress={loadAlerts} style={{ padding: 8 }}>
          <Text style={{ fontWeight: '600', color: '#007bff', fontSize: 14 }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {isLoading && (
        <View 
          style={{ 
            marginBottom: 16, 
            borderRadius: 10, 
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#e9ecef',
            padding: 16,
            alignItems: 'center'
          }}
        >
          <Text style={{ fontSize: 14, color: '#6c757d' }}>Loading alerts…</Text>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View 
          style={{ 
            marginBottom: 16,
            borderLeftWidth: 4,
            borderLeftColor: '#dc3545',
            backgroundColor: '#f8d7da',
            borderRadius: 6,
            padding: 12
          }}
        >
          <Text style={{ fontSize: 13, color: '#721c24', fontWeight: '500' }}>{error}</Text>
        </View>
      )}

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <View 
          style={{
            borderRadius: 10,
            backgroundColor: '#e7f3ff',
            borderWidth: 1,
            borderColor: '#b3d9ff',
            padding: 24,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#004085', marginBottom: 8 }}>
            No active alerts yet.
          </Text>
          <Text style={{ fontSize: 13, color: '#004085', textAlign: 'center', lineHeight: 18 }}>
            Create your first alert above to get notified when prices hit your target levels.
          </Text>
        </View>
      ) : (
        alerts.map((alert) => (
          <View
            key={alert.id}
            style={{
              marginBottom: 12,
              borderRadius: 10,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#e9ecef',
              padding: 14,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1a1a1a' }}>
                  {alert.symbol}
                </Text>
              </View>
              <View 
                style={{
                  backgroundColor: alert.condition === 'above' ? '#d4edda' : '#fff3cd',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6
                }}
              >
                <Text 
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: alert.condition === 'above' ? '#28a745' : '#856404',
                    textTransform: 'capitalize'
                  }}
                >
                  {alert.condition}
                </Text>
              </View>
            </View>
            
            <Text style={{ fontSize: 13, color: '#6c757d', marginBottom: 12 }}>
              Trigger when {alert.symbol} is {alert.condition} <Text style={{ fontWeight: '600', color: '#1a1a1a' }}>${alert.threshold.toFixed(2)}</Text>
            </Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity 
                onPress={() => handleDeleteAlert(alert.id)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: '#f8d7da',
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '600', color: '#dc3545', fontSize: 13 }}>Delete alert</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
