import { Module } from '@nestjs/common';
import { PricePublisherService } from './price-publisher.service';
import { PriceSubscriberService } from './price-subscriber.service';
import { StockGateway } from './stock.gateway';

@Module({
  providers: [PricePublisherService, PriceSubscriberService, StockGateway],
  exports: [PricePublisherService, PriceSubscriberService, StockGateway],
})
export class IngestionModule {}
