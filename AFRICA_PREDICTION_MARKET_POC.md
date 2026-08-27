# AFRICA PREDICTION MARKET — POC COMPLET & FONCTIONNEL

> **Document de cadrage produit + UX/UI + architecture + technique + données + sécurité + tests**
>
> Objectif : construire un POC web fonctionnel d'une plateforme africaine de marchés prédictifs, inspirée du fonctionnement des plateformes modernes de prediction markets, notamment l'approche hybride **market data + order book/CLOB + règlement**, mais adaptée au contexte africain.
>
> **Important :** le POC reprend les concepts et patterns techniques pertinents d'un prediction market comme Polymarket, mais ne doit pas copier à l'identique son identité visuelle, ses textes, son logo, ses assets ou son code propriétaire. On reprend la logique produit et les patterns UX utiles, avec une identité propre à notre plateforme.

---

## 1. Vision du projet

Créer une plateforme où les utilisateurs peuvent acheter/vendre des positions sur l'issue d'événements réels concernant l'Afrique et le monde.

Exemples :

- « Le Sénégal remportera-t-il la CAN 2027 ? »
- « Le prix du cacao dépassera-t-il 3 500 $/tonne avant le 31 décembre ? »
- « Le taux de change USD/XOF dépassera-t-il 600 avant telle date ? »
- « Une startup ivoirienne lèvera-t-elle plus de 10 M$ en 2027 ? »
- « Quel artiste africain sera n°1 du streaming ce mois-ci ? »
- « Le taux de participation à telle élection dépassera-t-il 60 % ? »

### Principe

Chaque marché possède deux issues principales :

- **YES / OUI**
- **NO / NON**

Dans le POC, les positions sont simulées avec des crédits virtuels.

Exemple :

```text
Question :
La Côte d'Ivoire remportera-t-elle la CAN 2027 ?

YES   0,62  → probabilité implicite 62 %
NO    0,38  → probabilité implicite 38 %

Utilisateur :
Achète 100 YES à 0,62

Valeur théorique si YES gagne :
100 × 1,00 = 100 crédits

Coût :
100 × 0,62 = 62 crédits

Gain théorique :
38 crédits
```

---

# 2. Objectifs du POC

Le POC doit être **réellement utilisable**, pas uniquement une maquette.

Il doit permettre :

1. créer un compte ;
2. se connecter ;
3. consulter les marchés ;
4. rechercher et filtrer les marchés ;
5. ouvrir une page de marché ;
6. voir les probabilités/prix ;
7. voir l'évolution historique ;
8. consulter l'order book ;
9. placer un ordre BUY YES / BUY NO ;
10. placer un ordre limite ;
11. annuler un ordre ;
12. simuler le matching ;
13. voir ses positions ;
14. voir son portefeuille virtuel ;
15. voir son historique ;
16. suivre des marchés ;
17. commenter ;
18. recevoir des notifications ;
19. créer un marché depuis l'admin ;
20. gérer/résoudre un marché depuis l'admin ;
21. consulter les statistiques ;
22. tester la résolution d'un événement ;
23. avoir une API documentée ;
24. disposer de données seed pour une démonstration immédiate.

---

# 3. Décision importante : mode POC

## 3.1 Pas d'argent réel

Le POC fonctionne avec une monnaie virtuelle :

```text
AFR = African Credits
```

Chaque compte de démonstration reçoit par exemple :

```text
10 000 AFR
```

Aucun dépôt bancaire, Mobile Money ou crypto n'est nécessaire dans le POC.

## 3.2 Architecture préparée pour évoluer

Le système doit toutefois séparer :

```text
Virtual Wallet
        ↓
Trading Engine
        ↓
Ledger
```

afin de pouvoir remplacer ultérieurement le portefeuille virtuel par un système financier réglementé sans réécrire tout le moteur.

---

# 4. Architecture inspirée du modèle Polymarket

Polymarket utilise notamment une architecture hybride autour de :

- métadonnées de marchés ;
- moteur/order book CLOB ;
- données et positions ;
- règlement ;
- blockchain/CTF dans son architecture réelle.

Pour notre POC, on conserve les concepts mais on simplifie :

```text
                    ┌──────────────────────┐
                    │      WEB CLIENT      │
                    │      Next.js         │
                    └──────────┬───────────┘
                               │
                    REST / WebSocket
                               │
                               ▼
                    ┌──────────────────────┐
                    │       API / BFF       │
                    │     NestJS            │
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
   │ Market      │      │ Trading     │      │ User        │
   │ Service     │      │ Engine      │      │ Service     │
   └─────────────┘      └─────────────┘      └─────────────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ▼
                     ┌──────────────────┐
                     │    PostgreSQL    │
                     └──────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
               Redis Cache          Event/Jobs
                                     BullMQ
```

---

# 5. Architecture cible

## Frontend

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
Zustand
Recharts / Lightweight Charts
WebSocket client
```

## Backend

```text
NestJS
TypeScript
REST API
WebSocket Gateway
Prisma
PostgreSQL
Redis
BullMQ
```

## Authentification

POC :

```text
Email + password
JWT access token
Refresh token
bcrypt/argon2
```

Préparer l'architecture pour :

```text
Google
Apple
Phone OTP
Passkeys
Wallet
```

---

# 6. Monorepo

Structure recommandée :

```text
africa-prediction-market/
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── styles/
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── markets/
│   │   │   ├── events/
│   │   │   ├── orders/
│   │   │   ├── orderbook/
│   │   │   ├── trades/
│   │   │   ├── positions/
│   │   │   ├── portfolio/
│   │   │   ├── comments/
│   │   │   ├── notifications/
│   │   │   ├── admin/
│   │   │   └── health/
│   │   └── prisma/
│   │
│   └── worker/
│       ├── matching/
│       ├── notifications/
│       ├── market-resolution/
│       └── analytics/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── config/
│   ├── validation/
│   └── shared/
│
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── UX.md
│   └── SECURITY.md
│
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

---

# 7. Modèle de données

## User

```text
id
email
username
displayName
avatarUrl
passwordHash
country
role
status
createdAt
updatedAt
```

Roles :

```text
USER
MODERATOR
MARKET_CREATOR
ADMIN
SUPER_ADMIN
```

---

## Wallet

```text
id
userId
currency
balance
lockedBalance
createdAt
updatedAt
```

---

## LedgerEntry

Le ledger doit être la source de vérité des mouvements.

```text
id
userId
walletId
type
amount
balanceBefore
balanceAfter
referenceType
referenceId
createdAt
```

Types :

```text
INITIAL_BONUS
ORDER_LOCK
ORDER_RELEASE
TRADE
SETTLEMENT
REFUND
ADMIN_ADJUSTMENT
```

---

# 8. Event

Un événement représente le fait réel.

```text
id
title
description
category
country
region
sourceUrl
resolutionCriteria
resolutionDate
status
createdAt
updatedAt
```

Exemples de catégories :

```text
SPORT
POLITICS
ECONOMY
BUSINESS
TECH
CULTURE
ENTERTAINMENT
WEATHER
CRYPTO
WORLD
```

---

# 9. Market

Un événement peut contenir un ou plusieurs marchés.

```text
id
eventId
question
slug
description
marketType
status
openAt
closeAt
resolutionAt
resolutionSource
resolvedOutcome
yesTokenId
noTokenId
yesPrice
noPrice
volume
liquidity
createdAt
updatedAt
```

Market type :

```text
BINARY
MULTI_OUTCOME
```

Pour le MVP :

```text
BINARY uniquement
```

---

# 10. Outcome

```text
id
marketId
label
ticker
price
totalVolume
```

Exemple :

```text
YES
NO
```

---

# 11. Order

```text
id
userId
marketId
outcomeId
side
orderType
price
quantity
remainingQuantity
status
createdAt
updatedAt
```

Side :

```text
BUY
SELL
```

OrderType :

```text
LIMIT
MARKET
```

Status :

```text
OPEN
PARTIALLY_FILLED
FILLED
CANCELLED
EXPIRED
REJECTED
```

---

# 12. Trade

```text
id
marketId
buyOrderId
sellOrderId
buyerId
sellerId
outcomeId
price
quantity
totalValue
createdAt
```

---

# 13. Position

```text
id
userId
marketId
outcomeId
quantity
averagePrice
realizedPnl
unrealizedPnl
updatedAt
```

---

# 14. Comment

```text
id
userId
marketId
content
status
createdAt
updatedAt
```

---

# 15. Watchlist

```text
id
userId
marketId
createdAt
```

---

# 16. Notification

```text
id
userId
type
title
message
read
metadata
createdAt
```

---

# 17. Matching Engine

C'est l'une des parties les plus importantes.

## Order book

Pour chaque market + outcome :

```text
ASKS
price ↑

0.68   100
0.69   250
0.70   400

BIDS
price ↓

0.67   200
0.66   500
0.65   900
```

## Matching

Une BUY à 0.68 peut matcher avec une SELL à 0.68.

Pseudo-flow :

```text
1. Validate user
2. Validate market status
3. Validate balance
4. Lock funds
5. Insert order
6. Search compatible opposite orders
7. Match price/time priority
8. Create trade
9. Update remaining quantities
10. Update positions
11. Update ledger
12. Broadcast WebSocket event
```

---

# 18. Price / Probability

Dans un marché binaire :

```text
YES price ≈ implied probability
```

Exemple :

```text
YES = 0.73
NO  = 0.27
```

Afficher :

```text
73%
27%
```

Attention : le POC doit présenter cela comme une **probabilité implicite du marché**, pas comme une vérité ou une prédiction garantie.

---

# 19. Resolution Engine

Le marché doit avoir des règles de résolution extrêmement précises.

Exemple :

```text
Question:
La Côte d'Ivoire remportera-t-elle la CAN 2027 ?

Resolution:
YES si la Côte d'Ivoire est officiellement déclarée championne
de la CAN 2027 par la CAF.

NO dans tous les autres cas.

Primary source:
CAF

Fallback:
FIFA / source officielle équivalente
```

États :

```text
OPEN
CLOSED
PENDING_RESOLUTION
RESOLVED
CANCELLED
```

---

# 20. Settlement

Si YES gagne :

```text
YES position → 1 AFR / share
NO position  → 0 AFR / share
```

Si NO gagne :

```text
YES → 0
NO  → 1 AFR
```

Le settlement doit :

1. verrouiller le marché ;
2. déterminer le résultat ;
3. calculer les positions gagnantes ;
4. créditer les utilisateurs ;
5. écrire les ledger entries ;
6. marquer les positions comme settled ;
7. notifier les utilisateurs ;
8. conserver un audit trail.

---

# 21. WebSocket

Le frontend doit recevoir en temps réel :

```text
orderbook.updated
trade.created
market.price.updated
market.volume.updated
market.resolved
notification.created
```

Exemple :

```json
{
  "event": "market.price.updated",
  "marketId": "market_123",
  "yesPrice": 0.67,
  "noPrice": 0.33
}
```

---

# 22. Pages utilisateur

## 22.1 Home

Structure :

```text
HEADER

Logo
Markets
Trending
New
Politics
Sports
Economy
Business
Search
Login
Sign up

---------------------------------

HERO

"Predict Africa's future."

[Explore markets]

---------------------------------

TRENDING MARKETS

Card
Card
Card
Card

---------------------------------

AFRICA

Markets by country

🇨🇮 Côte d'Ivoire
🇸🇳 Sénégal
🇳🇬 Nigeria
🇬🇭 Ghana
🇰🇪 Kenya
🇿🇦 South Africa
🇨🇲 Cameroon
...

---------------------------------

LATEST MARKETS

...

---------------------------------

FOOTER
```

---

# 23. Page Markets

Filtres :

```text
All
Trending
New
Ending Soon
Politics
Sports
Economy
Business
Technology
Culture
```

Filtres géographiques :

```text
Africa
West Africa
East Africa
Central Africa
North Africa
Southern Africa
Country
```

Chaque carte affiche :

```text
Question

YES 73¢
NO 27¢

Volume $24.8K
Ends in 4d
```

---

# 24. Page Market Detail

C'est l'écran principal du produit.

```text
--------------------------------------------------
← Markets

SPORT

La Côte d'Ivoire remportera-t-elle la CAN 2027 ?

73% YES

Volume        Liquidity       Traders
$124,500      $18,200         1,204

--------------------------------------------------

YES 73¢        NO 27¢

[ Buy YES ]    [ Buy NO ]

--------------------------------------------------

PRICE CHART

73%
│              ╭──────
│         ╭────╯
│    ╭────╯
│────╯
└──────────────────────
     1D  1W  1M  ALL

--------------------------------------------------

ORDER BOOK

Price     Size      Total

SELL
0.76      120       91.20
0.75      200       150.00
0.74      300       222.00

SPREAD 1¢

BUY
0.73      150       109.50
0.72      250       180.00
0.71      500       355.00

--------------------------------------------------

YOUR POSITION

YES 120 shares
Average 0.68
Current 0.73
P&L +6.00 AFR

--------------------------------------------------

ABOUT THIS MARKET

Resolution criteria
Source
Close date
Resolution date

--------------------------------------------------

COMMENTS

...
```

---

# 25. Trading panel

Lorsqu'on clique BUY YES :

```text
BUY YES

Current price
73¢

Order type

○ Market
● Limit

Price
[ 0.73 ]

Quantity
[ 100 ]

Estimated cost
73 AFR

Potential payout
100 AFR

Potential profit
27 AFR

[ Place order ]
```

Validation :

```text
Insufficient balance
Market closed
Invalid price
Invalid quantity
Order book empty
```

---

# 26. Portfolio

```text
Portfolio

Balance
10,450 AFR

Total invested
4,200 AFR

Portfolio value
12,180 AFR

P&L
+1,730 AFR
```

Positions :

```text
Market
YES
Quantity
Avg price
Current price
P&L
```

---

# 27. Orders

Tabs :

```text
Open Orders
Order History
Trades
```

Actions :

```text
Cancel
View market
```

---

# 28. Activity

Timeline :

```text
Bought 100 YES
Sold 40 YES
Market resolved
Received 60 AFR
Added to watchlist
```

---

# 29. Leaderboard

Classement :

```text
#   User           P&L       Win Rate

1   @Koffi         +8,420     72%
2   @Amina         +7,910     69%
3   @Yao           +6,880     68%
```

Prévoir :

```text
Daily
Weekly
Monthly
All time
```

---

# 30. Profil

```text
Avatar
Username
Country
Member since

Total trades
Markets traded
Win rate
Profit/Loss
```

---

# 31. Admin Dashboard

## Dashboard

```text
Total users
Active users
Total markets
Open markets
Volume
Trades
Revenue simulation
Reports
```

Graphiques :

```text
Trading volume
Users
Markets
Daily trades
```

---

# 32. Admin — Market Management

Table :

```text
Question
Category
Country
Status
Volume
Created
Close
Actions
```

Actions :

```text
View
Edit
Pause
Close
Resolve
Cancel
```

---

# 33. Admin — Create Market

Form :

```text
Event title
Market question
Description
Category
Country
Open date
Close date
Resolution date
Resolution criteria
Primary source
Fallback source
Outcomes
```

Validation obligatoire :

- question non ambiguë ;
- date de résolution définie ;
- source définie ;
- règles YES/NO explicites ;
- absence de conflit évident ;
- aucune résolution basée sur une donnée impossible à vérifier.

---

# 34. Admin — Resolution

Écran :

```text
Market

Question

YES
NO

Evidence
[ Source URL ]

Resolution notes
[ ... ]

Result
[ YES ]

[ Resolve Market ]
```

Action sensible :

```text
Confirmation modal
↓
Admin password / 2FA
↓
Audit log
↓
Settlement
```

---

# 35. Admin — Users

Actions :

```text
Search
View
Suspend
Unsuspend
Change role
Reset demo balance
View activity
```

---

# 36. Admin — Reports

Types :

```text
Reported market
Reported comment
Suspicious trading
Market dispute
User report
```

---

# 37. Design System

## Direction artistique

Créer une identité propre inspirée des qualités UX des prediction markets modernes :

- très informationnelle ;
- dense mais lisible ;
- beaucoup de données ;
- cartes simples ;
- typographie forte ;
- graphiques visibles ;
- navigation rapide ;
- très peu d'effets décoratifs inutiles.

Ne pas reproduire exactement le branding ou les écrans de Polymarket.

## Palette proposée

```text
Primary       #111827
Secondary     #2563EB
Success       #16A34A
Danger        #DC2626
Background    #F8FAFC
Surface       #FFFFFF
Border        #E5E7EB
Text          #111827
Muted         #64748B
```

## Typographie

```text
Inter
```

Alternative :

```text
Space Grotesk
```

## UI

Préférence :

```text
Border radius faible
Cards sobres
Buttons compacts
Tables denses
Badges simples
Charts minimalistes
```

---

# 38. Navigation desktop

```text
┌──────────────────────────────────────────────────────┐
│ LOGO    Markets  Trending  New       Search   Wallet │
│                                      Profile         │
└──────────────────────────────────────────────────────┘
```

---

# 39. Navigation mobile

```text
Home
Markets
Portfolio
Activity
Profile
```

---

# 40. Responsive

Le POC doit fonctionner sur :

```text
Desktop
Tablet
Mobile
```

Priorité :

```text
Desktop trading experience
+
Mobile market browsing
```

---

# 41. API

## Auth

```http
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

## Markets

```http
GET    /markets
GET    /markets/:id
POST   /markets
PATCH  /markets/:id
POST   /markets/:id/close
POST   /markets/:id/resolve
```

## Orders

```http
POST   /orders
GET    /orders
GET    /orders/:id
DELETE /orders/:id
```

## Orderbook

```http
GET /markets/:id/orderbook
GET /markets/:id/trades
```

## Portfolio

```http
GET /portfolio
GET /portfolio/positions
GET /portfolio/orders
GET /portfolio/activity
```

## Comments

```http
GET    /markets/:id/comments
POST   /markets/:id/comments
DELETE /comments/:id
```

---

# 42. API Response standard

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-08-26T00:00:00Z"
  }
}
```

Erreur :

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient virtual balance"
  }
}
```

---

# 43. Validation

Utiliser :

```text
Zod
class-validator
```

Règles :

```text
price >= 0.01
price <= 0.99
quantity > 0
```

---

# 44. Sécurité

Même pour un POC, implémenter :

- validation serveur ;
- rate limiting ;
- CORS ;
- Helmet ;
- JWT sécurisé ;
- password hashing ;
- protection brute-force ;
- RBAC ;
- validation des rôles ;
- audit logs ;
- transactions PostgreSQL ;
- idempotency keys sur opérations critiques ;
- verrouillage des fonds ;
- contrôle de concurrence ;
- protection contre double settlement ;
- logs structurés ;
- secrets uniquement via `.env`.

Ne jamais faire confiance au frontend pour :

```text
balance
price
P&L
permissions
market status
settlement
```

---

# 45. Atomicité financière

Toutes les opérations critiques doivent être transactionnelles.

Exemple :

```text
BEGIN TRANSACTION

lock wallet
validate balance
lock order
create trade
update order
update position
create ledger entry

COMMIT
```

En cas d'erreur :

```text
ROLLBACK
```

---

# 46. Audit Log

Chaque action sensible :

```text
id
actorId
action
entityType
entityId
before
after
ip
userAgent
createdAt
```

Exemples :

```text
MARKET_CREATED
MARKET_EDITED
MARKET_CLOSED
MARKET_RESOLVED
USER_SUSPENDED
BALANCE_ADJUSTED
ORDER_CANCELLED_BY_ADMIN
```

---

# 47. Données africaines

Le POC doit être livré avec des marchés fictifs mais réalistes.

Créer au minimum :

```text
30 marchés
10 catégories
15 pays africains
100 utilisateurs seed
500 ordres seed
300 trades seed
50 commentaires
```

Pays :

```text
Côte d'Ivoire
Sénégal
Nigeria
Ghana
Kenya
South Africa
Cameroon
Morocco
Egypt
Tanzania
Uganda
Rwanda
Benin
Togo
Guinea
```

---

# 48. Seed Markets

Exemples :

```text
SPORT

La Côte d'Ivoire remportera-t-elle la prochaine CAN ?
Le Sénégal atteindra-t-il la finale ?
Une équipe africaine gagnera-t-elle la prochaine Coupe du Monde ?

ECONOMY

Le prix du cacao dépassera-t-il 3 500 $ ?
Le pétrole dépassera-t-il 100 $ ?
Le taux USD/XOF dépassera-t-il 600 ?

TECH

Une startup africaine lèvera-t-elle plus de 50 M$ cette année ?

BUSINESS

Le nombre de licornes africaines augmentera-t-il cette année ?

CULTURE

Un artiste africain atteindra-t-il 1 milliard de streams ?
```

Les marchés de démonstration doivent être clairement marqués comme **SIMULATION / DEMO**.

---

# 49. Simulation de marché

Pour rendre le POC vivant, créer un worker :

```text
Market Simulator
```

Il peut :

- modifier légèrement les prix ;
- générer des ordres ;
- générer des trades ;
- faire varier le volume ;
- alimenter les graphiques.

Mais :

```text
NE JAMAIS simuler artificiellement de vrais utilisateurs
sans marquage explicite dans le POC.
```

Utiliser des comptes :

```text
BOT_DEMO
```

et afficher :

```text
Demo market activity
```

dans l'environnement de démonstration.

---

# 50. Charts

Page marché :

```text
Price chart
Volume chart
```

Intervalles :

```text
1H
1D
1W
1M
ALL
```

Données :

```text
timestamp
yesPrice
noPrice
volume
```

---

# 51. Search

Recherche :

```text
"cacao"
"CAN"
"Côte d'Ivoire"
"Nigeria"
"election"
```

Filtres :

```text
category
country
status
endingSoon
trending
```

---

# 52. Trending algorithm

Score simple pour le POC :

```text
trendingScore =
    volumeScore
  + recentTradesScore
  + uniqueTradersScore
  + watchlistScore
```

Ne pas faire dépendre le classement uniquement du volume.

---

# 53. Notifications

Déclencheurs :

```text
ORDER_FILLED
ORDER_CANCELLED
MARKET_CLOSING
MARKET_RESOLVED
POSITION_SETTLED
COMMENT_REPLY
WATCHLIST_UPDATE
```

---

# 54. Internationalisation

Préparer :

```text
fr
en
```

Langue par défaut :

```text
fr
```

Préparer les devises :

```text
AFR
XOF
NGN
GHS
KES
ZAR
MAD
EGP
USD
```

Mais dans le POC :

```text
AFR = monnaie virtuelle
```

---

# 55. Tests

## Unit tests

Tester :

```text
price calculation
probability
order validation
matching
position calculation
P&L
settlement
ledger
permissions
```

## Integration tests

Tester :

```text
register → login
create market → open
place order → match
trade → position
resolve → settlement
```

## E2E

Scénario principal :

```text
User registers
↓
Receives 10 000 AFR
↓
Opens market
↓
Buys YES
↓
Order appears
↓
Another user sells YES
↓
Orders match
↓
Position updated
↓
Market resolves YES
↓
User receives payout
↓
Portfolio updated
```

---

# 56. Test accounts

Créer automatiquement :

```text
admin@demo.africa
trader1@demo.africa
trader2@demo.africa
viewer@demo.africa
```

Mot de passe de démo documenté uniquement dans `.env.example` / documentation locale.

---

# 57. Docker

Services :

```text
web
api
worker
postgres
redis
```

Commande :

```bash
docker compose up -d
```

Puis :

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

---

# 58. Variables d'environnement

```env
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=
```

Optionnel :

```env
OPENAI_API_KEY=
NEWS_API_KEY=
SENTRY_DSN=
```

---

# 59. IA — fonctionnalité différenciante

Ajouter un module :

```text
AI Market Analyst
```

Pour chaque marché :

```text
Question
Market probability
AI estimated probability
Key factors
Sources
Confidence
```

Exemple :

```text
Market probability: 63%

AI analysis:
58%

Factors:
+ Recent performance
+ Historical data
- Injuries
- Tournament format

Confidence:
Medium
```

L'IA ne doit jamais être présentée comme une garantie de résultat.

---

# 60. Sources et data ingestion

Prévoir un service :

```text
Data Ingestion Service
```

Sources possibles :

```text
official government websites
CAF
FIFA
central banks
national statistics agencies
financial data providers
news APIs
weather APIs
```

Principe :

```text
External source
      ↓
Ingestion
      ↓
Normalization
      ↓
Validation
      ↓
Market context
```

---

# 61. Architecture future

Quand le POC est validé :

```text
                    Web / Mobile
                         │
                         ▼
                     API Gateway
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
 Market Service     Trading Service    User Service
        │                │                │
        ▼                ▼                ▼
   PostgreSQL         CLOB Engine       PostgreSQL
                         │
                         ▼
                    Settlement
                         │
                         ▼
                 Payment / Wallet
```

Puis éventuellement :

```text
Blockchain
Stablecoin
Mobile Money
Banking APIs
```

Mais **pas dans le POC initial**.

---

# 62. Pourquoi commencer avec un CLOB simulé ?

Parce qu'un vrai exchange on-chain introduit immédiatement :

- wallets ;
- signatures ;
- gas ;
- smart contracts ;
- custody ;
- sécurité blockchain ;
- audits ;
- réglementation ;
- liquidité réelle.

Pour prouver le produit, le POC doit d'abord prouver :

```text
Market creation
+
Discovery
+
Trading UX
+
Order matching
+
Portfolio
+
Resolution
+
Settlement
```

---

# 63. UX — principes

Le produit doit donner immédiatement l'impression :

```text
"Je peux comprendre un marché en 5 secondes."
```

Une market card doit répondre à :

```text
Qu'est-ce qu'on prédit ?
Quelle est la probabilité actuelle ?
Quand cela se termine ?
Combien d'argent/volume est engagé ?
```

---

# 64. Écrans à implémenter

## Public

```text
01 Landing
02 Markets
03 Market detail
04 Search
05 Login
06 Register
```

## Authenticated

```text
07 Portfolio
08 Positions
09 Orders
10 Activity
11 Watchlist
12 Profile
13 Notifications
```

## Admin

```text
14 Admin dashboard
15 Markets
16 Create market
17 Edit market
18 Resolve market
19 Users
20 Reports
21 Audit logs
22 Analytics
```

Minimum POC :

```text
Landing
Markets
Market Detail
Trading
Portfolio
Orders
Profile
Admin Dashboard
Create Market
Resolve Market
```

---

# 65. États UI obligatoires

Chaque écran doit prévoir :

```text
Loading
Empty
Error
Success
Disabled
Unauthorized
Not found
```

Exemple Market :

```text
Loading skeleton
No orderbook
Market closed
Market resolved
Market cancelled
```

---

# 66. Performance

Objectifs POC :

```text
LCP < 2.5s
API p95 < 300ms
WebSocket update < 500ms
```

Optimisations :

```text
Redis
database indexes
pagination
server-side filtering
React Query caching
WebSocket only for live data
```

---

# 67. Database indexes

Prévoir notamment :

```text
markets(status)
markets(category)
markets(country)
markets(closeAt)
orders(marketId, status)
orders(marketId, outcomeId, side, price)
trades(marketId, createdAt)
positions(userId)
comments(marketId, createdAt)
notifications(userId, read)
```

---

# 68. Business model futur

Une fois le produit validé :

### Option 1

Trading fee.

### Option 2

Market creation fee.

### Option 3

Premium analytics.

### Option 4

API B2B.

### Option 5

Data / intelligence platform.

### Option 6

Sponsored markets.

Le modèle dépendra du pays et du cadre réglementaire applicable.

---

# 69. Réglementation — à ne pas ignorer

Le POC doit rester en :

```text
VIRTUAL CREDITS
SIMULATION
NO CASH-OUT
NO REAL-MONEY BETTING
```

Avant tout lancement public avec argent réel :

```text
Legal review
Gambling / gaming analysis
Financial regulation analysis
AML/KYC analysis
Consumer protection
Payment regulation
Data protection
Country-by-country compliance
```

Ne pas supposer que parce qu'il s'agit de « prediction markets », le produit échappe automatiquement aux règles applicables aux jeux d'argent ou services financiers.

---

# 70. Différence stratégique avec un bookmaker

Ne pas construire simplement :

```text
Match → cote → pari → gain
```

Construire :

```text
Question réelle
↓
Information
↓
Probability
↓
Market
↓
Trading
↓
Price discovery
↓
Resolution
↓
Data
```

Le produit doit se rapprocher d'un :

> **marché de l'information africain**

plutôt que d'un simple bookmaker.

---

# 71. MVP POC — ordre d'implémentation

## Phase 1 — Foundation

```text
[ ] Monorepo
[ ] Next.js
[ ] NestJS
[ ] PostgreSQL
[ ] Prisma
[ ] Redis
[ ] Docker
[ ] Environment
```

## Phase 2 — Auth

```text
[ ] Register
[ ] Login
[ ] JWT
[ ] Profile
[ ] RBAC
```

## Phase 3 — Markets

```text
[ ] Event
[ ] Market
[ ] Outcomes
[ ] Categories
[ ] Countries
[ ] Search
[ ] Filters
```

## Phase 4 — Trading

```text
[ ] Wallet
[ ] Ledger
[ ] Orders
[ ] Orderbook
[ ] Matching engine
[ ] Trades
[ ] Positions
```

## Phase 5 — Portfolio

```text
[ ] Balance
[ ] Positions
[ ] P&L
[ ] Orders
[ ] Activity
```

## Phase 6 — Resolution

```text
[ ] Close
[ ] Resolve
[ ] Settlement
[ ] Audit
```

## Phase 7 — Social

```text
[ ] Comments
[ ] Watchlist
[ ] Notifications
[ ] Leaderboard
```

## Phase 8 — Admin

```text
[ ] Dashboard
[ ] Market management
[ ] Users
[ ] Resolution
[ ] Reports
[ ] Audit logs
```

## Phase 9 — AI

```text
[ ] Market analysis
[ ] Probability estimate
[ ] Source aggregation
[ ] Explanation
```

## Phase 10 — Polish

```text
[ ] Responsive
[ ] Loading states
[ ] Error states
[ ] Empty states
[ ] Accessibility
[ ] E2E tests
[ ] Seed/demo mode
```

---

# 72. Definition of Done

Le POC est considéré terminé lorsqu'un testeur peut :

```text
1. Ouvrir le site
2. Créer un compte
3. Recevoir 10 000 AFR
4. Explorer les marchés
5. Rechercher "CAN"
6. Ouvrir un marché
7. Voir le graphique
8. Voir l'order book
9. Acheter YES
10. Voir son ordre
11. Faire matcher l'ordre avec un autre utilisateur
12. Voir sa position
13. Voir son P&L
14. Annuler un ordre
15. Suivre un marché
16. Commenter
17. Recevoir une notification
18. Résoudre le marché via admin
19. Voir le settlement
20. Voir le nouveau solde
21. Vérifier l'historique
```

---

# 73. Critères de démonstration

Pour une démo, préparer :

```text
1 admin
2 traders
1 viewer
30 markets
500 orders
300 trades
historical charts
comments
notifications
```

Scénario :

```text
ADMIN
→ crée marché

TRADER A
→ achète YES

TRADER B
→ vend YES

ENGINE
→ match

A
→ voit position

ADMIN
→ résout YES

SYSTEM
→ settlement

A
→ reçoit payout

LEADERBOARD
→ classement mis à jour
```

---

# 74. Règles de développement

## Ne pas

```text
mettre la logique métier critique uniquement dans React
faire confiance au prix envoyé par le frontend
modifier directement le solde
résoudre deux fois un marché
faire des UPDATE non transactionnels sur le wallet
stocker des mots de passe en clair
mettre des secrets dans Git
```

## Faire

```text
service layer
transactions
validation
RBAC
audit logs
idempotency
tests
database constraints
```

---

# 75. Stack finale recommandée

```text
Frontend
Next.js
TypeScript
Tailwind
shadcn/ui
TanStack Query
Zustand
Recharts / Lightweight Charts

Backend
NestJS
TypeScript
Prisma

Database
PostgreSQL

Cache
Redis

Jobs
BullMQ

Realtime
WebSocket

Auth
JWT
Argon2

Validation
Zod + class-validator

Testing
Vitest
Jest
Playwright

Infrastructure
Docker
Docker Compose

CI
GitHub Actions
```

---

# 76. Évolution blockchain — hors POC

Architecture future possible :

```text
User Wallet
      │
      ▼
Trading API
      │
      ▼
CLOB
      │
      ▼
Smart Contract
      │
      ▼
Conditional Tokens
      │
      ▼
Settlement
```

Le POC doit cependant conserver une abstraction :

```text
SettlementProvider
```

avec :

```text
VirtualSettlementProvider
```

Aujourd'hui.

Puis éventuellement :

```text
BlockchainSettlementProvider
```

plus tard.

---

# 77. Abstraction recommandée

```ts
interface SettlementProvider {
  createMarket(): Promise<void>;
  resolveMarket(): Promise<void>;
  settlePosition(): Promise<void>;
  getSettlementStatus(): Promise<string>;
}
```

Implémentation POC :

```text
VirtualSettlementProvider
```

---

# 78. Trading abstraction

```ts
interface TradingEngine {
  placeOrder(order): Promise<Order>;
  cancelOrder(orderId): Promise<void>;
  getOrderBook(marketId): Promise<OrderBook>;
  matchOrders(marketId): Promise<Trade[]>;
}
```

Implémentation :

```text
InMemory/Database CLOB
```

Puis possibilité future :

```text
OnChainTradingEngine
```

---

# 79. AI abstraction

```ts
interface MarketAnalysisProvider {
  analyzeMarket(input): Promise<MarketAnalysis>;
}
```

Provider POC :

```text
OpenAI / Azure OpenAI
```

Fallback :

```text
RuleBasedAnalysisProvider
```

---

# 80. README attendu

Le projet final doit avoir un README expliquant :

```text
What is this?
Features
Architecture
Tech stack
Installation
Environment
Database
Seed
Demo accounts
Running locally
Tests
API
Project structure
Security
Roadmap
Legal disclaimer
```

---

# 81. Résultat attendu du POC

À la fin, nous devons avoir une application qui ressemble à un **vrai produit de prediction market africain**, et non à un simple dashboard.

Elle doit permettre une démonstration complète :

```text
DISCOVER
   ↓
UNDERSTAND
   ↓
PREDICT / TRADE
   ↓
TRACK
   ↓
RESOLVE
   ↓
SETTLE
   ↓
LEARN
```

Le tout avec :

```text
African-first content
+
Modern prediction-market UX
+
CLOB simulation
+
Real-time updates
+
Virtual wallet
+
Admin resolution
+
AI analysis
+
Complete audit trail
```

---

# 82. Positionnement du produit

Nom de travail :

```text
AFRIPREDICT
```

Tagline :

```text
Predict Africa. Understand the future.
```

Alternative :

```text
Africa's Prediction Market.
```

Alternative francophone :

```text
Anticipez l'Afrique.
```

Le nom est provisoire et doit être vérifié avant utilisation commerciale.

---

# 83. Référence technique

La conception est volontairement inspirée des architectures publiques documentées autour de Polymarket : séparation des métadonnées de marché, trading/CLOB, données/positions et règlement.

Pour les intégrations futures avec l'écosystème Polymarket lui-même, vérifier systématiquement la documentation et les SDK officiels à jour. Le dépôt historique `@polymarket/clob-client` a notamment été archivé en mai 2026 et la documentation GitHub recommande désormais le SDK TypeScript unifié pour les nouveaux projets.

Sources de référence :
- Polymarket documentation : https://docs.polymarket.com/
- Polymarket TypeScript SDK : https://github.com/Polymarket/ts-sdk
- Polymarket CLOB client historique : https://github.com/Polymarket/clob-client

---

# 84. Instruction finale pour l'implémentation

**Construire le POC comme un produit complet, mais garder toute la partie financière en simulation.**

Priorité absolue :

```text
1. UX fluide
2. Market discovery
3. Market detail
4. Trading
5. CLOB / matching
6. Portfolio
7. Resolution
8. Settlement
9. Admin
10. Tests
```

Ne pas commencer par blockchain, paiement ou argent réel.

Le POC doit être suffisamment complet pour qu'une personne puisse l'ouvrir, créer un compte, recevoir des crédits virtuels, trader un marché, voir le matching en temps réel, puis assister à sa résolution et au settlement.

