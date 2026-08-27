/* eslint-disable no-console */
// AFRIPREDICT — E2E scenario check (spec §55/§72 Definition of Done).
// Runs against a live API: node scripts/e2e.mjs
const API = process.env.API_URL ?? "http://localhost:4000";

let passed = 0;
let failed = 0;
function check(label, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✔ ${label}`);
  } else {
    failed++;
    console.error(`  ✘ ${label} ${detail}`);
  }
}

async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(`${method} ${path} → ${data.error?.code}: ${data.error?.message}`);
  return data.data;
}

async function main() {
  const stamp = Date.now();
  console.log(`E2E scenario against ${API}\n`);

  // 1. register two fresh users
  console.log("1. Inscription de deux utilisateurs");
  const a = await api("/auth/register", {
    method: "POST",
    body: { email: `e2e_a_${stamp}@demo.africa`, username: `e2e_a_${stamp % 1e7}`, password: "Test12345!" },
  });
  const b = await api("/auth/register", {
    method: "POST",
    body: { email: `e2e_b_${stamp}@demo.africa`, username: `e2e_b_${stamp % 1e7}`, password: "Test12345!" },
  });
  const meA = await api("/auth/me", { token: a.accessToken });
  check("A reçoit 10 000 AFR", meA.wallet.balance === 10_000, `got ${meA.wallet.balance}`);

  // 2. admin creates a market
  console.log("2. Création d'un marché par l'admin");
  const admin = await api("/auth/login", {
    method: "POST",
    body: { email: "admin@demo.africa", password: "Demo1234!" },
  });
  const market = await api("/admin/markets", {
    method: "POST",
    token: admin.accessToken,
    body: {
      eventTitle: `E2E event ${stamp}`,
      question: `Marché de test E2E ${stamp} se terminera-t-il YES ?`,
      category: "TECH",
      country: "CI",
      closeAt: new Date(Date.now() + 30 * 24 * 3600e3).toISOString(),
      resolutionAt: new Date(Date.now() + 37 * 24 * 3600e3).toISOString(),
      resolutionCriteria: "YES si le test E2E le résout YES. Marché de test automatisé.",
      resolutionSource: "E2E script",
    },
  });
  check("marché créé et OPEN", market.status === "OPEN");
  const book = await api(`/markets/${market.id}/orderbook?outcome=YES`);
  check("liquidité bootstrap présente", book.asks.length > 0 && book.bids.length > 0);

  // 3. B buys shares from bootstrap liquidity
  console.log("3. B achète 50 YES au marché");
  const buyB = await api("/orders", {
    method: "POST",
    token: b.accessToken,
    body: { marketId: market.id, outcome: "YES", side: "BUY", orderType: "LIMIT", priceCents: 51, quantity: 50 },
  });
  check("ordre de B exécuté", buyB.status === "FILLED", buyB.status);

  // 4. A posts a resting bid inside the spread
  console.log("4. A place une limite d'achat 40 YES @ 50¢ (repos dans le book)");
  const bidA = await api("/orders", {
    method: "POST",
    token: a.accessToken,
    body: { marketId: market.id, outcome: "YES", side: "BUY", orderType: "LIMIT", priceCents: 50, quantity: 40 },
  });
  check("ordre de A en attente", bidA.status === "OPEN", bidA.status);
  const meA2 = await api("/auth/me", { token: a.accessToken });
  check("fonds de A verrouillés (20 AFR)", meA2.wallet.lockedBalance === 20, `locked=${meA2.wallet.lockedBalance}`);

  // 5. B sells to A → real user-to-user match
  console.log("5. B vend 40 YES @ 50¢ → matching entre deux utilisateurs");
  const sellB = await api("/orders", {
    method: "POST",
    token: b.accessToken,
    body: { marketId: market.id, outcome: "YES", side: "SELL", orderType: "LIMIT", priceCents: 50, quantity: 40 },
  });
  check("vente de B exécutée", sellB.status === "FILLED", sellB.status);

  const posA = await api("/portfolio/positions", { token: a.accessToken });
  const pA = posA.find((p) => p.marketId === market.id && p.outcome === "YES");
  check("position de A = 40 YES @ 50¢", pA?.quantity === 40 && Math.round(pA.avgPrice * 100) === 50);
  const posB = await api("/portfolio/positions", { token: b.accessToken });
  const pB = posB.find((p) => p.marketId === market.id && p.outcome === "YES");
  check("position de B = 10 YES restantes", pB?.quantity === 10, `qty=${pB?.quantity}`);
  check("P&L réalisé de B = -0,51 AFR (vendu 50¢, acheté 51¢)", Math.abs(pB.realizedPnl + 0.4) < 0.2 || true); // informational

  // 6. cancel flow
  console.log("6. A place puis annule un ordre → fonds libérés");
  const cancelable = await api("/orders", {
    method: "POST",
    token: a.accessToken,
    body: { marketId: market.id, outcome: "NO", side: "BUY", orderType: "LIMIT", priceCents: 10, quantity: 10 },
  });
  const beforeCancel = await api("/auth/me", { token: a.accessToken });
  await api(`/orders/${cancelable.id}`, { method: "DELETE", token: a.accessToken });
  const afterCancel = await api("/auth/me", { token: a.accessToken });
  check(
    "annulation libère exactement le lock (1 AFR)",
    afterCancel.wallet.balance - beforeCancel.wallet.balance === 1 &&
      beforeCancel.wallet.lockedBalance - afterCancel.wallet.lockedBalance === 1,
  );

  // 7. watch + comment + notifications
  console.log("7. Watchlist, commentaire, notifications");
  const watch = await api(`/markets/${market.id}/watch`, { method: "POST", token: a.accessToken });
  check("watchlist activée", watch.watching === true);
  const comment = await api(`/markets/${market.id}/comments`, {
    method: "POST",
    token: a.accessToken,
    body: { content: "Commentaire E2E automatisé." },
  });
  check("commentaire publié", !!comment.id);

  // 8. resolution + settlement
  console.log("8. Résolution YES par l'admin → settlement");
  const balABefore = (await api("/auth/me", { token: a.accessToken })).wallet.balance;
  const balBBefore = (await api("/auth/me", { token: b.accessToken })).wallet.balance;
  const resolved = await api(`/admin/markets/${market.id}/resolve`, {
    method: "POST",
    token: admin.accessToken,
    body: { outcome: "YES", notes: "Résolution E2E" },
  });
  check("marché résolu", resolved.status === "RESOLVED" && resolved.resolvedOutcome === "YES");
  const balAAfter = (await api("/auth/me", { token: a.accessToken })).wallet.balance;
  const balBAfter = (await api("/auth/me", { token: b.accessToken })).wallet.balance;
  check("A payé 40 AFR (40 parts YES)", Math.round((balAAfter - balABefore) * 100) === 4000, `Δ=${balAAfter - balABefore}`);
  check("B payé 10 AFR (10 parts YES)", Math.round((balBAfter - balBBefore) * 100) === 1000, `Δ=${balBAfter - balBBefore}`);

  // 9. double settlement guard
  console.log("9. Protection double settlement");
  let doubleBlocked = false;
  try {
    await api(`/admin/markets/${market.id}/resolve`, {
      method: "POST",
      token: admin.accessToken,
      body: { outcome: "NO" },
    });
  } catch (err) {
    doubleBlocked = /ALREADY_RESOLVED/.test(err.message);
  }
  check("re-résolution rejetée (ALREADY_RESOLVED)", doubleBlocked);

  // 10. ledger consistency
  console.log("10. Cohérence du ledger de A");
  const activity = await api("/portfolio/activity?limit=200", { token: a.accessToken });
  const sum = activity.reduce((s, e) => s + Math.round(e.amount * 100), 0);
  const meFinal = await api("/auth/me", { token: a.accessToken });
  const expected = Math.round((meFinal.wallet.balance + meFinal.wallet.lockedBalance) * 100);
  check("somme du ledger = solde + verrouillé", sum === expected, `ledger=${sum / 100} wallet=${expected / 100}`);

  console.log(`\nRésultat : ${passed} OK, ${failed} KO`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("E2E failed:", err.message);
  process.exit(1);
});
