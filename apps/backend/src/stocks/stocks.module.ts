import { Module } from '@nestjs/common';
import { DevModule } from '../dev/dev.module';
import { FinnhubModule } from '../finnhub/finnhub.module';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';

@Module({
  imports: [DevModule, FinnhubModule],
  controllers: [StocksController],
  providers: [StocksService],
  exports: [StocksService],
})
export class StocksModule {}
