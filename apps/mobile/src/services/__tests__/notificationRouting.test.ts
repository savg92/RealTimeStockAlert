import { NotificationRouter, resolveNotificationRoute } from '../notificationRouting';

describe('resolveNotificationRoute', () => {
  it('returns null when notification payload is not an object', () => {
    expect(resolveNotificationRoute('AAPL')).toBeNull();
    expect(resolveNotificationRoute(['AAPL'])).toBeNull();
  });

  it('routes stock notifications to StockDetail when only a symbol is provided', () => {
    expect(resolveNotificationRoute({ symbol: 'AAPL' })).toEqual({
      name: 'StockDetail',
      params: { symbol: 'AAPL' },
    });
  });

  it('supports route aliases and trims string fields', () => {
    expect(resolveNotificationRoute({ target: ' StockDetail ', stockSymbol: ' TSLA ', name: ' Tesla ' })).toEqual({
      name: 'StockDetail',
      params: { symbol: 'TSLA', name: 'Tesla' },
    });
  });

  it('routes to allowed non-stock routes when requested', () => {
    expect(resolveNotificationRoute({ route: 'Home' })).toEqual({ name: 'Home' });
  });

  it('rejects unsafe or unknown routes', () => {
    expect(resolveNotificationRoute({ route: 'Admin', symbol: 'AAPL' })).toBeNull();
  });

  it('requires a symbol for StockDetail routes', () => {
    expect(resolveNotificationRoute({ screen: 'StockDetail' })).toBeNull();
  });
});

describe('NotificationRouter', () => {
  it('ignores responses that do not resolve to a route', () => {
    const navigate = jest.fn();
    const router = new NotificationRouter({
      isReady: () => true,
      navigate,
    });

    router.handleResponse({
      notification: {
        request: {
          content: {
            data: { route: 'Unknown' },
          },
        },
      },
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates immediately when navigation is ready', () => {
    const navigate = jest.fn();
    const router = new NotificationRouter({
      isReady: () => true,
      navigate,
    });

    router.handleResponse({
      notification: {
        request: {
          content: {
            data: { symbol: 'MSFT', name: 'Microsoft' },
          },
        },
      },
    });

    expect(navigate).toHaveBeenCalledWith('StockDetail', {
      symbol: 'MSFT',
      name: 'Microsoft',
    });
  });

  it('queues notification navigation until the navigator is ready', () => {
    const navigate = jest.fn();
    let ready = false;
    const router = new NotificationRouter({
      isReady: () => ready,
      navigate,
    });

    router.handleResponse({
      notification: {
        request: {
          content: {
            data: { screen: 'Watchlist' },
          },
        },
      },
    });

    expect(navigate).not.toHaveBeenCalled();

    ready = true;
    router.handleReady();

    expect(navigate).toHaveBeenCalledWith('Watchlist', undefined);
  });

  it('does not navigate queued routes until navigation becomes ready', () => {
    const navigate = jest.fn();
    const router = new NotificationRouter({
      isReady: () => false,
      navigate,
    });

    router.handleResponse({
      notification: {
        request: {
          content: {
            data: { route: 'Alerts' },
          },
        },
      },
    });

    router.handleReady();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('does nothing on ready when no pending route exists', () => {
    const navigate = jest.fn();
    const router = new NotificationRouter({
      isReady: () => true,
      navigate,
    });

    router.handleReady();

    expect(navigate).not.toHaveBeenCalled();
  });
});
