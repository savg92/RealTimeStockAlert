import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { AlertCondition, CreateAlertInput } from '@stock-alert/shared';
import CreateAlertForm, { type CreateAlertFormPayload } from '../components/CreateAlertForm';
import { useAppStore } from '../store/appStore';
import type { AlertConfig } from '../types';
import { createAlert, deleteAlert, fetchAlerts } from '../services/alertsApi';

export const authTokenResolver = {
  getAuthToken: (): string | null => {
    const token = process.env.EXPO_PUBLIC_AUTH_BEARER_TOKEN;
    if (!token || !token.trim()) {
      return null;
    }

    return token.trim();
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

export default function AlertsListScreen() {
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

  const token = React.useMemo(() => authTokenResolver.getAuthToken(), []);

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

  React.useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

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

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#f8f9fa' }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
    >
      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 }}>
          Price Alerts
        </Text>
        <Text style={{ fontSize: 14, color: '#6c757d' }}>
          Create, view, and remove active price alerts.
        </Text>
      </View>

      {/* Create Alert Form */}
      <CreateAlertForm isSubmitting={isSubmitting} onSubmit={handleCreateAlert} />

      {/* Active Alerts Section */}
      <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1a1a1a' }}>
          Active Alerts
        </Text>
        <TouchableOpacity onPress={loadAlerts} style={{ padding: 8 }}>
          <Text style={{ fontWeight: '600', color: '#007bff', fontSize: 14 }}>
            ↻ Refresh
          </Text>
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
          <Text style={{ fontSize: 13, color: '#721c24', fontWeight: '500' }}>
            ⚠️ {error}
          </Text>
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
            📢 No alerts yet
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
              Trigger when price reaches <Text style={{ fontWeight: '600', color: '#1a1a1a' }}>${alert.threshold.toFixed(2)}</Text>
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
                <Text style={{ fontWeight: '600', color: '#dc3545', fontSize: 13 }}>
                  🗑️ Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
