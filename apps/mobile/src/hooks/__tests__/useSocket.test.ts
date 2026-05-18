import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSocket } from '../useSocket';
import * as socketIO from 'socket.io-client';
import { useAppStore } from '../../store/appStore';

// Mock socket.io-client
jest.mock('socket.io-client');

// Mock zustand store
jest.mock('../../store/appStore');

describe('useSocket', () => {
  let mockSocket: any;
  let mockSetConnected: jest.Mock;
  let mockSetError: jest.Mock;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Setup mock socket
    mockSocket = {
     on: jest.fn(),
     off: jest.fn(),
     emit: jest.fn(),
     connected: false,
     disconnect: jest.fn(),
    };

    // Mock socket.io-client
    (socketIO.default as jest.Mock).mockReturnValue(mockSocket);
    (socketIO.io as jest.Mock).mockReturnValue(mockSocket);

    // Mock store
    mockSetConnected = jest.fn();
    mockSetError = jest.fn();
    (useAppStore as any).mockReturnValue({
      setConnected: mockSetConnected,
      setError: mockSetError,
    });
  });

  const getRegisteredHandler = (event: string) => {
    const call = mockSocket.on.mock.calls.find(([registeredEvent]: [string]) => registeredEvent === event);

    if (!call) {
      throw new Error(`Expected handler for ${event}`);
    }

    return call[1] as (...args: any[]) => void;
  };

  describe('Connection Management', () => {
    it('should establish socket connection on mount', async () => {
      renderHook(() => useSocket());

      await waitFor(() => {
        expect(socketIO.io).toHaveBeenCalled();
      });
    });

    it('should register connect event handler', async () => {
      renderHook(() => useSocket());

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      });
    });

    it('should disconnect socket on unmount', async () => {
      const { unmount } = renderHook(() => useSocket());

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should not reconnect when already connected', () => {
      const { result } = renderHook(() => useSocket());
      mockSocket.connected = true;

      result.current.connect();

      expect(socketIO.io).toHaveBeenCalledTimes(1);
    });

    it('should preserve connected status when connect is called again', () => {
      const { result } = renderHook(() => useSocket());
      const connectHandler = getRegisteredHandler('connect');

      act(() => {
        connectHandler();
      });

      mockSocket.connected = false;
      const callsBefore = (socketIO.io as jest.Mock).mock.calls.length;

      act(() => {
        result.current.connect();
      });

      expect((socketIO.io as jest.Mock).mock.calls.length).toBe(callsBefore + 1);
      expect(result.current.connectionStatus).toBe('connected');
    });
  });

  describe('Offline Detection', () => {
    it('should provide isOnline state', () => {
      const { result } = renderHook(() => useSocket());

      expect(result.current).toHaveProperty('isOnline');
    });
  });

  describe('Reconnection with Exponential Backoff', () => {
    it('should have reconnection enabled', async () => {
      renderHook(() => useSocket());

      await waitFor(() => {
        const callArgs = (socketIO.io as jest.Mock).mock.calls[0];
        expect(callArgs[1]).toHaveProperty('reconnection', true);
      });
    });

    it('should track reconnection attempts', () => {
      const { result } = renderHook(() => useSocket());

      expect(result.current).toHaveProperty('reconnectAttempts');
    });

    it('should transition to reconnecting on connection error', () => {
      const { result } = renderHook(() => useSocket());
      const connectErrorHandler = getRegisteredHandler('connect_error');

      act(() => {
        connectErrorHandler(new Error('socket down'));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.connectionStatus).toBe('reconnecting');
      expect(result.current.statusMessage).toBe('Reconnecting...');
      expect(mockSetError).toHaveBeenCalledWith('socket down');
    });

    it('should reset reconnection attempts after connect', () => {
      const { result } = renderHook(() => useSocket());
      const connectErrorHandler = getRegisteredHandler('connect_error');
      const connectHandler = getRegisteredHandler('connect');

      act(() => {
        connectErrorHandler(new Error('socket down'));
      });

      act(() => {
        connectHandler();
      });

      expect(result.current.reconnectAttempts).toBe(0);
      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.statusMessage).toBe('Connected');
      expect(mockSetConnected).toHaveBeenCalledWith(true);
      expect(mockSetError).toHaveBeenCalledWith(null);
    });
  });

  describe('Fallback Handling', () => {
    it('should provide fallback data from last successful state', () => {
      const { result } = renderHook(() => useSocket());

      expect(result.current).toHaveProperty('lastKnownState');
    });

    it('should provide method to fetch prices via REST when socket unavailable', () => {
      const { result } = renderHook(() => useSocket());

      expect(result.current).toHaveProperty('fetchPricesViaRest');
      expect(typeof result.current.fetchPricesViaRest).toBe('function');
    });

    it('should fetch prices via REST and cache the response', async () => {
      const prices = [{ symbol: 'AAPL', price: 180 }];
      mockFetch.mockResolvedValue({
        json: jest.fn().mockResolvedValue(prices),
      });

      const { result } = renderHook(() => useSocket());

      await act(async () => {
        await result.current.fetchPricesViaRest();
      });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/stocks/prices');
      expect(result.current.lastKnownState).toEqual(prices);
    });
  });

  describe('Price Updates', () => {
    it('should handle price subscription', () => {
      const { result } = renderHook(() => useSocket());
      mockSocket.connected = true;

      result.current.subscribe('AAPL');

      expect(mockSocket.emit).toHaveBeenCalledWith('price:subscribe', { symbol: 'AAPL' });
    });

    it('should handle price unsubscription', () => {
      const { result } = renderHook(() => useSocket());
      mockSocket.connected = true;

      result.current.unsubscribe('AAPL');

      expect(mockSocket.emit).toHaveBeenCalledWith('price:unsubscribe', { symbol: 'AAPL' });
    });

    it('should not emit when disconnected', () => {
      const { result } = renderHook(() => useSocket());
      mockSocket.connected = false;

      result.current.subscribe('AAPL');

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should cache the latest price update event payload', () => {
      const { result } = renderHook(() => useSocket());
      const priceUpdateHandler = getRegisteredHandler('price:update');
      const payload = { symbol: 'AAPL', price: 181 };

      act(() => {
        priceUpdateHandler(payload);
      });

      expect(result.current.lastKnownState).toEqual(payload);
    });
  });

  describe('Custom Event Handling', () => {
    it('should support subscribing to custom events', () => {
      const { result } = renderHook(() => useSocket());

      const handler = jest.fn();
      result.current.on('custom:event', handler);

      expect(mockSocket.on).toHaveBeenCalledWith('custom:event', handler);
    });

    it('should support emitting custom events', () => {
      const { result } = renderHook(() => useSocket());
      mockSocket.connected = true;

      result.current.emit('custom:action', { data: 'test' });

      expect(mockSocket.emit).toHaveBeenCalledWith('custom:action', { data: 'test' });
    });
  });

  describe('Connection Status Badge', () => {
    it('should provide connection status for UI', () => {
      const { result } = renderHook(() => useSocket());

      expect(result.current).toHaveProperty('connectionStatus');
    });

    it('should provide human-readable status message', () => {
      const { result } = renderHook(() => useSocket());

      expect(result.current).toHaveProperty('statusMessage');
      expect(typeof result.current.statusMessage).toBe('string');
    });

    it('should show offline status when the socket errors', () => {
      const { result } = renderHook(() => useSocket());
      const errorHandler = getRegisteredHandler('error');

      act(() => {
        errorHandler(new Error('network unavailable'));
      });

      expect(result.current.connectionStatus).toBe('offline');
      expect(result.current.statusMessage).toBe('Offline');
      expect(result.current.isOnline).toBe(false);
      expect(mockSetError).toHaveBeenCalledWith('Error: network unavailable');
    });

    it('should mark the store disconnected on socket disconnect', () => {
      const { result } = renderHook(() => useSocket());
      const disconnectHandler = getRegisteredHandler('disconnect');

      act(() => {
        disconnectHandler();
      });

      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.statusMessage).toBe('Disconnected');
      expect(mockSetConnected).toHaveBeenCalledWith(false);
    });
  });

  describe('Event Registration Guardrails', () => {
    it('should skip unsubscribe when disconnected', () => {
      const { result } = renderHook(() => useSocket());

      result.current.unsubscribe('AAPL');

      expect(mockSocket.emit).not.toHaveBeenCalledWith('price:unsubscribe', { symbol: 'AAPL' });
    });

    it('should skip registering handlers after unmount', () => {
      const { result, unmount } = renderHook(() => useSocket());

      unmount();
      result.current.on('custom:event', jest.fn());

      expect(mockSocket.on).toHaveBeenCalledTimes(5);
    });

    it('should skip emitting custom events after unmount', () => {
      const { result, unmount } = renderHook(() => useSocket());

      unmount();
      result.current.emit('custom:event', { value: 1 });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  it('should fall back to offline mode when socket creation fails', () => {
    (socketIO.default as jest.Mock).mockImplementationOnce(() => {
      throw new Error('socket init failed');
    });
    (socketIO.io as jest.Mock).mockImplementationOnce(() => {
      throw new Error('socket init failed');
    });

    const { result } = renderHook(() => useSocket());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.connectionStatus).toBe('offline');
    expect(result.current.statusMessage).toBe('Offline');
    expect(mockSetError).toHaveBeenCalledWith('Error: socket init failed');
  });
});
