import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { StockGateway } from './socket.gateway';

@Module({
  imports: [RedisModule],
  providers: [StockGateway],
  exports: [StockGateway],
})
export class SocketModule {}
