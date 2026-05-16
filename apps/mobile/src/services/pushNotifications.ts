import { API_CONFIG, API_ENDPOINTS } from '../utils/api';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface PushPermissionResponse {
  status: PermissionStatus;
}

export interface PushTokenResponse {
  data?: string;
}

export interface PushTokenListenerSubscription {
  remove: () => void;
}

export interface PushNotificationAdapter {
  getPermissionsAsync: () => Promise<PushPermissionResponse>;
  requestPermissionsAsync: () => Promise<PushPermissionResponse>;
  getDevicePushTokenAsync: () => Promise<PushTokenResponse>;
  addPushTokenListener: (listener: (token: PushTokenResponse) => void) => PushTokenListenerSubscription;
}

export interface PushNotificationBackend {
  registerToken: (token: string) => Promise<void>;
  unregisterToken: (token: string) => Promise<void>;
}

export interface EnablePushNotificationsResult {
  synced: boolean;
  token?: string;
  reason?: string;
}

export class PushNotificationManager {
  private currentToken: string | null = null;
  private refreshListener: PushTokenListenerSubscription | null = null;

  constructor(
    private readonly adapter: PushNotificationAdapter,
    private readonly backend: PushNotificationBackend,
    private readonly isPhysicalDevice: boolean,
  ) {}

  async enable(): Promise<EnablePushNotificationsResult> {
    if (!this.isPhysicalDevice) {
      return { synced: false, reason: 'Push notifications require a physical device' };
    }

    const permissionGranted = await this.ensurePermission();
    if (!permissionGranted) {
      return { synced: false, reason: 'Push notification permission denied' };
    }

    const token = this.extractToken(await this.adapter.getDevicePushTokenAsync());
    if (!token) {
      return { synced: false, reason: 'No FCM token returned by device' };
    }

    await this.backend.registerToken(token);
    this.currentToken = token;
    this.attachRefreshListener();
    return { synced: true, token };
  }

  async disable(): Promise<void> {
    this.refreshListener?.remove();
    this.refreshListener = null;

    if (this.currentToken) {
      await this.backend.unregisterToken(this.currentToken);
      this.currentToken = null;
    }
  }

  private async ensurePermission(): Promise<boolean> {
    const existing = await this.adapter.getPermissionsAsync();
    if (existing.status === 'granted') {
      return true;
    }

    const requested = await this.adapter.requestPermissionsAsync();
    return requested.status === 'granted';
  }

  private attachRefreshListener(): void {
    if (this.refreshListener) {
      return;
    }

    this.refreshListener = this.adapter.addPushTokenListener((tokenResponse) => {
      const token = this.extractToken(tokenResponse);
      if (!token || token === this.currentToken) {
        return;
      }

      this.currentToken = token;
      this.backend.registerToken(token).catch((err) => {
        console.error('Failed to sync refreshed FCM token', err);
      });
    });
  }

  private extractToken(tokenResponse: PushTokenResponse): string | undefined {
    if (!tokenResponse || typeof tokenResponse.data !== 'string') {
      return undefined;
    }

    const token = tokenResponse.data.trim();
    return token.length ? token : undefined;
  }
}

const buildAuthHeaders = (): HeadersInit => {
  const bearer = process.env.EXPO_PUBLIC_AUTH_BEARER_TOKEN?.trim();
  return bearer ? { Authorization: `Bearer ${bearer}` } : {};
};

export const createNotificationBackendClient = (): PushNotificationBackend => {
  const send = async (path: string, method: 'PUT' | 'DELETE', payload?: object) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Notification sync failed (${response.status})`);
    }
  };

  return {
    registerToken: async (token: string) => {
      await send(API_ENDPOINTS.NOTIFICATION_TOKEN, 'PUT', { token });
    },
    unregisterToken: async (token: string) => {
      await send(API_ENDPOINTS.NOTIFICATION_TOKEN_BY_VALUE(token), 'DELETE');
    },
  };
};
