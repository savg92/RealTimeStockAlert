import fs from 'node:fs';
import path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const resolveGoogleServicesFile = (candidatePath?: string): string | undefined => {
  const fallbackPath = './google-services.json';
  const rawPath = candidatePath?.trim() || fallbackPath;
  const resolvedPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(__dirname, rawPath);

  return fs.existsSync(resolvedPath) ? resolvedPath : undefined;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServicesFile = resolveGoogleServicesFile(process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE);

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
