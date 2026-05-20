import { cert, getApp, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';

const normalizePrivateKey = (value: string): string => value.replace(/\\n/g, '\n');

const parseServiceAccountFromEnv = (): ServiceAccount | null => {
  const credentialsJson = process.env.FIREBASE_ADMIN_CREDENTIALS?.trim();

  if (credentialsJson) {
    try {
      const parsedRaw = JSON.parse(credentialsJson) as any;

      // Support both camelCase keys (projectId) and service-account underscore keys (project_id)
      const projectId = parsedRaw.projectId || parsedRaw.project_id;
      const clientEmail = parsedRaw.clientEmail || parsedRaw.client_email;
      let privateKey = parsedRaw.privateKey || parsedRaw.private_key;

      if (projectId && clientEmail && privateKey) {
        // Normalize private key if it contains literal "\\n" sequences
        privateKey = normalizePrivateKey(privateKey);
        return {
          projectId,
          clientEmail,
          privateKey,
        } as ServiceAccount;
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
    console.log('[Firebase] Found service account in env. projectId=', serviceAccount.projectId);
    return initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.projectId });
  }

  console.log('[Firebase] No service account in env; initializing default app');
  return initializeApp();
};

