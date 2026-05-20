import { Module } from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { WatchlistController } from './watchlist.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { FinnhubModule } from '../finnhub/finnhub.module';

@Module({
  imports: [PrismaModule, FinnhubModule],
  providers: [WatchlistService],
  controllers: [WatchlistController],
  exports: [WatchlistService],
})
export class WatchlistModule {}
