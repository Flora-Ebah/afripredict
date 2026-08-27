import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { DomainException } from "../common/api-exception.filter";
import { EventsGateway } from "../ws/events.gateway";
import { CreateMarketDto, ResolveMarketDto } from "./admin.dto";

const INITIAL_BONUS_CENTS = 10_000 * 100;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

@Injectable()
export class AdminService {
  private logger = new Logger("Admin");

  constructor(
    private prisma: PrismaService,
    private ws: EventsGateway,
  ) {}

  private async audit(
    tx: Prisma.TransactionClient,
    actorId: string,
    action: string,
    entityType: string,
    entityId?: string,
    before?: unknown,
    after?: unknown,
  ) {
    await tx.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        before: before ? (before as Prisma.InputJsonValue) : undefined,
        after: after ? (after as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  // ------------------------------------------------------------- dashboard

  async dashboard() {
    const [totalUsers, activeUsers, totalMarkets, openMarkets, tradeAgg, volumeAgg, openOrders, comments] =
      await Promise.all([
        this.prisma.user.count({ where: { isBot: false } }),
        this.prisma.user.count({ where: { isBot: false, status: "ACTIVE" } }),
        this.prisma.market.count(),
        this.prisma.market.count({ where: { status: "OPEN" } }),
        this.prisma.trade.count(),
        this.prisma.market.aggregate({ _sum: { volumeCents: true } }),
        this.prisma.order.count({ where: { status: { in: ["OPEN", "PARTIALLY_FILLED"] } } }),
        this.prisma.comment.count({ where: { status: "VISIBLE" } }),
      ]);

    // last 14 days of daily volume/trades
    const since = new Date(Date.now() - 14 * 24 * 3600_000);
    const trades = await this.prisma.trade.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, totalValueCents: true },
    });
    const daily = new Map<string, { volume: number; trades: number }>();
    for (const t of trades) {
      const day = t.createdAt.toISOString().slice(0, 10);
      const d = daily.get(day) ?? { volume: 0, trades: 0 };
      d.volume += t.totalValueCents / 100;
      d.trades += 1;
      daily.set(day, d);
    }

    return {
      totalUsers,
      activeUsers,
      totalMarkets,
      openMarkets,
      totalTrades: tradeAgg,
      totalVolume: (volumeAgg._sum.volumeCents ?? 0) / 100,
      openOrders,
      comments,
      dailyStats: [...daily.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, d]) => ({ date, ...d })),
    };
  }

  // --------------------------------------------------------- market admin

  async createMarket(actorId: string, dto: CreateMarketDto) {
    if (dto.closeAt <= new Date()) {
      throw new DomainException("INVALID_DATES", "closeAt must be in the future");
    }
    if (dto.resolutionAt < dto.closeAt) {
      throw new DomainException("INVALID_DATES", "resolutionAt must be after closeAt");
    }

    const baseSlug = slugify(dto.question);
    let slug = baseSlug;
    for (let i = 2; await this.prisma.market.findUnique({ where: { slug } }); i++) {
      slug = `${baseSlug}-${i}`;
    }

    const market = await this.prisma.serializableTx(async (tx) => {
      const event = await tx.event.create({
        data: {
          title: dto.eventTitle,
          description: dto.description,
          category: dto.category.toUpperCase(),
          country: dto.country?.toUpperCase(),
          region: dto.region?.toUpperCase(),
          sourceUrl: dto.sourceUrl,
          resolutionCriteria: dto.resolutionCriteria,
          resolutionDate: dto.resolutionAt,
        },
      });
      const created = await tx.market.create({
        data: {
          eventId: event.id,
          question: dto.question,
          slug,
          description: dto.description,
          category: dto.category.toUpperCase(),
          country: dto.country?.toUpperCase(),
          region: dto.region?.toUpperCase(),
          closeAt: dto.closeAt,
          resolutionAt: dto.resolutionAt,
          resolutionSource: dto.fallbackSource
            ? `${dto.resolutionSource} (fallback: ${dto.fallbackSource})`
            : dto.resolutionSource,
          outcomes: {
            create: [
              { side: "YES", label: "YES", ticker: "YES" },
              { side: "NO", label: "NO", ticker: "NO" },
            ],
          },
        },
      });
      await tx.pricePoint.create({
        data: { marketId: created.id, yesPriceCents: 50, noPriceCents: 50 },
      });
      await this.audit(tx, actorId, "MARKET_CREATED", "MARKET", created.id, undefined, {
        question: created.question,
        slug: created.slug,
      });
      await this.bootstrapLiquidity(tx, created.id);
      return created;
    });

    return { id: market.id, slug: market.slug, question: market.question, status: market.status };
  }

  /**
   * Demo liquidity bootstrap: without it, a brand-new market has no share
   * inventory and no order could ever match (shares only change hands, they
   * are never minted in this POC). BOT_DEMO accounts are granted inventory
   * and quote both sides around 50¢. Demo-only mechanism, clearly bot-backed.
   */
  private async bootstrapLiquidity(tx: Prisma.TransactionClient, marketId: string) {
    const bots = await tx.user.findMany({ where: { isBot: true }, take: 6 });
    if (bots.length === 0) return;
    const outcomes = await tx.outcome.findMany({ where: { marketId } });

    let botIdx = 0;
    for (const outcome of outcomes) {
      for (let lvl = 0; lvl < 3; lvl++) {
        const bot = bots[botIdx++ % bots.length];
        const qty = 150 + lvl * 50;

        // asks: grant inventory then quote it
        const askPrice = 51 + lvl * 2;
        const pos = await tx.position.upsert({
          where: { userId_marketId_outcomeId: { userId: bot.id, marketId, outcomeId: outcome.id } },
          create: { userId: bot.id, marketId, outcomeId: outcome.id, quantity: qty, avgPriceCents: 50 },
          update: { quantity: { increment: qty } },
        });
        await tx.position.update({ where: { id: pos.id }, data: { lockedQuantity: { increment: qty } } });
        await tx.order.create({
          data: {
            userId: bot.id, marketId, outcomeId: outcome.id,
            side: "SELL", orderType: "LIMIT", priceCents: askPrice,
            quantity: qty, remainingQuantity: qty, status: "OPEN",
          },
        });

        // bids: lock bot funds
        const bidPrice = 49 - lvl * 2;
        const bidBot = bots[botIdx++ % bots.length];
        const lock = bidPrice * qty;
        const wallet = await tx.wallet.findUnique({ where: { userId: bidBot.id } });
        if (wallet && wallet.balanceCents >= lock) {
          await tx.ledgerEntry.create({
            data: {
              userId: bidBot.id, walletId: wallet.id, type: "ORDER_LOCK",
              amountCents: -lock, balanceBeforeCents: wallet.balanceCents,
              balanceAfterCents: wallet.balanceCents - lock, referenceType: "MARKET_BOOTSTRAP", referenceId: marketId,
            },
          });
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balanceCents: { decrement: lock }, lockedCents: { increment: lock } },
          });
          await tx.order.create({
            data: {
              userId: bidBot.id, marketId, outcomeId: outcome.id,
              side: "BUY", orderType: "LIMIT", priceCents: bidPrice,
              quantity: qty, remainingQuantity: qty, lockedCents: lock, status: "OPEN",
            },
          });
        }
      }
    }
  }

  async closeMarket(actorId: string, marketId: string) {
    const market = await this.prisma.serializableTx(async (tx) => {
      const m = await tx.market.findUnique({ where: { id: marketId } });
      if (!m) throw new DomainException("MARKET_NOT_FOUND", "Market not found", HttpStatus.NOT_FOUND);
      if (m.status !== "OPEN") throw new DomainException("INVALID_STATUS", "Market is not open");
      const updated = await tx.market.update({
        where: { id: marketId },
        data: { status: "CLOSED" },
      });
      await this.audit(tx, actorId, "MARKET_CLOSED", "MARKET", marketId, { status: m.status }, { status: "CLOSED" });
      return updated;
    });
    this.ws.emitToMarket(marketId, "market.price.updated", {
      marketId,
      status: market.status,
    });
    return { id: market.id, status: market.status };
  }

  /**
   * Resolve + settle a market. Guarded against double settlement:
   * only OPEN/CLOSED/PENDING_RESOLUTION markets can be resolved, and the
   * whole settlement runs in one serializable transaction.
   */
  async resolveMarket(actorId: string, marketId: string, dto: ResolveMarketDto) {
    const { market, settledCount } = await this.prisma.serializableTx(async (tx) => {
      const m = await tx.market.findUnique({ where: { id: marketId }, include: { outcomes: true } });
      if (!m) throw new DomainException("MARKET_NOT_FOUND", "Market not found", HttpStatus.NOT_FOUND);
      if (m.status === "RESOLVED") {
        throw new DomainException("ALREADY_RESOLVED", "Market already resolved", HttpStatus.CONFLICT);
      }
      if (m.status === "CANCELLED") {
        throw new DomainException("INVALID_STATUS", "Cancelled market cannot be resolved");
      }

      // 1. cancel all open orders and release funds/shares
      const openOrders = await tx.order.findMany({
        where: { marketId, status: { in: ["OPEN", "PARTIALLY_FILLED"] } },
      });
      for (const order of openOrders) {
        if (order.side === "BUY" && order.lockedCents > 0) {
          const wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
          if (wallet) {
            await tx.ledgerEntry.create({
              data: {
                userId: order.userId,
                walletId: wallet.id,
                type: "ORDER_RELEASE",
                amountCents: order.lockedCents,
                balanceBeforeCents: wallet.balanceCents,
                balanceAfterCents: wallet.balanceCents + order.lockedCents,
                referenceType: "ORDER",
                referenceId: order.id,
              },
            });
            await tx.wallet.update({
              where: { id: wallet.id },
              data: {
                balanceCents: { increment: order.lockedCents },
                lockedCents: { decrement: order.lockedCents },
              },
            });
          }
        }
        if (order.side === "SELL") {
          await tx.position.updateMany({
            where: { userId: order.userId, marketId, outcomeId: order.outcomeId },
            data: { lockedQuantity: { decrement: order.remainingQuantity } },
          });
        }
        await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", lockedCents: 0 } });
      }

      // 2. settle positions: winning shares pay 1 AFR (100 cents), losers 0
      const winningOutcome = m.outcomes.find((o) => o.side === dto.outcome)!;
      const positions = await tx.position.findMany({
        where: { marketId, settled: false },
        include: { user: { select: { isBot: true } } },
      });
      let settledCount = 0;
      for (const pos of positions) {
        const isWinner = pos.outcomeId === winningOutcome.id;
        const payoutCents = isWinner ? pos.quantity * 100 : 0;
        if (payoutCents > 0) {
          const wallet = await tx.wallet.findUnique({ where: { userId: pos.userId } });
          if (wallet) {
            await tx.ledgerEntry.create({
              data: {
                userId: pos.userId,
                walletId: wallet.id,
                type: "SETTLEMENT",
                amountCents: payoutCents,
                balanceBeforeCents: wallet.balanceCents,
                balanceAfterCents: wallet.balanceCents + payoutCents,
                referenceType: "MARKET",
                referenceId: marketId,
              },
            });
            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balanceCents: { increment: payoutCents } },
            });
          }
        }
        const settlePnl = isWinner
          ? (100 - pos.avgPriceCents) * pos.quantity
          : -(pos.avgPriceCents * pos.quantity);
        await tx.position.update({
          where: { id: pos.id },
          data: {
            settled: true,
            lockedQuantity: 0,
            realizedPnlCents: { increment: pos.quantity > 0 ? settlePnl : 0 },
          },
        });
        if (!pos.user.isBot && pos.quantity > 0) {
          await tx.notification.create({
            data: {
              userId: pos.userId,
              type: "POSITION_SETTLED",
              title: isWinner ? "Position gagnante réglée 🎉" : "Marché résolu",
              message: isWinner
                ? `Vous recevez ${(payoutCents / 100).toFixed(0)} AFR — « ${m.question} » résolu ${dto.outcome}.`
                : `« ${m.question} » résolu ${dto.outcome}. Votre position ${isWinner ? "" : "n'a pas gagné."}`,
              metadata: { marketId, outcome: dto.outcome, payout: payoutCents / 100 },
            },
          });
        }
        settledCount++;
      }

      // 3. mark market resolved
      const yesWins = dto.outcome === "YES";
      const updated = await tx.market.update({
        where: { id: marketId },
        data: {
          status: "RESOLVED",
          resolvedOutcome: dto.outcome,
          resolvedAt: new Date(),
          resolutionNotes: dto.notes,
          yesPriceCents: yesWins ? 100 : 0,
          noPriceCents: yesWins ? 0 : 100,
        },
      });
      await tx.pricePoint.create({
        data: {
          marketId,
          yesPriceCents: yesWins ? 100 : 0,
          noPriceCents: yesWins ? 0 : 100,
        },
      });
      await this.audit(
        tx, actorId, "MARKET_RESOLVED", "MARKET", marketId,
        { status: m.status },
        { status: "RESOLVED", outcome: dto.outcome, notes: dto.notes, evidenceUrl: dto.evidenceUrl },
      );
      return { market: updated, settledCount };
    });

    this.ws.emitToMarket(marketId, "market.resolved", {
      marketId,
      outcome: market.resolvedOutcome,
    });
    this.ws.emitGlobal("market.resolved", { marketId, outcome: market.resolvedOutcome });
    this.logger.log(`Market ${marketId} resolved ${dto.outcome}, ${settledCount} positions settled`);
    return {
      id: market.id,
      status: market.status,
      resolvedOutcome: market.resolvedOutcome,
      settledPositions: settledCount,
    };
  }

  async cancelMarket(actorId: string, marketId: string) {
    // cancel = refund everyone their cost basis, void the market
    const market = await this.prisma.serializableTx(async (tx) => {
      const m = await tx.market.findUnique({ where: { id: marketId } });
      if (!m) throw new DomainException("MARKET_NOT_FOUND", "Market not found", HttpStatus.NOT_FOUND);
      if (m.status === "RESOLVED" || m.status === "CANCELLED") {
        throw new DomainException("INVALID_STATUS", "Market already finalized", HttpStatus.CONFLICT);
      }

      const openOrders = await tx.order.findMany({
        where: { marketId, status: { in: ["OPEN", "PARTIALLY_FILLED"] } },
      });
      for (const order of openOrders) {
        if (order.side === "BUY" && order.lockedCents > 0) {
          const wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
          if (wallet) {
            await tx.ledgerEntry.create({
              data: {
                userId: order.userId,
                walletId: wallet.id,
                type: "ORDER_RELEASE",
                amountCents: order.lockedCents,
                balanceBeforeCents: wallet.balanceCents,
                balanceAfterCents: wallet.balanceCents + order.lockedCents,
                referenceType: "ORDER",
                referenceId: order.id,
              },
            });
            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balanceCents: { increment: order.lockedCents }, lockedCents: { decrement: order.lockedCents } },
            });
          }
        }
        await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED", lockedCents: 0 } });
      }

      const positions = await tx.position.findMany({ where: { marketId, settled: false, quantity: { gt: 0 } } });
      for (const pos of positions) {
        const refundCents = pos.avgPriceCents * pos.quantity;
        const wallet = await tx.wallet.findUnique({ where: { userId: pos.userId } });
        if (wallet && refundCents > 0) {
          await tx.ledgerEntry.create({
            data: {
              userId: pos.userId,
              walletId: wallet.id,
              type: "REFUND",
              amountCents: refundCents,
              balanceBeforeCents: wallet.balanceCents,
              balanceAfterCents: wallet.balanceCents + refundCents,
              referenceType: "MARKET",
              referenceId: marketId,
            },
          });
          await tx.wallet.update({ where: { id: wallet.id }, data: { balanceCents: { increment: refundCents } } });
        }
        await tx.position.update({ where: { id: pos.id }, data: { settled: true, lockedQuantity: 0 } });
      }

      const updated = await tx.market.update({ where: { id: marketId }, data: { status: "CANCELLED" } });
      await this.audit(tx, actorId, "MARKET_CANCELLED", "MARKET", marketId, { status: m.status }, { status: "CANCELLED" });
      return updated;
    });
    this.ws.emitGlobal("market.resolved", { marketId, outcome: "CANCELLED" });
    return { id: market.id, status: market.status };
  }

  // ------------------------------------------------------------ users

  async listUsers(search?: string, page = 1, pageSize = 20) {
    const where: Prisma.UserWhereInput = {
      isBot: false,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { wallet: true, _count: { select: { orders: true, positions: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        country: u.country,
        role: u.role,
        status: u.status,
        balance: (u.wallet?.balanceCents ?? 0) / 100,
        orders: u._count.orders,
        positions: u._count.positions,
        createdAt: u.createdAt,
      })),
      page,
      pageSize,
      total,
    };
  }

  async userAction(actorId: string, userId: string, action: string, role?: string) {
    return this.prisma.serializableTx(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, include: { wallet: true } });
      if (!user) throw new DomainException("NOT_FOUND", "User not found", HttpStatus.NOT_FOUND);

      if (action === "SUSPEND") {
        await tx.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
        await this.audit(tx, actorId, "USER_SUSPENDED", "USER", userId, { status: user.status }, { status: "SUSPENDED" });
        return { id: userId, status: "SUSPENDED" };
      }
      if (action === "UNSUSPEND") {
        await tx.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
        await this.audit(tx, actorId, "USER_UNSUSPENDED", "USER", userId, { status: user.status }, { status: "ACTIVE" });
        return { id: userId, status: "ACTIVE" };
      }
      if (action === "RESET_BALANCE") {
        if (!user.wallet) throw new DomainException("WALLET_NOT_FOUND", "No wallet");
        const delta = INITIAL_BONUS_CENTS - user.wallet.balanceCents;
        await tx.ledgerEntry.create({
          data: {
            userId,
            walletId: user.wallet.id,
            type: "ADMIN_ADJUSTMENT",
            amountCents: delta,
            balanceBeforeCents: user.wallet.balanceCents,
            balanceAfterCents: INITIAL_BONUS_CENTS,
            referenceType: "ADMIN_RESET",
          },
        });
        await tx.wallet.update({
          where: { id: user.wallet.id },
          data: { balanceCents: INITIAL_BONUS_CENTS },
        });
        await this.audit(tx, actorId, "BALANCE_ADJUSTED", "USER", userId,
          { balance: user.wallet.balanceCents / 100 }, { balance: INITIAL_BONUS_CENTS / 100 });
        return { id: userId, balance: INITIAL_BONUS_CENTS / 100 };
      }
      if (role) {
        await tx.user.update({ where: { id: userId }, data: { role: role as any } });
        await this.audit(tx, actorId, "USER_ROLE_CHANGED", "USER", userId, { role: user.role }, { role });
        return { id: userId, role };
      }
      throw new DomainException("INVALID_ACTION", "Unknown admin action");
    });
  }

  async auditLogs(page = 1, pageSize = 50) {
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { username: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);
    return { items, page, pageSize, total };
  }

  async marketsAdmin(page = 1, pageSize = 30) {
    const [items, total] = await Promise.all([
      this.prisma.market.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.market.count(),
    ]);
    return {
      items: items.map((m) => ({
        id: m.id,
        slug: m.slug,
        question: m.question,
        category: m.category,
        country: m.country,
        status: m.status,
        yesPrice: m.yesPriceCents / 100,
        volume: m.volumeCents / 100,
        tradeCount: m.tradeCount,
        closeAt: m.closeAt,
        resolvedOutcome: m.resolvedOutcome,
        createdAt: m.createdAt,
      })),
      page,
      pageSize,
      total,
    };
  }
}
