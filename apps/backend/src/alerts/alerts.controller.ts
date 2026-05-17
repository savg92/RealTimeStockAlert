import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser, CreateAlertInput } from '@stock-alert/shared';
import { AuthGuard } from '../common/auth/auth.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@ApiBearerAuth('bearer')
@Controller('alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a price alert for the authenticated user' })
  @ApiCreatedResponse({ description: 'Alert created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid alert payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateAlertInput) {
    return this.alertsService.createAlert(user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'List alerts for the authenticated user' })
  @ApiOkResponse({ description: 'Alerts retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.alertsService.findAlertsForUser(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete one alert owned by the authenticated user' })
  @ApiOkResponse({ description: 'Alert deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.alertsService.deleteAlert(user.id, id);
  }
}
