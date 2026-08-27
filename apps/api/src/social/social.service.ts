import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { DomainException } from "../common/api-exception.filter";
import { AuthUser } from "../common/decorators";

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  // ------------------------------------------------------------- comments

  async listComments(marketId: string, limit = 50) {
    const comments = await this.prisma.comment.findMany({
      where: { marketId, status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      take: Math.min(200, limit),
      include: { user: { select: { username: true, displayName: true, avatarUrl: true, country: true } } },
    });
    return comments.map((c) => ({
      id: c.id,
      content: c.content,
      user: c.user,
      createdAt: c.createdAt,
    }));
  }

  async addComment(userId: string, marketId: string, content: string) {
    const market = await this.prisma.market.findUnique({ where: { id: marketId } });
    if (!market) throw new DomainException("MARKET_NOT_FOUND", "Market not found", HttpStatus.NOT_FOUND);
    const comment = await this.prisma.comment.create({
      data: { userId, marketId, content: content.trim() },
      include: { user: { select: { username: true, displayName: true, avatarUrl: true, country: true } } },
    });
    return { id: comment.id, content: comment.content, user: comment.user, createdAt: comment.createdAt };
  }

  async deleteComment(user: AuthUser, commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new DomainException("NOT_FOUND", "Comment not found", HttpStatus.NOT_FOUND);
    const isStaff = ["MODERATOR", "ADMIN", "SUPER_ADMIN"].includes(user.role);
    if (comment.userId !== user.id && !isStaff) {
      throw new DomainException("FORBIDDEN", "Cannot delete this comment", HttpStatus.FORBIDDEN);
    }
    await this.prisma.comment.update({ where: { id: commentId }, data: { status: "DELETED" } });
    return { deleted: true };
  }

  // ------------------------------------------------------------ watchlist

  async listWatchlist(userId: string) {
    const items = await this.prisma.watchlist.findMany({
      where: { userId },
      include: { market: true },
      orderBy: { createdAt: "desc" },
    });
    return items.map((w) => ({
      marketId: w.marketId,
      slug: w.market.slug,
      question: w.market.question,
      status: w.market.status,
      yesPrice: w.market.yesPriceCents / 100,
      noPrice: w.market.noPriceCents / 100,
      volume: w.market.volumeCents / 100,
      closeAt: w.market.closeAt,
      addedAt: w.createdAt,
    }));
  }

  async toggleWatch(userId: string, marketId: string) {
    const existing = await this.prisma.watchlist.findUnique({
      where: { userId_marketId: { userId, marketId } },
    });
    if (existing) {
      await this.prisma.watchlist.delete({ where: { id: existing.id } });
      return { watching: false };
    }
    const market = await this.prisma.market.findUnique({ where: { id: marketId } });
    if (!market) throw new DomainException("MARKET_NOT_FOUND", "Market not found", HttpStatus.NOT_FOUND);
    await this.prisma.watchlist.create({ data: { userId, marketId } });
    return { watching: true };
  }

  // -------------------------------------------------------- notifications

  async listNotifications(userId: string, unreadOnly = false) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = await this.prisma.notification.count({ where: { userId, read: false } });
    return { items: notifications, unreadCount };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return { read: true };
  }

  // ---------------------------------------------------------- leaderboard

  async leaderboard(period: "daily" | "weekly" | "monthly" | "all") {
    const since =
      period === "daily" ? new Date(Date.now() - 24 * 3600_000)
      : period === "weekly" ? new Date(Date.now() - 7 * 24 * 3600_000)
      : period === "monthly" ? new Date(Date.now() - 30 * 24 * 3600_000)
      : undefined;

    // realized P&L from settlements & trades in the window, from ledger
    const grouped = await this.prisma.ledgerEntry.groupBy({
      by: ["userId"],
      where: {
        type: { in: ["TRADE", "SETTLEMENT"] },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      _sum: { amountCents: true },
    });

    const sorted = grouped
      .map((g) => ({ userId: g.userId, pnlCents: g._sum.amountCents ?? 0 }))
      .sort((a, b) => b.pnlCents - a.pnlCents)
      .slice(0, 50);

    const users = await this.prisma.user.findMany({
      where: { id: { in: sorted.map((s) => s.userId) }, isBot: false },
      select: { id: true, username: true, displayName: true, avatarUrl: true, country: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // win rate: settled positions with positive realized pnl
    const rows: Array<{
      rank: number;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      country: string | null;
      pnl: number;
      winRate: number | null;
    }> = [];
    let rank = 1;
    for (const s of sorted) {
      const u = userMap.get(s.userId);
      if (!u) continue; // bot or missing
      const settled = await this.prisma.position.findMany({
        where: { userId: s.userId, settled: true },
        select: { realizedPnlCents: true },
      });
      const wins = settled.filter((p) => p.realizedPnlCents > 0).length;
      rows.push({
        rank: rank++,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        country: u.country,
        pnl: s.pnlCents / 100,
        winRate: settled.length > 0 ? Math.round((wins / settled.length) * 100) : null,
      });
      if (rows.length >= 20) break;
    }
    return { period, rows };
  }
}
