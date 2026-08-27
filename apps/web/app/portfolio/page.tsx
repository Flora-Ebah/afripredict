"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api";
import { useAuthStore } from "../../lib/auth-store";
import { useUiStore } from "../../lib/ui-store";
import { fmtAFR, fmtDateTime } from "../../lib/format";

const TABS = ["Positions", "Activité", "Trades"] as const;

export default function PortfolioPage() {
  const user = useAuthStore((s) => s.user);
  const openAuth = useUiStore((s) => s.openAuth);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Positions");

  const { data: summary, isLoading } = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => apiGet("/portfolio"),
    enabled: !!user,
    refetchInterval: 15_000,
  });
  const { data: positions } = useQuery({
    queryKey: ["positions"],
    queryFn: () => apiGet("/portfolio/positions"),
    enabled: !!user,
  });
  const { data: activity } = useQuery({
    queryKey: ["activity"],
    queryFn: () => apiGet("/portfolio/activity"),
    enabled: !!user && tab === "Activité",
  });
  const { data: trades } = useQuery({
    queryKey: ["mytrades"],
    queryFn: () => apiGet("/portfolio/trades"),
    enabled: !!user && tab === "Trades",
  });

  if (!user) {
    return (
      <div className="card p-10 text-center space-y-3">
        <p className="text-sm text-muted font-semibold">Connectez-vous pour voir votre portefeuille.</p>
        <button onClick={() => openAuth("login")} className="btn-primary text-xs">Connexion</button>
      </div>
    );
  }

  const pnl = (summary?.unrealizedPnl ?? 0) + (summary?.realizedPnl ?? 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Portefeuille</h1>

      {isLoading ? (
        <div className="card h-24 animate-pulse bg-gray-100" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ["Solde disponible", fmtAFR(summary?.balance ?? 0), ""],
            ["Bloqué (ordres)", fmtAFR(summary?.lockedBalance ?? 0), ""],
            ["Valeur du portefeuille", fmtAFR(summary?.portfolioValue ?? 0), ""],
            ["P&L total", `${pnl >= 0 ? "+" : ""}${fmtAFR(pnl, 2)}`, pnl >= 0 ? "text-success" : "text-danger"],
          ].map(([label, value, cls]) => (
            <div key={label as string} className="card px-4 py-3">
              <div className="text-[10px] uppercase text-muted">{label}</div>
              <div className={`text-lg font-bold ${cls}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 border-b border-borderc">
        {TABS.map((t) => (
          <button
            key={t}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === t ? "border-secondary text-secondary" : "border-transparent text-muted"}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
        <Link href="/orders" className="px-4 py-2 text-sm font-semibold text-muted ml-auto">
          Mes ordres →
        </Link>
      </div>

      {tab === "Positions" && (
        <div className="card overflow-x-auto">
          {(positions ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">
              Aucune position. <Link href="/markets" className="text-secondary font-semibold">Explorer les marchés</Link>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase text-muted border-b border-borderc">
                  <th className="px-3 py-2">Marché</th>
                  <th className="px-3 py-2">Issue</th>
                  <th className="px-3 py-2 text-right">Qté</th>
                  <th className="px-3 py-2 text-right">Prix moyen</th>
                  <th className="px-3 py-2 text-right">Prix actuel</th>
                  <th className="px-3 py-2 text-right">Valeur</th>
                  <th className="px-3 py-2 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {(positions ?? []).map((p: any) => {
                  const totalPnl = p.unrealizedPnl + p.realizedPnl;
                  return (
                    <tr key={p.id} className="border-b border-borderc last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 max-w-[280px]">
                        <Link href={`/market/${p.marketSlug}`} className="font-semibold hover:text-secondary line-clamp-2">
                          {p.marketQuestion}
                        </Link>
                        {p.marketStatus === "RESOLVED" && (
                          <span className="badge bg-blue-100 text-secondary ml-1">Résolu {p.resolvedOutcome}</span>
                        )}
                      </td>
                      <td className={`px-3 py-2 font-bold ${p.outcome === "YES" ? "text-success" : "text-danger"}`}>{p.outcome}</td>
                      <td className="px-3 py-2 text-right">{p.quantity}</td>
                      <td className="px-3 py-2 text-right">{Math.round(p.avgPrice * 100)}¢</td>
                      <td className="px-3 py-2 text-right">{Math.round(p.currentPrice * 100)}¢</td>
                      <td className="px-3 py-2 text-right">{fmtAFR(p.value)}</td>
                      <td className={`px-3 py-2 text-right font-bold ${totalPnl >= 0 ? "text-success" : "text-danger"}`}>
                        {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "Activité" && (
        <div className="card">
          {(activity ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">Aucune activité.</div>
          ) : (
            (activity ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-2.5 border-b border-borderc last:border-0 text-xs">
                <div>
                  <b>{a.type}</b>
                  {a.referenceType && <span className="text-muted ml-2">{a.referenceType}</span>}
                  <div className="text-muted">{fmtDateTime(a.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${a.amount >= 0 ? "text-success" : "text-danger"}`}>
                    {a.amount >= 0 ? "+" : ""}{fmtAFR(a.amount, 2)}
                  </div>
                  <div className="text-muted">solde : {fmtAFR(a.balanceAfter, 2)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "Trades" && (
        <div className="card overflow-x-auto">
          {(trades ?? []).length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">Aucun trade.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase text-muted border-b border-borderc">
                  <th className="px-3 py-2">Marché</th>
                  <th className="px-3 py-2">Sens</th>
                  <th className="px-3 py-2">Issue</th>
                  <th className="px-3 py-2 text-right">Prix</th>
                  <th className="px-3 py-2 text-right">Qté</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {(trades ?? []).map((t: any) => (
                  <tr key={t.id} className="border-b border-borderc last:border-0">
                    <td className="px-3 py-2 max-w-[280px]">
                      <Link href={`/market/${t.marketSlug}`} className="hover:text-secondary line-clamp-1">{t.marketQuestion}</Link>
                    </td>
                    <td className={`px-3 py-2 font-bold ${t.side === "BUY" ? "text-success" : "text-danger"}`}>{t.side}</td>
                    <td className="px-3 py-2">{t.outcome}</td>
                    <td className="px-3 py-2 text-right">{Math.round(t.price * 100)}¢</td>
                    <td className="px-3 py-2 text-right">{t.quantity}</td>
                    <td className="px-3 py-2 text-right">{fmtAFR(t.totalValue, 2)}</td>
                    <td className="px-3 py-2 text-right text-muted">{fmtDateTime(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
