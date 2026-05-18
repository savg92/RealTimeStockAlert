import { Module } from '@nestjs/common';
import { PriceSimulatorService } from './price-simulator.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [PriceSimulatorService],
  exports: [PriceSimulatorService],
})
export class DevModule {}
