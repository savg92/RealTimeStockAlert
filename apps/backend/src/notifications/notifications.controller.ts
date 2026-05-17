import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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

@ApiTags('notifications')
@ApiBearerAuth('bearer')
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Put('token')
  @ApiOperation({ summary: 'Register or refresh the current user push token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token'],
      properties: {
        token: { type: 'string', example: 'ExponentPushToken[example]' },
      },
    },
  })
  @ApiOkResponse({ description: 'Token synchronized successfully.' })
  @ApiBadRequestResponse({ description: 'Missing token in request body.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async syncToken(@CurrentUser() user: AuthenticatedUser, @Body() body: SyncTokenRequest) {
    await this.notificationService.registerToken(user.id, body.token);
    return { ok: true };
  }

  @Delete('token/:token')
  @ApiOperation({ summary: 'Revoke a previously registered push token' })
  @ApiOkResponse({ description: 'Token revoked successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async revokeToken(@CurrentUser() user: AuthenticatedUser, @Param('token') token: string) {
    await this.notificationService.revokeToken(user.id, token);
    return { ok: true };
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test notification to the authenticated user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Stock Alert Test Notification' },
        body: { type: 'string', example: 'FCM integration test notification' },
        data: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Test notification dispatched.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  async sendTestNotification(@CurrentUser() user: AuthenticatedUser, @Body() body: SendTestNotificationRequest) {
    const result = await this.notificationService.sendToUser(user.id, {
      title: body.title ?? 'Stock Alert Test Notification',
      body: body.body ?? 'FCM integration test notification',
      data: body.data,
    });
    return result;
  }
}
