// ---------------------------------------------------------------------------
// AFRIPREDICT — shared types & constants (POC, virtual credits only)
// ---------------------------------------------------------------------------

export const VIRTUAL_CURRENCY = "AFR";
export const INITIAL_BONUS = 10_000;
export const MIN_PRICE = 0.01;
export const MAX_PRICE = 0.99;
export const PRICE_TICK = 0.01;

export const CATEGORIES = [
  "SPORT",
  "POLITICS",
  "ECONOMY",
  "BUSINESS",
  "TECH",
  "CULTURE",
  "ENTERTAINMENT",
  "WEATHER",
  "CRYPTO",
  "WORLD",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const COUNTRIES = [
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", region: "WEST_AFRICA" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", region: "WEST_AFRICA" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", region: "WEST_AFRICA" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", region: "WEST_AFRICA" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", region: "EAST_AFRICA" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", region: "SOUTHERN_AFRICA" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲", region: "CENTRAL_AFRICA" },
  { code: "MA", name: "Morocco", flag: "🇲🇦", region: "NORTH_AFRICA" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", region: "NORTH_AFRICA" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", region: "EAST_AFRICA" },
  { code: "UG", name: "Uganda", flag: "🇺🇬", region: "EAST_AFRICA" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", region: "EAST_AFRICA" },
  { code: "BJ", name: "Benin", flag: "🇧🇯", region: "WEST_AFRICA" },
  { code: "TG", name: "Togo", flag: "🇹🇬", region: "WEST_AFRICA" },
  { code: "GN", name: "Guinea", flag: "🇬🇳", region: "WEST_AFRICA" },
  { code: "AF", name: "Africa (pan-African)", flag: "🌍", region: "PAN_AFRICA" },
] as const;
export type CountryCode = (typeof COUNTRIES)[number]["code"];

export const REGIONS = [
  "WEST_AFRICA",
  "EAST_AFRICA",
  "CENTRAL_AFRICA",
  "NORTH_AFRICA",
  "SOUTHERN_AFRICA",
  "PAN_AFRICA",
] as const;
export type Region = (typeof REGIONS)[number];

// --- WebSocket events -------------------------------------------------------
export const WS_EVENTS = {
  ORDERBOOK_UPDATED: "orderbook.updated",
  TRADE_CREATED: "trade.created",
  MARKET_PRICE_UPDATED: "market.price.updated",
  MARKET_VOLUME_UPDATED: "market.volume.updated",
  MARKET_RESOLVED: "market.resolved",
  NOTIFICATION_CREATED: "notification.created",
} as const;

// --- API envelope -----------------------------------------------------------
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { timestamp: string; [k: string]: unknown };
}
export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// --- Orderbook shape --------------------------------------------------------
export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}
export interface OrderBookSnapshot {
  marketId: string;
  outcome: "YES" | "NO";
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number | null;
}
