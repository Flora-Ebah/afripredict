"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../lib/api";
import { useAuthStore } from "../../../lib/auth-store";
import { fmtAFR, fmtDate } from "../../../lib/format";

export default function AdminUsersPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const isAdmin = user && ["ADMIN", "SUPER_ADMIN"].includes(user.role);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => apiGet(`/admin/users?search=${encodeURIComponent(search)}`),
    enabled: !!isAdmin,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiPost(`/admin/users/${id}/action`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  if (!isAdmin) {
    return <div className="card p-10 text-center text-sm text-muted">Accès réservé aux administrateurs.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <Link href="/admin" className="btn-outline text-xs">← Admin</Link>
      </div>

      <input
        className="input max-w-sm"
        placeholder="Rechercher par email ou username…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="h-32 animate-pulse bg-gray-50" />
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase text-muted border-b border-borderc">
                <th className="px-3 py-2">Utilisateur</th>
                <th className="px-3 py-2">Rôle</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2 text-right">Solde</th>
                <th className="px-3 py-2 text-right">Ordres</th>
                <th className="px-3 py-2 text-right">Inscrit</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((u: any) => (
                <tr key={u.id} className="border-b border-borderc last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <b>@{u.username}</b>
                    <div className="text-muted">{u.email}</div>
                  </td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">
                    <span className={`badge ${u.status === "ACTIVE" ? "bg-green-100 text-success" : "bg-red-100 text-danger"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{fmtAFR(u.balance)}</td>
                  <td className="px-3 py-2 text-right">{u.orders}</td>
                  <td className="px-3 py-2 text-right text-muted">{fmtDate(u.createdAt)}</td>
                  <td className="px-3 py-2 text-right space-x-2 whitespace-nowrap">
                    {u.status === "ACTIVE" ? (
                      <button className="text-danger hover:underline"
                        onClick={() => actionMutation.mutate({ id: u.id, action: "SUSPEND" })}>
                        Suspendre
                      </button>
                    ) : (
                      <button className="text-success hover:underline"
                        onClick={() => actionMutation.mutate({ id: u.id, action: "UNSUSPEND" })}>
                        Réactiver
                      </button>
                    )}
                    <button className="text-secondary hover:underline"
                      onClick={() => actionMutation.mutate({ id: u.id, action: "RESET_BALANCE" })}>
                      Reset solde
                    </button>
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
