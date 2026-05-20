const DEV_AUTH_BEARER_TOKEN = 'dev-test-token-12345';

const readEnvToken = (): string | null => {
  const token = process.env.EXPO_PUBLIC_AUTH_BEARER_TOKEN?.trim();
  return token ? token : null;
};

export const resolveAuthBearerToken = (): string | null => {
  const configuredToken = readEnvToken();
  if (configuredToken) {
    return configuredToken;
  }

  if (process.env.NODE_ENV === 'development') {
    return DEV_AUTH_BEARER_TOKEN;
  }

  return null;
};

