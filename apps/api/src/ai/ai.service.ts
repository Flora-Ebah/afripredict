import { HttpStatus, Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { DomainException } from "../common/api-exception.filter";

export interface MarketAnalysis {
  marketProbability: number;
  aiProbability: number;
  factors: { label: string; impact: "positive" | "negative" | "neutral" }[];
  confidence: "Low" | "Medium" | "High";
  disclaimer: string;
  provider: string;
}

/**
 * MarketAnalysisProvider abstraction (spec §79).
 * POC ships the rule-based provider; an LLM-backed provider can be swapped in
 * later behind the same interface (OPENAI_API_KEY is reserved for that).
 */
export interface MarketAnalysisProvider {
  analyzeMarket(marketId: string): Promise<MarketAnalysis>;
}

@Injectable()
export class RuleBasedAnalysisService implements MarketAnalysisProvider {
  constructor(private prisma: PrismaService) {}

  async analyzeMarket(marketId: string): Promise<MarketAnalysis> {
    const market = await this.prisma.market.findUnique({ where: { id: marketId } });
    if (!market) throw new DomainException("MARKET_NOT_FOUND", "Market not found", HttpStatus.NOT_FOUND);

    const since = new Date(Date.now() - 7 * 24 * 3600_000);
    const points = await this.prisma.pricePoint.findMany({
      where: { marketId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    });
    const recentTrades = await this.prisma.trade.count({
      where: { marketId, createdAt: { gte: since } },
    });

    const marketProb = market.yesPriceCents;
    const factors: MarketAnalysis["factors"] = [];

    // momentum over the last week of price points
    let momentum = 0;
    if (points.length >= 2) {
      momentum = points[points.length - 1].yesPriceCents - points[0].yesPriceCents;
      if (momentum > 3) factors.push({ label: `Tendance haussière récente (+${momentum} pts sur 7j)`, impact: "positive" });
      else if (momentum < -3) factors.push({ label: `Tendance baissière récente (${momentum} pts sur 7j)`, impact: "negative" });
      else factors.push({ label: "Prix stable sur la semaine", impact: "neutral" });
    }

    // liquidity / activity signals
    if (market.volumeCents > 500_000) factors.push({ label: "Volume élevé — signal de marché plus fiable", impact: "positive" });
    else factors.push({ label: "Volume limité — probabilité de marché peu fiable", impact: "negative" });
    if (recentTrades > 20) factors.push({ label: `${recentTrades} trades cette semaine — marché actif`, impact: "positive" });

    // time to close
    const daysLeft = Math.max(0, (market.closeAt.getTime() - Date.now()) / (24 * 3600_000));
    if (daysLeft < 3) factors.push({ label: "Clôture imminente — incertitude réduite", impact: "neutral" });
    else factors.push({ label: `${Math.round(daysLeft)} jours avant clôture — évènements imprévus possibles`, impact: "negative" });

    // rule-based estimate: shrink market price toward 50 when the market is
    // illiquid, follow momentum slightly when it is liquid
    const liquidityWeight = Math.min(1, market.volumeCents / 1_000_000);
    let aiProb = Math.round(50 + (marketProb - 50) * (0.6 + 0.4 * liquidityWeight) + momentum * 0.2);
    aiProb = Math.max(2, Math.min(98, aiProb));

    const confidence: MarketAnalysis["confidence"] =
      liquidityWeight > 0.7 && recentTrades > 20 ? "High" : liquidityWeight > 0.3 ? "Medium" : "Low";

    return {
      marketProbability: marketProb,
      aiProbability: aiProb,
      factors,
      confidence,
      disclaimer:
        "Analyse automatique fournie à titre informatif uniquement. Ce n'est ni une prédiction garantie ni un conseil.",
      provider: "RuleBasedAnalysisProvider",
    };
  }
}
