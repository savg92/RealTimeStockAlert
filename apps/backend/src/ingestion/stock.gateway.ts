import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { PriceSubscriberService, PriceUpdate } from './price-subscriber.service';

@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class StockGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(StockGateway.name);
  private connectedClients = new Set<string>();
  private watchedSymbols = new Map<string, Set<string>>();

  constructor(private priceSubscriber: PriceSubscriberService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.add(client.id);
    client.emit('connection-status', { status: 'connected', timestamp: Date.now() });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);

    for (const [symbol, clients] of this.watchedSymbols.entries()) {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        if (clients.size === 0) {
          this.watchedSymbols.delete(symbol);
          this.priceSubscriber.unsubscribe(symbol);
        }
      }
    }
  }

  @SubscribeMessage('watch-symbol')
  handleWatchSymbol(client: Socket, symbol: string) {
    this.logger.debug(`Client ${client.id} watching symbol: ${symbol}`);

    if (!this.watchedSymbols.has(symbol)) {
      this.watchedSymbols.set(symbol, new Set());

      this.priceSubscriber.subscribe(symbol, (update: PriceUpdate) => {
        const watchers = this.watchedSymbols.get(symbol);
        if (watchers) {
          for (const clientId of watchers) {
            this.server.to(clientId).emit('price-update', update);
          }
        }
      });
    }

    const watchers = this.watchedSymbols.get(symbol);
    watchers.add(client.id);

    const lastPrice = this.priceSubscriber.getLastPrice(symbol);
    if (lastPrice !== undefined) {
      client.emit('price-update', {
        symbol,
        price: lastPrice,
        timestamp: Date.now(),
      });
    }

    client.emit('watching', { symbol });
  }

  @SubscribeMessage('unwatch-symbol')
  handleUnwatchSymbol(client: Socket, symbol: string) {
    this.logger.debug(`Client ${client.id} unwatching symbol: ${symbol}`);

    const watchers = this.watchedSymbols.get(symbol);
    if (watchers) {
      watchers.delete(client.id);
      if (watchers.size === 0) {
        this.watchedSymbols.delete(symbol);
        this.priceSubscriber.unsubscribe(symbol);
      }
    }

    client.emit('unwatched', { symbol });
  }

  broadcastConnectionStatus(status: 'connected' | 'reconnecting' | 'disconnected') {
    this.server.emit('connection-status', {
      status,
      timestamp: Date.now(),
      clientCount: this.connectedClients.size,
    });
  }
}
