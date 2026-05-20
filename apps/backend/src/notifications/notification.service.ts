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

    // Split Expo tokens vs FCM tokens
    const expoTokens = tokens.filter(
      (t) => typeof t === 'string' && t.startsWith('ExponentPushToken'),
    ) as string[];
    const fcmTokens = tokens.filter(
      (t) => typeof t === 'string' && !t.startsWith('ExponentPushToken'),
    ) as string[];

    let sentCount = 0;
    const invalidTokens: string[] = [];
    const failureReasons: string[] = [];

    // Send Expo push notifications (batching up to 100)
    if (expoTokens.length > 0) {
      try {
        const expoSent = await this.sendExpoPushes(expoTokens, payload);
        sentCount += expoSent.successCount;
        invalidTokens.push(...expoSent.invalidTokens);
        failureReasons.push(...expoSent.failureReasons);
      } catch (e) {
        const reason = this.describeError(e);
        if (reason) {
          failureReasons.push(reason);
        }
        this.logger.warn('Failed to send Expo push notifications', e as any);
      }
    }

    // Send FCM notifications via Firebase if available
    if (fcmTokens.length > 0) {
      if (!this.messaging) {
        // Messaging disabled: mark as skipped
        return {
          attemptedCount: tokens.length,
          sentCount,
          skipped: true,
          reason: 'Firebase Messaging is disabled for this environment',
        };
      }

      const response = await this.sendWithRetry(fcmTokens, payload);

      response.responses.forEach((res, index) => {
        if (res.success) {
          sentCount += 1;
        } else {
          const code = this.readMessagingErrorCode(res.error);
          const message = this.readMessagingErrorMessage(res.error);
          failureReasons.push(
            `FCM token ${fcmTokens[index]} failed${code ? ` (${code})` : ''}${message ? `: ${message}` : ''}`,
          );
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(fcmTokens[index]);
          }
          this.logger.warn(`Failed to send push notification for token. code=${code ?? 'unknown'}`);
        }
      });
    }

    if (invalidTokens.length) {
      await this.prisma.fcmToken.deleteMany({
        where: { token: { in: invalidTokens } },
      });
    }

    return {
      attemptedCount: tokens.length,
      sentCount,
      skipped: false,
      ...(sentCount === 0 && failureReasons.length ? { reason: failureReasons[0] } : {}),
    };
  }

  private async sendExpoPushes(
    tokens: string[],
    payload: NotificationPayload,
  ): Promise<{ successCount: number; invalidTokens: string[]; failureReasons: string[] }> {
    const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
    const chunkSize = 100;
    let successCount = 0;
    const invalidTokens: string[] = [];
    const failureReasons: string[] = [];

    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      const messages = chunk.map((t) => ({
        to: t,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      }));

      try {
        const res = await (globalThis as any).fetch(EXPO_ENDPOINT, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });

        if (!res.ok) {
          this.logger.warn(`Expo push returned ${res.status}`);
          failureReasons.push(`Expo push returned HTTP ${res.status}`);
          continue;
        }

        const json = await res.json();
        // json should be { data: [ { status: 'ok'|'error', id?, message?, details? }, ... ] }
        const data = Array.isArray(json) ? json : (json.data ?? []);
        // The Expo push API sometimes returns an array directly or a {data: [...]} wrapper
        const results = Array.isArray(data) && data.length ? data : json;

        // Try to interpret results
        if (Array.isArray(results)) {
          results.forEach((r: any, idx: number) => {
            if (r.status === 'ok') {
              successCount += 1;
            } else if (r.status === 'error') {
              const token = chunk[idx];
              const detail = r.details ?? r.message ?? null;
              // If error indicates unregistered token, mark invalid
              if (typeof detail === 'object' && detail?.error === 'DeviceNotRegistered') {
                invalidTokens.push(token);
              }
            }
          });
        }
      } catch (err) {
        this.logger.warn('Error sending Expo pushes', err as any);
        const reason = this.describeError(err);
        if (reason) {
          failureReasons.push(reason);
        }
      }
    }

    return { successCount, invalidTokens, failureReasons };
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
        // Log detailed error for debugging Firebase/FCM issues in development
        if (error instanceof Error) {
          this.logger.warn(`Push notification attempt ${attempt} failed: ${error.message}`);
          this.logger.debug(error.stack ?? 'no-stack');
        } else {
          try {
            this.logger.warn(
              `Push notification attempt ${attempt} failed: ${JSON.stringify(error)}`,
            );
          } catch {
            this.logger.warn(
              `Push notification attempt ${attempt} failed: (non-serializable error)`,
            );
          }
        }
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

  private readMessagingErrorMessage(error: unknown): string | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const message = Reflect.get(error, 'message');
    return typeof message === 'string' && message.trim() ? message.trim() : null;
  }

  private describeError(error: unknown): string | null {
    if (error instanceof Error) {
      return error.message;
    }

    const message = this.readMessagingErrorMessage(error);
    if (message) {
      return message;
    }

    if (error && typeof error === 'object') {
      try {
        return JSON.stringify(error);
      } catch {
        return null;
      }
    }

    return null;
  }
}
