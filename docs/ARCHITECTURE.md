# Architecture

```
              ┌───────────────────┐
              │   Next.js  :3002  │  App Router, TanStack Query, Zustand
              └────────┬──────────┘
              REST + WebSocket (socket.io)
                       │
              ┌────────▼──────────┐          ┌──────────────────┐
              │   NestJS  :4000   │◄─────────│  Worker simulator │
              │  auth · markets   │  REST    │  (comptes BOT_DEMO)│
              │  orders/matching  │          └──────────────────┘
              │  portfolio · admin│
              │  social · ai · ws │
              └────────┬──────────┘
                 Prisma (Serializable tx)
                       │
              ┌────────▼──────────┐   ┌────────────┐
              │ PostgreSQL :5436  │   │ Redis :6382 │ (provisionné)
              └───────────────────┘   └────────────┘
```

## Décisions clés

1. **Montants en centimes entiers** (`priceCents` 1–99, `balanceCents`, `amountCents`) — aucune erreur d'arrondi possible ; l'API expose des décimaux.
2. **Ledger = source de vérité** (spec §7) : chaque mouvement écrit `balanceBefore/After`. Invariant testé : `Σ ledger = balance + locked`.
3. **Matching synchrone dans la requête** (spec §17) : BUY↔SELL même outcome, priorité prix puis temps, exécution au prix du *maker*. Un ordre MARKET ne repose jamais dans le book (reliquat annulé).
4. **Verrouillages** : BUY LIMIT verrouille `prix×qté` (balance→locked, ledger ORDER_LOCK) ; SELL verrouille les parts (`Position.lockedQuantity`). Fill acheteur = ORDER_RELEASE (lock au prix limite) puis TRADE (coût au prix d'exécution) → l'excédent revient automatiquement.
5. **Transactions Serializable + retry** (`PrismaService.serializableTx`) pour toutes les mutations financières : placement, annulation, résolution, settlement.
6. **Settlement idempotent** : seul un marché non-RESOLVED peut être résolu ; la résolution annule d'abord tous les ordres ouverts (libération), paie 1 AFR/part gagnante, marque `settled`, notifie, écrit l'audit log — le tout dans une transaction.
7. **Bootstrap de liquidité** : à la création d'un marché, des bots reçoivent un inventaire et cotent bids/asks autour de 50¢ — sans quoi aucun échange ne serait possible (pas de mint de paires dans ce POC).
8. **Abstractions prêtes pour l'évolution** (spec §76-79) : `MarketAnalysisProvider` (rule-based aujourd'hui, LLM demain) ; la logique settlement est isolée dans `AdminService` et remplaçable par un `SettlementProvider` on-chain.

## Modèle de données

Voir [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma) : User, RefreshToken, Wallet, LedgerEntry, Event, Market, Outcome, Order, Trade, Position, PricePoint, Comment, Watchlist, Notification, AuditLog. Index conformes au cadrage §67.

## Flux d'un ordre BUY LIMIT

```
validate market OPEN → validate price/qty → lock funds (ledger ORDER_LOCK)
→ create order → scan asks (price asc, time asc, ≠ self)
→ pour chaque fill : release lock partiel + TRADE acheteur / TRADE vendeur
  + update positions (avg price, realized PnL) + create Trade
→ update order statuses → update market prices/volume + PricePoint
→ notifications makers → COMMIT → broadcasts WebSocket
```
