jest.mock('pg', () => {
  const Pool = jest.fn().mockImplementation((options) => ({ options, kind: 'pool' }));
  return { Pool };
});

jest.mock('@prisma/adapter-pg', () => {
  const PrismaPg = jest.fn().mockImplementation((pool) => ({ pool, kind: 'adapter' }));
  return { PrismaPg };
});

jest.mock('../../generated/prisma/client', () => {
  const client = {
    user: { model: 'user' },
    alert: { model: 'alert' },
    alertDispatch: { model: 'alertDispatch' },
    fcmToken: { model: 'fcmToken' },
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  const PrismaClient = jest.fn().mockImplementation(() => client);
  return { PrismaClient };
});

import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const pgMock = jest.requireMock('pg') as { Pool: jest.Mock };
  const adapterMock = jest.requireMock('@prisma/adapter-pg') as { PrismaPg: jest.Mock };
  const clientMock = jest.requireMock('../../generated/prisma/client') as {
    PrismaClient: jest.Mock;
  };
  const envKey = 'DATABASE_URL';
  const originalDatabaseUrl = process.env[envKey];

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env[envKey];
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = originalDatabaseUrl;
    }
  });

  it('creates a Prisma client with the pg adapter when DATABASE_URL is set', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/stock';

    const service = new PrismaService();
    const client = clientMock.PrismaClient.mock.results[0].value;

    expect(pgMock.Pool).toHaveBeenCalledWith({ connectionString: process.env.DATABASE_URL });
    expect(adapterMock.PrismaPg).toHaveBeenCalledWith(expect.objectContaining({ kind: 'pool' }));
    expect(clientMock.PrismaClient).toHaveBeenCalledWith({
      adapter: expect.objectContaining({ kind: 'adapter' }),
    });
    expect(service.user).toBe(client.user);
    expect(service.alert).toBe(client.alert);
    expect(service.alertDispatch).toBe(client.alertDispatch);
    expect(service.fcmToken).toBe(client.fcmToken);

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(client.$connect).toHaveBeenCalledTimes(1);
    expect(client.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('exposes unavailable models when DATABASE_URL is missing', async () => {
    const service = new PrismaService();

    expect(Reflect.get(service.user as object, Symbol.iterator)).toBeUndefined();
    expect(() => service.user.findMany()).toThrow(
      'Prisma client is not configured. Cannot call user.findMany.',
    );
    expect(() => (service.$transaction as { run: () => void }).run()).toThrow(
      'Prisma client is not configured. Cannot call $transaction.run.',
    );

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
