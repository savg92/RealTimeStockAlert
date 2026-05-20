import { Module } from '@nestjs/common';
import { PriceSimulatorService } from './price-simulator.service';
import { RedisModule } from '../redis/redis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AlertsModule } from '../alerts/alerts.module';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { FinnhubModule } from '../finnhub/finnhub.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { DevController } from './dev.controller';

@Module({
  imports: [RedisModule, NotificationsModule, AlertsModule, WatchlistModule, FinnhubModule, PrismaModule],
  providers: [PriceSimulatorService],
  controllers: [DevController],
  exports: [PriceSimulatorService],
})
export class DevModule {}
