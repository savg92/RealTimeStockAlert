import { cert, getApp, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';

const normalizePrivateKey = (value: string): string => value.replace(/\\n/g, '\n');

const parseServiceAccountFromEnv = (): ServiceAccount | null => {
  const credentialsJson = process.env.FIREBASE_ADMIN_CREDENTIALS?.trim();

  if (credentialsJson) {
    try {
      const parsed = JSON.parse(credentialsJson) as ServiceAccount;
      if (parsed.projectId && parsed.clientEmail && parsed.privateKey) {
        return {
          projectId: parsed.projectId,
          clientEmail: parsed.clientEmail,
          privateKey: normalizePrivateKey(parsed.privateKey),
        };
      }
    } catch {
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  };
};

export const initializeFirebaseAdminApp = (): App => {
  if (getApps().length) {
    return getApp();
  }

  const serviceAccount = parseServiceAccountFromEnv();
  if (serviceAccount) {
    return initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.projectId });
  }

  return initializeApp();
};

