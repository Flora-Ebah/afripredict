/* eslint-disable no-console */
/**
 * AFRIPREDICT — Market Simulator worker (demo market activity).
 *
 * Logs in as BOT_DEMO accounts and places small orders through the public API,
 * so all activity goes through the real matching engine, ledger and websocket.
 * Never impersonates real users (spec §49).
 */

const API = process.env.API_URL ?? "http://localhost:4000";
const TICK_MS = Number(process.env.SIM_INTERVAL_MS ?? 15_000);
const BOT_PASSWORD = process.env.BOT_PASSWORD ?? "Demo1234!";
const BOT_COUNT = 96;

const tokens = new Map<string, string>();

async function api<T = any>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const body = (await res.json()) as any;
  if (!body.success) throw new Error(`${path}: ${body.error?.code} ${body.error?.message}`);
  return body.data as T;
}

async function botToken(botIndex: number): Promise<string> {
  const email = `bot${botIndex}@demo.africa`;
  const cached = tokens.get(email);
  if (cached) return cached;
  const data = await api<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: BOT_PASSWORD }),
  });
  tokens.set(email, data.accessToken);
  // tokens expire; drop from cache before expiry
  setTimeout(() => tokens.delete(email), 10 * 60_000).unref?.();
  return data.accessToken;
}

const randint = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function tick() {
  const { items } = await api<{ items: any[] }>("/markets?status=OPEN&pageSize=50");
  if (!items.length) return;
  const market = pick(items);
  const outcome = Math.random() < 0.5 ? "YES" : "NO";
  const mid = Math.round((outcome === "YES" ? market.yesPrice : market.noPrice) * 100);

  const bot = randint(1, BOT_COUNT);
  const token = await botToken(bot);

  // 40%: aggressive order that crosses the spread (generates trades)
  // 60%: passive order that thickens the book
  const aggressive = Math.random() < 0.4;
  const side = Math.random() < 0.55 ? "BUY" : "SELL";
  let price: number;
  if (side === "BUY") price = aggressive ? Math.min(99, mid + randint(1, 3)) : Math.max(1, mid - randint(1, 4));
  else price = aggressive ? Math.max(1, mid - randint(1, 3)) : Math.min(99, mid + randint(1, 4));

  const quantity = randint(5, 60);
  try {
    const order = await api(
      "/orders",
      {
        method: "POST",
        body: JSON.stringify({
          marketId: market.id,
          outcome,
          side,
          orderType: "LIMIT",
          priceCents: price,
          quantity,
        }),
      },
      token,
    );
    console.log(
      `[sim] bot${bot} ${side} ${quantity} ${outcome} @ 0.${String(price).padStart(2, "0")} on "${market.question.slice(0, 50)}…" → ${order.status}`,
    );
  } catch (err: any) {
    // insufficient shares/balance are expected for bots sometimes — just log
    console.log(`[sim] bot${bot} order skipped: ${err.message}`);
  }
}

async function main() {
  console.log(`Market Simulator started → ${API}, tick every ${TICK_MS}ms (demo market activity)`);
  for (;;) {
    try {
      await tick();
    } catch (err: any) {
      console.error(`[sim] tick failed: ${err.message}`);
      tokens.clear();
    }
    await new Promise((r) => setTimeout(r, TICK_MS));
  }
}

main();
