import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FinnhubService } from './finnhub.service';
import { PricePublisherService } from '../redis/price-publisher.service';

// Mock WebSocket for Node.js environment
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;

  constructor() {
    // Simulate opening after a tick
    setImmediate(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    });
  }

  send() {
    // Mock send
  }

  close() {
    // Mock close
  }
}

describe('FinnhubService', () => {
  let service: FinnhubService;
  let configService: ConfigService;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    // Mock WebSocket globally
    (global as any).WebSocket = MockWebSocket;

    moduleRef = await Test.createTestingModule({
      providers: [
        FinnhubService,
        {
          provide: PricePublisherService,
          useValue: {
            publishPriceUpdate: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                FINNHUB_API_KEY: 'test-api-key',
                FINNHUB_WS_URL: 'wss://ws.finnhub.io',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get<FinnhubService>(FinnhubService);
    configService = moduleRef.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await service.disconnect();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should read API key from config', () => {
      expect(configService.get).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('subscribe', () => {
    it('should track subscribed symbols', () => {
      service.subscribe('AAPL');
      service.subscribe('GOOGL');

      expect((service as any).subscribedSymbols).toContain('AAPL');
      expect((service as any).subscribedSymbols).toContain('GOOGL');
    });

    it('should not subscribe to the same symbol twice', () => {
      const mockSendMessage = jest.spyOn(service as any, 'sendMessage');

      service.subscribe('AAPL');
      const firstCallCount = mockSendMessage.mock.calls.length;

      service.subscribe('AAPL');
      const secondCallCount = mockSendMessage.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('unsubscribe', () => {
    it('should remove symbol from subscribed list', () => {
      service.subscribe('AAPL');
      service.unsubscribe('AAPL');

      expect((service as any).subscribedSymbols).not.toContain('AAPL');
    });
  });

  describe('price message handling', () => {
    it('should parse valid price message', () => {
      const message = {
        type: 'trade',
        data: [
          {
            s: 'AAPL',
            p: 150.5,
            t: 1234567890,
            v: 100,
          },
        ],
      };

      const parsed = (service as any).parsePriceMessage(JSON.stringify(message));

      expect(parsed).toEqual(message);
    });

    it('should log and throw for invalid price payloads', () => {
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

      expect(() => (service as any).parsePriceMessage('{bad json')).toThrow();
      expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to parse message:', expect.any(SyntaxError));
    });

    it('should emit price update event when trade received', () => {
      const onPriceSpy = jest.fn();
      service.onPrice(onPriceSpy);

      const message = {
        type: 'trade',
        data: [
          {
            s: 'AAPL',
            p: 150.5,
            t: 1234567890,
            v: 100,
          },
        ],
      };

      (service as any).handlePriceMessage(message);

      expect(onPriceSpy).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'AAPL', price: 150.5 }));
    });

    it('should publish price updates to redis when a trade is received', () => {
      const publisher = moduleRef.get(PricePublisherService);

      const message = {
        type: 'trade',
        data: [
          {
            s: 'AAPL',
            p: 150.5,
            t: 1234567890,
            v: 100,
          },
        ],
      };

      (service as any).handlePriceMessage(message);

      expect(publisher.publishPriceUpdate).toHaveBeenCalledWith({
        symbol: 'AAPL',
        price: 150.5,
        timestamp: 1234567890,
        volume: 100,
      });
    });

    it('should ignore non-trade messages', () => {
      const onPriceSpy = jest.fn();
      service.onPrice(onPriceSpy);

      const message = {
        type: 'ping',
      };

      (service as any).handlePriceMessage(message);

      expect(onPriceSpy).not.toHaveBeenCalled();
    });

    it('should publish to redis, notify listeners, and respond to pings', async () => {
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
      const publisher = moduleRef.get(PricePublisherService);
      const listener = jest.fn(() => {
        throw new Error('listener failed');
      });

      publisher.publishPriceUpdate = jest.fn().mockRejectedValue(new Error('redis failed'));
      service.onPrice(listener);
      (service as any).wsConnected = true;
      (service as any).ws = {
        send: jest.fn(),
      };

      (service as any).handlePriceMessage({
        type: 'trade',
        data: [{ s: 'MSFT', p: 432.1, t: 111, v: 7 }],
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'MSFT', price: 432.1 }));
      expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to publish price update to Redis', expect.any(Error));
      expect(loggerErrorSpy).toHaveBeenCalledWith('Error in price listener:', expect.any(Error));

      (service as any).handlePriceMessage({ type: 'ping' });
      expect((service as any).ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'pong' }));
    });
  });

  describe('heartbeat detection', () => {
    it('should track last heartbeat timestamp', () => {
      const beforeTime = Date.now();
      (service as any).recordHeartbeat();
      const afterTime = Date.now();

      const lastHeartbeat = (service as any).lastHeartbeatTime;

      expect(lastHeartbeat).toBeGreaterThanOrEqual(beforeTime);
      expect(lastHeartbeat).toBeLessThanOrEqual(afterTime);
    });

    it('should detect connection as dead if no heartbeat for timeout duration', () => {
      (service as any).lastHeartbeatTime = Date.now() - 65000;
      (service as any).heartbeatTimeoutMs = 60000;

      const isAlive = (service as any).isConnectionAlive();

      expect(isAlive).toBe(false);
    });

    it('should detect connection as alive if heartbeat recent', () => {
      (service as any).lastHeartbeatTime = Date.now();
      (service as any).heartbeatTimeoutMs = 60000;

      const isAlive = (service as any).isConnectionAlive();

      expect(isAlive).toBe(true);
    });
  });

  describe('reconnect telemetry', () => {
    it('should provide telemetry data on reconnect stats', () => {
      const telemetry = service.getReconnectTelemetry();

      expect(telemetry.reconnectAttempts).toBeDefined();
      expect(typeof telemetry.failureCount).toBe('number');
      expect(typeof telemetry.totalConnectionTime).toBe('number');
    });
  });

  describe('connection lifecycle', () => {
    it('should reject connect without an API key', async () => {
      (service as any).apiKey = '';

      await expect(service.connect()).rejects.toThrow('FINNHUB_API_KEY is not configured');
    });

    it('should return early when already connected', async () => {
      (service as any).wsConnected = true;
      const connectWithRetrySpy = jest.spyOn(service as any, 'connectWithRetry');

      await service.connect();

      expect(connectWithRetrySpy).not.toHaveBeenCalled();
    });

    it('should reconnect on close unless REST fallback is enabled', async () => {
      await service.connect();

      const attemptReconnectSpy = jest.spyOn(service as any, 'attemptReconnect').mockImplementation(() => undefined);
      (service as any).ws.onclose?.(new Event('close'));

      expect(attemptReconnectSpy).toHaveBeenCalled();

      attemptReconnectSpy.mockClear();
      (service as any).useRestFallback = true;
      (service as any).ws.onclose?.(new Event('close'));

      expect(attemptReconnectSpy).not.toHaveBeenCalled();
    });

    it('should log websocket message parse errors', async () => {
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

      await service.connect();
      (service as any).ws.onmessage?.({ data: '{bad json' } as MessageEvent);

      expect(loggerErrorSpy).toHaveBeenCalledWith('Error processing message:', expect.any(SyntaxError));
    });

    it('should connect with retry success and fallback paths', async () => {
      const startHeartbeatCheckSpy = jest.spyOn(service as any, 'startHeartbeatCheck').mockImplementation(() => undefined);
      const connectWebSocketSpy = jest.spyOn(service as any, 'connectWebSocket').mockResolvedValue(undefined);

      await (service as any).connectWithRetry();

      expect(connectWebSocketSpy).toHaveBeenCalledTimes(1);
      expect(startHeartbeatCheckSpy).toHaveBeenCalled();

      connectWebSocketSpy.mockRejectedValue(new Error('retry failed'));
      const delaySpy = jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);
      const startRestFallbackSpy = jest.spyOn(service as any, 'startRestFallback').mockImplementation(() => undefined);

      await (service as any).connectWithRetry();

      expect((service as any).useRestFallback).toBe(true);
      expect((service as any).reconnectAttempts).toBe(5);
      expect((service as any).failureCount).toBeGreaterThanOrEqual(5);
      expect(startRestFallbackSpy).toHaveBeenCalled();

      delaySpy.mockRestore();
    });
  });

  describe('REST polling fallback', () => {
    it('should have REST fallback option when WebSocket unavailable', () => {
      expect(service.enableRestFallback).toBeDefined();
      expect(typeof service.enableRestFallback).toBe('function');
    });

    it('should poll subscribed symbols and stop cleanly', async () => {
      const publisher = moduleRef.get(PricePublisherService);
      const originalSetInterval = global.setInterval;
      const originalClearInterval = global.clearInterval;
      const clearIntervalSpy = jest.fn();
      let intervalCallback: (() => Promise<void>) | undefined;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ c: 150.5, t: 1234567890 }),
      } as any);

      try {
        (global as any).setInterval = jest.fn((callback: () => Promise<void>) => {
          intervalCallback = callback;
          return 123;
        });
        (global as any).clearInterval = clearIntervalSpy;

        (service as any).restFallbackSymbols.add('AAPL');
        (service as any).startRestFallback();
        (service as any).startRestFallback();

        expect((global as any).setInterval).toHaveBeenCalledTimes(1);

        await intervalCallback?.();

        expect(publisher.publishPriceUpdate).toHaveBeenCalledWith({
          symbol: 'AAPL',
          price: 150.5,
          timestamp: 1234567890,
        });

        (service as any).stopRestFallback();

        expect(clearIntervalSpy).toHaveBeenCalledWith(123);
        expect((service as any).restPollInterval).toBeNull();
      } finally {
        global.setInterval = originalSetInterval;
        global.clearInterval = originalClearInterval;
      }
    });

    it('should fetch price via REST API as fallback', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ c: 150.5, t: 1234567890 }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const price = await service.fetchPriceViaRest('AAPL');

      expect(global.fetch).toHaveBeenCalled();
      expect(price).toBeDefined();
      expect(price?.price).toBe(150.5);
    });

    it('should return null for non-OK REST responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      const price = await service.fetchPriceViaRest('AAPL');

      expect(price).toBeNull();
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const price = await service.fetchPriceViaRest('AAPL');

      expect(price).toBeNull();
    });

    it('should switch to REST fallback when enabled', async () => {
      await service.enableRestFallback();

      expect(service.isUsingRestFallback()).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should clear subscribed symbols on disconnect', async () => {
      service.subscribe('AAPL');
      service.onPrice(jest.fn());
      await service.enableRestFallback();
      service.subscribe('MSFT');

      await service.disconnect();

      expect((service as any).subscribedSymbols.size).toBe(0);
      expect((service as any).restFallbackSymbols.size).toBe(0);
      expect((service as any).priceListeners).toHaveLength(0);
      expect(service.isConnected()).toBe(false);
    });

    it('should stop heartbeat check on disconnect', async () => {
      // Manually start heartbeat check to verify it gets stopped
      (service as any).startHeartbeatCheck();

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      await service.disconnect();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('low-level send helpers', () => {
    it('should swallow websocket send failures', () => {
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
      (service as any).wsConnected = true;
      (service as any).ws = {
        send: jest.fn(() => {
          throw new Error('send failed');
        }),
      };

      (service as any).sendMessage({ type: 'subscribe', symbol: 'AAPL' });

      expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to send message:', expect.any(Error));
    });

    it('should compute capped backoff delays', () => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      expect((service as any).calculateBackoff(1)).toBe(1000);
      expect((service as any).calculateBackoff(10)).toBe(30000);

      randomSpy.mockRestore();
    });
  });

  describe('connection status', () => {
    it('should report disconnected status by default', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should report connected status when connected', () => {
      (service as any).wsConnected = true;

      expect(service.isConnected()).toBe(true);
    });
  });
});
