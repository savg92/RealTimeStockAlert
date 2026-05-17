import { Test } from '@nestjs/testing';
import { PrismaService } from '../common/prisma/prisma.service';
import { PriceSubscriberService } from '../redis/price-subscriber.service';
import { AlertEngineService } from './alert-engine.service';
import { NotificationService } from './notification.service';

describe('AlertEngineService', () => {
  const listenerMocks: Array<(tick: { symbol: string; price: number; timestamp: number; volume?: number }) => void> = [];

  const tx = {
    alert: {
      updateMany: jest.fn(),
    },
    alertDispatch: {
      create: jest.fn(),
    },
  };

  const prisma = {
    alert: {
      findMany: jest.fn(),
    },
    alertDispatch: {
      update: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx)),
  };

  const notificationService = {
    sendToUser: jest.fn(),
  };

  const priceSubscriber = {
    onPriceUpdate: jest.fn((listener: (tick: any) => void) => {
      listenerMocks.push(listener);
    }),
  };

  beforeEach(() => {
    listenerMocks.length = 0;
    jest.clearAllMocks();
  });

  it('triggers and deactivates an alert when the threshold is crossed', async () => {
    prisma.alert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        symbol: 'AAPL',
        condition: 'above',
        threshold: 150,
      },
    ]);
    tx.alert.updateMany.mockResolvedValue({ count: 1 });
    tx.alertDispatch.create.mockResolvedValue({ id: 'dispatch-1' });
    notificationService.sendToUser.mockResolvedValue({
      attemptedCount: 1,
      sentCount: 1,
      skipped: false,
    });
    prisma.alertDispatch.update.mockResolvedValue({ id: 'dispatch-1' });

    const moduleRef = await Test.createTestingModule({
      providers: [
        AlertEngineService,
        { provide: PrismaService, useValue: prisma },
        { provide: PriceSubscriberService, useValue: priceSubscriber },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    const service = moduleRef.get(AlertEngineService);
    await service.processPriceTick({
      symbol: 'aapl',
      price: 151,
      timestamp: 1234567890,
    });

    expect(prisma.alert.findMany).toHaveBeenCalledWith({
      where: {
        symbol: 'AAPL',
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        userId: true,
        symbol: true,
        condition: true,
        threshold: true,
      },
    });
    expect(tx.alert.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'alert-1',
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
    expect(tx.alertDispatch.create).toHaveBeenCalledWith({
      data: {
        alertId: 'alert-1',
        userId: 'user-1',
        symbol: 'AAPL',
        triggerPrice: 151,
        triggerAt: new Date(1234567890),
      },
    });
    expect(notificationService.sendToUser).toHaveBeenCalledWith('user-1', {
      title: 'AAPL alert triggered',
      body: 'AAPL is above 150 at 151',
      data: {
        alertId: 'alert-1',
        symbol: 'AAPL',
        condition: 'above',
        threshold: '150',
        price: '151',
        timestamp: '1234567890',
      },
    });
    expect(prisma.alertDispatch.update).toHaveBeenCalledWith({
      where: { alertId: 'alert-1' },
      data: {
        deliveryStatus: 'sent',
        attemptedCount: 1,
        sentCount: 1,
        failureReason: null,
      },
    });
  });

  it('skips alerts that do not meet the threshold', async () => {
    prisma.alert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        symbol: 'AAPL',
        condition: 'below',
        threshold: 150,
      },
    ]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AlertEngineService,
        { provide: PrismaService, useValue: prisma },
        { provide: PriceSubscriberService, useValue: priceSubscriber },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    const service = moduleRef.get(AlertEngineService);
    await service.processPriceTick({
      symbol: 'AAPL',
      price: 151,
      timestamp: 1234567890,
    });

    expect(tx.alert.updateMany).not.toHaveBeenCalled();
    expect(tx.alertDispatch.create).not.toHaveBeenCalled();
    expect(notificationService.sendToUser).not.toHaveBeenCalled();
  });

  it('does not duplicate notifications for already claimed alerts', async () => {
    prisma.alert.findMany.mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        symbol: 'AAPL',
        condition: 'above',
        threshold: 150,
      },
    ]);
    tx.alert.updateMany.mockResolvedValue({ count: 0 });

    const moduleRef = await Test.createTestingModule({
      providers: [
        AlertEngineService,
        { provide: PrismaService, useValue: prisma },
        { provide: PriceSubscriberService, useValue: priceSubscriber },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    const service = moduleRef.get(AlertEngineService);
    await service.processPriceTick({
      symbol: 'AAPL',
      price: 151,
      timestamp: 1234567890,
    });

    expect(tx.alertDispatch.create).not.toHaveBeenCalled();
    expect(notificationService.sendToUser).not.toHaveBeenCalled();
  });
});
