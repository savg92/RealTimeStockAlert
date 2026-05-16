import { renderHook, waitFor } from '@testing-library/react-native';
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock socket
    mockSocket = {
      on: jest.fn((event: string, handler: Function) => {
        if (event === 'connect') {
          setTimeout(() => handler(), 100);
        }
      }),
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
  });
});
