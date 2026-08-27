# AFRIPREDICT — African Prediction Market (POC)

> **Predict Africa. Understand the future.**
>
> ⚠️ **SIMULATION UNIQUEMENT** — crédits virtuels AFR, aucun argent réel, aucun cash-out, aucun pari.

POC web complet d'une plateforme africaine de marchés prédictifs : découverte de marchés, order book CLOB simulé, matching prix/temps, portefeuille virtuel, résolution admin et settlement, temps réel WebSocket, analyste IA rule-based.

## Fonctionnalités

- **Marchés binaires YES/NO** sur des évènements africains (sport, économie, politique, tech, culture…)
- **CLOB simulé** : ordres LIMIT/MARKET, matching prix/temps, annulation, order book agrégé, spread
- **Portefeuille virtuel** : 10 000 AFR à l'inscription, positions, P&L réalisé/latent, historique ledger complet
- **Résolution & settlement** : résolution admin avec preuve + notes, paiement 1 AFR/part gagnante, audit trail, protection anti-double-settlement
- **Temps réel** : WebSocket (prix, order book, trades, résolutions, notifications)
- **Social** : commentaires, watchlist, notifications, leaderboard (jour/semaine/mois/total)
- **Admin** : dashboard stats, création de marché (avec bootstrap de liquidité bots), gestion utilisateurs, audit logs
- **AI Market Analyst** : estimation de probabilité rule-based (interface extensible vers un LLM)
- **Market Simulator** : worker qui anime les marchés via des comptes `BOT_DEMO` (jamais de faux utilisateurs réels)

## Stack

| Couche | Techno |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack Query, Zustand, Recharts, socket.io-client |
| Backend | NestJS 10, TypeScript, Prisma, class-validator, socket.io, Helmet, Throttler |
| Base de données | PostgreSQL 16 (Docker) |
| Cache/Jobs | Redis 7 (provisionné ; matching synchrone dans le POC) |
| Auth | JWT access (15 min) + refresh tokens rotatifs hashés, bcrypt |
| Monorepo | pnpm workspaces (`apps/web`, `apps/api`, `apps/worker`, `packages/shared`) |

## Installation

Prérequis : Node ≥ 20, pnpm ≥ 9, Docker Desktop.

```bash
pnpm install
docker compose up -d          # PostgreSQL :5436, Redis :6382
cp .env.example apps/api/.env # ajuster si besoin
pnpm db:push                  # crée le schéma
pnpm db:seed                  # 100 users, 30 marchés, ~1000 ordres, ~320 trades
pnpm dev                      # api :4000 + web :3002 + worker simulateur
```

Ouvrir **http://localhost:3002**.

## Comptes démo

| Email | Rôle | Mot de passe |
|---|---|---|
| `admin@demo.africa` | ADMIN | `Demo1234!` |
| `trader1@demo.africa` | USER | `Demo1234!` |
| `trader2@demo.africa` | USER | `Demo1234!` |
| `viewer@demo.africa` | USER | `Demo1234!` |

## Tests

```bash
pnpm test        # tests unitaires (validation des ordres)
pnpm test:e2e    # scénario complet contre l'API démarrée (18 vérifications)
```

Le scénario E2E couvre : inscription → bonus 10 000 AFR → création de marché admin → achat → ordre au repos → matching entre deux utilisateurs → positions/P&L → annulation avec libération des fonds → watchlist/commentaires → résolution → settlement → garde anti-double-settlement → cohérence du ledger.

## Modèle financier (important)

- Tous les montants sont stockés en **centimes entiers d'AFR** → arithmétique exacte.
- Le **ledger est la source de vérité** : chaque mouvement (bonus, lock, release, trade, settlement, refund, ajustement) est une écriture avec solde avant/après. Invariant vérifié par l'E2E : `somme(ledger) = solde + verrouillé`.
- Les ordres BUY verrouillent les fonds, les ordres SELL verrouillent les parts.
- Toutes les mutations financières s'exécutent dans des **transactions PostgreSQL Serializable** avec retry.
- Le frontend n'est jamais cru : prix, soldes, statuts et permissions sont validés côté serveur.

## Limites connues du POC

- Pas de mint de paires YES/NO (modèle Polymarket complet) : les parts ne changent que de mains. La liquidité initiale vient d'un bootstrap bots à la création du marché.
- L'abonnement WebSocket aux notifications privées est basé sur l'userId sans vérification JWT côté gateway (documenté dans le code).
- Redis/BullMQ provisionnés mais non utilisés (matching synchrone suffisant pour un POC).
- i18n préparé (contenu fr) mais non externalisé.

## Structure

```
apps/
  web/      Next.js (landing, markets, détail marché, portfolio, orders, watchlist,
            profil, leaderboard, admin dashboard/création/résolution/users)
  api/      NestJS (auth, markets, orders+matching, portfolio, social, admin, ai, ws, health)
            + prisma/schema.prisma + prisma/seed.ts
  worker/   Market Simulator (ordres bots via l'API publique)
packages/
  shared/   types & constantes partagés
docs/       API.md, ARCHITECTURE.md, SECURITY.md, UX.md
scripts/    e2e.mjs
```

## Roadmap post-POC

Paiements réels (Mobile Money…), KYC/AML, conformité pays par pays, moteur CLOB dédié, mint de paires conditionnelles, éventuellement blockchain/stablecoins — **rien de tout cela dans le POC** (voir `docs/SECURITY.md` et le cadrage §69).

## Avertissement légal

Prototype de démonstration. Les probabilités affichées sont des probabilités implicites de marché simulé, pas des prédictions garanties ni des conseils. Aucune transaction financière réelle n'est possible. Tout lancement public avec argent réel exigerait une revue juridique complète (jeux d'argent, régulation financière, AML/KYC, protection des consommateurs, données personnelles) dans chaque pays visé.
