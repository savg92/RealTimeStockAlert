import { createNotificationBackendClient, PushNotificationManager } from '../pushNotifications';

describe('PushNotificationManager', () => {
  const adapter = {
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    getDevicePushTokenAsync: jest.fn(),
    addPushTokenListener: jest.fn(),
  };
  const backend = {
    registerToken: jest.fn(),
    unregisterToken: jest.fn(),
  };
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('requests permission and registers token', async () => {
    adapter.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    adapter.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    adapter.getDevicePushTokenAsync.mockResolvedValue({ data: 'fcm-token' });
    adapter.addPushTokenListener.mockReturnValue({ remove: jest.fn() });

    const manager = new PushNotificationManager(adapter, backend, true);
    const result = await manager.enable();

    expect(result).toEqual({ synced: true, token: 'fcm-token' });
    expect(backend.registerToken).toHaveBeenCalledWith('fcm-token');
  });

  it('revokes token on disable', async () => {
    const remove = jest.fn();
    adapter.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    adapter.getDevicePushTokenAsync.mockResolvedValue({ data: 'fcm-token' });
    adapter.addPushTokenListener.mockReturnValue({ remove });

    const manager = new PushNotificationManager(adapter, backend, true);
    await manager.enable();
    await manager.disable();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(backend.unregisterToken).toHaveBeenCalledWith('fcm-token');
  });

  it('returns a skipped result when permission is denied', async () => {
    adapter.getPermissionsAsync.mockResolvedValue({ status: 'denied' });
    adapter.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const manager = new PushNotificationManager(adapter, backend, true);
    const result = await manager.enable();

    expect(result).toEqual({
      synced: false,
      reason: 'Push notification permission denied',
    });
    expect(backend.registerToken).not.toHaveBeenCalled();
  });

  it('syncs refreshed tokens and revokes the previous token', async () => {
    let pushTokenListener: ((token: { data?: string }) => void) | undefined;

    adapter.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    adapter.getDevicePushTokenAsync.mockResolvedValue({ data: 'initial-token' });
    adapter.addPushTokenListener.mockImplementation((listener) => {
      pushTokenListener = listener;
      return { remove: jest.fn() };
    });
    backend.registerToken.mockResolvedValue(undefined);
    backend.unregisterToken.mockResolvedValue(undefined);

    const manager = new PushNotificationManager(adapter, backend, true);
    await manager.enable();

    pushTokenListener?.({ data: 'refreshed-token' });
    await new Promise((resolve) => setImmediate(resolve));

    expect(backend.registerToken).toHaveBeenCalledWith('refreshed-token');
    expect(backend.unregisterToken).toHaveBeenCalledWith('initial-token');
  });

  it('does not attach a second refresh listener when enabled twice', async () => {
    adapter.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    adapter.getDevicePushTokenAsync.mockResolvedValue({ data: 'initial-token' });
    adapter.addPushTokenListener.mockReturnValue({ remove: jest.fn() });

    const manager = new PushNotificationManager(adapter, backend, true);
    await manager.enable();
    await manager.enable();

    expect(adapter.addPushTokenListener).toHaveBeenCalledTimes(1);
  });

  it('logs refresh sync failures without throwing', async () => {
    let pushTokenListener: ((token: { data?: string }) => void) | undefined;

    adapter.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    adapter.getDevicePushTokenAsync.mockResolvedValue({ data: 'initial-token' });
    adapter.addPushTokenListener.mockImplementation((listener) => {
      pushTokenListener = listener;
      return { remove: jest.fn() };
    });
    backend.registerToken.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('sync failed'));
    backend.unregisterToken.mockResolvedValue(undefined);

    const manager = new PushNotificationManager(adapter, backend, true);
    await manager.enable();

    pushTokenListener?.({ data: 'refreshed-token' });
    await new Promise((resolve) => setImmediate(resolve));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to sync refreshed FCM token',
      expect.any(Error),
    );
    expect(backend.unregisterToken).not.toHaveBeenCalledWith('initial-token');
  });

  it('skips setup on a simulator or emulator', async () => {
    const manager = new PushNotificationManager(adapter, backend, false);
    const result = await manager.enable();

    expect(result).toEqual({
      synced: false,
      reason: 'Push notifications require a physical device',
    });
  });

  it('returns a no-token result when the device yields an empty push token', async () => {
    adapter.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    adapter.getDevicePushTokenAsync.mockResolvedValue({ data: '   ' });

    const manager = new PushNotificationManager(adapter, backend, true);
    const result = await manager.enable();

    expect(result).toEqual({
      synced: false,
      reason: 'No FCM token returned by device',
    });
  });

  it('returns a no-token result when the device token payload is malformed', async () => {
    adapter.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    adapter.getDevicePushTokenAsync.mockResolvedValue({ data: 1234 });

    const manager = new PushNotificationManager(adapter, backend, true);
    const result = await manager.enable();

    expect(result).toEqual({
      synced: false,
      reason: 'No FCM token returned by device',
    });
  });

  it('ignores refresh events that do not change the token', async () => {
    let pushTokenListener: ((token: { data?: string }) => void) | undefined;

    adapter.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    adapter.getDevicePushTokenAsync.mockResolvedValue({ data: 'initial-token' });
    adapter.addPushTokenListener.mockImplementation((listener) => {
      pushTokenListener = listener;
      return { remove: jest.fn() };
    });

    const manager = new PushNotificationManager(adapter, backend, true);
    await manager.enable();

    pushTokenListener?.({ data: 'initial-token' });
    await new Promise((resolve) => setImmediate(resolve));

    expect(backend.registerToken).toHaveBeenCalledTimes(1);
    expect(backend.unregisterToken).not.toHaveBeenCalled();
  });

  it('ignores refresh events when the refreshed payload has no valid token', async () => {
    let pushTokenListener: ((token: { data?: string }) => void) | undefined;

    adapter.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    adapter.getDevicePushTokenAsync.mockResolvedValue({ data: 'initial-token' });
    adapter.addPushTokenListener.mockImplementation((listener) => {
      pushTokenListener = listener;
      return { remove: jest.fn() };
    });

    const manager = new PushNotificationManager(adapter, backend, true);
    await manager.enable();

    pushTokenListener?.({ data: '   ' });
    await new Promise((resolve) => setImmediate(resolve));

    expect(backend.registerToken).toHaveBeenCalledTimes(1);
    expect(backend.unregisterToken).not.toHaveBeenCalled();
  });

  it('does not try to unregister a token when disabled before enable succeeds', async () => {
    const manager = new PushNotificationManager(adapter, backend, true);

    await manager.disable();

    expect(backend.unregisterToken).not.toHaveBeenCalled();
  });
});

describe('createNotificationBackendClient', () => {
  it('falls back to a no-op client when no bearer token is configured', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as never;
    const client = createNotificationBackendClient();

    await client.registerToken('fcm-token');
    await client.unregisterToken('fcm-token');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('syncs tokens through the backend when a bearer token is configured', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
    } as Response);
    global.fetch = fetchSpy as never;

    const client = createNotificationBackendClient('bearer-123');
    await client.registerToken('fcm-token');
    await client.unregisterToken('fcm-token');

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/notifications/token'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer bearer-123',
        }),
        body: JSON.stringify({ token: 'fcm-token' }),
      }),
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/notifications/token/fcm-token'),
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer bearer-123',
        }),
      }),
    );
  });

  it('throws when backend sync fails', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);
    global.fetch = fetchSpy as never;

    const client = createNotificationBackendClient('bearer-123');

    await expect(client.registerToken('fcm-token')).rejects.toThrow(
      'Notification sync failed (500)',
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('trims configured bearer tokens before building auth headers', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
    } as Response);
    global.fetch = fetchSpy as never;

    const client = createNotificationBackendClient(' bearer-123 ');
    await client.registerToken('fcm-token');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer bearer-123',
        }),
      }),
    );
  });

  it('throws when unregister token sync fails', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);
    global.fetch = fetchSpy as never;

    const client = createNotificationBackendClient('bearer-123');

    await expect(client.unregisterToken('fcm-token')).rejects.toThrow(
      'Notification sync failed (403)',
    );
  });

});
