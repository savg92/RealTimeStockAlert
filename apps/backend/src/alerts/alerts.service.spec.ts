import { Test } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('AlertsService', () => {
  const prisma = {
    alert: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates alerts for the authenticated user', async () => {
    prisma.alert.create.mockResolvedValue({
      id: 'alert-1',
      userId: 'user-1',
      symbol: 'AAPL',
      price: 150,
      condition: 'above',
      threshold: 150,
      isActive: true,
    });

    const moduleRef = await Test.createTestingModule({
      providers: [AlertsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    const service = moduleRef.get(AlertsService);

    await expect(
      service.createAlert('user-1', {
        symbol: 'AAPL',
        price: 150,
        condition: 'above',
        threshold: 150,
      }),
    ).resolves.toMatchObject({ userId: 'user-1', symbol: 'AAPL' });

    expect(prisma.alert.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        symbol: 'AAPL',
        price: 150,
        condition: 'above',
        threshold: 150,
      },
    });
  });

  it('filters alerts by authenticated user', async () => {
    prisma.alert.findMany.mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [AlertsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    const service = moduleRef.get(AlertsService);

    await service.findAlertsForUser('user-1');

    expect(prisma.alert.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    });
  });
});
