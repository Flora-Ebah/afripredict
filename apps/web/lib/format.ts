export const fmtAFR = (v: number, digits = 0) =>
  `${v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 2) })} AFR`;

export const fmtCents = (price: number) => `${Math.round(price * 100)}¢`;

/** Format compact : 1,8K · 2,4M (pour les volumes sur les cards). */
export const fmtCompact = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1).replace(".", ",")}M`
  : v >= 1_000 ? `${(v / 1_000).toFixed(1).replace(".", ",")}K`
  : v.toFixed(0);

export const fmtPct = (price: number) => `${Math.round(price * 100)}%`;

export function timeLeft(date: string | Date): string {
  const ms = new Date(date).getTime() - Date.now();
  if (ms <= 0) return "terminé";
  const days = Math.floor(ms / (24 * 3600_000));
  if (days > 30) return `${Math.floor(days / 30)} mois`;
  if (days > 0) return `${days}j`;
  const hours = Math.floor(ms / 3600_000);
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(ms / 60_000)}min`;
}

export function fmtDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("fr-FR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export const COUNTRY_FLAGS: Record<string, string> = {
  CI: "🇨🇮", SN: "🇸🇳", NG: "🇳🇬", GH: "🇬🇭", KE: "🇰🇪", ZA: "🇿🇦", CM: "🇨🇲",
  MA: "🇲🇦", EG: "🇪🇬", TZ: "🇹🇿", UG: "🇺🇬", RW: "🇷🇼", BJ: "🇧🇯", TG: "🇹🇬",
  GN: "🇬🇳", AF: "🌍",
};

export const CATEGORY_LABELS: Record<string, string> = {
  SPORT: "Sport", POLITICS: "Politique", ECONOMY: "Économie", BUSINESS: "Business",
  TECH: "Tech", CULTURE: "Culture", ENTERTAINMENT: "Divertissement",
  WEATHER: "Météo", CRYPTO: "Crypto", WORLD: "Monde",
};
