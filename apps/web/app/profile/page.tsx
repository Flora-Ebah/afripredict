"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api";
import { useAuthStore } from "../../lib/auth-store";
import { useUiStore } from "../../lib/ui-store";
import { COUNTRY_FLAGS, fmtAFR, fmtDate } from "../../lib/format";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const openAuth = useUiStore((s) => s.openAuth);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => apiGet("/auth/me"), enabled: !!user });
  const { data: summary } = useQuery({ queryKey: ["portfolio"], queryFn: () => apiGet("/portfolio"), enabled: !!user });
  const { data: positions } = useQuery({ queryKey: ["positions"], queryFn: () => apiGet("/portfolio/positions"), enabled: !!user });
  const { data: trades } = useQuery({ queryKey: ["mytrades"], queryFn: () => apiGet("/portfolio/trades?limit=200"), enabled: !!user });

  if (!user) {
    return (
      <div className="card p-10 text-center space-y-3">
        <p className="text-sm text-muted font-semibold">Connectez-vous pour voir votre profil.</p>
        <button onClick={() => openAuth("login")} className="btn-primary text-xs">Connexion</button>
      </div>
    );
  }

  const settled = (positions ?? []).filter((p: any) => p.settled);
  const wins = settled.filter((p: any) => p.realizedPnl > 0).length;
  const totalPnl = (summary?.unrealizedPnl ?? 0) + (summary?.realizedPnl ?? 0);
  const marketsTraded = new Set((trades ?? []).map((t: any) => t.marketSlug)).size;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="card p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-secondary text-white flex items-center justify-center text-2xl font-bold">
          {user.displayName?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <h1 className="text-xl font-bold">
            {me?.displayName ?? user.displayName}{" "}
            {me?.country && <span>{COUNTRY_FLAGS[me.country] ?? ""}</span>}
          </h1>
          <p className="text-sm text-muted">@{user.username} · {user.email}</p>
          {me?.createdAt && <p className="text-xs text-muted">Membre depuis {fmtDate(me.createdAt)}</p>}
          <span className="badge bg-gray-100 text-muted mt-1">{user.role}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          ["Trades", String((trades ?? []).length)],
          ["Marchés tradés", String(marketsTraded)],
          ["Win rate", settled.length ? `${Math.round((wins / settled.length) * 100)}%` : "—"],
          ["P&L", `${totalPnl >= 0 ? "+" : ""}${fmtAFR(totalPnl, 2)}`],
        ].map(([label, value]) => (
          <div key={label} className="card px-4 py-3">
            <div className="text-[10px] uppercase text-muted">{label}</div>
            <div className="text-lg font-bold">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
