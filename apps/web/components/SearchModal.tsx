"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Compass, FileText, Search, TrendingUp } from "lucide-react";
import { apiGet } from "../lib/api";
import { useUiStore } from "../lib/ui-store";
import { CATEGORY_LABELS } from "../lib/format";

/* Pages réelles du site, filtrées dynamiquement selon la frappe */
const SITE_PAGES: { label: string; href: string; keywords: string }[] = [
  { label: "Tous les marchés", href: "/markets", keywords: "marchés markets liste parier trader" },
  { label: "Marchés tendance", href: "/markets?sort=trending", keywords: "tendance trending populaire hot" },
  { label: "Fin proche", href: "/markets?sort=ending_soon", keywords: "fin proche bientôt clôture ending" },
  { label: "Classement", href: "/leaderboard", keywords: "classement leaderboard top traders gagnants" },
  { label: "Portefeuille", href: "/portfolio", keywords: "portefeuille portfolio solde positions p&l" },
  { label: "Mes ordres", href: "/orders", keywords: "ordres orders achats ventes historique" },
  { label: "Watchlist", href: "/watchlist", keywords: "watchlist favoris suivis étoile" },
  { label: "Profil", href: "/profile", keywords: "profil compte stats win rate" },
];

export function SearchModal() {
  const router = useRouter();
  const { searchOpen, closeSearch } = useUiStore();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // debounce de la frappe → requêtes API légères
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (searchOpen) {
      setQuery("");
      setDebounced("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSearch();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSearch]);

  // résultats marchés : live depuis l'API selon la frappe ; tendances si champ vide
  const { data: results, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () =>
      apiGet(
        debounced
          ? `/markets?search=${encodeURIComponent(debounced)}&pageSize=6`
          : "/markets?sort=trending&pageSize=5",
      ),
    enabled: searchOpen,
    staleTime: 10_000,
  });

  if (!searchOpen) return null;

  const markets = results?.items ?? [];
  const q = debounced.toLowerCase();
  const pages = q
    ? SITE_PAGES.filter((p) => (p.label + " " + p.keywords).toLowerCase().includes(q)).slice(0, 4)
    : [];

  const go = (href: string) => {
    closeSearch();
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
      onClick={closeSearch}
    >
      <div
        className="bg-[color:var(--surface)] rounded-lg w-full max-w-xl overflow-hidden ring-1 ring-[color:var(--gris-200)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) go(`/markets?search=${encodeURIComponent(query.trim())}`);
          }}
          className="flex items-center gap-2.5 px-4 border-b border-[color:var(--gris-200)]"
        >
          <Search size={17} className="text-[color:var(--gris-400)] shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 h-12 bg-transparent outline-none text-sm font-medium text-[color:var(--gris-900)] placeholder:text-[color:var(--gris-400)]"
            placeholder="Rechercher un marché, une page… (CAN, cacao, portfolio…)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isFetching && <span className="text-[10px] text-muted font-semibold shrink-0">recherche…</span>}
        </form>

        <div className="max-h-[55vh] overflow-auto py-2">
          {/* Marchés (dynamique : API) */}
          <div className="px-4 pt-1 pb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[color:var(--gris-400)]">
            {debounced ? <Search size={11} /> : <TrendingUp size={11} />}
            {debounced ? "Marchés" : "Marchés tendance"}
          </div>
          {markets.length === 0 && !isFetching && (
            <div className="px-4 py-3 text-xs text-muted font-medium">
              Aucun marché trouvé pour « {debounced} ».
            </div>
          )}
          {markets.map((m: any) => (
            <button
              key={m.id}
              onClick={() => go(`/market/${m.slug}`)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[color:var(--gris-100)] text-left"
            >
              <span className="badge bg-terra-600 text-white shrink-0">
                {CATEGORY_LABELS[m.category] ?? m.category}
              </span>
              <span className="flex-1 min-w-0 text-[13px] font-semibold truncate text-[color:var(--gris-900)]">
                {m.question}
              </span>
              <span className="text-xs font-bold text-success shrink-0">{Math.round(m.yesPrice * 100)}%</span>
            </button>
          ))}

          {/* Pages du site correspondant à la frappe */}
          {pages.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[color:var(--gris-400)]">
                <FileText size={11} /> Pages
              </div>
              {pages.map((p) => (
                <button
                  key={p.href}
                  onClick={() => go(p.href)}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[color:var(--gris-100)] text-left"
                >
                  <Compass size={14} className="text-[color:var(--gris-400)] shrink-0" />
                  <span className="flex-1 text-[13px] font-semibold text-[color:var(--gris-900)]">{p.label}</span>
                  <ArrowRight size={13} className="text-[color:var(--gris-400)]" />
                </button>
              ))}
            </>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[color:var(--gris-200)] text-[10px] text-[color:var(--gris-400)] font-medium flex justify-between">
          <span>Entrée → tous les résultats</span>
          <span>Échap → fermer</span>
        </div>
      </div>
    </div>
  );
}
