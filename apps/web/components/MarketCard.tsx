"use client";

import Link from "next/link";
import { CATEGORY_LABELS, COUNTRY_FLAGS, fmtCompact, fmtDate } from "../lib/format";

export interface MarketCardData {
  id: string;
  slug: string;
  question: string;
  category: string;
  country: string | null;
  status: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  closeAt: string;
  resolvedOutcome?: string | null;
}

/* Visuel de la card : dégradé par catégorie + drapeau (pas d'images marché en POC) */
const CATEGORY_GRADIENTS: Record<string, string> = {
  SPORT: "linear-gradient(135deg,#16A34A22,#16A34A55)",
  POLITICS: "linear-gradient(135deg,#2563EB22,#2563EB55)",
  ECONOMY: "linear-gradient(135deg,#C4552D22,#C4552D55)",
  BUSINESS: "linear-gradient(135deg,#92400E22,#92400E55)",
  TECH: "linear-gradient(135deg,#7C3AED22,#7C3AED55)",
  CULTURE: "linear-gradient(135deg,#DB277722,#DB277755)",
  ENTERTAINMENT: "linear-gradient(135deg,#EA580C22,#EA580C55)",
  WEATHER: "linear-gradient(135deg,#0891B222,#0891B255)",
  CRYPTO: "linear-gradient(135deg,#F59E0B22,#F59E0B55)",
  WORLD: "linear-gradient(135deg,#05966922,#05966955)",
};

export function MarketCard({ market }: { market: MarketCardData }) {
  const prob = Math.round(market.yesPrice * 100);
  const resolved = market.status === "RESOLVED";

  return (
    <Link
      href={`/market/${market.slug}`}
      className="card p-3.5 min-h-[168px] flex flex-col gap-3 hover:!bg-[color:var(--gris-200)] transition-colors"
    >
      {/* Ligne haute : miniature + catégorie + titre */}
      <div className="flex items-start gap-2.5 flex-1">
        <div
          className="w-9 h-9 rounded-md shrink-0 flex items-center justify-center text-base"
          style={{ background: CATEGORY_GRADIENTS[market.category] ?? "var(--gris-200)" }}
        >
          {market.country ? COUNTRY_FLAGS[market.country] ?? "🌍" : "🌍"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="badge bg-terra-600 text-white shrink-0 !px-1.5 !text-[10px]">
              {CATEGORY_LABELS[market.category] ?? market.category}
            </span>
            <span className="text-[11px] text-muted font-medium truncate">
              {resolved ? (
                <span className={market.resolvedOutcome === "YES" ? "text-success font-semibold" : "text-danger font-semibold"}>
                  Résolu {market.resolvedOutcome === "YES" ? "OUI" : "NON"}
                </span>
              ) : (
                <>Fin : {fmtDate(market.closeAt)}</>
              )}
            </span>
          </div>
          <p className="text-[13px] font-semibold leading-snug line-clamp-2 text-[color:var(--gris-900)] mt-1">
            {market.question}
          </p>
        </div>
      </div>

      {/* Volume + probabilité */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-muted shrink-0">
          {fmtCompact(market.volume)} AFR
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-[color:var(--gris-200)] overflow-hidden">
          <div className="h-full rounded-full bg-success" style={{ width: `${prob}%` }} />
        </div>
        <span className="text-xs font-bold shrink-0 text-[color:var(--gris-900)]">{prob}%</span>
      </div>

      {/* Oui / Non pleine largeur */}
      <div className="grid grid-cols-2 gap-1.5">
        <span className="rounded-md bg-green-100 text-success text-xs font-semibold py-1.5 text-center dark:bg-green-950">
          Oui {prob}¢
        </span>
        <span className="rounded-md bg-red-100 text-danger text-xs font-semibold py-1.5 text-center dark:bg-red-950">
          Non {100 - prob}¢
        </span>
      </div>
    </Link>
  );
}
