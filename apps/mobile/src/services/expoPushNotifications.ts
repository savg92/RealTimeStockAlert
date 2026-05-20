import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import {
  PushNotificationAdapter,
  PushNotificationManager,
  createNotificationBackendClient,
} from './pushNotifications';

const expoAdapter: PushNotificationAdapter = {
  getPermissionsAsync: () => Notifications.getPermissionsAsync(),
  requestPermissionsAsync: () => Notifications.requestPermissionsAsync(),
  getDevicePushTokenAsync: () => Notifications.getDevicePushTokenAsync(),
  addPushTokenListener: (listener) => Notifications.addPushTokenListener(listener),
};

export const createExpoPushNotificationManager = (): PushNotificationManager => {
  const allowEmulatorPush = process.env.EXPO_PUBLIC_ALLOW_EMULATOR_PUSH === 'true';
  return new PushNotificationManager(
    expoAdapter,
    createNotificationBackendClient(),
    Constants.isDevice || allowEmulatorPush,
  );
};

