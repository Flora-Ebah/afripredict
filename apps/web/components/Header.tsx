"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgePercent, Bell, Briefcase, ChevronDown, LayoutDashboard,
  LayoutGrid, ListOrdered, LogOut, MoreHorizontal, Search, Star,
  TrendingUpDown, User, UserRound, Wallet,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthStore } from "../lib/auth-store";
import { apiGet, apiPost } from "../lib/api";
import { useUiStore } from "../lib/ui-store";
import { useUserSocket } from "../lib/ws";
import { CATEGORY_LABELS, fmtAFR } from "../lib/format";

function NavItem({
  href, icon: Icon, label, active, onClick, chevron,
}: {
  href?: string; icon: any; label: string; active?: boolean; onClick?: () => void; chevron?: boolean;
}) {
  const cls = `relative flex items-center gap-1.5 h-14 px-2.5 text-[13px] font-semibold transition-colors ${
    active ? "text-terra-600" : "text-[color:var(--gris-700)] hover:text-terra-600"
  }`;
  const underline = active && (
    <span className="absolute left-2 right-2 bottom-0 h-[2.5px] rounded-full bg-terra-600" />
  );
  const content = (
    <>
      <Icon size={15} strokeWidth={2.25} />
      {label}
      {chevron && <ChevronDown size={13} className="opacity-60" />}
      {underline}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>{content}</Link>
  ) : (
    <button onClick={onClick} className={cls}>{content}</button>
  );
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const { user, refreshToken, clear } = useAuthStore();
  const openAuth = useUiStore((s) => s.openAuth);
  const openSearch = useUiStore((s) => s.openSearch);

  const [openMenu, setOpenMenu] = useState<"cats" | "plus" | "notifs" | "account" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet("/auth/me"),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const { data: notifs } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet("/notifications"),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  useUserSocket(user?.id, () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["me"] });
  });

  const logout = async () => {
    try {
      if (refreshToken) await apiPost("/auth/logout", { refreshToken });
    } catch {}
    clear();
    qc.clear();
    setOpenMenu(null);
    router.push("/");
  };

  const unread = notifs?.unreadCount ?? 0;
  const marketsActive = pathname.startsWith("/market");
  const dropdownCls =
    "absolute top-full mt-1 bg-[color:var(--surface)] rounded-md shadow-lg ring-1 ring-[color:var(--gris-200)] py-1 z-50";

  return (
    <header className="sticky top-0 z-40 px-4 pt-3 pb-1">
      <div
        ref={rootRef}
        className="max-w-6xl mx-auto bg-[color:var(--surface)] rounded-lg ring-1 ring-[color:var(--gris-200)] h-14 flex items-center gap-2 px-4"
      >
        {/* Logo : version claire / sombre selon le thème */}
        <Link href="/" className="shrink-0 flex items-center mr-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="AfriPredict" className="logo-light h-8 w-auto object-contain" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.png" alt="AfriPredict" className="logo-dark h-9 w-auto object-contain rounded" />
        </Link>

        {/* Nav (charte) */}
        <nav className="hidden md:flex items-center">
          <NavItem href="/markets" icon={TrendingUpDown} label="Marchés" active={marketsActive} />

          <div className="relative">
            <NavItem
              icon={LayoutGrid}
              label="Catégories"
              chevron
              active={openMenu === "cats"}
              onClick={() => setOpenMenu(openMenu === "cats" ? null : "cats")}
            />
            {openMenu === "cats" && (
              <div className={`${dropdownCls} left-0 w-48 grid grid-cols-2`}>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <Link
                    key={key}
                    href={`/markets?category=${key}`}
                    className="px-3 py-1.5 text-xs font-medium text-[color:var(--gris-700)] hover:bg-[color:var(--gris-100)] hover:text-terra-600"
                    onClick={() => setOpenMenu(null)}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <NavItem href="/portfolio" icon={Briefcase} label="Portfolio" active={pathname === "/portfolio"} />
          <NavItem href="#" icon={BadgePercent} label="Offres" />

          <div className="relative">
            <NavItem
              icon={MoreHorizontal}
              label="Plus"
              active={openMenu === "plus"}
              onClick={() => setOpenMenu(openMenu === "plus" ? null : "plus")}
            />
            {openMenu === "plus" && (
              <div className={`${dropdownCls} left-0 w-44`}>
                {[
                  ["/leaderboard", "Classement"],
                  ["/watchlist", "Watchlist"],
                  ["/orders", "Mes ordres"],
                  ["/profile", "Profil"],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="block px-3 py-1.5 text-xs font-medium text-[color:var(--gris-700)] hover:bg-[color:var(--gris-100)] hover:text-terra-600"
                    onClick={() => setOpenMenu(null)}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Recherche : ouvre le modal de recherche dynamique */}
          <button
            className="h-9 w-9 rounded-full bg-[color:var(--gris-100)] hover:bg-[color:var(--gris-200)] text-[color:var(--gris-700)] flex items-center justify-center transition-colors"
            aria-label="Rechercher"
            onClick={openSearch}
          >
            <Search size={16} />
          </button>

          {/* Thème clair / système / sombre */}
          <ThemeToggle />

          {user ? (
            <>
              {/* Solde */}
              <Link
                href="/portfolio"
                className="hidden sm:flex items-center gap-1.5 rounded bg-terra-50 text-terra-700 px-3 h-9 text-xs font-bold hover:bg-terra-100 transition-colors"
              >
                <Wallet size={15} />
                {me?.wallet ? fmtAFR(me.wallet.balance) : "…"}
              </Link>

              {/* Notifications */}
              <div className="relative">
                <button
                  className="btn-ghost h-9 w-9 p-0 relative"
                  onClick={() => {
                    const next = openMenu === "notifs" ? null : "notifs";
                    setOpenMenu(next);
                    if (next && unread > 0) {
                      apiPost("/notifications/read").then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
                    }
                  }}
                  aria-label="Notifications"
                >
                  <Bell size={17} />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-terra-600 text-white text-[10px] font-bold rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </button>
                {openMenu === "notifs" && (
                  <div className={`${dropdownCls} right-0 w-80 max-h-96 overflow-auto`}>
                    <div className="p-3 border-b border-[color:var(--gris-200)] text-xs font-bold uppercase tracking-wide text-muted">
                      Notifications
                    </div>
                    {(notifs?.items ?? []).length === 0 && (
                      <div className="p-4 text-xs text-muted font-medium">Aucune notification.</div>
                    )}
                    {(notifs?.items ?? []).map((n: any) => (
                      <div key={n.id} className="p-3 border-b border-[color:var(--gris-100)] last:border-0 text-xs">
                        <div className="font-semibold">{n.title}</div>
                        <div className="text-muted font-medium mt-0.5">{n.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compte */}
              <div className="relative">
                <button
                  className="btn-ghost h-9 pl-1.5 pr-2 gap-1.5"
                  onClick={() => setOpenMenu(openMenu === "account" ? null : "account")}
                >
                  <span className="w-6 h-6 rounded-full bg-terra-600 text-white text-[11px] font-bold flex items-center justify-center">
                    {user.displayName?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {openMenu === "account" && (
                  <div className={`${dropdownCls} right-0 w-52`}>
                    <div className="px-3 py-2 border-b border-[color:var(--gris-200)]">
                      <div className="text-sm font-bold">@{user.username}</div>
                      <div className="text-[11px] text-muted font-medium">{user.email}</div>
                    </div>
                    {[
                      ["/portfolio", Wallet, "Portefeuille"],
                      ["/orders", ListOrdered, "Mes ordres"],
                      ["/watchlist", Star, "Watchlist"],
                      ["/profile", User, "Profil"],
                    ].map(([href, Icon, label]: any) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[color:var(--gris-700)] hover:bg-[color:var(--gris-100)]"
                        onClick={() => setOpenMenu(null)}
                      >
                        <Icon size={15} className="text-muted" /> {label}
                      </Link>
                    ))}
                    {["ADMIN", "SUPER_ADMIN"].includes(user.role) && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-terra-700 hover:bg-terra-50"
                        onClick={() => setOpenMenu(null)}
                      >
                        <LayoutDashboard size={15} /> Admin
                      </Link>
                    )}
                    <button
                      onClick={logout}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-danger hover:bg-red-50"
                    >
                      <LogOut size={15} /> Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Bouton Connecter (charte) */
            <button onClick={() => openAuth("login")} className="btn-primary h-9 px-4 text-[13px] font-medium">
              <UserRound size={15} /> Connecter
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
