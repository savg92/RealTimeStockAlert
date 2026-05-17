import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Messaging } from 'firebase-admin/messaging';
import { PrismaService } from '../common/prisma/prisma.service';
import { FIREBASE_ADMIN_MESSAGING } from './notifications.tokens';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface NotificationSendResult {
  attemptedCount: number;
  sentCount: number;
  skipped: boolean;
  reason?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FIREBASE_ADMIN_MESSAGING)
    private readonly messaging: Messaging | null,
  ) {}

  async registerToken(userId: string, token: string) {
    return this.prisma.fcmToken.upsert({
      where: { token },
      create: { userId, token },
      update: { userId },
    });
  }

  async revokeToken(userId: string, token: string) {
    return this.prisma.fcmToken.deleteMany({
      where: {
        userId,
        token,
      },
    });
  }

  async sendToUser(userId: string, payload: NotificationPayload): Promise<NotificationSendResult> {
    const tokenRows = (await this.prisma.fcmToken.findMany({
      where: { userId },
      select: { token: true },
    })) as Array<{ token: string }>;

    if (!tokenRows.length) {
      return {
        attemptedCount: 0,
        sentCount: 0,
        skipped: true,
        reason: 'No registered FCM tokens for user',
      };
    }

    if (!this.messaging) {
      return {
        attemptedCount: tokenRows.length,
        sentCount: 0,
        skipped: true,
        reason: 'Firebase Messaging is disabled for this environment',
      };
    }

    const tokens = tokenRows.map((r) => r.token);
    const response = await this.sendWithRetry(tokens, payload);

    const invalidTokens: string[] = [];
    let sentCount = 0;

    response.responses.forEach((res, index) => {
      if (res.success) {
        sentCount += 1;
      } else {
        const code = this.readMessagingErrorCode(res.error);
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
          invalidTokens.push(tokens[index]);
        }
        this.logger.warn(`Failed to send push notification for token. code=${code ?? 'unknown'}`);
      }
    });

    if (invalidTokens.length) {
      await this.prisma.fcmToken.deleteMany({
        where: { token: { in: invalidTokens } },
      });
    }

    return {
      attemptedCount: tokenRows.length,
      sentCount,
      skipped: false,
    };
  }

  private async sendWithRetry(tokens: string[], payload: NotificationPayload) {
    const maxAttempts = 2;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.messaging!.sendEachForMulticast({
          tokens,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data,
        });
      } catch (error) {
        lastError = error;
        this.logger.warn(`Push notification attempt ${attempt} failed`);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Failed to send push notifications');
  }

  private readMessagingErrorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const code = Reflect.get(error, 'code');
    return typeof code === 'string' ? code : null;
  }
}
