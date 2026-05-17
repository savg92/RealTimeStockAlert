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
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}>
      <Text className="mb-1 text-2xl font-bold text-text">Price Alerts</Text>
      <Text className="mb-4 text-sm text-text-secondary">
        Create, view, and remove active price alerts.
      </Text>

      <CreateAlertForm isSubmitting={isSubmitting} onSubmit={handleCreateAlert} />

      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-text">Active Alerts</Text>
        <TouchableOpacity onPress={loadAlerts}>
          <Text className="font-semibold text-primary">Refresh</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View className="mb-3 rounded-lg border border-border bg-background-secondary p-3">
          <Text className="text-sm text-text-secondary">Loading alerts…</Text>
        </View>
      )}

      {error && (
        <View className="mb-3 rounded-lg border border-danger bg-background-secondary p-3">
          <Text className="text-sm text-danger">{error}</Text>
        </View>
      )}

      {alerts.length === 0 ? (
        <View className="rounded-lg border border-border bg-background-secondary p-4">
          <Text className="text-sm text-text-secondary">No active alerts yet.</Text>
        </View>
      ) : (
        alerts.map((alert) => (
          <View
            key={alert.id}
            className="mb-3 rounded-lg border border-border bg-background-secondary p-4"
          >
            <Text className="text-base font-bold text-text">{alert.symbol}</Text>
            <Text className="text-sm text-text-secondary">
              Trigger when {alert.symbol} is {alert.condition} ${alert.threshold.toFixed(2)}
            </Text>
            <TouchableOpacity onPress={() => handleDeleteAlert(alert.id)} className="mt-3 self-start">
              <Text className="font-semibold text-danger">Delete alert</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}
