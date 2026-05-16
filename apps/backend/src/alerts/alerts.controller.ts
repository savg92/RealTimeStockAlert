import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser, CreateAlertInput } from '@stock-alert/shared';
import { AuthGuard } from '../common/auth/auth.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { AlertsService } from './alerts.service';

@Controller('alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateAlertInput) {
    return this.alertsService.createAlert(user.id, body);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.alertsService.findAlertsForUser(user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.alertsService.deleteAlert(user.id, id);
  }
}
