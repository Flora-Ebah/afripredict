import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { LedgerType, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { DomainException } from "../common/api-exception.filter";
import { EventsGateway } from "../ws/events.gateway";
import { PlaceOrderDto } from "./orders.dto";

interface FillRecord {
  tradeId: string;
  makerOrderId: string;
  makerUserId: string;
  makerIsBot: boolean;
  priceCents: number;
  quantity: number;
}

/**
 * CLOB matching engine (POC).
 * - Price/time priority, maker price execution.
 * - BUY locks funds (wallet.balance -> wallet.locked), SELL locks shares.
 * - Every money movement is a ledger entry; ledger sums to wallet balance.
 * - All mutations run in one serializable transaction.
 */
@Injectable()
export class OrdersService {
  private logger = new Logger("Orders");

  constructor(
    private prisma: PrismaService,
    private ws: EventsGateway,
  ) {}

  // ---------------------------------------------------------------- helpers

  private async ledger(
    tx: Prisma.TransactionClient,
    walletId: string,
    userId: string,
    type: LedgerType,
    amountCents: number,
    balanceBeforeCents: number,
    referenceType?: string,
    referenceId?: string,
  ) {
    await tx.ledgerEntry.create({
      data: {
        userId,
        walletId,
        type,
        amountCents,
        balanceBeforeCents,
        balanceAfterCents: balanceBeforeCents + amountCents,
        referenceType,
        referenceId,
      },
    });
    return balanceBeforeCents + amountCents;
  }

  // ------------------------------------------------------------ place order

  async placeOrder(userId: string, dto: PlaceOrderDto) {
    if (dto.orderType === "LIMIT" && dto.priceCents === undefined) {
      throw new DomainException("INVALID_PRICE", "Limit orders require a price");
    }

    if (dto.idempotencyKey) {
      const existing = await this.prisma.order.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
      if (existing) return this.orderView(existing.id);
    }

    const result = await this.prisma.serializableTx(async (tx) => {
      const market = await tx.market.findUnique({ where: { id: dto.marketId } });
      if (!market) throw new DomainException("MARKET_NOT_FOUND", "Market not found", HttpStatus.NOT_FOUND);
      if (market.status !== "OPEN" || market.closeAt <= new Date()) {
        throw new DomainException("MARKET_CLOSED", "Market is not open for trading");
      }
      const outcome = await tx.outcome.findUnique({
        where: { marketId_side: { marketId: market.id, side: dto.outcome } },
      });
      if (!outcome) throw new DomainException("MARKET_NOT_FOUND", "Outcome not found", HttpStatus.NOT_FOUND);

      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new DomainException("WALLET_NOT_FOUND", "Wallet not found", HttpStatus.NOT_FOUND);

      const fills: FillRecord[] = [];
      let order;

      if (dto.side === "BUY") {
        order = await this.placeBuy(tx, userId, wallet.id, market.id, outcome.id, dto, fills);
      } else {
        order = await this.placeSell(tx, userId, wallet.id, market.id, outcome.id, dto, fills);
      }

      // ---- post-fill market data updates
      let priceUpdate: { yesPriceCents: number; noPriceCents: number } | null = null;
      if (fills.length > 0) {
        const totalValue = fills.reduce((s, f) => s + f.priceCents * f.quantity, 0);
        const lastPrice = fills[fills.length - 1].priceCents;
        const yesPriceCents = dto.outcome === "YES" ? lastPrice : 100 - lastPrice;
        const noPriceCents = 100 - yesPriceCents;
        priceUpdate = { yesPriceCents, noPriceCents };

        await tx.market.update({
          where: { id: market.id },
          data: {
            yesPriceCents,
            noPriceCents,
            volumeCents: { increment: totalValue },
            tradeCount: { increment: fills.length },
          },
        });
        await tx.outcome.update({
          where: { id: outcome.id },
          data: { priceCents: dto.outcome === "YES" ? yesPriceCents : noPriceCents, volumeCents: { increment: totalValue } },
        });
        const other = await tx.outcome.findUnique({
          where: { marketId_side: { marketId: market.id, side: dto.outcome === "YES" ? "NO" : "YES" } },
        });
        if (other) {
          await tx.outcome.update({
            where: { id: other.id },
            data: { priceCents: dto.outcome === "YES" ? noPriceCents : yesPriceCents },
          });
        }
        await tx.pricePoint.create({
          data: { marketId: market.id, yesPriceCents, noPriceCents, volumeCents: totalValue },
        });

        // notify makers whose orders were touched
        for (const f of fills) {
          if (f.makerIsBot) continue;
          await tx.notification.create({
            data: {
              userId: f.makerUserId,
              type: "ORDER_FILLED",
              title: "Ordre exécuté",
              message: `${f.quantity} parts @ ${(f.priceCents / 100).toFixed(2)} AFR sur « ${market.question} »`,
              metadata: { marketId: market.id, orderId: f.makerOrderId, tradeId: f.tradeId },
            },
          });
        }
      }

      return { order, fills, market, priceUpdate };
    });

    // ---- after commit: websocket broadcasts
    const { order, fills, market, priceUpdate } = result;
    if (fills.length > 0) {
      this.ws.emitToMarket(market.id, "trade.created", {
        marketId: market.id,
        trades: fills.map((f) => ({ price: f.priceCents / 100, quantity: f.quantity })),
      });
      if (priceUpdate) {
        this.ws.emitToMarket(market.id, "market.price.updated", {
          marketId: market.id,
          yesPrice: priceUpdate.yesPriceCents / 100,
          noPrice: priceUpdate.noPriceCents / 100,
        });
        this.ws.emitGlobal("market.price.updated", {
          marketId: market.id,
          yesPrice: priceUpdate.yesPriceCents / 100,
          noPrice: priceUpdate.noPriceCents / 100,
        });
      }
      for (const f of fills) {
        if (!f.makerIsBot) {
          this.ws.emitToUser(f.makerUserId, "notification.created", {
            type: "ORDER_FILLED",
            marketId: market.id,
          });
        }
      }
    }
    this.ws.emitToMarket(market.id, "orderbook.updated", { marketId: market.id });

    return this.orderView(order.id);
  }

  // ----------------------------------------------------------------- BUY

  private async placeBuy(
    tx: Prisma.TransactionClient,
    userId: string,
    walletId: string,
    marketId: string,
    outcomeId: string,
    dto: PlaceOrderDto,
    fills: FillRecord[],
  ) {
    const isLimit = dto.orderType === "LIMIT";
    const limitCents = isLimit ? dto.priceCents! : 99;

    const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new DomainException("WALLET_NOT_FOUND", "Wallet not found");

    // LIMIT: lock full cost upfront
    let lockCents = 0;
    if (isLimit) {
      lockCents = limitCents * dto.quantity;
      if (wallet.balanceCents < lockCents) {
        throw new DomainException("INSUFFICIENT_BALANCE", "Insufficient virtual balance");
      }
      const after = await this.ledger(tx, walletId, userId, "ORDER_LOCK", -lockCents, wallet.balanceCents);
      await tx.wallet.update({
        where: { id: walletId },
        data: { balanceCents: after, lockedCents: { increment: lockCents } },
      });
    }

    const order = await tx.order.create({
      data: {
        userId,
        marketId,
        outcomeId,
        side: "BUY",
        orderType: dto.orderType as any,
        priceCents: limitCents,
        quantity: dto.quantity,
        remainingQuantity: dto.quantity,
        lockedCents: lockCents,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    // matching: cheapest asks first, oldest first, skip own orders
    const asks = await tx.order.findMany({
      where: {
        outcomeId,
        side: "SELL",
        status: { in: ["OPEN", "PARTIALLY_FILLED"] },
        priceCents: { lte: limitCents },
        userId: { not: userId },
      },
      orderBy: [{ priceCents: "asc" }, { createdAt: "asc" }],
      include: { user: { select: { isBot: true } } },
    });

    let remaining = dto.quantity;
    for (const ask of asks) {
      if (remaining <= 0) break;
      const fillQty = Math.min(remaining, ask.remainingQuantity);
      const tradePrice = ask.priceCents;
      const tradeCost = tradePrice * fillQty;

      // buyer funds
      const w = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!w) throw new DomainException("WALLET_NOT_FOUND", "Wallet not found");
      if (isLimit) {
        // release locked portion at limit price, then pay trade cost
        const releaseCents = limitCents * fillQty;
        let bal = await this.ledger(tx, walletId, userId, "ORDER_RELEASE", releaseCents, w.balanceCents, "ORDER", order.id);
        bal = await this.ledger(tx, walletId, userId, "TRADE", -tradeCost, bal, "ORDER", order.id);
        await tx.wallet.update({
          where: { id: walletId },
          data: { balanceCents: bal, lockedCents: { decrement: releaseCents } },
        });
        await tx.order.update({ where: { id: order.id }, data: { lockedCents: { decrement: releaseCents } } });
      } else {
        if (w.balanceCents < tradeCost) break; // market order: stop when funds run out
        const bal = await this.ledger(tx, walletId, userId, "TRADE", -tradeCost, w.balanceCents, "ORDER", order.id);
        await tx.wallet.update({ where: { id: walletId }, data: { balanceCents: bal } });
      }

      // seller: receives money, shares leave locked position
      const sellerWallet = await tx.wallet.findUnique({ where: { userId: ask.userId } });
      if (sellerWallet) {
        const sbal = await this.ledger(
          tx, sellerWallet.id, ask.userId, "TRADE", tradeCost, sellerWallet.balanceCents, "ORDER", ask.id,
        );
        await tx.wallet.update({ where: { id: sellerWallet.id }, data: { balanceCents: sbal } });
      }
      const sellerPos = await tx.position.findUnique({
        where: { userId_marketId_outcomeId: { userId: ask.userId, marketId, outcomeId } },
      });
      if (sellerPos) {
        await tx.position.update({
          where: { id: sellerPos.id },
          data: {
            quantity: { decrement: fillQty },
            lockedQuantity: { decrement: fillQty },
            realizedPnlCents: { increment: (tradePrice - sellerPos.avgPriceCents) * fillQty },
          },
        });
      }

      // buyer position
      const buyerPos = await tx.position.upsert({
        where: { userId_marketId_outcomeId: { userId, marketId, outcomeId } },
        create: { userId, marketId, outcomeId, quantity: 0, avgPriceCents: 0 },
        update: {},
      });
      const newQty = buyerPos.quantity + fillQty;
      const newAvg = Math.round((buyerPos.avgPriceCents * buyerPos.quantity + tradePrice * fillQty) / newQty);
      await tx.position.update({
        where: { id: buyerPos.id },
        data: { quantity: newQty, avgPriceCents: newAvg, settled: false },
      });

      // order states
      const askRemaining = ask.remainingQuantity - fillQty;
      await tx.order.update({
        where: { id: ask.id },
        data: { remainingQuantity: askRemaining, status: askRemaining === 0 ? "FILLED" : "PARTIALLY_FILLED" },
      });
      remaining -= fillQty;

      const trade = await tx.trade.create({
        data: {
          marketId,
          outcomeId,
          buyOrderId: order.id,
          sellOrderId: ask.id,
          buyerId: userId,
          sellerId: ask.userId,
          priceCents: tradePrice,
          quantity: fillQty,
          totalValueCents: tradeCost,
        },
      });
      fills.push({
        tradeId: trade.id,
        makerOrderId: ask.id,
        makerUserId: ask.userId,
        makerIsBot: ask.user.isBot,
        priceCents: tradePrice,
        quantity: fillQty,
      });
    }

    // final state of the taker order
    let status: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED" =
      remaining === 0 ? "FILLED" : remaining < dto.quantity ? "PARTIALLY_FILLED" : "OPEN";
    if (!isLimit && remaining > 0) {
      // market orders never rest on the book
      status = "CANCELLED";
    }
    return tx.order.update({
      where: { id: order.id },
      data: { remainingQuantity: remaining, status },
    });
  }

  // ----------------------------------------------------------------- SELL

  private async placeSell(
    tx: Prisma.TransactionClient,
    userId: string,
    walletId: string,
    marketId: string,
    outcomeId: string,
    dto: PlaceOrderDto,
    fills: FillRecord[],
  ) {
    const isLimit = dto.orderType === "LIMIT";
    const limitCents = isLimit ? dto.priceCents! : 1;

    const position = await tx.position.findUnique({
      where: { userId_marketId_outcomeId: { userId, marketId, outcomeId } },
    });
    const available = (position?.quantity ?? 0) - (position?.lockedQuantity ?? 0);
    if (!position || available < dto.quantity) {
      throw new DomainException("INSUFFICIENT_SHARES", "Not enough shares to sell");
    }

    // lock the shares committed to this order
    await tx.position.update({
      where: { id: position.id },
      data: { lockedQuantity: { increment: dto.quantity } },
    });

    const order = await tx.order.create({
      data: {
        userId,
        marketId,
        outcomeId,
        side: "SELL",
        orderType: dto.orderType as any,
        priceCents: limitCents,
        quantity: dto.quantity,
        remainingQuantity: dto.quantity,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    // matching: highest bids first, oldest first
    const bids = await tx.order.findMany({
      where: {
        outcomeId,
        side: "BUY",
        status: { in: ["OPEN", "PARTIALLY_FILLED"] },
        priceCents: { gte: limitCents },
        userId: { not: userId },
      },
      orderBy: [{ priceCents: "desc" }, { createdAt: "asc" }],
      include: { user: { select: { isBot: true } } },
    });

    let remaining = dto.quantity;
    for (const bid of bids) {
      if (remaining <= 0) break;
      const fillQty = Math.min(remaining, bid.remainingQuantity);
      const tradePrice = bid.priceCents; // maker price
      const tradeCost = tradePrice * fillQty;

      // buyer (maker): release lock then pay — same amount since trade executes at his limit
      const buyerWallet = await tx.wallet.findUnique({ where: { userId: bid.userId } });
      if (buyerWallet) {
        let bbal = await this.ledger(
          tx, buyerWallet.id, bid.userId, "ORDER_RELEASE", tradeCost, buyerWallet.balanceCents, "ORDER", bid.id,
        );
        bbal = await this.ledger(tx, buyerWallet.id, bid.userId, "TRADE", -tradeCost, bbal, "ORDER", bid.id);
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: { balanceCents: bbal, lockedCents: { decrement: tradeCost } },
        });
        await tx.order.update({ where: { id: bid.id }, data: { lockedCents: { decrement: tradeCost } } });
      }

      // buyer position
      const buyerPos = await tx.position.upsert({
        where: { userId_marketId_outcomeId: { userId: bid.userId, marketId, outcomeId } },
        create: { userId: bid.userId, marketId, outcomeId, quantity: 0, avgPriceCents: 0 },
        update: {},
      });
      const nq = buyerPos.quantity + fillQty;
      const na = Math.round((buyerPos.avgPriceCents * buyerPos.quantity + tradePrice * fillQty) / nq);
      await tx.position.update({ where: { id: buyerPos.id }, data: { quantity: nq, avgPriceCents: na, settled: false } });

      // seller (taker, this user): receive money, drop shares
      const w = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!w) throw new DomainException("WALLET_NOT_FOUND", "Wallet not found");
      const bal = await this.ledger(tx, walletId, userId, "TRADE", tradeCost, w.balanceCents, "ORDER", order.id);
      await tx.wallet.update({ where: { id: walletId }, data: { balanceCents: bal } });
      await tx.position.update({
        where: { id: position.id },
        data: {
          quantity: { decrement: fillQty },
          lockedQuantity: { decrement: fillQty },
          realizedPnlCents: { increment: (tradePrice - position.avgPriceCents) * fillQty },
        },
      });

      const bidRemaining = bid.remainingQuantity - fillQty;
      await tx.order.update({
        where: { id: bid.id },
        data: { remainingQuantity: bidRemaining, status: bidRemaining === 0 ? "FILLED" : "PARTIALLY_FILLED" },
      });
      remaining -= fillQty;

      const trade = await tx.trade.create({
        data: {
          marketId,
          outcomeId,
          buyOrderId: bid.id,
          sellOrderId: order.id,
          buyerId: bid.userId,
          sellerId: userId,
          priceCents: tradePrice,
          quantity: fillQty,
          totalValueCents: tradeCost,
        },
      });
      fills.push({
        tradeId: trade.id,
        makerOrderId: bid.id,
        makerUserId: bid.userId,
        makerIsBot: bid.user.isBot,
        priceCents: tradePrice,
        quantity: fillQty,
      });
    }

    let status: "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED" =
      remaining === 0 ? "FILLED" : remaining < dto.quantity ? "PARTIALLY_FILLED" : "OPEN";
    if (!isLimit && remaining > 0) {
      status = "CANCELLED";
      // unlock unfilled shares of a market sell
      await tx.position.update({
        where: { id: position.id },
        data: { lockedQuantity: { decrement: remaining } },
      });
    }
    return tx.order.update({
      where: { id: order.id },
      data: { remainingQuantity: remaining, status },
    });
  }

  // ---------------------------------------------------------------- cancel

  async cancelOrder(userId: string, orderId: string) {
    const result = await this.prisma.serializableTx(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new DomainException("ORDER_NOT_FOUND", "Order not found", HttpStatus.NOT_FOUND);
      if (order.userId !== userId) {
        throw new DomainException("FORBIDDEN", "Not your order", HttpStatus.FORBIDDEN);
      }
      if (order.status !== "OPEN" && order.status !== "PARTIALLY_FILLED") {
        throw new DomainException("ORDER_NOT_CANCELLABLE", "Order can no longer be cancelled");
      }

      if (order.side === "BUY" && order.lockedCents > 0) {
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (wallet) {
          const bal = await this.ledger(
            tx, wallet.id, userId, "ORDER_RELEASE", order.lockedCents, wallet.balanceCents, "ORDER", order.id,
          );
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balanceCents: bal, lockedCents: { decrement: order.lockedCents } },
          });
        }
      }
      if (order.side === "SELL") {
        await tx.position.updateMany({
          where: { userId, marketId: order.marketId, outcomeId: order.outcomeId },
          data: { lockedQuantity: { decrement: order.remainingQuantity } },
        });
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", lockedCents: 0 },
      });
      await tx.notification.create({
        data: {
          userId,
          type: "ORDER_CANCELLED",
          title: "Ordre annulé",
          message: `Votre ordre ${order.side} a été annulé (${order.remainingQuantity} parts restantes).`,
          metadata: { orderId: order.id, marketId: order.marketId },
        },
      });
      return updated;
    });

    this.ws.emitToMarket(result.marketId, "orderbook.updated", { marketId: result.marketId });
    return this.orderView(result.id);
  }

  // ------------------------------------------------------------------ read

  async orderView(orderId: string) {
    const o = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { outcome: true, market: { select: { question: true, slug: true } } },
    });
    if (!o) throw new DomainException("ORDER_NOT_FOUND", "Order not found", HttpStatus.NOT_FOUND);
    return {
      id: o.id,
      marketId: o.marketId,
      marketQuestion: o.market.question,
      marketSlug: o.market.slug,
      outcome: o.outcome.side,
      side: o.side,
      orderType: o.orderType,
      price: o.priceCents / 100,
      quantity: o.quantity,
      remainingQuantity: o.remainingQuantity,
      status: o.status,
      createdAt: o.createdAt,
    };
  }

  async listOrders(userId: string, status?: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        ...(status === "open"
          ? { status: { in: ["OPEN", "PARTIALLY_FILLED"] } }
          : status
          ? { status: status.toUpperCase() as any }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { outcome: true, market: { select: { question: true, slug: true } } },
    });
    return orders.map((o) => ({
      id: o.id,
      marketId: o.marketId,
      marketQuestion: o.market.question,
      marketSlug: o.market.slug,
      outcome: o.outcome.side,
      side: o.side,
      orderType: o.orderType,
      price: o.priceCents / 100,
      quantity: o.quantity,
      remainingQuantity: o.remainingQuantity,
      status: o.status,
      createdAt: o.createdAt,
    }));
  }
}
