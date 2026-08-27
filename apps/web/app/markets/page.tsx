"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api";
import { MarketCard } from "../../components/MarketCard";
import { CATEGORY_LABELS } from "../../lib/format";

const SORTS = [
  ["trending", "Trending"],
  ["new", "Nouveaux"],
  ["ending_soon", "Fin proche"],
  ["volume", "Volume"],
] as const;

const REGIONS = [
  ["", "Toute l'Afrique"],
  ["WEST_AFRICA", "Afrique de l'Ouest"],
  ["EAST_AFRICA", "Afrique de l'Est"],
  ["CENTRAL_AFRICA", "Afrique centrale"],
  ["NORTH_AFRICA", "Afrique du Nord"],
  ["SOUTHERN_AFRICA", "Afrique australe"],
] as const;

function MarketsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [page, setPage] = useState(1);

  const category = params.get("category") ?? "";
  const country = params.get("country") ?? "";
  const region = params.get("region") ?? "";
  const search = params.get("search") ?? "";
  const sort = params.get("sort") ?? "";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    setPage(1);
    router.push(`/markets?${next.toString()}`);
  };

  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (country) query.set("country", country);
  if (region) query.set("region", region);
  if (search) query.set("search", search);
  if (sort) query.set("sort", sort);
  query.set("page", String(page));
  query.set("pageSize", "16");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["markets", query.toString()],
    queryFn: () => apiGet(`/markets?${query.toString()}`),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Marchés</h1>

      {/* filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <button className={`btn text-xs ${!sort ? "btn-primary" : "btn-outline"}`} onClick={() => setParam("sort", "")}>
          Tous
        </button>
        {SORTS.map(([key, label]) => (
          <button
            key={key}
            className={`btn text-xs ${sort === key ? "btn-primary" : "btn-outline"}`}
            onClick={() => setParam("sort", key)}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 text-borderc">|</span>
        <select className="input w-auto h-8 text-xs" value={category} onChange={(e) => setParam("category", e.target.value)}>
          <option value="">Toutes catégories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select className="input w-auto h-8 text-xs" value={region} onChange={(e) => setParam("region", e.target.value)}>
          {REGIONS.map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {(search || country) && (
          <span className="text-xs text-muted">
            {search && <>Recherche : « {search} » </>}
            {country && <>Pays : {country} </>}
            <button className="text-secondary underline" onClick={() => router.push("/markets")}>
              réinitialiser
            </button>
          </span>
        )}
      </div>

      {/* list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card h-40 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : isError ? (
        <div className="card p-8 text-center text-sm text-danger">
          Impossible de charger les marchés. L&apos;API est-elle démarrée ?
        </div>
      ) : (data?.items ?? []).length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">Aucun marché ne correspond à ces filtres.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {data.items.map((m: any) => <MarketCard key={m.id} market={m} />)}
          </div>
          {data.total > data.pageSize && (
            <div className="flex justify-center gap-2 pt-2">
              <button className="btn-outline text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Précédent
              </button>
              <span className="text-xs text-muted self-center">
                Page {page} / {Math.ceil(data.total / data.pageSize)}
              </span>
              <button
                className="btn-outline text-xs"
                disabled={page >= Math.ceil(data.total / data.pageSize)}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function MarketsPage() {
  return (
    <Suspense fallback={<div className="card h-40 animate-pulse bg-gray-100" />}>
      <MarketsContent />
    </Suspense>
  );
}
