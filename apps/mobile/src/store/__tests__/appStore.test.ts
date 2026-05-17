import { useAppStore } from '../appStore';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it('exposes the default state', () => {
    const state = useAppStore.getState();

    expect(state.stocks).toEqual([]);
    expect(state.alerts).toEqual([]);
    expect(state.isConnected).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.settings.notifications).toBe(true);
  });

  it('updates collections and flags through store actions', () => {
    const store = useAppStore.getState();

    store.setStocks([
      {
        id: '1',
        symbol: 'AAPL',
        name: 'Apple',
        price: 200,
        change: 1,
        changePercent: 0.5,
        currency: 'USD',
        lastUpdated: new Date('2026-05-16T00:00:00.000Z'),
      },
    ]);
    store.updateStock({
      id: '1',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 201,
      change: 2,
      changePercent: 1,
      currency: 'USD',
      lastUpdated: new Date('2026-05-16T00:01:00.000Z'),
    });
    store.setAlerts([
      {
        id: 'a1',
        symbol: 'AAPL',
        price: 200,
        condition: 'above',
        threshold: 200,
        isActive: true,
        createdAt: '2026-05-16T00:00:00.000Z',
        updatedAt: '2026-05-16T00:00:00.000Z',
      },
    ]);
    store.addAlert({
      id: 'a2',
      symbol: 'MSFT',
      price: 300,
      condition: 'below',
      threshold: 300,
      isActive: true,
      createdAt: '2026-05-16T00:00:00.000Z',
      updatedAt: '2026-05-16T00:00:00.000Z',
    });
    store.removeAlert('a1');
    store.setSettings({
      notifications: false,
      darkMode: true,
      autoRefresh: false,
      wifiOnly: true,
      currency: 'EUR',
      refreshInterval: 15000,
    });
    store.updateSettings({ wifiOnly: false, refreshInterval: 60000 });
    store.setConnected(true);
    store.setLoading(true);
    store.setError('Boom');

    const state = useAppStore.getState();

    expect(state.stocks).toHaveLength(1);
    expect(state.stocks[0].price).toBe(201);
    expect(state.alerts).toHaveLength(1);
    expect(state.alerts[0].id).toBe('a2');
    expect(state.settings.currency).toBe('EUR');
    expect(state.settings.wifiOnly).toBe(false);
    expect(state.settings.refreshInterval).toBe(60000);
    expect(state.isConnected).toBe(true);
    expect(state.isLoading).toBe(true);
    expect(state.error).toBe('Boom');
  });
});
