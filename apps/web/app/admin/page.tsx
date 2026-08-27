"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../lib/api";
import { useAuthStore } from "../../lib/auth-store";
import { fmtAFR, fmtDate } from "../../lib/format";

function ResolveModal({ market, onClose }: { market: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [notes, setNotes] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiPost(`/admin/markets/${market.id}/resolve`, { outcome, notes, evidenceUrl: evidenceUrl || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-markets"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      onClose();
    },
    onError: (err: any) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold">Résoudre le marché</h3>
        <p className="text-sm text-muted">{market.question}</p>

        <div className="grid grid-cols-2 gap-2">
          <button
            className={`btn py-2 ${outcome === "YES" ? "bg-success text-white" : "btn-outline"}`}
            onClick={() => setOutcome("YES")}
          >
            YES
          </button>
          <button
            className={`btn py-2 ${outcome === "NO" ? "bg-danger text-white" : "btn-outline"}`}
            onClick={() => setOutcome("NO")}
          >
            NO
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted">Preuve (URL de la source)</label>
          <input className="input mt-1" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted">Notes de résolution</label>
          <textarea className="input mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
          Je confirme que cette résolution est définitive : les positions seront réglées et les gains crédités.
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button className="btn-outline text-xs" onClick={onClose}>Annuler</button>
          <button
            className="btn-primary text-xs"
            disabled={!confirm || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Settlement en cours…" : `Résoudre ${outcome}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [resolving, setResolving] = useState<any>(null);

  const isAdmin = user && ["ADMIN", "SUPER_ADMIN"].includes(user.role);

  const { data: dash } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => apiGet("/admin/dashboard"),
    enabled: !!isAdmin,
  });
  const { data: markets } = useQuery({
    queryKey: ["admin-markets"],
    queryFn: () => apiGet("/admin/markets"),
    enabled: !!isAdmin,
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/admin/markets/${id}/close`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-markets"] }),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/admin/markets/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-markets"] }),
  });

  if (!isAdmin) {
    return (
      <div className="card p-10 text-center text-sm text-muted">
        Accès réservé aux administrateurs. Connectez-vous avec <code>admin@demo.africa</code>.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="flex gap-2">
          <Link href="/admin/users" className="btn-outline text-xs">Utilisateurs</Link>
          <Link href="/admin/new-market" className="btn-primary text-xs">+ Créer un marché</Link>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          ["Utilisateurs", dash?.totalUsers],
          ["Marchés ouverts", `${dash?.openMarkets ?? "…"} / ${dash?.totalMarkets ?? "…"}`],
          ["Trades", dash?.totalTrades],
          ["Volume total", dash ? fmtAFR(dash.totalVolume) : "…"],
        ].map(([label, value]) => (
          <div key={label as string} className="card px-4 py-3">
            <div className="text-[10px] uppercase text-muted">{label}</div>
            <div className="text-lg font-bold">{value ?? "…"}</div>
          </div>
        ))}
      </div>

      {/* markets table */}
      <div className="card overflow-x-auto">
        <div className="px-4 py-2.5 border-b border-borderc text-sm font-bold">Gestion des marchés</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase text-muted border-b border-borderc">
              <th className="px-3 py-2">Question</th>
              <th className="px-3 py-2">Catégorie</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2 text-right">YES</th>
              <th className="px-3 py-2 text-right">Volume</th>
              <th className="px-3 py-2 text-right">Clôture</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(markets?.items ?? []).map((m: any) => (
              <tr key={m.id} className="border-b border-borderc last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2 max-w-[300px]">
                  <Link href={`/market/${m.slug}`} className="hover:text-secondary line-clamp-1 font-semibold">
                    {m.question}
                  </Link>
                </td>
                <td className="px-3 py-2">{m.category}</td>
                <td className="px-3 py-2">
                  <span className={`badge ${
                    m.status === "OPEN" ? "bg-green-100 text-success"
                    : m.status === "RESOLVED" ? "bg-blue-100 text-secondary"
                    : "bg-gray-200 text-muted"
                  }`}>
                    {m.status}{m.resolvedOutcome ? ` ${m.resolvedOutcome}` : ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{Math.round(m.yesPrice * 100)}¢</td>
                <td className="px-3 py-2 text-right">{fmtAFR(m.volume)}</td>
                <td className="px-3 py-2 text-right text-muted">{fmtDate(m.closeAt)}</td>
                <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                  {m.status === "OPEN" && (
                    <button className="text-muted hover:underline" onClick={() => closeMutation.mutate(m.id)}>
                      Fermer
                    </button>
                  )}
                  {["OPEN", "CLOSED", "PENDING_RESOLUTION"].includes(m.status) && (
                    <>
                      <button className="text-secondary font-semibold hover:underline" onClick={() => setResolving(m)}>
                        Résoudre
                      </button>
                      <button
                        className="text-danger hover:underline"
                        onClick={() => {
                          if (window.confirm("Annuler ce marché et rembourser toutes les positions ?")) {
                            cancelMutation.mutate(m.id);
                          }
                        }}
                      >
                        Annuler
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resolving && <ResolveModal market={resolving} onClose={() => setResolving(null)} />}
    </div>
  );
}
