import type { CreateAlertInput } from '@stock-alert/shared';
import { API_CONFIG, API_ENDPOINTS } from '../utils/api';
import type { AlertConfig } from '../types';

const createHeaders = (token: string): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

const parseError = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    if (typeof data?.message === 'string') {
      return data.message;
    }
  } catch {
    // Ignore parse error and fall back to status text
  }

  return response.statusText || 'Request failed';
};

const normalizeAlert = (alert: AlertConfig): AlertConfig => ({
  ...alert,
  symbol: alert.symbol.toUpperCase(),
  condition: alert.condition === 'below' ? 'below' : 'above',
  createdAt: alert.createdAt,
  updatedAt: alert.updatedAt,
});

export const fetchAlerts = async (token: string): Promise<AlertConfig[]> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.ALERTS}`, {
    method: 'GET',
    headers: createHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const alerts = (await response.json()) as AlertConfig[];
  return alerts.map(normalizeAlert);
};

export const createAlert = async (
  input: CreateAlertInput,
  token: string,
): Promise<AlertConfig> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.ALERTS}`, {
    method: 'POST',
    headers: createHeaders(token),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return normalizeAlert((await response.json()) as AlertConfig);
};

export const deleteAlert = async (alertId: string, token: string): Promise<void> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.ALERT_BY_ID(alertId)}`, {
    method: 'DELETE',
    headers: createHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
};
