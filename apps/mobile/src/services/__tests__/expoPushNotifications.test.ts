import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { createExpoPushNotificationManager } from '../expoPushNotifications';
import { createNotificationBackendClient, PushNotificationManager } from '../pushNotifications';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    isDevice: true,
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  addPushTokenListener: jest.fn(),
}));

jest.mock('../pushNotifications', () => ({
  __esModule: true,
  PushNotificationManager: jest.fn().mockImplementation((adapter, backend, isPhysicalDevice) => ({
    adapter,
    backend,
    isPhysicalDevice,
  })),
  createNotificationBackendClient: jest.fn(),
}));

describe('createExpoPushNotificationManager', () => {
  beforeEach(() => {
    (Constants as { isDevice: boolean }).isDevice = true;
    jest.clearAllMocks();
  });

  it('creates a manager wired to Expo notifications and device detection', () => {
    const backendClient = { registerToken: jest.fn(), unregisterToken: jest.fn() };
    (createNotificationBackendClient as jest.Mock).mockReturnValue(backendClient);

    const manager = createExpoPushNotificationManager();

    expect(manager).toEqual({
      adapter: expect.objectContaining({
        getPermissionsAsync: expect.any(Function),
        requestPermissionsAsync: expect.any(Function),
        getDevicePushTokenAsync: expect.any(Function),
        addPushTokenListener: expect.any(Function),
      }),
      backend: backendClient,
      isPhysicalDevice: true,
    });
    expect(createNotificationBackendClient).toHaveBeenCalledTimes(1);
    expect(PushNotificationManager).toHaveBeenCalledWith(
      expect.objectContaining({
        getPermissionsAsync: expect.any(Function),
        requestPermissionsAsync: expect.any(Function),
        getDevicePushTokenAsync: expect.any(Function),
        addPushTokenListener: expect.any(Function),
      }),
      backendClient,
      true,
    );
    expect(Constants.isDevice).toBe(true);
    const [adapter] = (PushNotificationManager as jest.Mock).mock.calls[0];
    adapter.getPermissionsAsync();
    adapter.requestPermissionsAsync();
    adapter.getDevicePushTokenAsync();
    adapter.addPushTokenListener(jest.fn());
    expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(Notifications.getDevicePushTokenAsync).toHaveBeenCalled();
    expect(Notifications.addPushTokenListener).toHaveBeenCalled();
  });

  it('passes through non-device environments to manager construction', () => {
    const backendClient = { registerToken: jest.fn(), unregisterToken: jest.fn() };
    (Constants as { isDevice: boolean }).isDevice = false;
    (createNotificationBackendClient as jest.Mock).mockReturnValue(backendClient);

    createExpoPushNotificationManager();

    expect(PushNotificationManager).toHaveBeenCalledWith(
      expect.any(Object),
      backendClient,
      false,
    );
  });
});
