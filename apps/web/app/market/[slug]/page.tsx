"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Bot, CalendarClock, Coins, Star, Users } from "lucide-react";
import { apiGet, apiPost } from "../../../lib/api";
import { useAuthStore } from "../../../lib/auth-store";
import { useUiStore } from "../../../lib/ui-store";
import { useMarketSocket } from "../../../lib/ws";
import { PriceChart } from "../../../components/PriceChart";
import { OrderBook } from "../../../components/OrderBook";
import { TradePanel } from "../../../components/TradePanel";
import { CATEGORY_LABELS, COUNTRY_FLAGS, fmtAFR, fmtDate, fmtDateTime } from "../../../lib/format";

function ProbRing({ prob }: { prob: number }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  const color = prob >= 50 ? "#16A34A" : "#DC2626";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 64 64" className="w-20 h-20 -rotate-90">
          <circle cx="32" cy="32" r={R} fill="none" stroke="var(--gris-200)" strokeWidth="6" />
          <circle
            cx="32" cy="32" r={R} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(prob / 100) * C} ${C}`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{prob}%</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-muted uppercase tracking-wide">chance Oui</span>
    </div>
  );
}

export default function MarketDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const openAuth = useUiStore((s) => s.openAuth);
  const [bookOutcome, setBookOutcome] = useState<"YES" | "NO">("YES");
  const [comment, setComment] = useState("");

  const { data: market, isLoading, isError } = useQuery({
    queryKey: ["market", slug],
    queryFn: () => apiGet(`/markets/${slug}`),
  });

  const marketId = market?.id;

  const onSocketEvent = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["market", slug] });
    qc.invalidateQueries({ queryKey: ["orderbook", marketId] });
    qc.invalidateQueries({ queryKey: ["trades", marketId] });
    qc.invalidateQueries({ queryKey: ["history", marketId] });
  }, [qc, slug, marketId]);
  useMarketSocket(marketId, onSocketEvent);

  const { data: trades } = useQuery({
    queryKey: ["trades", marketId],
    queryFn: () => apiGet(`/markets/${marketId}/trades?limit=15`),
    enabled: !!marketId,
    refetchInterval: 10_000,
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", marketId],
    queryFn: () => apiGet(`/markets/${marketId}/comments`),
    enabled: !!marketId,
  });

  const { data: analysis } = useQuery({
    queryKey: ["analysis", marketId],
    queryFn: () => apiGet(`/markets/${marketId}/analysis`),
    enabled: !!marketId,
    staleTime: 60_000,
  });

  const watchMutation = useMutation({
    mutationFn: () => apiPost(`/markets/${marketId}/watch`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["market", slug] }),
  });

  const commentMutation = useMutation({
    mutationFn: () => apiPost(`/markets/${marketId}/comments`, { content: comment }),
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["comments", marketId] });
    },
  });

  if (isLoading) return <div className="card h-96 animate-pulse bg-gray-100" />;
  if (isError || !market) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-muted">Marché introuvable.</p>
        <Link href="/markets" className="btn-outline text-xs mt-3">← Retour aux marchés</Link>
      </div>
    );
  }

  const prob = Math.round(market.yesPrice * 100);
  const myShares = { YES: 0, NO: 0 };
  for (const p of market.myPositions ?? []) {
    if (p.outcome === "YES") myShares.YES = p.quantity - p.lockedQuantity;
    if (p.outcome === "NO") myShares.NO = p.quantity - p.lockedQuantity;
  }

  return (
    <div className="space-y-4">
      <Link href="/markets" className="text-xs text-muted hover:text-primary">← Marchés</Link>

      {/* header */}
      <div className="card p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2 max-w-2xl flex-1 min-w-[240px]">
          <div className="flex flex-wrap gap-1.5">
            <span className="badge bg-terra-600 text-white">
              {market.country ? `${COUNTRY_FLAGS[market.country] ?? ""} ` : ""}
              {CATEGORY_LABELS[market.category] ?? market.category}
            </span>
            {market.status !== "OPEN" && (
              <span className={`badge ${market.status === "RESOLVED" ? "bg-terra-100 text-terra-700" : "bg-[color:var(--gris-200)] text-muted"}`}>
                {market.status === "RESOLVED" ? `Résolu — ${market.resolvedOutcome === "YES" ? "OUI" : "NON"}` : market.status}
              </span>
            )}
            <span className="badge bg-[color:var(--gris-100)] text-muted">DEMO</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold leading-snug">{market.question}</h1>
        </div>
        <ProbRing prob={prob} />
      </div>

      {/* stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          [Coins, "Volume", fmtAFR(market.volume)],
          [ArrowLeftRight, "Trades", String(market.tradeCount)],
          [Users, "Traders", String(market.traders)],
          [CalendarClock, "Clôture", fmtDate(market.closeAt)],
        ].map(([Icon, label, value]: any) => (
          <div key={label} className="card px-3.5 py-3 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-md bg-terra-100 text-terra-600 flex items-center justify-center shrink-0">
              <Icon size={15} strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide font-semibold text-muted">{label}</div>
              <div className="text-sm font-bold truncate">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <PriceChart marketId={market.id} />

          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold">Carnet d&apos;ordres</h3>
            <div className="flex items-center gap-0.5 rounded-full bg-[color:var(--gris-100)] p-0.5">
              {(["YES", "NO"] as const).map((o) => (
                <button
                  key={o}
                  className={`h-6 px-2.5 rounded-full text-[11px] font-semibold transition-colors ${
                    bookOutcome === o
                      ? o === "YES"
                        ? "bg-[color:var(--surface)] text-success shadow-sm"
                        : "bg-[color:var(--surface)] text-danger shadow-sm"
                      : "text-muted hover:text-[color:var(--gris-700)]"
                  }`}
                  onClick={() => setBookOutcome(o)}
                >
                  {o === "YES" ? "Oui" : "Non"}
                </button>
              ))}
            </div>
          </div>
          <OrderBook marketId={market.id} outcome={bookOutcome} />

          {/* recent trades */}
          <div className="card">
            <div className="px-3 py-2 border-b border-borderc text-sm font-bold">Derniers trades</div>
            {(trades ?? []).length === 0 ? (
              <div className="p-3 text-xs text-muted">Aucun trade pour le moment.</div>
            ) : (
              <table className="w-full text-[11px]">
                <tbody>
                  {(trades ?? []).map((t: any) => (
                    <tr key={t.id} className="border-b border-borderc last:border-0">
                      <td className="px-3 py-1.5">
                        <span className={`badge ${t.outcome === "YES" ? "bg-green-100 text-success dark:bg-green-950" : "bg-red-100 text-danger dark:bg-red-950"}`}>
                          {t.outcome === "YES" ? "Oui" : "Non"}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 font-semibold">{Math.round(t.price * 100)}¢</td>
                      <td className="px-3 py-1.5">{t.quantity} parts</td>
                      <td className="px-3 py-1.5 text-muted">{t.buyer}</td>
                      <td className="px-3 py-1.5 text-right text-muted">{fmtDateTime(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* right column */}
        <div className="space-y-4">
          <TradePanel
            marketId={market.id}
            yesPrice={market.yesPrice}
            noPrice={market.noPrice}
            status={market.status}
            myShares={myShares}
          />

          {user && (
            <button
              className={`w-full ${market.watching ? "btn-primary" : "btn-outline"} text-xs py-2`}
              onClick={() => watchMutation.mutate()}
            >
              <Star size={14} fill={market.watching ? "currentColor" : "none"} />
              {market.watching ? "Dans votre watchlist" : "Suivre ce marché"}
            </button>
          )}

          {/* my position */}
          {(market.myPositions ?? []).length > 0 && (
            <div className="card p-3 space-y-2">
              <h3 className="text-sm font-bold">Votre position</h3>
              {market.myPositions.map((p: any, i: number) => (
                <div key={i} className="text-xs space-y-0.5 border-b border-borderc last:border-0 pb-2 last:pb-0">
                  <div className="flex justify-between">
                    <b className={p.outcome === "YES" ? "text-success" : "text-danger"}>{p.outcome} × {p.quantity}</b>
                    <span className={p.unrealizedPnl >= 0 ? "text-success" : "text-danger"}>
                      {p.unrealizedPnl >= 0 ? "+" : ""}{p.unrealizedPnl.toFixed(2)} AFR
                    </span>
                  </div>
                  <div className="text-muted">
                    Moyen {Math.round(p.avgPrice * 100)}¢ → Actuel {Math.round(p.currentPrice * 100)}¢
                    {p.settled && " · réglée"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI analysis */}
          {analysis && (
            <div className="card p-3 space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-bold">
                <Bot size={16} className="text-terra-600" /> AI Market Analyst
              </h3>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Marché</span><b>{analysis.marketProbability}%</b>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Estimation IA</span><b>{analysis.aiProbability}%</b>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Confiance</span><b>{analysis.confidence}</b>
              </div>
              <ul className="text-[11px] space-y-1 pt-1">
                {analysis.factors.map((f: any, i: number) => (
                  <li key={i}>
                    <span className={f.impact === "positive" ? "text-success" : f.impact === "negative" ? "text-danger" : "text-muted"}>
                      {f.impact === "positive" ? "+" : f.impact === "negative" ? "−" : "•"}
                    </span>{" "}
                    {f.label}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted border-t border-borderc pt-1.5">{analysis.disclaimer}</p>
            </div>
          )}

          {/* about */}
          <div className="card p-3 space-y-2 text-xs">
            <h3 className="text-sm font-bold">À propos de ce marché</h3>
            <div>
              <div className="text-[10px] uppercase text-muted">Critère de résolution</div>
              <p className="whitespace-pre-line">{market.event?.resolutionCriteria ?? market.description}</p>
            </div>
            <div className="flex justify-between"><span className="text-muted">Source</span><b>{market.resolutionSource}</b></div>
            <div className="flex justify-between"><span className="text-muted">Clôture</span><b>{fmtDate(market.closeAt)}</b></div>
            {market.resolutionAt && (
              <div className="flex justify-between"><span className="text-muted">Résolution prévue</span><b>{fmtDate(market.resolutionAt)}</b></div>
            )}
            {market.resolutionNotes && (
              <div>
                <div className="text-[10px] uppercase text-muted">Notes de résolution</div>
                <p>{market.resolutionNotes}</p>
              </div>
            )}
          </div>

          {/* comments */}
          <div className="card">
            <div className="px-3.5 py-2.5 border-b border-borderc text-sm font-bold">
              Commentaires ({market.commentCount})
            </div>
            {user ? (
              <div className="p-3 border-b border-borderc flex gap-2">
                <input
                  className="input !text-xs"
                  placeholder="Partagez votre analyse…"
                  value={comment}
                  maxLength={2000}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && comment.trim() && commentMutation.mutate()}
                />
                <button
                  className="btn-primary text-xs shrink-0"
                  disabled={!comment.trim() || commentMutation.isPending}
                  onClick={() => commentMutation.mutate()}
                >
                  Publier
                </button>
              </div>
            ) : (
              <div className="p-3.5 border-b border-borderc text-xs text-muted font-semibold">
                <button onClick={() => openAuth("login")} className="text-terra-700 font-bold hover:underline">
                  Connectez-vous
                </button>{" "}
                pour commenter.
              </div>
            )}
            <div className="max-h-80 overflow-auto">
              {(comments ?? []).length === 0 ? (
                <div className="p-3.5 text-xs text-muted">Aucun commentaire.</div>
              ) : (
                (comments ?? []).map((c: any) => (
                  <div key={c.id} className="px-3.5 py-2.5 border-b border-borderc last:border-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      <b>@{c.user.username}</b>
                      {c.user.country && <span>{COUNTRY_FLAGS[c.user.country] ?? ""}</span>}
                      <span className="text-muted text-[10px]">{fmtDateTime(c.createdAt)}</span>
                    </div>
                    <p className="text-xs mt-1 leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
