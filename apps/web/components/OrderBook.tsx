"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";

export function OrderBook({ marketId, outcome }: { marketId: string; outcome: "YES" | "NO" }) {
  const { data, isLoading } = useQuery({
    queryKey: ["orderbook", marketId, outcome],
    queryFn: () => apiGet(`/markets/${marketId}/orderbook?outcome=${outcome}`),
    refetchInterval: 5_000,
  });

  if (isLoading) return <div className="card h-64 animate-pulse" />;

  const asks = [...(data?.asks ?? [])].reverse();
  const bids = data?.bids ?? [];
  const maxSize = Math.max(1, ...asks.map((l: any) => l.size), ...bids.map((l: any) => l.size));

  const Row = ({ level, side }: { level: any; side: "bid" | "ask" }) => (
    <div className="relative flex items-center text-[11px] px-2 py-0.5">
      <div
        className="absolute inset-y-0 right-0 rounded-l-sm"
        style={{
          width: `${(level.size / maxSize) * 100}%`,
          background: side === "ask" ? "rgba(220,38,38,0.10)" : "rgba(22,163,74,0.12)",
        }}
      />
      <span className={`relative w-14 font-semibold ${side === "ask" ? "text-danger" : "text-success"}`}>
        {Math.round(level.price * 100)}¢
      </span>
      <span className="relative flex-1 text-right">{level.size}</span>
      <span className="relative flex-1 text-right text-muted">{level.total.toFixed(0)}</span>
    </div>
  );

  return (
    <div className="card">
      <div className="px-3 py-2 border-b border-borderc flex items-center justify-between">
        <h3 className="text-sm font-bold">Carnet — {outcome === "YES" ? "Oui" : "Non"}</h3>
        {data?.spread !== null && data?.spread !== undefined && (
          <span className="badge bg-[color:var(--gris-100)] text-muted">Spread {Math.round(data.spread * 100)}¢</span>
        )}
      </div>
      <div className="flex text-[10px] uppercase text-muted px-2 py-1">
        <span className="w-14">Prix</span>
        <span className="flex-1 text-right">Taille</span>
        <span className="flex-1 text-right">Total AFR</span>
      </div>
      <div className="max-h-40 overflow-auto">
        {asks.length === 0 && <div className="text-[11px] text-muted px-2 py-1">Aucun vendeur</div>}
        {asks.map((l: any, i: number) => <Row key={`a${i}`} level={l} side="ask" />)}
      </div>
      <div className="border-y border-borderc px-2 py-1 text-[11px] font-bold text-center bg-[color:var(--gris-100)] text-muted">
        {data?.spread !== null ? "—" : ""}
      </div>
      <div className="max-h-40 overflow-auto">
        {bids.length === 0 && <div className="text-[11px] text-muted px-2 py-1">Aucun acheteur</div>}
        {bids.map((l: any, i: number) => <Row key={`b${i}`} level={l} side="bid" />)}
      </div>
    </div>
  );
}
