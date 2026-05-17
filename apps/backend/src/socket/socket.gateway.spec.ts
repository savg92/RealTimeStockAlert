import { StockGateway } from './socket.gateway';

describe('StockGateway', () => {
  const tick = {
    symbol: 'AAPL',
    price: 150.25,
    timestamp: 1710000000000,
    volume: 100,
  };

  let onPriceUpdate: jest.Mock;
  let priceSubscriber: { onPriceUpdate: jest.Mock };

  beforeEach(() => {
    onPriceUpdate = jest.fn();
    priceSubscriber = {
      onPriceUpdate,
    };
    jest.clearAllMocks();
  });

  it('emits connection status and manages subscriptions', () => {
    const gateway = new StockGateway(priceSubscriber as any);
    const client = {
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    };

    gateway.handleConnection(client as any);
    gateway.handleDisconnect(client as any);
    gateway.handleSubscribe(client as any, { symbol: 'AAPL' });
    gateway.handleSubscribe(client as any, {} as any);
    gateway.handleUnsubscribe(client as any, { symbol: 'AAPL' });
    gateway.handleUnsubscribe(client as any, {} as any);

    expect(onPriceUpdate).toHaveBeenCalledWith(expect.any(Function));
    expect(client.emit).toHaveBeenCalledWith(
      'connection-status',
      expect.objectContaining({ status: 'connected', timestamp: expect.any(String) }),
    );
    expect(client.emit).toHaveBeenCalledWith(
      'connection-status',
      expect.objectContaining({ status: 'disconnected', timestamp: expect.any(String) }),
    );
    expect(client.join).toHaveBeenCalledWith('AAPL');
    expect(client.leave).toHaveBeenCalledWith('AAPL');
  });

  it('broadcasts price ticks to the room and the full server', () => {
    let listener!: (update: typeof tick) => void;
    priceSubscriber.onPriceUpdate.mockImplementation((handler) => {
      listener = handler;
    });

    const gateway = new StockGateway(priceSubscriber as any);
    const roomEmit = jest.fn();
    const server = {
      to: jest.fn(() => ({ emit: roomEmit })),
      emit: jest.fn(),
    };

    gateway.server = server as any;
    listener(tick);

    expect(server.to).toHaveBeenCalledWith('AAPL');
    expect(roomEmit).toHaveBeenCalledWith('price:update', tick);
    expect(server.emit).toHaveBeenCalledWith('price:update', tick);
  });

  it('warns when the server is unavailable for broadcasts', () => {
    let listener!: (update: typeof tick) => void;
    priceSubscriber.onPriceUpdate.mockImplementation((handler) => {
      listener = handler;
    });

    const gateway = new StockGateway(priceSubscriber as any);
    const warn = jest.spyOn((gateway as any).logger, 'warn').mockImplementation(() => undefined);

    listener(tick);

    expect(warn).toHaveBeenCalledWith('Socket server not ready; dropping price tick');
  });
});
