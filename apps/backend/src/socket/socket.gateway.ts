import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { PriceSubscriberService, type PriceTick } from '../redis/price-subscriber.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})
export class StockGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(StockGateway.name);

  constructor(private readonly priceSubscriber: PriceSubscriberService) {
    this.priceSubscriber.onPriceUpdate((tick) => {
      this.broadcastPriceTick(tick);
    });
  }

  handleConnection(client: Socket) {
    client.emit('connection-status', {
      status: 'connected',
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    client.emit('connection-status', {
      status: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('price:subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { symbol: string },
  ) {
    if (!payload?.symbol) {
      return;
    }

    client.join(payload.symbol);
    client.emit('connection-status', {
      status: 'connected',
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('price:unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { symbol: string },
  ) {
    if (!payload?.symbol) {
      return;
    }

    client.leave(payload.symbol);
  }

  private broadcastPriceTick(tick: PriceTick) {
    if (!this.server) {
      this.logger.warn('Socket server not ready; dropping price tick');
      return;
    }

    this.server.to(tick.symbol).emit('price:update', tick);
    this.server.emit('price:update', tick);
  }
}
