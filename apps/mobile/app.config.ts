import fs from 'node:fs';
import path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

const resolveGoogleServicesFile = (candidatePath?: string): string | undefined => {
  const fallbackPath = './google-services.json';
  const rawPath = candidatePath?.trim() || fallbackPath;
  const resolvedPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(__dirname, rawPath);

  return fs.existsSync(resolvedPath) ? resolvedPath : undefined;
};

const normalizeSlug = (rawSlug?: string): string | undefined => {
  const normalized = rawSlug?.trim().replace(/^@/, '').replace(/\//g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
  return normalized || undefined;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleServicesFile = resolveGoogleServicesFile(process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE);
  const androidPackage = process.env.EXPO_ANDROID_PACKAGE?.trim() || config.android?.package || 'com.stockalert.mobile';
  const slug = normalizeSlug(process.env.EXPO_SLUG) || 'real-time-stock-alert';
  const name = process.env.EXPO_APP_NAME?.trim() || config.name || 'Real-Time Stock Alert';

  return {
    ...config,
    name,
    slug,
    android: {
      ...config.android,
      package: androidPackage,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
