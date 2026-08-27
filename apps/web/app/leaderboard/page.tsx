"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { apiGet } from "../../lib/api";
import { COUNTRY_FLAGS } from "../../lib/format";

const PERIODS = [["daily", "Jour"], ["weekly", "Semaine"], ["monthly", "Mois"], ["all", "Tout"]] as const;

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<string>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => apiGet(`/leaderboard?period=${period}`),
  });

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-black">
        <span className="w-8 h-8 rounded bg-terra-100 text-terra-700 flex items-center justify-center">
          <Trophy size={17} strokeWidth={2.5} />
        </span>
        Classement
      </h1>
      <div className="flex gap-2">
        {PERIODS.map(([key, label]) => (
          <button
            key={key}
            className={`btn text-xs ${period === key ? "btn-primary" : "btn-outline"}`}
            onClick={() => setPeriod(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="h-48 animate-pulse bg-gray-50" />
        ) : (data?.rows ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">Pas encore de classement sur cette période.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase text-muted border-b border-borderc">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Trader</th>
                <th className="px-4 py-2 text-right">P&L</th>
                <th className="px-4 py-2 text-right">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((r: any) => (
                <tr key={r.rank} className="border-b border-borderc last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-bold">{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</td>
                  <td className="px-4 py-2.5">
                    <b>@{r.username}</b>{" "}
                    {r.country && <span>{COUNTRY_FLAGS[r.country] ?? ""}</span>}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-bold ${r.pnl >= 0 ? "text-success" : "text-danger"}`}>
                    {r.pnl >= 0 ? "+" : ""}{r.pnl.toLocaleString("fr-FR")} AFR
                  </td>
                  <td className="px-4 py-2.5 text-right">{r.winRate !== null ? `${r.winRate}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
