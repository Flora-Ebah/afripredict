# API AFRIPREDICT

Base : `http://localhost:4000` — toutes les réponses suivent l'enveloppe :

```json
{ "success": true, "data": {}, "meta": { "timestamp": "…" } }
{ "success": false, "error": { "code": "INSUFFICIENT_BALANCE", "message": "…" } }
```

Auth : header `Authorization: Bearer <accessToken>`. Rate limiting global 200 req/min (5/min sur register, 10/min sur login, 30/min sur orders).

## Auth

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/register` | `{email, username, password, displayName?, country?}` → user + tokens, +10 000 AFR |
| POST | `/auth/login` | `{email, password}` → user + tokens |
| POST | `/auth/refresh` | `{refreshToken}` → nouveaux tokens (rotation, ancien révoqué) |
| POST | `/auth/logout` | `{refreshToken}` → révocation |
| GET | `/auth/me` | 🔒 profil + wallet |

## Markets

| Méthode | Route | Description |
|---|---|---|
| GET | `/markets` | `?category=&country=&region=&status=&search=&sort=trending\|new\|ending_soon\|volume&page=&pageSize=` |
| GET | `/markets/:idOrSlug` | détail (+ `myPositions`/`watching` si authentifié) |
| GET | `/markets/:id/orderbook?outcome=YES\|NO` | niveaux agrégés bids/asks + spread |
| GET | `/markets/:id/trades?limit=` | derniers trades |
| GET | `/markets/:id/history?interval=1H\|1D\|1W\|1M\|ALL` | points de prix pour les charts |
| GET | `/markets/:id/analysis` | analyse IA rule-based |
| GET | `/markets/:id/comments` | commentaires visibles |
| POST | `/markets/:id/comments` | 🔒 `{content}` |
| POST | `/markets/:id/watch` | 🔒 toggle watchlist |

## Orders

| Méthode | Route | Description |
|---|---|---|
| POST | `/orders` | 🔒 `{marketId, outcome: YES\|NO, side: BUY\|SELL, orderType: LIMIT\|MARKET, priceCents? (1–99), quantity, idempotencyKey?}` |
| GET | `/orders?status=open\|filled\|cancelled` | 🔒 mes ordres |
| GET | `/orders/:id` | 🔒 détail |
| DELETE | `/orders/:id` | 🔒 annulation (libère fonds/parts restants) |

Codes d'erreur métier : `MARKET_CLOSED`, `INSUFFICIENT_BALANCE`, `INSUFFICIENT_SHARES`, `INVALID_PRICE`, `ORDER_NOT_CANCELLABLE`, `ALREADY_RESOLVED`.

## Portfolio

| Méthode | Route | Description |
|---|---|---|
| GET | `/portfolio` | 🔒 solde, verrouillé, investi, valeur, P&L |
| GET | `/portfolio/positions` | 🔒 positions avec P&L latent/réalisé |
| GET | `/portfolio/activity?limit=` | 🔒 écritures ledger |
| GET | `/portfolio/trades?limit=` | 🔒 historique de trades |

## Social

| Méthode | Route | Description |
|---|---|---|
| GET | `/watchlist` | 🔒 marchés suivis |
| GET | `/notifications?unread=true` | 🔒 items + unreadCount |
| POST | `/notifications/read` | 🔒 tout marquer lu |
| GET | `/leaderboard?period=daily\|weekly\|monthly\|all` | classement P&L |
| DELETE | `/comments/:id` | 🔒 auteur ou modérateur+ |

## Admin (rôle ADMIN/SUPER_ADMIN)

| Méthode | Route | Description |
|---|---|---|
| GET | `/admin/dashboard` | stats globales + série quotidienne 14 j |
| GET | `/admin/markets` | table de gestion |
| POST | `/admin/markets` | création évènement + marché + outcomes + liquidité bootstrap (aussi MARKET_CREATOR) |
| POST | `/admin/markets/:id/close` | ferme le trading |
| POST | `/admin/markets/:id/resolve` | `{outcome: YES\|NO, notes?, evidenceUrl?}` → settlement complet |
| POST | `/admin/markets/:id/cancel` | annule + rembourse au prix de revient |
| GET | `/admin/users?search=&page=` | gestion utilisateurs |
| POST | `/admin/users/:id/action` | `{action: SUSPEND\|UNSUSPEND\|RESET_BALANCE}` ou `{role}` |
| GET | `/admin/audit-logs?page=` | journal d'audit |

## WebSocket (socket.io, même origine que l'API)

Client → serveur : `market.subscribe {marketId}`, `market.unsubscribe`, `user.subscribe {userId}`.

Serveur → client :

```
orderbook.updated      { marketId }
trade.created          { marketId, trades: [{price, quantity}] }
market.price.updated   { marketId, yesPrice, noPrice }
market.resolved        { marketId, outcome }
notification.created   { type, marketId }
```
