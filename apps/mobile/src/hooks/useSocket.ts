import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAppStore } from '../store/appStore';
import { API_CONFIG, API_ENDPOINTS, SOCKET_CONFIG, SOCKET_EVENTS } from '../utils/api';
import type { RealTimeUpdate } from '../types';

interface UseSocketReturn {
  socket: Socket | null;
  isOnline: boolean;
  reconnectAttempts: number;
  lastKnownState: unknown | null;
  connectionStatus: 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'offline';
  statusMessage: string;
  connect: () => void;
  disconnect: () => void;
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  emit: (event: string, data?: unknown) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  fetchPricesViaRest: () => Promise<unknown>;
}

export const useSocket = (): UseSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastKnownState, setLastKnownState] = useState<unknown | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'offline'
  >('disconnected');
  const { setConnected, setError } = useAppStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setConnectionStatus((currentStatus) => (currentStatus === 'connected' ? currentStatus : 'connecting'));

    try {
      socketRef.current = io(API_CONFIG.SOCKET_URL, SOCKET_CONFIG);

      // Connection event handlers
      socketRef.current.on(SOCKET_EVENTS.CONNECT, () => {
        setConnected(true);
        setIsOnline(true);
        setReconnectAttempts(0);
        setConnectionStatus('connected');
        setError(null);
      });

      socketRef.current.on(SOCKET_EVENTS.DISCONNECT, () => {
        setConnected(false);
        setConnectionStatus('disconnected');
      });

      socketRef.current.on(SOCKET_EVENTS.CONNECT_ERROR, (error: Error) => {
        setIsOnline(false);
        setConnectionStatus('reconnecting');
        setReconnectAttempts((attempts) => attempts + 1);
        setError(error.message);
      });

      // Price update handler
      socketRef.current.on(SOCKET_EVENTS.PRICE_UPDATE, (data: RealTimeUpdate) => {
        setLastKnownState(data);
        // Update will be handled by the store subscription
      });

      // Error handler
      socketRef.current.on(SOCKET_EVENTS.ERROR, (error: unknown) => {
        setIsOnline(false);
        setConnectionStatus('offline');
        setError(String(error));
      });
    } catch (error) {
      setIsOnline(false);
      setConnectionStatus('offline');
      setError(String(error));
    }
  }, [setConnected, setError]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const subscribe = useCallback((symbol: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(SOCKET_EVENTS.PRICE_SUBSCRIBE, { symbol });
    }
  }, []);

  const unsubscribe = useCallback((symbol: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(SOCKET_EVENTS.PRICE_UNSUBSCRIBE, { symbol });
    }
  }, []);

  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const fetchPricesViaRest = useCallback(async () => {
    const url = `${API_CONFIG.BASE_URL}${API_ENDPOINTS.STOCK_PRICES}`;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Failed to load live prices: request timed out.'));
        }, API_CONFIG.TIMEOUT);
      });
      const response = await Promise.race([
        fetch(url),
        timeoutPromise,
      ]) as Response;
      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setLastKnownState(data);
      return data;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }, []);

  const statusMessage = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'offline':
        return 'Offline';
      default:
        return 'Disconnected';
    }
  }, [connectionStatus]);

  useEffect(() => {
    // Connect on mount
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const exposed = useMemo(() => ({
    socket: socketRef.current,
    isOnline,
    reconnectAttempts,
    lastKnownState,
    connectionStatus,
    statusMessage,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    emit,
    on,
    fetchPricesViaRest,
  }), [
    isOnline,
    reconnectAttempts,
    lastKnownState,
    connectionStatus,
    statusMessage,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    emit,
    on,
    fetchPricesViaRest,
  ]);

  return exposed;
};
