/* eslint-disable no-console */
// AFRIPREDICT seed — demo data only (SIMULATION, virtual AFR credits).
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// deterministic PRNG for reproducible seeds
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260826);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const randint = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const DEMO_PASSWORD = "Demo1234!";
const INITIAL = 10_000 * 100;

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

interface SeedMarket {
  question: string;
  category: string;
  country: string | null;
  region: string | null;
  eventTitle: string;
  criteria: string;
  source: string;
  daysToClose: number;
  startProb: number; // starting YES probability in cents
}

const MARKETS: SeedMarket[] = [
  // SPORT
  { question: "La Côte d'Ivoire remportera-t-elle la CAN 2027 ?", category: "SPORT", country: "CI", region: "WEST_AFRICA", eventTitle: "CAN 2027", criteria: "YES si la Côte d'Ivoire est officiellement déclarée championne de la CAN 2027 par la CAF. NO dans tous les autres cas.", source: "CAF (fallback: FIFA)", daysToClose: 200, startProb: 22 },
  { question: "Le Sénégal atteindra-t-il la finale de la CAN 2027 ?", category: "SPORT", country: "SN", region: "WEST_AFRICA", eventTitle: "CAN 2027", criteria: "YES si le Sénégal dispute la finale de la CAN 2027.", source: "CAF", daysToClose: 195, startProb: 30 },
  { question: "Le Nigeria se qualifiera-t-il pour la Coupe du Monde 2030 ?", category: "SPORT", country: "NG", region: "WEST_AFRICA", eventTitle: "Qualifications CDM 2030", criteria: "YES si le Nigeria figure sur la liste officielle FIFA des équipes qualifiées.", source: "FIFA", daysToClose: 300, startProb: 65 },
  { question: "Une équipe africaine atteindra-t-elle les demi-finales de la prochaine Coupe du Monde ?", category: "SPORT", country: "AF", region: "PAN_AFRICA", eventTitle: "Coupe du Monde", criteria: "YES si au moins une équipe affiliée CAF atteint les demi-finales.", source: "FIFA", daysToClose: 320, startProb: 28 },
  { question: "Le Maroc terminera-t-il dans le top 10 du classement FIFA cette année ?", category: "SPORT", country: "MA", region: "NORTH_AFRICA", eventTitle: "Classement FIFA", criteria: "YES si le Maroc est classé 10e ou mieux au dernier classement FIFA de l'année.", source: "FIFA", daysToClose: 120, startProb: 55 },
  { question: "Un club africain remportera-t-il la Coupe du Monde des Clubs ?", category: "SPORT", country: "AF", region: "PAN_AFRICA", eventTitle: "Coupe du Monde des Clubs", criteria: "YES si un club affilié CAF remporte l'édition en cours.", source: "FIFA", daysToClose: 90, startProb: 8 },
  // ECONOMY
  { question: "Le prix du cacao dépassera-t-il 3 500 $/tonne avant le 31 décembre ?", category: "ECONOMY", country: "CI", region: "WEST_AFRICA", eventTitle: "Prix du cacao", criteria: "YES si le cours ICE du cacao clôture au-dessus de 3 500 $/tonne au moins un jour avant le 31 décembre.", source: "ICE Futures", daysToClose: 125, startProb: 78 },
  { question: "Le taux USD/XOF dépassera-t-il 600 avant la fin de l'année ?", category: "ECONOMY", country: "SN", region: "WEST_AFRICA", eventTitle: "Taux de change USD/XOF", criteria: "YES si le taux officiel BCEAO USD/XOF dépasse 600 au moins un jour.", source: "BCEAO", daysToClose: 125, startProb: 42 },
  { question: "Le pétrole Brent dépassera-t-il 100 $ le baril cette année ?", category: "ECONOMY", country: "NG", region: "WEST_AFRICA", eventTitle: "Prix du pétrole", criteria: "YES si le Brent clôture au-dessus de 100 $ au moins un jour.", source: "ICE Futures", daysToClose: 125, startProb: 35 },
  { question: "L'inflation au Ghana passera-t-elle sous 15 % ce trimestre ?", category: "ECONOMY", country: "GH", region: "WEST_AFRICA", eventTitle: "Inflation Ghana", criteria: "YES si l'inflation annuelle publiée par le Ghana Statistical Service est < 15 %.", source: "Ghana Statistical Service", daysToClose: 60, startProb: 48 },
  { question: "Le Kenya émettra-t-il un eurobond cette année ?", category: "ECONOMY", country: "KE", region: "EAST_AFRICA", eventTitle: "Eurobond Kenya", criteria: "YES si le Trésor kenyan annonce officiellement une émission d'eurobond.", source: "National Treasury of Kenya", daysToClose: 125, startProb: 60 },
  { question: "Le rand sud-africain se renforcera-t-il face au dollar ce trimestre ?", category: "ECONOMY", country: "ZA", region: "SOUTHERN_AFRICA", eventTitle: "Taux USD/ZAR", criteria: "YES si USD/ZAR clôture le trimestre plus bas qu'à son ouverture.", source: "SARB", daysToClose: 60, startProb: 45 },
  // TECH / BUSINESS
  { question: "Une startup africaine lèvera-t-elle plus de 50 M$ cette année ?", category: "TECH", country: "AF", region: "PAN_AFRICA", eventTitle: "Levées de fonds tech Afrique", criteria: "YES si une startup dont le siège est en Afrique annonce une levée ≥ 50 M$ confirmée par deux sources.", source: "Africa: The Big Deal", daysToClose: 125, startProb: 72 },
  { question: "Une startup ivoirienne lèvera-t-elle plus de 10 M$ cette année ?", category: "TECH", country: "CI", region: "WEST_AFRICA", eventTitle: "Tech Côte d'Ivoire", criteria: "YES si une startup basée en Côte d'Ivoire annonce une levée ≥ 10 M$.", source: "Africa: The Big Deal", daysToClose: 125, startProb: 38 },
  { question: "Le nombre de licornes africaines augmentera-t-il cette année ?", category: "BUSINESS", country: "AF", region: "PAN_AFRICA", eventTitle: "Licornes africaines", criteria: "YES si une nouvelle entreprise africaine atteint une valorisation ≥ 1 Md$ confirmée.", source: "CB Insights", daysToClose: 125, startProb: 33 },
  { question: "Starlink sera-t-il disponible dans plus de 30 pays africains d'ici la fin de l'année ?", category: "TECH", country: "AF", region: "PAN_AFRICA", eventTitle: "Starlink en Afrique", criteria: "YES si la carte de disponibilité officielle Starlink liste plus de 30 pays africains actifs.", source: "starlink.com/map", daysToClose: 125, startProb: 55 },
  { question: "Le Rwanda lancera-t-il sa monnaie numérique de banque centrale (CBDC) cette année ?", category: "TECH", country: "RW", region: "EAST_AFRICA", eventTitle: "CBDC Rwanda", criteria: "YES si la Banque Nationale du Rwanda annonce le lancement public d'un franc rwandais numérique.", source: "BNR", daysToClose: 125, startProb: 25 },
  { question: "MTN dépassera-t-il 300 millions d'abonnés en Afrique ?", category: "BUSINESS", country: "ZA", region: "SOUTHERN_AFRICA", eventTitle: "Abonnés MTN", criteria: "YES si MTN Group publie un nombre d'abonnés ≥ 300 millions dans un rapport trimestriel.", source: "MTN Group Investor Relations", daysToClose: 100, startProb: 58 },
  // POLITICS
  { question: "Le taux de participation à la prochaine élection présidentielle ivoirienne dépassera-t-il 60 % ?", category: "POLITICS", country: "CI", region: "WEST_AFRICA", eventTitle: "Élection présidentielle CI", criteria: "YES si la CEI annonce un taux de participation officiel > 60 %.", source: "CEI Côte d'Ivoire", daysToClose: 150, startProb: 40 },
  { question: "L'Union Africaine admettra-t-elle un nouveau membre au G20 cette année ?", category: "POLITICS", country: "AF", region: "PAN_AFRICA", eventTitle: "UA et G20", criteria: "YES si un siège permanent supplémentaire africain est officiellement annoncé au G20.", source: "Union Africaine", daysToClose: 125, startProb: 15 },
  { question: "Le Sénégal adoptera-t-il une nouvelle loi sur les startups cette année ?", category: "POLITICS", country: "SN", region: "WEST_AFRICA", eventTitle: "Startup Act Sénégal", criteria: "YES si une loi startup révisée est promulguée au Journal Officiel.", source: "Journal Officiel du Sénégal", daysToClose: 125, startProb: 45 },
  { question: "La ZLECAf atteindra-t-elle 50 pays ratifiés d'ici la fin de l'année ?", category: "POLITICS", country: "AF", region: "PAN_AFRICA", eventTitle: "Ratifications ZLECAf", criteria: "YES si le dépositaire de l'UA confirme ≥ 50 ratifications.", source: "Union Africaine", daysToClose: 125, startProb: 62 },
  // CULTURE / ENTERTAINMENT
  { question: "Un artiste africain atteindra-t-il 1 milliard de streams sur une plateforme cette année ?", category: "CULTURE", country: "AF", region: "PAN_AFRICA", eventTitle: "Streaming musique africaine", criteria: "YES si une plateforme majeure confirme 1 Md de streams pour un titre ou album d'un artiste africain.", source: "Spotify / Apple Music (communiqués officiels)", daysToClose: 125, startProb: 70 },
  { question: "Un film nigérian sera-t-il nommé aux Oscars ?", category: "ENTERTAINMENT", country: "NG", region: "WEST_AFRICA", eventTitle: "Nollywood aux Oscars", criteria: "YES si un film produit au Nigeria figure dans les nominations officielles de l'Académie.", source: "oscars.org", daysToClose: 170, startProb: 20 },
  { question: "Un artiste amapiano remportera-t-il un Grammy cette année ?", category: "CULTURE", country: "ZA", region: "SOUTHERN_AFRICA", eventTitle: "Amapiano aux Grammys", criteria: "YES si un artiste sud-africain d'amapiano remporte au moins un Grammy Award.", source: "grammy.com", daysToClose: 160, startProb: 35 },
  { question: "La CAN 2027 battra-t-elle le record d'audience TV du continent ?", category: "ENTERTAINMENT", country: "KE", region: "EAST_AFRICA", eventTitle: "Audience CAN 2027", criteria: "YES si la CAF annonce une audience cumulée record pour la CAN 2027.", source: "CAF", daysToClose: 210, startProb: 50 },
  // WEATHER / WORLD / CRYPTO
  { question: "La saison des pluies au Sahel sera-t-elle excédentaire cette année ?", category: "WEATHER", country: "SN", region: "WEST_AFRICA", eventTitle: "Pluviométrie Sahel", criteria: "YES si AGRHYMET rapporte une pluviométrie saisonnière au-dessus de la moyenne 1991-2020.", source: "AGRHYMET", daysToClose: 100, startProb: 52 },
  { question: "Le Bitcoin dépassera-t-il 150 000 $ avant la fin de l'année ?", category: "CRYPTO", country: null, region: null, eventTitle: "Prix du Bitcoin", criteria: "YES si BTC/USD clôture au-dessus de 150 000 $ sur Coinbase au moins un jour.", source: "Coinbase", daysToClose: 125, startProb: 45 },
  { question: "Le Nigeria adoptera-t-il un cadre réglementaire crypto complet cette année ?", category: "CRYPTO", country: "NG", region: "WEST_AFRICA", eventTitle: "Régulation crypto Nigeria", criteria: "YES si la SEC nigériane publie un cadre réglementaire crypto finalisé.", source: "SEC Nigeria", daysToClose: 125, startProb: 55 },
  { question: "L'Afrique dépassera-t-elle 200 GW de capacité solaire installée d'ici la fin de l'année ?", category: "WORLD", country: "AF", region: "PAN_AFRICA", eventTitle: "Solaire en Afrique", criteria: "YES si l'IRENA rapporte ≥ 200 GW de capacité solaire installée cumulée en Afrique.", source: "IRENA", daysToClose: 125, startProb: 18 },
];

const FIRST_NAMES = ["Koffi", "Amina", "Yao", "Fatou", "Kwame", "Aïcha", "Sekou", "Ngozi", "Moussa", "Zanele", "Tunde", "Wanjiru", "Abdou", "Chipo", "Mamadou", "Nia", "Kofi", "Salima", "Idris", "Thandiwe"];
const COUNTRIES = ["CI", "SN", "NG", "GH", "KE", "ZA", "CM", "MA", "EG", "TZ", "UG", "RW", "BJ", "TG", "GN"];

const COMMENTS = [
  "Je pense que le marché sous-estime cette probabilité.",
  "Le volume monte vite sur ce marché 👀",
  "Les dernières nouvelles vont clairement dans le sens du YES.",
  "Trop incertain pour moi, je reste à l'écart.",
  "J'ai pris une position NO, le prix me semble trop haut.",
  "Quelqu'un a une source récente sur ce sujet ?",
  "Le critère de résolution est très clair, j'aime bien ce marché.",
  "Historiquement ce genre d'évènement arrive rarement.",
  "Gros mouvement de prix aujourd'hui !",
  "Je suis ce marché depuis le début, belle volatilité.",
];

async function main() {
  console.log("Seeding AFRIPREDICT demo data…");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // wipe (demo POC: full reseed)
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.watchlist.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.pricePoint.deleteMany(),
    prisma.trade.deleteMany(),
    prisma.position.deleteMany(),
    prisma.order.deleteMany(),
    prisma.outcome.deleteMany(),
    prisma.market.deleteMany(),
    prisma.event.deleteMany(),
    prisma.ledgerEntry.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // --- users -----------------------------------------------------------
  const mkUser = async (email: string, username: string, role: string, isBot = false, country?: string) => {
    const user = await prisma.user.create({
      data: {
        email, username,
        displayName: username,
        passwordHash,
        role: role as any,
        isBot,
        country: country ?? pick(COUNTRIES),
      },
    });
    const wallet = await prisma.wallet.create({ data: { userId: user.id, balanceCents: INITIAL } });
    await prisma.ledgerEntry.create({
      data: {
        userId: user.id, walletId: wallet.id, type: "INITIAL_BONUS",
        amountCents: INITIAL, balanceBeforeCents: 0, balanceAfterCents: INITIAL,
        referenceType: "SEED",
      },
    });
    return { user, wallet };
  };

  const admin = await mkUser("admin@demo.africa", "admin_demo", "ADMIN", false, "CI");
  const trader1 = await mkUser("trader1@demo.africa", "trader_koffi", "USER", false, "CI");
  const trader2 = await mkUser("trader2@demo.africa", "trader_amina", "USER", false, "SN");
  await mkUser("viewer@demo.africa", "viewer_demo", "USER", false, "KE");

  const bots: { user: any; wallet: any }[] = [];
  for (let i = 1; i <= 96; i++) {
    const name = `${pick(FIRST_NAMES).toLowerCase()}_bot${i}`;
    bots.push(await mkUser(`bot${i}@demo.africa`, `BOT_DEMO_${name}`, "USER", true));
  }
  console.log("Users created: 4 demo + 96 bots");

  // --- markets ---------------------------------------------------------
  let totalTrades = 0;
  let totalOrders = 0;
  let commentCount = 0;

  for (const sm of MARKETS) {
    const closeAt = new Date(Date.now() + sm.daysToClose * 24 * 3600_000);
    const event = await prisma.event.create({
      data: {
        title: sm.eventTitle,
        category: sm.category,
        country: sm.country,
        region: sm.region,
        resolutionCriteria: sm.criteria,
        resolutionDate: new Date(closeAt.getTime() + 7 * 24 * 3600_000),
      },
    });
    // 30-day price random walk ending at final price
    const points: { yes: number; at: Date; vol: number }[] = [];
    let p = sm.startProb;
    for (let d = 30; d >= 0; d--) {
      p = Math.max(3, Math.min(97, p + randint(-4, 4)));
      points.push({ yes: p, at: new Date(Date.now() - d * 24 * 3600_000 + randint(0, 12) * 3600_000), vol: randint(50, 900) * 100 });
    }
    const finalYes = points[points.length - 1].yes;

    const market = await prisma.market.create({
      data: {
        eventId: event.id,
        question: sm.question,
        slug: slugify(sm.question),
        description: `${sm.criteria}\n\n⚠️ Marché de DÉMONSTRATION — crédits virtuels AFR uniquement, aucune valeur réelle.`,
        category: sm.category,
        country: sm.country,
        region: sm.region,
        closeAt,
        resolutionAt: new Date(closeAt.getTime() + 7 * 24 * 3600_000),
        resolutionSource: sm.source,
        yesPriceCents: finalYes,
        noPriceCents: 100 - finalYes,
        createdAt: new Date(Date.now() - 31 * 24 * 3600_000),
        outcomes: {
          create: [
            { side: "YES", label: "YES", ticker: "YES", priceCents: finalYes },
            { side: "NO", label: "NO", ticker: "NO", priceCents: 100 - finalYes },
          ],
        },
      },
      include: { outcomes: true },
    });
    const yesOutcome = market.outcomes.find((o) => o.side === "YES")!;
    const noOutcome = market.outcomes.find((o) => o.side === "NO")!;

    await prisma.pricePoint.createMany({
      data: points.map((pt) => ({
        marketId: market.id,
        yesPriceCents: pt.yes,
        noPriceCents: 100 - pt.yes,
        volumeCents: pt.vol,
        createdAt: pt.at,
      })),
    });

    // historical trades between bots (filled orders, money already settled in prices)
    const nTrades = randint(8, 14);
    let marketVolume = 0;
    for (let t = 0; t < nTrades; t++) {
      const buyer = pick(bots);
      let seller = pick(bots);
      while (seller.user.id === buyer.user.id) seller = pick(bots);
      const outcome = rand() < 0.6 ? yesOutcome : noOutcome;
      const pt = points[randint(5, points.length - 1)];
      const price = outcome.side === "YES" ? pt.yes : 100 - pt.yes;
      const qty = randint(10, 120);
      const at = pt.at;
      const buyOrder = await prisma.order.create({
        data: {
          userId: buyer.user.id, marketId: market.id, outcomeId: outcome.id,
          side: "BUY", orderType: "LIMIT", priceCents: price,
          quantity: qty, remainingQuantity: 0, status: "FILLED", createdAt: at,
        },
      });
      const sellOrder = await prisma.order.create({
        data: {
          userId: seller.user.id, marketId: market.id, outcomeId: outcome.id,
          side: "SELL", orderType: "LIMIT", priceCents: price,
          quantity: qty, remainingQuantity: 0, status: "FILLED", createdAt: at,
        },
      });
      await prisma.trade.create({
        data: {
          marketId: market.id, outcomeId: outcome.id,
          buyOrderId: buyOrder.id, sellOrderId: sellOrder.id,
          buyerId: buyer.user.id, sellerId: seller.user.id,
          priceCents: price, quantity: qty, totalValueCents: price * qty,
          createdAt: at,
        },
      });
      marketVolume += price * qty;
      totalTrades++;
      totalOrders += 2;

      // buyer ends up holding the shares
      const pos = await prisma.position.findUnique({
        where: { userId_marketId_outcomeId: { userId: buyer.user.id, marketId: market.id, outcomeId: outcome.id } },
      });
      if (pos) {
        const nq = pos.quantity + qty;
        await prisma.position.update({
          where: { id: pos.id },
          data: { quantity: nq, avgPriceCents: Math.round((pos.avgPriceCents * pos.quantity + price * qty) / nq) },
        });
      } else {
        await prisma.position.create({
          data: { userId: buyer.user.id, marketId: market.id, outcomeId: outcome.id, quantity: qty, avgPriceCents: price },
        });
      }
    }
    await prisma.market.update({
      where: { id: market.id },
      data: { volumeCents: marketVolume, tradeCount: nTrades },
    });

    // open orderbook: bot bids below price, bot asks above (asks backed by bot positions)
    for (const [outcome, mid] of [[yesOutcome, finalYes], [noOutcome, 100 - finalYes]] as const) {
      // bids
      for (let lvl = 1; lvl <= 3; lvl++) {
        const price = Math.max(1, mid - lvl - randint(0, 1));
        const qty = randint(50, 300);
        const bot = pick(bots);
        const lock = price * qty;
        const wallet = await prisma.wallet.findUnique({ where: { userId: bot.user.id } });
        if (!wallet || wallet.balanceCents < lock) continue;
        await prisma.ledgerEntry.create({
          data: {
            userId: bot.user.id, walletId: wallet.id, type: "ORDER_LOCK",
            amountCents: -lock, balanceBeforeCents: wallet.balanceCents,
            balanceAfterCents: wallet.balanceCents - lock, referenceType: "SEED_ORDER",
          },
        });
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { balanceCents: { decrement: lock }, lockedCents: { increment: lock } },
        });
        await prisma.order.create({
          data: {
            userId: bot.user.id, marketId: market.id, outcomeId: outcome.id,
            side: "BUY", orderType: "LIMIT", priceCents: price,
            quantity: qty, remainingQuantity: qty, lockedCents: lock, status: "OPEN",
          },
        });
        totalOrders++;
      }
      // asks: give the bot a position first (seed inventory), then lock it in a sell
      for (let lvl = 1; lvl <= 3; lvl++) {
        const price = Math.min(99, mid + lvl + randint(0, 1));
        const qty = randint(50, 300);
        const bot = pick(bots);
        const costBasis = Math.max(1, mid - randint(0, 5));
        const pos = await prisma.position.upsert({
          where: { userId_marketId_outcomeId: { userId: bot.user.id, marketId: market.id, outcomeId: outcome.id } },
          create: { userId: bot.user.id, marketId: market.id, outcomeId: outcome.id, quantity: qty, avgPriceCents: costBasis },
          update: { quantity: { increment: qty } },
        });
        await prisma.position.update({
          where: { id: pos.id },
          data: { lockedQuantity: { increment: qty } },
        });
        await prisma.order.create({
          data: {
            userId: bot.user.id, marketId: market.id, outcomeId: outcome.id,
            side: "SELL", orderType: "LIMIT", priceCents: price,
            quantity: qty, remainingQuantity: qty, status: "OPEN",
          },
        });
        totalOrders++;
      }
    }

    // comments
    const nComments = randint(1, 3);
    for (let c = 0; c < nComments; c++) {
      const author = rand() < 0.3 ? pick([trader1, trader2]) : pick(bots);
      await prisma.comment.create({
        data: {
          userId: author.user.id,
          marketId: market.id,
          content: pick(COMMENTS),
          createdAt: new Date(Date.now() - randint(0, 20) * 24 * 3600_000),
        },
      });
      commentCount++;
    }
  }

  // demo traders get a starter position + watchlist on the first market
  const firstMarket = await prisma.market.findFirst({ include: { outcomes: true } });
  if (firstMarket) {
    const yes = firstMarket.outcomes.find((o) => o.side === "YES")!;
    for (const t of [trader1, trader2]) {
      await prisma.watchlist.create({ data: { userId: t.user.id, marketId: firstMarket.id } });
      await prisma.notification.create({
        data: {
          userId: t.user.id, type: "SYSTEM",
          title: "Bienvenue sur AFRIPREDICT 🎉",
          message: "Compte démo prêt : 10 000 AFR virtuels. Bonne découverte !",
        },
      });
    }
    // trader1 holds 100 YES bought at (price-5)
    const cost = Math.max(1, firstMarket.yesPriceCents - 5) * 100;
    const w = await prisma.wallet.findUnique({ where: { userId: trader1.user.id } });
    if (w) {
      await prisma.ledgerEntry.create({
        data: {
          userId: trader1.user.id, walletId: w.id, type: "TRADE",
          amountCents: -cost, balanceBeforeCents: w.balanceCents,
          balanceAfterCents: w.balanceCents - cost, referenceType: "SEED_TRADE",
        },
      });
      await prisma.wallet.update({ where: { id: w.id }, data: { balanceCents: { decrement: cost } } });
      await prisma.position.create({
        data: {
          userId: trader1.user.id, marketId: firstMarket.id, outcomeId: yes.id,
          quantity: 100, avgPriceCents: Math.max(1, firstMarket.yesPriceCents - 5),
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.user.id,
      action: "SEED_COMPLETED",
      entityType: "SYSTEM",
      after: { markets: MARKETS.length, trades: totalTrades, orders: totalOrders, comments: commentCount },
    },
  });

  console.log(`Seed done: ${MARKETS.length} markets, ${totalOrders} orders, ${totalTrades} trades, ${commentCount} comments.`);
  console.log(`Demo accounts (password: ${DEMO_PASSWORD}): admin@demo.africa, trader1@demo.africa, trader2@demo.africa, viewer@demo.africa`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
