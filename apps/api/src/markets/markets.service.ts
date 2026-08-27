import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";
import { DomainException } from "../common/api-exception.filter";

export interface MarketFilters {
  category?: string;
  country?: string;
  region?: string;
  status?: string;
  search?: string;
  sort?: "trending" | "new" | "ending_soon" | "volume";
  page?: number;
  pageSize?: number;
}

@Injectable()
export class MarketsService {
  constructor(private prisma: PrismaService) {}

  private marketCard(m: any, watchers = 0) {
    return {
      id: m.id,
      slug: m.slug,
      question: m.question,
      category: m.category,
      country: m.country,
      region: m.region,
      status: m.status,
      yesPrice: m.yesPriceCents / 100,
      noPrice: m.noPriceCents / 100,
      probability: m.yesPriceCents,
      volume: m.volumeCents / 100,
      tradeCount: m.tradeCount,
      closeAt: m.closeAt,
      resolvedOutcome: m.resolvedOutcome,
      watchers,
      createdAt: m.createdAt,
    };
  }

  async list(filters: MarketFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));

    const where: Prisma.MarketWhereInput = {};
    if (filters.category) where.category = filters.category.toUpperCase();
    if (filters.country) where.country = filters.country.toUpperCase();
    if (filters.region) where.region = filters.region.toUpperCase();
    if (filters.status) where.status = filters.status.toUpperCase() as any;
    else where.status = { in: ["OPEN", "CLOSED", "PENDING_RESOLUTION", "RESOLVED"] };
    if (filters.search) {
      where.OR = [
        { question: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { event: { title: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    let orderBy: Prisma.MarketOrderByWithRelationInput[] = [{ createdAt: "desc" }];
    if (filters.sort === "ending_soon") {
      where.status = "OPEN";
      orderBy = [{ closeAt: "asc" }];
    } else if (filters.sort === "volume") orderBy = [{ volumeCents: "desc" }];
    else if (filters.sort === "new") orderBy = [{ createdAt: "desc" }];

    if (filters.sort === "trending") {
      // Trending score = volume + recent trades + unique traders + watchlist (per spec §52)
      const candidates = await this.prisma.market.findMany({
        where: { ...where, status: "OPEN" },
        include: { _count: { select: { watchlist: true } } },
        take: 200,
      });
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const recent = await this.prisma.trade.groupBy({
        by: ["marketId"],
        where: { createdAt: { gte: since }, marketId: { in: candidates.map((c) => c.id) } },
        _count: { _all: true },
      });
      const traders = await this.prisma.trade.findMany({
        where: { createdAt: { gte: since }, marketId: { in: candidates.map((c) => c.id) } },
        select: { marketId: true, buyerId: true, sellerId: true },
      });
      const recentMap = new Map(recent.map((r) => [r.marketId, r._count._all]));
      const traderMap = new Map<string, Set<string>>();
      for (const t of traders) {
        if (!traderMap.has(t.marketId)) traderMap.set(t.marketId, new Set());
        traderMap.get(t.marketId)!.add(t.buyerId);
        traderMap.get(t.marketId)!.add(t.sellerId);
      }
      const scored = candidates
        .map((m) => ({
          m,
          score:
            m.volumeCents / 1000 +
            (recentMap.get(m.id) ?? 0) * 50 +
            (traderMap.get(m.id)?.size ?? 0) * 100 +
            m._count.watchlist * 80,
        }))
        .sort((a, b) => b.score - a.score);
      const slice = scored.slice((page - 1) * pageSize, page * pageSize);
      return {
        items: slice.map((s) => this.marketCard(s.m, s.m._count.watchlist)),
        page,
        pageSize,
        total: scored.length,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.market.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { watchlist: true } } },
      }),
      this.prisma.market.count({ where }),
    ]);
    return {
      items: items.map((m) => this.marketCard(m, m._count.watchlist)),
      page,
      pageSize,
      total,
    };
  }

  async detail(idOrSlug: string, userId?: string) {
    const market = await this.prisma.market.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        event: true,
        outcomes: true,
        _count: { select: { watchlist: true, comments: true } },
      },
    });
    if (!market) throw new DomainException("MARKET_NOT_FOUND", "Market not found", HttpStatus.NOT_FOUND);

    const traders = await this.prisma.position.count({
      where: { marketId: market.id, quantity: { gt: 0 } },
    });

    let myPosition: any = null;
    let watching = false;
    if (userId) {
      const positions = await this.prisma.position.findMany({
        where: { userId, marketId: market.id },
        include: { outcome: true },
      });
      myPosition = positions
        .filter((p) => p.quantity > 0 || p.realizedPnlCents !== 0)
        .map((p) => ({
          outcome: p.outcome.side,
          quantity: p.quantity,
          lockedQuantity: p.lockedQuantity,
          avgPrice: p.avgPriceCents / 100,
          currentPrice: (p.outcome.side === "YES" ? market.yesPriceCents : market.noPriceCents) / 100,
          unrealizedPnl:
            (p.quantity * ((p.outcome.side === "YES" ? market.yesPriceCents : market.noPriceCents) - p.avgPriceCents)) /
            100,
          realizedPnl: p.realizedPnlCents / 100,
          settled: p.settled,
        }));
      watching = !!(await this.prisma.watchlist.findUnique({
        where: { userId_marketId: { userId, marketId: market.id } },
      }));
    }

    return {
      id: market.id,
      slug: market.slug,
      question: market.question,
      description: market.description,
      category: market.category,
      country: market.country,
      region: market.region,
      status: market.status,
      marketType: market.marketType,
      yesPrice: market.yesPriceCents / 100,
      noPrice: market.noPriceCents / 100,
      volume: market.volumeCents / 100,
      tradeCount: market.tradeCount,
      traders,
      watchers: market._count.watchlist,
      commentCount: market._count.comments,
      openAt: market.openAt,
      closeAt: market.closeAt,
      resolutionAt: market.resolutionAt,
      resolutionSource: market.resolutionSource,
      resolutionNotes: market.resolutionNotes,
      resolvedOutcome: market.resolvedOutcome,
      resolvedAt: market.resolvedAt,
      event: {
        id: market.event.id,
        title: market.event.title,
        resolutionCriteria: market.event.resolutionCriteria,
        sourceUrl: market.event.sourceUrl,
      },
      outcomes: market.outcomes.map((o) => ({
        id: o.id,
        side: o.side,
        label: o.label,
        price: o.priceCents / 100,
      })),
      myPositions: myPosition,
      watching,
    };
  }

  async orderbook(marketId: string, outcomeSide: "YES" | "NO" = "YES") {
    const outcome = await this.prisma.outcome.findFirst({
      where: { marketId, side: outcomeSide },
    });
    if (!outcome) throw new DomainException("MARKET_NOT_FOUND", "Market/outcome not found", HttpStatus.NOT_FOUND);

    const open = await this.prisma.order.findMany({
      where: { outcomeId: outcome.id, status: { in: ["OPEN", "PARTIALLY_FILLED"] } },
      select: { side: true, priceCents: true, remainingQuantity: true },
    });

    const aggregate = (side: "BUY" | "SELL") => {
      const levels = new Map<number, number>();
      for (const o of open.filter((o) => o.side === side)) {
        levels.set(o.priceCents, (levels.get(o.priceCents) ?? 0) + o.remainingQuantity);
      }
      const sorted = [...levels.entries()].sort((a, b) => (side === "BUY" ? b[0] - a[0] : a[0] - b[0]));
      return sorted.slice(0, 12).map(([priceCents, size]) => ({
        price: priceCents / 100,
        size,
        total: (priceCents * size) / 100,
      }));
    };

    const bids = aggregate("BUY");
    const asks = aggregate("SELL");
    const bestBid = bids[0]?.price ?? null;
    const bestAsk = asks[0]?.price ?? null;
    const spread = bestBid !== null && bestAsk !== null ? Math.round((bestAsk - bestBid) * 100) / 100 : null;

    return { marketId, outcome: outcomeSide, bids, asks, spread };
  }

  async trades(marketId: string, limit = 30) {
    const trades = await this.prisma.trade.findMany({
      where: { marketId },
      orderBy: { createdAt: "desc" },
      take: Math.min(100, limit),
      include: { outcome: true, buyer: { select: { username: true, isBot: true } } },
    });
    return trades.map((t) => ({
      id: t.id,
      outcome: t.outcome.side,
      price: t.priceCents / 100,
      quantity: t.quantity,
      totalValue: t.totalValueCents / 100,
      buyer: t.buyer.isBot ? "BOT_DEMO" : t.buyer.username,
      createdAt: t.createdAt,
    }));
  }

  async priceHistory(marketId: string, interval: "1H" | "1D" | "1W" | "1M" | "ALL" = "ALL") {
    const since =
      interval === "1H" ? new Date(Date.now() - 3600_000)
      : interval === "1D" ? new Date(Date.now() - 24 * 3600_000)
      : interval === "1W" ? new Date(Date.now() - 7 * 24 * 3600_000)
      : interval === "1M" ? new Date(Date.now() - 30 * 24 * 3600_000)
      : undefined;

    const points = await this.prisma.pricePoint.findMany({
      where: { marketId, ...(since ? { createdAt: { gte: since } } : {}) },
      orderBy: { createdAt: "asc" },
      take: 2000,
    });
    return points.map((p) => ({
      t: p.createdAt,
      yesPrice: p.yesPriceCents / 100,
      noPrice: p.noPriceCents / 100,
      volume: p.volumeCents / 100,
    }));
  }
}
