jest.mock('firebase-admin/app', () => {
  const cert = jest.fn((value) => ({ kind: 'cert', value }));
  const getApp = jest.fn();
  const getApps = jest.fn();
  const initializeApp = jest.fn((options) => ({ kind: 'app', options }));

  return {
    cert,
    getApp,
    getApps,
    initializeApp,
  };
});

import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { initializeFirebaseAdminApp } from './firebase-admin-app';

describe('initializeFirebaseAdminApp', () => {
  const mockedGetApps = getApps as jest.MockedFunction<typeof getApps>;
  const mockedGetApp = getApp as jest.MockedFunction<typeof getApp>;
  const mockedInitializeApp = initializeApp as jest.MockedFunction<typeof initializeApp>;
  const envKeys = [
    'FIREBASE_ADMIN_CREDENTIALS',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ] as const;
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetApps.mockReturnValue([]);
    mockedGetApp.mockReturnValue({ kind: 'existing-app' } as never);
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  afterAll(() => {
    for (const key of envKeys) {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('initializes from FIREBASE_ADMIN_CREDENTIALS JSON and normalizes the private key', () => {
    process.env.FIREBASE_ADMIN_CREDENTIALS = JSON.stringify({
      projectId: 'stock-alerts',
      clientEmail: 'firebase-admin@example.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\\nline-2\\n-----END PRIVATE KEY-----',
    });

    const app = initializeFirebaseAdminApp();

    expect(cert).toHaveBeenCalledWith({
      projectId: 'stock-alerts',
      clientEmail: 'firebase-admin@example.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nline-2\n-----END PRIVATE KEY-----',
    });
    expect(mockedInitializeApp).toHaveBeenCalledWith({
      credential: { kind: 'cert', value: expect.any(Object) },
      projectId: 'stock-alerts',
    });
    expect(app).toEqual({
      kind: 'app',
      options: {
        credential: { kind: 'cert', value: expect.any(Object) },
        projectId: 'stock-alerts',
      },
    });
  });

  it('falls back to explicit FIREBASE_* environment variables', () => {
    process.env.FIREBASE_PROJECT_ID = 'stock-alerts';
    process.env.FIREBASE_CLIENT_EMAIL = 'firebase-admin@example.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nline-2\\n-----END PRIVATE KEY-----';

    initializeFirebaseAdminApp();

    expect(cert).toHaveBeenCalledWith({
      projectId: 'stock-alerts',
      clientEmail: 'firebase-admin@example.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nline-2\n-----END PRIVATE KEY-----',
    });
    expect(mockedInitializeApp).toHaveBeenCalledWith({
      credential: { kind: 'cert', value: expect.any(Object) },
      projectId: 'stock-alerts',
    });
  });

  it('uses default initializeApp when Firebase credentials are missing', () => {
    const app = initializeFirebaseAdminApp();

    expect(cert).not.toHaveBeenCalled();
    expect(mockedInitializeApp).toHaveBeenCalledTimes(1);
    expect(mockedInitializeApp.mock.calls[0]).toEqual([]);
    expect(app).toEqual({ kind: 'app', options: undefined });
  });

  it('returns the existing app when one is already registered', () => {
    mockedGetApps.mockReturnValue([{} as never]);

    const app = initializeFirebaseAdminApp();

    expect(mockedGetApp).toHaveBeenCalledTimes(1);
    expect(mockedInitializeApp).not.toHaveBeenCalled();
    expect(app).toEqual({ kind: 'existing-app' });
  });
});
