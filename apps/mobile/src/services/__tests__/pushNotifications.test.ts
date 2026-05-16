import { PushNotificationManager } from '../pushNotifications';

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

  beforeEach(() => {
    jest.clearAllMocks();
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
    adapter.getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    adapter.getDevicePushTokenAsync.mockResolvedValue({ data: 'fcm-token' });
    adapter.addPushTokenListener.mockReturnValue({ remove: jest.fn() });

    const manager = new PushNotificationManager(adapter, backend, true);
    await manager.enable();
    await manager.disable();

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
});
