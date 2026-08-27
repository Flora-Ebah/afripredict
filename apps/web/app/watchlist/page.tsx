"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api";
import { useAuthStore } from "../../lib/auth-store";
import { useUiStore } from "../../lib/ui-store";
import { fmtAFR, timeLeft } from "../../lib/format";

export default function WatchlistPage() {
  const user = useAuthStore((s) => s.user);
  const openAuth = useUiStore((s) => s.openAuth);
  const { data, isLoading } = useQuery({
    queryKey: ["watchlist"],
    queryFn: () => apiGet("/watchlist"),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="card p-10 text-center space-y-3">
        <p className="text-sm text-muted font-semibold">Connectez-vous pour voir votre watchlist.</p>
        <button onClick={() => openAuth("login")} className="btn-primary text-xs">Connexion</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Watchlist</h1>
      <div className="card">
        {isLoading ? (
          <div className="h-32 animate-pulse bg-gray-50" />
        ) : (data ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">
            Aucun marché suivi. <Link href="/markets" className="text-secondary font-semibold">Explorer les marchés</Link>
          </div>
        ) : (
          (data ?? []).map((w: any) => (
            <Link
              key={w.marketId}
              href={`/market/${w.slug}`}
              className="flex items-center justify-between px-4 py-3 border-b border-borderc last:border-0 hover:bg-gray-50"
            >
              <div className="text-sm font-semibold line-clamp-1 flex-1">{w.question}</div>
              <div className="flex items-center gap-4 text-xs shrink-0 ml-4">
                <span className="font-bold text-success">{Math.round(w.yesPrice * 100)}%</span>
                <span className="text-muted">Vol {fmtAFR(w.volume)}</span>
                <span className="text-muted">⏱ {timeLeft(w.closeAt)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
