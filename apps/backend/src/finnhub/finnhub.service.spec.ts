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

  describe('REST polling fallback', () => {
    it('should have REST fallback option when WebSocket unavailable', () => {
      expect(service.enableRestFallback).toBeDefined();
      expect(typeof service.enableRestFallback).toBe('function');
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

      await service.disconnect();

      expect((service as any).subscribedSymbols.size).toBe(0);
    });

    it('should stop heartbeat check on disconnect', async () => {
      // Manually start heartbeat check to verify it gets stopped
      (service as any).startHeartbeatCheck();

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      await service.disconnect();

      expect(clearIntervalSpy).toHaveBeenCalled();
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
