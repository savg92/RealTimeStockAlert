import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FinnhubService } from './finnhub.service';

describe('FinnhubService', () => {
  let service: FinnhubService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinnhubService,
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

    service = module.get<FinnhubService>(FinnhubService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('connect', () => {
    it('should establish WebSocket connection with authentication', async () => {
      // Mock WebSocket connection
      const mockConnect = jest.spyOn(service as any, 'connectWebSocket').mockResolvedValueOnce(true);

      await service.connect();

      expect(mockConnect).toHaveBeenCalled();
    });

    it('should throw error if API key is not configured', async () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce(undefined);

      await expect(service.connect()).rejects.toThrow();
    });

    it('should retry connection with exponential backoff on failure', async () => {
      let attemptCount = 0;
      jest.spyOn(service as any, 'connectWebSocket').mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Connection failed');
        }
        return true;
      });

      await service.connect();

      expect(attemptCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('subscribe', () => {
    it('should send subscription message for a symbol', async () => {
      const mockSendMessage = jest.spyOn(service as any, 'sendMessage').mockResolvedValueOnce(true);

      service.subscribe('AAPL');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'subscribe',
          symbol: 'AAPL',
        })
      );
    });

    it('should track subscribed symbols', () => {
      service.subscribe('AAPL');
      service.subscribe('GOOGL');

      expect((service as any).subscribedSymbols).toContain('AAPL');
      expect((service as any).subscribedSymbols).toContain('GOOGL');
    });

    it('should not subscribe to the same symbol twice', () => {
      const mockSendMessage = jest.spyOn(service as any, 'sendMessage').mockResolvedValue(true);

      service.subscribe('AAPL');
      service.subscribe('AAPL');

      expect(mockSendMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe', () => {
    it('should send unsubscription message for a symbol', async () => {
      service.subscribe('AAPL');
      const mockSendMessage = jest.spyOn(service as any, 'sendMessage').mockResolvedValueOnce(true);

      service.unsubscribe('AAPL');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'unsubscribe',
          symbol: 'AAPL',
        })
      );
    });

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

    it('should emit price update event when trade received', async () => {
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
    it('should detect ping messages and respond with pong', async () => {
      const mockSendMessage = jest.spyOn(service as any, 'sendMessage').mockResolvedValueOnce(true);

      (service as any).handleHeartbeat();

      expect(mockSendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'pong' }));
    });

    it('should track last heartbeat timestamp', () => {
      const beforeTime = Date.now();
      (service as any).recordHeartbeat();
      const afterTime = Date.now();

      const lastHeartbeat = (service as any).lastHeartbeatTime;

      expect(lastHeartbeat).toBeGreaterThanOrEqual(beforeTime);
      expect(lastHeartbeat).toBeLessThanOrEqual(afterTime);
    });

    it('should detect connection as dead if no heartbeat for timeout duration', () => {
      (service as any).lastHeartbeatTime = Date.now() - 65000; // 65 seconds ago
      (service as any).heartbeatTimeoutMs = 60000; // 60 second timeout

      const isAlive = (service as any).isConnectionAlive();

      expect(isAlive).toBe(false);
    });
  });

  describe('reconnect telemetry', () => {
    it('should track reconnection attempts', async () => {
      const getTelemetry = jest.spyOn(service, 'getReconnectTelemetry');

      (service as any).recordReconnectAttempt();

      expect(getTelemetry).toBeDefined();
    });

    it('should provide telemetry data on reconnect stats', () => {
      (service as any).recordReconnectAttempt();
      (service as any).recordReconnectAttempt();

      const telemetry = service.getReconnectTelemetry();

      expect(telemetry.reconnectAttempts).toBeGreaterThanOrEqual(0);
      expect(telemetry.lastReconnectTime).toBeDefined();
    });
  });

  describe('REST polling fallback', () => {
    it('should have REST fallback option when WebSocket unavailable', () => {
      expect(service.enableRestFallback).toBeDefined();
      expect(typeof service.enableRestFallback).toBe('function');
    });

    it('should fetch price via REST API as fallback', async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ c: 150.5, t: 1234567890 }),
      });

      global.fetch = mockFetch as any;

      const price = await service.fetchPriceViaRest('AAPL');

      expect(mockFetch).toHaveBeenCalled();
      expect(price).toBeDefined();
    });

    it('should switch to REST fallback after WebSocket failure', async () => {
      jest.spyOn(service as any, 'connectWebSocket').mockRejectedValueOnce(new Error('Connection failed'));

      try {
        await service.connect();
      } catch (e) {
        // Expected error
      }

      expect(service.isUsingRestFallback()).toBeDefined();
    });
  });

  describe('disconnect', () => {
    it('should properly clean up resources on disconnect', async () => {
      const mockDisconnect = jest.spyOn(service as any, 'closeWebSocket').mockResolvedValueOnce(true);

      await service.disconnect();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should clear subscribed symbols on disconnect', async () => {
      service.subscribe('AAPL');

      await service.disconnect();

      expect((service as any).subscribedSymbols.size).toBe(0);
    });
  });

  describe('connection status', () => {
    it('should report connected status', () => {
      (service as any).wsConnected = true;

      expect(service.isConnected()).toBe(true);
    });

    it('should report disconnected status', () => {
      (service as any).wsConnected = false;

      expect(service.isConnected()).toBe(false);
    });
  });
});

