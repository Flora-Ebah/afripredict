"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet } from "../../lib/api";
import { useAuthStore } from "../../lib/auth-store";
import { useUiStore } from "../../lib/ui-store";
import { fmtDateTime } from "../../lib/format";

export default function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const openAuth = useUiStore((s) => s.openAuth);
  const qc = useQueryClient();
  const [tab, setTab] = useState<"open" | "all">("open");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", tab],
    queryFn: () => apiGet(`/orders${tab === "open" ? "?status=open" : ""}`),
    enabled: !!user,
    refetchInterval: 10_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/orders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  if (!user) {
    return (
      <div className="card p-10 text-center space-y-3">
        <p className="text-sm text-muted font-semibold">Connectez-vous pour voir vos ordres.</p>
        <button onClick={() => openAuth("login")} className="btn-primary text-xs">Connexion</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mes ordres</h1>

      <div className="flex gap-1 border-b border-borderc">
        {([["open", "Ordres ouverts"], ["all", "Historique"]] as const).map(([key, label]) => (
          <button
            key={key}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === key ? "border-secondary text-secondary" : "border-transparent text-muted"}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="h-32 animate-pulse bg-gray-50" />
        ) : (orders ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">
            Aucun ordre {tab === "open" ? "ouvert" : ""}.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase text-muted border-b border-borderc">
                <th className="px-3 py-2">Marché</th>
                <th className="px-3 py-2">Sens</th>
                <th className="px-3 py-2">Issue</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Prix</th>
                <th className="px-3 py-2 text-right">Restant / Qté</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2 text-right">Date</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((o: any) => (
                <tr key={o.id} className="border-b border-borderc last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 max-w-[240px]">
                    <Link href={`/market/${o.marketSlug}`} className="hover:text-secondary line-clamp-1">{o.marketQuestion}</Link>
                  </td>
                  <td className={`px-3 py-2 font-bold ${o.side === "BUY" ? "text-success" : "text-danger"}`}>{o.side}</td>
                  <td className="px-3 py-2">{o.outcome}</td>
                  <td className="px-3 py-2">{o.orderType}</td>
                  <td className="px-3 py-2 text-right">{Math.round(o.price * 100)}¢</td>
                  <td className="px-3 py-2 text-right">{o.remainingQuantity} / {o.quantity}</td>
                  <td className="px-3 py-2">
                    <span className={`badge ${
                      o.status === "FILLED" ? "bg-green-100 text-success"
                      : o.status === "CANCELLED" ? "bg-gray-200 text-muted"
                      : o.status === "PARTIALLY_FILLED" ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-secondary"
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-muted">{fmtDateTime(o.createdAt)}</td>
                  <td className="px-3 py-2 text-right">
                    {["OPEN", "PARTIALLY_FILLED"].includes(o.status) && (
                      <button
                        className="text-danger font-semibold hover:underline"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(o.id)}
                      >
                        Annuler
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
