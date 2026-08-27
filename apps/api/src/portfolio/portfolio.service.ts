import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  async summary(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const positions = await this.prisma.position.findMany({
      where: { userId, quantity: { gt: 0 }, settled: false },
      include: { outcome: true, market: true },
    });

    let invested = 0;
    let positionsValue = 0;
    for (const p of positions) {
      const current = p.outcome.side === "YES" ? p.market.yesPriceCents : p.market.noPriceCents;
      invested += p.avgPriceCents * p.quantity;
      positionsValue += current * p.quantity;
    }
    const realized = await this.prisma.position.aggregate({
      where: { userId },
      _sum: { realizedPnlCents: true },
    });

    const balance = (wallet?.balanceCents ?? 0) / 100;
    const locked = (wallet?.lockedCents ?? 0) / 100;
    return {
      currency: wallet?.currency ?? "AFR",
      balance,
      lockedBalance: locked,
      totalInvested: invested / 100,
      positionsValue: positionsValue / 100,
      portfolioValue: balance + locked + positionsValue / 100,
      unrealizedPnl: (positionsValue - invested) / 100,
      realizedPnl: (realized._sum.realizedPnlCents ?? 0) / 100,
    };
  }

  async positions(userId: string) {
    const positions = await this.prisma.position.findMany({
      where: { userId, OR: [{ quantity: { gt: 0 } }, { realizedPnlCents: { not: 0 } }] },
      include: { outcome: true, market: true },
      orderBy: { updatedAt: "desc" },
    });
    return positions.map((p) => {
      const current = p.outcome.side === "YES" ? p.market.yesPriceCents : p.market.noPriceCents;
      return {
        id: p.id,
        marketId: p.marketId,
        marketQuestion: p.market.question,
        marketSlug: p.market.slug,
        marketStatus: p.market.status,
        resolvedOutcome: p.market.resolvedOutcome,
        outcome: p.outcome.side,
        quantity: p.quantity,
        lockedQuantity: p.lockedQuantity,
        avgPrice: p.avgPriceCents / 100,
        currentPrice: current / 100,
        value: (current * p.quantity) / 100,
        unrealizedPnl: ((current - p.avgPriceCents) * p.quantity) / 100,
        realizedPnl: p.realizedPnlCents / 100,
        settled: p.settled,
      };
    });
  }

  async activity(userId: string, limit = 50) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(200, limit),
    });
    return entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amountCents / 100,
      balanceAfter: e.balanceAfterCents / 100,
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      createdAt: e.createdAt,
    }));
  }

  async tradeHistory(userId: string, limit = 50) {
    const trades = await this.prisma.trade.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { createdAt: "desc" },
      take: Math.min(200, limit),
      include: { outcome: true, market: { select: { question: true, slug: true } } },
    });
    return trades.map((t) => ({
      id: t.id,
      marketQuestion: t.market.question,
      marketSlug: t.market.slug,
      outcome: t.outcome.side,
      side: t.buyerId === userId ? "BUY" : "SELL",
      price: t.priceCents / 100,
      quantity: t.quantity,
      totalValue: t.totalValueCents / 100,
      createdAt: t.createdAt,
    }));
  }
}
