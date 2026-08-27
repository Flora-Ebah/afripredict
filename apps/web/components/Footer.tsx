"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

/* Icônes de marques (SVG officiels simplifiés — lucide ne fournit pas les logos de marques) */
const brandIcons: Record<string, string> = {
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  discord:
    "M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z",
  telegram:
    "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
  youtube:
    "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
};

function SocialIcon({ name, href }: { name: keyof typeof brandIcons; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={String(name)}
      className="w-8 h-8 rounded-md bg-white/5 hover:bg-white/15 flex items-center justify-center transition-colors"
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" className="text-gray-300">
        <path d={brandIcons[name]} />
      </svg>
    </a>
  );
}

const COLUMNS: [string, [string, string][]][] = [
  ["Produits", [["Marchés", "/markets"], ["Portfolio", "/portfolio"], ["Offres", "#"], ["Catégories", "/markets"]]],
  ["Ressources", [["Documentation", "#"], ["Centre d'aide", "#"], ["Blog", "#"], ["Statistiques", "/leaderboard"]]],
  ["Entreprise", [["À propos", "#"], ["Carrières", "#"], ["Contact", "#"], ["Sécurité", "#"]]],
  ["Légal", [["Conditions", "#"], ["Confidentialité", "#"], ["Cookies", "#"], ["Réglementation", "#"]]],
];

export function Footer() {
  return (
    <footer className="mt-12 px-4 pb-6">
      <div className="max-w-6xl mx-auto text-white rounded-lg overflow-hidden" style={{ background: "var(--footer-bg)" }}>
        <div className="px-6 md:px-10 py-8 grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand : vrai logo (logo2), aucun texte HTML */}
          <div className="col-span-2 space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-dark.png"
              alt="AfriPredict — Trade Your Beliefs. Shape Africa."
              className="h-14 w-auto object-contain -ml-1"
            />
            <div className="flex items-center gap-2">
              <SocialIcon name="x" href="#" />
              <SocialIcon name="discord" href="#" />
              <SocialIcon name="telegram" href="#" />
              <SocialIcon name="youtube" href="#" />
              <SocialIcon name="linkedin" href="#" />
            </div>
          </div>

          {COLUMNS.map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-bold text-white mb-3">{title}</h4>
              <ul className="space-y-2 text-xs font-medium text-gray-400">
                {links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="hover:text-terra-400 transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="px-6 md:px-10 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
            <p className="text-[11px] text-gray-400 font-medium">© 2025 AfriPredict. Tous droits réservés.</p>
            <p className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
              Conçu avec <Heart size={11} className="text-terra-400 fill-terra-400" /> pour l&apos;Afrique
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="" className="w-4 h-4 object-contain" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
