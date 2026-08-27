"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { apiGet } from "../lib/api";
import { fmtCompact } from "../lib/format";

const INTERVALS = ["1D", "1W", "1M", "ALL"] as const;

const YES_COLOR = "#16A34A";
const NO_COLOR = "#DC2626";
const VOL_COLOR = "#C4552D";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div
      className="rounded-md px-3 py-2 text-xs shadow-lg"
      style={{ background: "var(--surface)", border: "1px solid var(--gris-200)" }}
    >
      <div className="font-semibold mb-1" style={{ color: "var(--gris-900)" }}>{label}</div>
      <div className="space-y-0.5 font-medium" style={{ color: "var(--gris-700)" }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: YES_COLOR }} />
          Oui : <b>{row.yes}%</b>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: NO_COLOR }} />
          Non : <b>{row.no}%</b>
        </div>
        {row.vol > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: VOL_COLOR }} />
            Volume : <b>{fmtCompact(row.vol)} AFR</b>
          </div>
        )}
      </div>
    </div>
  );
}

export function PriceChart({ marketId }: { marketId: string }) {
  const [interval, setInterval] = useState<(typeof INTERVALS)[number]>("ALL");
  const [showNo, setShowNo] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["history", marketId, interval],
    queryFn: () => apiGet(`/markets/${marketId}/history?interval=${interval}`),
    refetchInterval: 30_000,
  });

  const points = (data ?? []).map((p: any) => ({
    t: new Date(p.t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    yes: Math.round(p.yesPrice * 100),
    no: Math.round(p.noPrice * 100),
    vol: p.volume ?? 0,
  }));

  const current = points.at(-1)?.yes ?? null;
  const first = points[0]?.yes ?? null;
  const delta = current !== null && first !== null ? current - first : null;

  return (
    <div className="card p-4">
      {/* En-tête : valeur courante + variation + périodes */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div>
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wide">Probabilité Oui</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-2xl font-bold leading-none" style={{ color: current !== null && current >= 50 ? YES_COLOR : NO_COLOR }}>
              {current !== null ? `${current}%` : "—"}
            </span>
            {delta !== null && delta !== 0 && (
              <span
                className={`badge !rounded-full ${delta > 0 ? "bg-green-100 text-success dark:bg-green-950" : "bg-red-100 text-danger dark:bg-red-950"}`}
              >
                {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {delta > 0 ? "+" : ""}{delta} pts
              </span>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Toggle courbe Non */}
          <button
            onClick={() => setShowNo(!showNo)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 h-7 text-[11px] font-semibold transition-colors ${
              showNo ? "bg-red-100 text-danger dark:bg-red-950" : "bg-[color:var(--gris-100)] text-muted hover:text-[color:var(--gris-700)]"
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: NO_COLOR, opacity: showNo ? 1 : 0.4 }} />
            Non
          </button>

          {/* Périodes en pilule */}
          <div className="flex items-center gap-0.5 rounded-full bg-[color:var(--gris-100)] p-0.5">
            {INTERVALS.map((iv) => (
              <button
                key={iv}
                className={`h-7 px-2.5 rounded-full text-[11px] font-semibold transition-colors ${
                  interval === iv
                    ? "bg-[color:var(--surface)] text-terra-600 shadow-sm"
                    : "text-muted hover:text-[color:var(--gris-700)]"
                }`}
                onClick={() => setInterval(iv)}
              >
                {iv}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-md bg-[color:var(--gris-100)]" />
      ) : points.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-muted font-medium">
          Pas encore de données de prix.
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 5, right: 5, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="yesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={YES_COLOR} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={YES_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,147,161,0.18)" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fontSize: 10, fill: "#8b93a1" }}
                minTickGap={40}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="price"
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#8b93a1" }}
                tickFormatter={(v) => `${v}%`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis yAxisId="vol" hide domain={[0, (max: number) => Math.max(max * 4, 10)]} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(139,147,161,0.35)" }} />
              <Bar yAxisId="vol" dataKey="vol" fill={VOL_COLOR} opacity={0.3} radius={[2, 2, 0, 0]} barSize={6} />
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="yes"
                stroke={YES_COLOR}
                strokeWidth={2.25}
                fill="url(#yesGrad)"
                dot={false}
                activeDot={{ r: 3.5, strokeWidth: 0 }}
              />
              {showNo && (
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="no"
                  stroke={NO_COLOR}
                  strokeWidth={1.75}
                  strokeDasharray="4 3"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Légende */}
      <div className="flex items-center gap-4 mt-2 text-[11px] font-medium text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: YES_COLOR }} /> Probabilité Oui
        </span>
        {showNo && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: NO_COLOR }} /> Probabilité Non
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: VOL_COLOR, opacity: 0.5 }} /> Volume échangé
        </span>
      </div>
    </div>
  );
}
