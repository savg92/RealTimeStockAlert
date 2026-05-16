import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '@stock-alert/shared';
import { AuthGuard } from '../common/auth/auth.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { NotificationService } from './notification.service';

interface SyncTokenRequest {
  token: string;
}

interface SendTestNotificationRequest {
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Put('token')
  async syncToken(@CurrentUser() user: AuthenticatedUser, @Body() body: SyncTokenRequest) {
    await this.notificationService.registerToken(user.id, body.token);
    return { ok: true };
  }

  @Delete('token/:token')
  async revokeToken(@CurrentUser() user: AuthenticatedUser, @Param('token') token: string) {
    await this.notificationService.revokeToken(user.id, token);
    return { ok: true };
  }

  @Post('test')
  async sendTestNotification(@CurrentUser() user: AuthenticatedUser, @Body() body: SendTestNotificationRequest) {
    const result = await this.notificationService.sendToUser(user.id, {
      title: body.title ?? 'Stock Alert Test Notification',
      body: body.body ?? 'FCM integration test notification',
      data: body.data,
    });
    return result;
  }
}

