"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flame, Globe2, Sparkles } from "lucide-react";
import { apiGet } from "../lib/api";
import { MarketCard } from "../components/MarketCard";
import { COUNTRY_FLAGS } from "../lib/format";
import { useUiStore } from "../lib/ui-store";
import { useAuthStore } from "../lib/auth-store";
import { Coins } from "lucide-react";

const COUNTRIES: [string, string][] = [
  ["CI", "Côte d'Ivoire"], ["SN", "Sénégal"], ["NG", "Nigeria"], ["GH", "Ghana"],
  ["KE", "Kenya"], ["ZA", "South Africa"], ["CM", "Cameroun"], ["MA", "Maroc"],
  ["EG", "Égypte"], ["TZ", "Tanzanie"], ["RW", "Rwanda"], ["BJ", "Bénin"],
];

function SectionTitle({ icon: Icon, children, href }: { icon: any; children: React.ReactNode; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="flex items-center gap-2 text-lg font-black">
        <span className="w-7 h-7 rounded bg-terra-100 text-terra-700 flex items-center justify-center">
          <Icon size={15} strokeWidth={2.5} />
        </span>
        {children}
      </h2>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-xs text-terra-700 font-extrabold hover:underline">
          Tout voir <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const openAuth = useUiStore((s) => s.openAuth);
  const user = useAuthStore((s) => s.user);

  const { data: trending, isLoading } = useQuery({
    queryKey: ["markets", "trending-home"],
    queryFn: () => apiGet("/markets?sort=trending&pageSize=8"),
  });
  const { data: latest } = useQuery({
    queryKey: ["markets", "latest-home"],
    queryFn: () => apiGet("/markets?sort=new&pageSize=4"),
  });

  return (
    <div className="space-y-10">
      {/* CTA — bloc d'accueil juste après le header */}
      <section className="card rounded-lg px-6 md:px-8 py-6 flex flex-col md:flex-row md:items-center gap-5">
        <div className="w-11 h-11 rounded-lg bg-terra-100 text-terra-600 flex items-center justify-center shrink-0">
          <Coins size={22} strokeWidth={2.25} />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold">
            {user ? "Prêt à trader vos convictions ?" : "Commencez avec 10 000 AFR offerts"}
          </h2>
          <p className="text-xs text-muted font-normal mt-0.5">
            {user
              ? "Explorez les marchés du continent et prenez position sur ce qui compte — sport, économie, politique, tech, culture."
              : "Créez votre compte gratuitement, recevez 10 000 crédits virtuels et prenez position sur l'avenir du continent. 100 % simulation, zéro risque."}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {!user && (
            <button onClick={() => openAuth("register")} className="btn-primary px-4 py-2 text-[13px] font-medium">
              Recevoir 10 000 AFR <ArrowRight size={14} />
            </button>
          )}
          <Link href="/markets" className={`${user ? "btn-primary" : "btn-outline"} px-4 py-2 text-[13px] font-medium`}>
            Explorer les marchés {user && <ArrowRight size={14} />}
          </Link>
        </div>
      </section>

      {/* TRENDING */}
      <section>
        <SectionTitle icon={Flame} href="/markets?sort=trending">Marchés tendance</SectionTitle>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(trending?.items ?? []).map((m: any) => <MarketCard key={m.id} market={m} />)}
          </div>
        )}
      </section>

      {/* AFRICA BY COUNTRY */}
      <section>
        <SectionTitle icon={Globe2}>Marchés par pays</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map(([code, name]) => (
            <Link key={code} href={`/markets?country=${code}`} className="btn-outline text-xs">
              {COUNTRY_FLAGS[code]} {name}
            </Link>
          ))}
        </div>
      </section>

      {/* LATEST */}
      <section>
        <SectionTitle icon={Sparkles} href="/markets?sort=new">Derniers marchés</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(latest?.items ?? []).map((m: any) => <MarketCard key={m.id} market={m} />)}
        </div>
      </section>
    </div>
  );
}
