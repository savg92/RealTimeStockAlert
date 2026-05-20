import { Module } from '@nestjs/common';
import { DevModule } from '../dev/dev.module';
import { FinnhubModule } from '../finnhub/finnhub.module';
import { RedisModule } from '../redis/redis.module';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [DevModule, FinnhubModule, RedisModule, PrismaModule],
  controllers: [StocksController],
  providers: [StocksService],
  exports: [StocksService],
})
export class StocksModule {}
