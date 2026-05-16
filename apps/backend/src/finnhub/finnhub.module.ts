import { Module } from '@nestjs/common';
import { FinnhubService } from './finnhub.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [FinnhubService],
  exports: [FinnhubService],
})
export class FinnhubModule {}
