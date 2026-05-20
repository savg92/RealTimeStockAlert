import { useAuthStore } from '../store/authStore';

const DEV_AUTH_BEARER_TOKEN = 'dev-test-token-12345';

const readEnvToken = (): string | null => {
  const token = process.env.EXPO_PUBLIC_AUTH_BEARER_TOKEN?.trim();
  return token ? token : null;
};

export const resolveAuthBearerToken = (): string | null => {
  // 1. Try real token from authStore
  const realToken = useAuthStore.getState().idToken;
  if (realToken) {
    return realToken;
  }

  // 2. Fallback to env-configured token
  const configuredToken = readEnvToken();
  if (configuredToken) {
    return configuredToken;
  }

  // 3. Last resort: development token
  if (process.env.NODE_ENV === 'development') {
    return DEV_AUTH_BEARER_TOKEN;
  }

  return null;
};

export const resolveNotificationSyncBearerToken = (): string | null => {
  // Prefer the explicit dev/test bearer token when present so push-token
  // registration and Swagger test calls target the same backend user.
  const configuredToken = readEnvToken();
  if (configuredToken) {
    return configuredToken;
  }

  const realToken = useAuthStore.getState().idToken;
  if (realToken) {
    return realToken;
  }

  if (process.env.NODE_ENV === 'development') {
    return DEV_AUTH_BEARER_TOKEN;
  }

  return null;
};

