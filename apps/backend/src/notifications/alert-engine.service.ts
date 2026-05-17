import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PriceSubscriberService, type PriceTick } from '../redis/price-subscriber.service';
import { NotificationService } from './notification.service';

type AlertRecord = {
  id: string;
  userId: string;
  symbol: string;
  condition: string;
  threshold: number;
};

@Injectable()
export class AlertEngineService {
  private readonly logger = new Logger(AlertEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly priceSubscriber: PriceSubscriberService,
    private readonly notificationService: NotificationService,
  ) {
    this.priceSubscriber.onPriceUpdate((tick) => {
      void this.processPriceTick(tick).catch((error) => {
        this.logger.error(
          `Failed to process alert tick for ${tick.symbol}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    });
  }

  async processPriceTick(tick: PriceTick): Promise<void> {
    const symbol = tick.symbol.trim().toUpperCase();
    if (!symbol) {
      return;
    }

    const activeAlerts = (await this.prisma.alert.findMany({
      where: {
        symbol,
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
    })) as AlertRecord[];

    for (const alert of activeAlerts) {
      if (!this.shouldTriggerAlert(alert, tick.price)) {
        continue;
      }

      const claimed = await this.claimAlert(alert, tick);
      if (!claimed) {
        continue;
      }

      try {
        const sendResult = await this.sendNotification(alert, tick);
        await this.persistDispatchResult(alert.id, sendResult);
      } catch (error) {
        await this.persistDispatchFailure(alert.id, error);
      }
    }
  }

  private shouldTriggerAlert(alert: AlertRecord, currentPrice: number): boolean {
    return alert.condition === 'below'
      ? currentPrice <= alert.threshold
      : currentPrice >= alert.threshold;
  }

  private async claimAlert(alert: AlertRecord, tick: PriceTick): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx: any) => {
        const updated = await tx.alert.updateMany({
          where: {
            id: alert.id,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });

        if (updated.count === 0) {
          throw new Error('Alert already processed');
        }

        await tx.alertDispatch.create({
          data: {
            alertId: alert.id,
            userId: alert.userId,
            symbol: alert.symbol,
            triggerPrice: tick.price,
            triggerAt: new Date(tick.timestamp),
          },
        });
      });

      return true;
    } catch (error) {
      if (this.isDuplicateDispatchError(error) || this.isAlreadyProcessedError(error)) {
        return false;
      }

      throw error;
    }
  }

  private async sendNotification(alert: AlertRecord, tick: PriceTick) {
    const direction = alert.condition === 'below' ? 'below' : 'above';
    return this.notificationService.sendToUser(alert.userId, {
      title: `${alert.symbol} alert triggered`,
      body: `${alert.symbol} is ${direction} ${alert.threshold} at ${tick.price}`,
      data: {
        alertId: alert.id,
        symbol: alert.symbol,
        condition: alert.condition,
        threshold: String(alert.threshold),
        price: String(tick.price),
        timestamp: String(tick.timestamp),
      },
    });
  }

  private async persistDispatchResult(alertId: string, result: { skipped: boolean; attemptedCount: number; sentCount: number; reason?: string }) {
    try {
      await this.prisma.alertDispatch.update({
        where: { alertId },
        data: {
          deliveryStatus: result.skipped ? 'skipped' : 'sent',
          attemptedCount: result.attemptedCount,
          sentCount: result.sentCount,
          failureReason: result.reason ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist dispatch result for alert ${alertId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async persistDispatchFailure(alertId: string, error: unknown) {
    try {
      await this.prisma.alertDispatch.update({
        where: { alertId },
        data: {
          deliveryStatus: 'failed',
          failureReason: this.readFailureReason(error),
        },
      });
    } catch (persistError) {
      this.logger.error(
        `Failed to persist alert dispatch failure for ${alertId}`,
        persistError instanceof Error ? persistError.stack : undefined,
      );
    }
  }

  private isDuplicateDispatchError(error: unknown): boolean {
    return this.readErrorCode(error) === 'P2002';
  }

  private isAlreadyProcessedError(error: unknown): boolean {
    return error instanceof Error && error.message === 'Alert already processed';
  }

  private readErrorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const code = Reflect.get(error, 'code');
    return typeof code === 'string' ? code : null;
  }

  private readFailureReason(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return typeof error === 'string' ? error : 'Unknown alert dispatch error';
  }
}
