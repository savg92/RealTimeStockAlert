import { Injectable } from '@nestjs/common';
import type { CreateAlertInput } from '@stock-alert/shared';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  createAlert(userId: string, input: CreateAlertInput) {
    return this.prisma.alert.create({
      data: {
        userId,
        symbol: input.symbol.toUpperCase(),
        price: input.price,
        condition: input.condition,
        threshold: input.threshold,
      },
    });
  }

  findAlertsForUser(userId: string) {
    return this.prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  deleteAlert(userId: string, alertId: string) {
    return this.prisma.alert.deleteMany({
      where: {
        id: alertId,
        userId,
      },
    });
  }
}
