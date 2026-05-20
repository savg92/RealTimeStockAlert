import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AlertsListScreen, { authTokenResolver } from '../AlertsListScreen';
import { useAppStore } from '../../store/appStore';
import { createAlert, deleteAlert, fetchAlerts } from '../../services/alertsApi';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: (callback: () => void) => {
      const React = require('react');
      React.useEffect(callback, []);
    },
  };
});

jest.mock('../../services/alertsApi', () => ({
  fetchAlerts: jest.fn(),
  createAlert: jest.fn(),
  deleteAlert: jest.fn(),
}));

jest.mock('../../components/CreateAlertForm', () => {
  return function MockCreateAlertForm({
    isSubmitting,
    onSubmit,
    prefilledSymbol,
  }: {
    isSubmitting: boolean;
    onSubmit: (payload: { symbol: string; threshold: number }, condition: 'above' | 'below') => Promise<void>;
    prefilledSymbol?: string;
  }) {
    const ReactNative = require('react-native');

    return (
      <ReactNative.View>
        <ReactNative.Text>{isSubmitting ? 'Creating…' : 'Create Mock Alert'}</ReactNative.Text>
        {prefilledSymbol && <ReactNative.Text>Prefilled: {prefilledSymbol}</ReactNative.Text>}
        <ReactNative.TouchableOpacity
          testID="create-mock-alert"
          onPress={() => onSubmit({ symbol: 'AAPL', threshold: 200 }, 'above')}
        >
          <ReactNative.Text>Submit Mock Alert</ReactNative.Text>
        </ReactNative.TouchableOpacity>
      </ReactNative.View>
    );
  };
});

describe('AlertsListScreen', () => {
  const mockedFetchAlerts = fetchAlerts as jest.MockedFunction<typeof fetchAlerts>;
  const mockedCreateAlert = createAlert as jest.MockedFunction<typeof createAlert>;
  const mockedDeleteAlert = deleteAlert as jest.MockedFunction<typeof deleteAlert>;
  const getAuthTokenSpy = jest.spyOn(authTokenResolver, 'getAuthToken');

  const now = '2026-05-15T00:00:00.000Z';
  const alert = {
    id: 'alert-1',
    symbol: 'AAPL',
    price: 200,
    condition: 'above' as const,
    threshold: 200,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const mockRoute = {
    params: undefined,
    name: 'Alerts',
    key: 'Alerts-key',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().reset();
    getAuthTokenSpy.mockReturnValue('token-123');
  });

  afterEach(() => {
    getAuthTokenSpy.mockReset();
  });

  it('loads alerts, refreshes them, and renders the empty state', async () => {
    mockedFetchAlerts.mockResolvedValue([]);

    const { getByText } = render(<AlertsListScreen route={mockRoute} />);

    await waitFor(() => expect(getByText('No active alerts yet.')).toBeTruthy());
    expect(mockedFetchAlerts).toHaveBeenCalledWith('token-123');

    fireEvent.press(getByText('Refresh'));
    await waitFor(() => expect(mockedFetchAlerts).toHaveBeenCalledTimes(2));
  });

  it('shows an auth error when the bearer token is missing', async () => {
    getAuthTokenSpy.mockReturnValue(null);
    mockedFetchAlerts.mockResolvedValue([]);

    const { getByText } = render(<AlertsListScreen route={mockRoute} />);

    await waitFor(() => {
      expect(getByText('Missing auth token. Set EXPO_PUBLIC_AUTH_BEARER_TOKEN.')).toBeTruthy();
    });
    expect(mockedFetchAlerts).not.toHaveBeenCalled();
  });

  it('shows a default message when loading alerts throws a non-Error value', async () => {
    mockedFetchAlerts.mockRejectedValue('boom');

    const { getByText } = render(<AlertsListScreen route={mockRoute} />);

    await waitFor(() => expect(getByText('Failed to load alerts.')).toBeTruthy());
  });

  it('creates alerts optimistically and replaces them with the API response', async () => {
    mockedFetchAlerts.mockResolvedValue([]);
    mockedCreateAlert.mockResolvedValue({
      id: 'created-alert',
      symbol: 'AAPL',
      price: 200,
      condition: 'above',
      threshold: 200,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const { getByTestId, getByText } = render(<AlertsListScreen route={mockRoute} />);

    await waitFor(() => expect(getByText('No active alerts yet.')).toBeTruthy());
    fireEvent.press(getByTestId('create-mock-alert'));

    await waitFor(() => expect(mockedCreateAlert).toHaveBeenCalled());
    expect(mockedCreateAlert).toHaveBeenCalledWith(
      {
        symbol: 'AAPL',
        price: 200,
        condition: 'above',
        threshold: 200,
      },
      'token-123',
    );
    await waitFor(() => expect(getByText('AAPL')).toBeTruthy());
    expect(useAppStore.getState().alerts).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'created-alert', symbol: 'AAPL' })]),
    );
  });

  it('surfaces create failures and clears optimistic alerts', async () => {
    mockedFetchAlerts.mockResolvedValue([]);
    mockedCreateAlert.mockRejectedValue(new Error('Create failed'));

    const { getByTestId, getByText, queryByText } = render(<AlertsListScreen route={mockRoute} />);

    await waitFor(() => expect(getByText('No active alerts yet.')).toBeTruthy());
    fireEvent.press(getByTestId('create-mock-alert'));

    await waitFor(() => expect(getByText('Create failed')).toBeTruthy());
    expect(queryByText('AAPL')).toBeNull();
    expect(useAppStore.getState().alerts).toHaveLength(0);
  });

  it('shows an auth error and skips create when token is missing', async () => {
    getAuthTokenSpy.mockReturnValue(null);
    mockedFetchAlerts.mockResolvedValue([]);

    const { getByTestId, getByText } = render(<AlertsListScreen route={mockRoute} />);

    await waitFor(() => {
      expect(getByText('Missing auth token. Set EXPO_PUBLIC_AUTH_BEARER_TOKEN.')).toBeTruthy();
    });

    fireEvent.press(getByTestId('create-mock-alert'));

    expect(mockedCreateAlert).not.toHaveBeenCalled();
  });

  it('renders loaded alerts and deletes them on success', async () => {
    mockedFetchAlerts.mockResolvedValue([alert]);
    mockedDeleteAlert.mockResolvedValue();

    const { getByText, queryByText } = render(<AlertsListScreen route={mockRoute} />);

    await waitFor(() => expect(getByText('Trigger when AAPL is above $200.00')).toBeTruthy());
    fireEvent.press(getByText('Delete alert'));

    await waitFor(() => expect(mockedDeleteAlert).toHaveBeenCalledWith('alert-1', 'token-123'));
    await waitFor(() => expect(getByText('No active alerts yet.')).toBeTruthy());
    expect(queryByText('AAPL')).toBeNull();
    expect(useAppStore.getState().alerts).toHaveLength(0);
  });

  it('restores alerts when deletion fails', async () => {
    mockedFetchAlerts.mockResolvedValue([alert]);
    mockedDeleteAlert.mockRejectedValue(new Error('Delete failed'));

    const { getByText } = render(<AlertsListScreen route={mockRoute} />);

    await waitFor(() => expect(getByText('Trigger when AAPL is above $200.00')).toBeTruthy());
    fireEvent.press(getByText('Delete alert'));

    await waitFor(() => expect(getByText('Delete failed')).toBeTruthy());
    expect(getByText('Trigger when AAPL is above $200.00')).toBeTruthy();
    expect(useAppStore.getState().alerts).toEqual(expect.arrayContaining([expect.objectContaining(alert)]));
  });

  it('shows an auth error and skips deletion when token is missing', async () => {
    getAuthTokenSpy.mockReturnValue(null);
    useAppStore.getState().setAlerts([alert]);

    const { getByText } = render(<AlertsListScreen route={mockRoute} />);

    fireEvent.press(getByText('Delete alert'));

    await waitFor(() => {
      expect(getByText('Missing auth token. Set EXPO_PUBLIC_AUTH_BEARER_TOKEN.')).toBeTruthy();
    });
    expect(mockedDeleteAlert).not.toHaveBeenCalled();
    expect(useAppStore.getState().alerts).toEqual(expect.arrayContaining([expect.objectContaining(alert)]));
  });
});
