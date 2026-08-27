"use client";

import { usePathname } from "next/navigation";

/** Hero de la charte (chart/hero.png) — affiché avant le header, uniquement sur l'accueil. */
export function HomeHero() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <section className="px-4 pt-3">
      <div className="max-w-6xl mx-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero.png"
          alt="Trade Your Beliefs. Shape Africa. — Prenez sur l'avenir, investissez dans ce qui compte."
          className="w-full h-auto rounded-lg"
        />
      </div>
    </section>
  );
}
