import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { FinnhubModule } from './finnhub/finnhub.module';
import { AlertsModule } from './alerts/alerts.module';
import { RedisModule } from './redis/redis.module';
import { SocketModule } from './socket/socket.module';
import { AuthModule } from './common/auth/auth.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { PinoLogger } from './common/logger/logger.service';
import { NotificationsModule } from './notifications/notifications.module';
import { DevModule } from './dev/dev.module';
import { StocksModule } from './stocks/stocks.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { AppInitializerService } from './app-init.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    FinnhubModule,
    RedisModule,
    SocketModule,
    AlertsModule,
    NotificationsModule,
    DevModule,
    StocksModule,
    WatchlistModule,
  ],
  providers: [
    {
      provide: 'Logger',
      useClass: PinoLogger,
    },
    AppInitializerService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
