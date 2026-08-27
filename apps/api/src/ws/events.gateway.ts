import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Injectable, Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";

/**
 * Realtime channel. Clients join rooms:
 *  - "market:<id>"  → orderbook/trades/price updates for one market
 *  - "user:<id>"    → private notifications (room joined after JWT check)
 */
@Injectable()
@WebSocketGateway({ cors: { origin: "*" } })
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private logger = new Logger("WS");

  handleConnection(client: Socket) {
    this.logger.debug(`client connected ${client.id}`);
  }

  @SubscribeMessage("market.subscribe")
  onSubscribeMarket(client: Socket, payload: { marketId: string }) {
    if (payload?.marketId) client.join(`market:${payload.marketId}`);
    return { subscribed: payload?.marketId };
  }

  @SubscribeMessage("market.unsubscribe")
  onUnsubscribeMarket(client: Socket, payload: { marketId: string }) {
    if (payload?.marketId) client.leave(`market:${payload.marketId}`);
    return { unsubscribed: payload?.marketId };
  }

  @SubscribeMessage("user.subscribe")
  onSubscribeUser(client: Socket, payload: { userId: string }) {
    // POC: trust-based user room join (documented limitation; real build must verify JWT here)
    if (payload?.userId) client.join(`user:${payload.userId}`);
    return { subscribed: payload?.userId };
  }

  emitToMarket(marketId: string, event: string, data: unknown) {
    this.server?.to(`market:${marketId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server?.to(`user:${userId}`).emit(event, data);
  }

  emitGlobal(event: string, data: unknown) {
    this.server?.emit(event, data);
  }
}
