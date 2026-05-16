import { Module } from '@nestjs/common';
import { AuthModule } from '../common/auth/auth.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
