import { Test } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { FIREBASE_ADMIN_MESSAGING } from './notifications.tokens';

describe('NotificationService', () => {
  const prisma = {
    fcmToken: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const messaging = {
    sendEachForMulticast: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers an FCM token for the authenticated user', async () => {
    prisma.fcmToken.upsert.mockResolvedValue({
      userId: 'user-1',
      token: 'fcm-token',
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: FIREBASE_ADMIN_MESSAGING, useValue: messaging },
      ],
    }).compile();

    const service = moduleRef.get(NotificationService);
    await service.registerToken('user-1', 'fcm-token');

    expect(prisma.fcmToken.upsert).toHaveBeenCalledWith({
      where: { token: 'fcm-token' },
      create: { userId: 'user-1', token: 'fcm-token' },
      update: { userId: 'user-1' },
    });
  });

  it('revokes an FCM token for the authenticated user', async () => {
    prisma.fcmToken.deleteMany.mockResolvedValue({ count: 1 });

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: FIREBASE_ADMIN_MESSAGING, useValue: messaging },
      ],
    }).compile();

    const service = moduleRef.get(NotificationService);
    await service.revokeToken('user-1', 'fcm-token');

    expect(prisma.fcmToken.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        token: 'fcm-token',
      },
    });
  });

  it('sends notifications and removes invalid tokens', async () => {
    prisma.fcmToken.findMany.mockResolvedValue([{ token: 'valid-token' }, { token: 'invalid-token' }]);
    messaging.sendEachForMulticast.mockResolvedValue({
      responses: [
        { success: true, messageId: 'msg-1' },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      ],
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: FIREBASE_ADMIN_MESSAGING, useValue: messaging },
      ],
    }).compile();

    const service = moduleRef.get(NotificationService);
    const result = await service.sendToUser('user-1', {
      title: 'Alert',
      body: 'AAPL hit 200',
      data: { symbol: 'AAPL' },
    });

    expect(result).toEqual({
      attemptedCount: 2,
      sentCount: 1,
      skipped: false,
    });
    expect(prisma.fcmToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['invalid-token'] } },
    });
  });

  it('returns skipped when Firebase Messaging is disabled', async () => {
    prisma.fcmToken.findMany.mockResolvedValue([{ token: 'fcm-token' }]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: FIREBASE_ADMIN_MESSAGING, useValue: null },
      ],
    }).compile();

    const service = moduleRef.get(NotificationService);
    const result = await service.sendToUser('user-1', {
      title: 'Alert',
      body: 'Payload',
    });

    expect(result).toEqual({
      attemptedCount: 1,
      sentCount: 0,
      skipped: true,
      reason: 'Firebase Messaging is disabled for this environment',
    });
  });
});
