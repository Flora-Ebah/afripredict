# PROMPT CLAUDE CODE — AFRICA PREDICTION MARKET POC

## Instructions principales

Tu es le **Lead Engineer / Software Architect** responsable de construire un POC complet, fonctionnel, sécurisé et testable d'une plateforme africaine de marchés prédictifs.

Je vais te laisser travailler de manière autonome pendant plusieurs heures et je reviendrai demain pour tester l'application.

Je ne veux donc PAS :
- une simple maquette ;
- du pseudo-code ;
- uniquement une architecture ;
- des boutons qui ne fonctionnent pas ;
- des données fictives uniquement affichées sans logique réelle.

Je veux que tu **construises réellement le projet**, installes les dépendances nécessaires, développes les fonctionnalités, lances les services, exécutes les tests, corriges les erreurs et laisses le projet dans l'état le plus fonctionnel possible.

---

# 1. DOCUMENT DE RÉFÉRENCE

Un fichier de spécification est fourni dans le projet :

`AFRICA_PREDICTION_MARKET_POC.md`

### OBLIGATION

Lis **ENTIÈREMENT** ce fichier avant de commencer.

Il contient notamment :
- vision produit ;
- fonctionnalités ;
- architecture ;
- écrans ;
- modèle de données ;
- CLOB / order book ;
- matching engine ;
- wallet virtuel ;
- ledger ;
- positions ;
- settlement ;
- résolution ;
- administration ;
- IA ;
- sécurité ;
- tests ;
- roadmap.

Ce document est la **spécification fonctionnelle principale**.

---

# 2. OBJECTIF FINAL

Le résultat attendu est une vraie application web que je peux ouvrir demain et tester immédiatement.

Le parcours suivant doit fonctionner :

```text
Utilisateur
    ↓
ouvre l'application
    ↓
crée un compte
    ↓
reçoit automatiquement des crédits virtuels
    ↓
explore les marchés
    ↓
recherche un marché
    ↓
ouvre un marché
    ↓
consulte le graphique
    ↓
consulte l'order book
    ↓
achète YES ou NO
    ↓
voit son ordre
    ↓
l'ordre peut être matché
    ↓
voit son trade
    ↓
voit sa position
    ↓
voit son P&L
    ↓
peut annuler un ordre
    ↓
peut suivre un marché
    ↓
peut commenter
    ↓
reçoit des notifications
    ↓
consulte son portfolio
```

Admin :

```text
Admin
    ↓
connexion
    ↓
dashboard
    ↓
création d'un marché
    ↓
gestion du marché
    ↓
fermeture
    ↓
résolution
    ↓
settlement
    ↓
positions mises à jour
    ↓
soldes mis à jour
    ↓
audit log
```

---

# 3. TRAVAIL AUTONOME

Ne m'attends pas pour prendre les décisions techniques.

Ne me demande pas :

- « Dois-je utiliser X ou Y ? »
- « Quelle librairie veux-tu ? »
- « Veux-tu que j'implémente cette fonctionnalité ? »
- « Quelle couleur dois-je utiliser ? »

Prends des décisions raisonnables en privilégiant :

1. simplicité ;
2. sécurité ;
3. maintenabilité ;
4. architecture propre ;
5. UX ;
6. performance ;
7. évolutivité.

Si une fonctionnalité est trop complexe pour le POC, implémente une version simplifiée mais **réellement fonctionnelle**.

Ne bloque jamais toute l'application à cause d'une fonctionnalité secondaire.

---

# 4. STACK

Utilise de préférence :

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zustand
- Recharts ou Lightweight Charts

## Backend

- NestJS
- TypeScript
- Prisma

## Database

- PostgreSQL

## Cache / Jobs

- Redis
- BullMQ si nécessaire

## Realtime

- WebSocket

## Auth

- JWT
- Argon2 ou bcrypt

## Validation

- Zod et/ou class-validator

## Tests

- Vitest/Jest
- Playwright

## Infrastructure

- Docker
- Docker Compose

## Package manager

- pnpm

Si le projet contient déjà une architecture cohérente, ne la détruis pas inutilement.

---

# 5. ARCHITECTURE

Sépare clairement :

```text
Frontend
    ↓
API
    ↓
Business Logic
    ↓
Domain Services
    ↓
Repositories / Prisma
    ↓
PostgreSQL
```

Services principaux :

```text
Auth
Users
Markets
Events
Orders
Orderbook
Trading
Trades
Positions
Portfolio
Wallet
Ledger
Settlement
Notifications
Comments
Watchlist
Admin
Audit
AI
```

Le frontend ne doit jamais être responsable des calculs critiques.

Ne jamais faire confiance au frontend pour :

- balance ;
- prix ;
- P&L ;
- permissions ;
- market status ;
- settlement ;
- ownership ;
- rôles.

---

# 6. MONNAIE VIRTUELLE

IMPORTANT :

Le POC fonctionne **uniquement avec une monnaie virtuelle**.

Nom :

```text
AFR
```

Chaque utilisateur reçoit par exemple :

```text
10 000 AFR
```

Pas de :

- dépôt réel ;
- retrait ;
- cash-out ;
- Mobile Money réel ;
- carte bancaire ;
- crypto réelle.

Architecture toutefois préparée pour pouvoir évoluer plus tard.

---

# 7. WALLET ET LEDGER

Créer :

```text
Wallet
LedgerEntry
```

Le ledger doit être la source de vérité des mouvements.

Gérer :

```text
INITIAL_BONUS
ORDER_LOCK
ORDER_RELEASE
TRADE
SETTLEMENT
REFUND
ADMIN_ADJUSTMENT
```

Lorsqu'un ordre est placé :

```text
balance
↓
fonds verrouillés
```

Lorsqu'un ordre est annulé :

```text
lockedBalance
↓
balance
```

Lors d'un trade :

```text
wallet
+
ledger
+
order
+
position
```

doivent être mis à jour de manière atomique.

---

# 8. TRADING ENGINE

Implémente un vrai système simplifié de prediction market.

Chaque marché binaire possède :

```text
YES
NO
```

Prix :

```text
0.01 → 0.99
```

Exemple :

```text
YES = 0.73
NO = 0.27
```

Implémenter :

- BUY ;
- SELL ;
- MARKET order ;
- LIMIT order ;
- order book ;
- matching ;
- partial fills ;
- filled ;
- cancelled ;
- rejected ;
- expired ;
- trade history.

Utiliser une logique de :

```text
PRICE + TIME PRIORITY
```

---

# 9. MATCHING ENGINE

Exemple :

```text
ASKS

0.76   120
0.75   200
0.74   300

BIDS

0.73   150
0.72   250
0.71   500
```

Une transaction peut être exécutée lorsque les prix sont compatibles.

Flow :

```text
Validate user
↓
Validate market
↓
Validate balance
↓
Lock funds
↓
Create order
↓
Find compatible orders
↓
Match
↓
Create trade
↓
Update orders
↓
Update positions
↓
Update ledger
↓
Broadcast WebSocket event
```

Les opérations critiques doivent utiliser des transactions PostgreSQL et les mécanismes de concurrence adaptés.

---

# 10. MARKET

Créer :

```text
Event
Market
Outcome
```

Un marché doit avoir :

- question ;
- description ;
- catégorie ;
- pays ;
- slug ;
- date d'ouverture ;
- date de fermeture ;
- date de résolution ;
- règles de résolution ;
- source primaire ;
- source secondaire ;
- statut ;
- volume ;
- liquidité ;
- prix YES ;
- prix NO.

États :

```text
OPEN
CLOSED
PENDING_RESOLUTION
RESOLVED
CANCELLED
```

---

# 11. RESOLUTION

Les règles de résolution doivent être précises.

Exemple :

```text
Question:
La Côte d'Ivoire remportera-t-elle la CAN 2027 ?

YES :
si la Côte d'Ivoire est officiellement déclarée championne.

NO :
dans tous les autres cas.

Source :
CAF

Fallback :
source officielle équivalente.
```

L'admin doit pouvoir :

```text
OPEN
→ CLOSED
→ PENDING_RESOLUTION
→ RESOLVED
```

ou :

```text
OPEN
→ CLOSED
→ CANCELLED
```

Une résolution doit produire un audit log.

---

# 12. SETTLEMENT

Si YES gagne :

```text
YES = 1 AFR
NO = 0 AFR
```

Si NO gagne :

```text
NO = 1 AFR
YES = 0 AFR
```

Le settlement doit :

1. verrouiller le marché ;
2. déterminer le résultat ;
3. calculer les positions ;
4. créditer les gagnants ;
5. mettre à jour le ledger ;
6. mettre à jour les positions ;
7. créer les notifications ;
8. créer l'audit log ;
9. empêcher un second settlement.

---

# 13. WEBSOCKET

Implémenter des événements :

```text
market.price.updated
orderbook.updated
trade.created
order.updated
position.updated
market.resolved
notification.created
```

Le frontend doit refléter les changements importants en temps réel.

---

# 14. DONNÉES DE DÉMONSTRATION

L'application doit être immédiatement intéressante demain.

Créer au minimum :

```text
30 marchés
15 pays africains
10 catégories
100 utilisateurs
500 ordres
300 trades
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

Catégories :

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

Les marchés doivent être clairement marqués :

```text
DEMO
SIMULATION
```

---

# 15. COMPTES DE DÉMO

Créer :

```text
admin@demo.africa
trader1@demo.africa
trader2@demo.africa
viewer@demo.africa
```

Prévoir un mot de passe de démonstration documenté localement.

Le compte admin doit réellement avoir les permissions admin.

---

# 16. FRONTEND

Le frontend doit ressembler à un vrai produit.

PAS à une maquette.

PAS à un dashboard administratif générique.

Direction :

```text
Modern prediction market
+
Africa-first
+
Data-driven
+
Professional
```

S'inspirer des meilleurs patterns UX des prediction markets modernes.

IMPORTANT :

Ne copie pas à l'identique :

- logo Polymarket ;
- branding ;
- textes ;
- assets ;
- identité visuelle ;
- code propriétaire.

Tu peux reprendre les concepts et patterns UX utiles.

---

# 17. PAGES

## Public

```text
/
Landing

/markets
Markets

/markets/[slug]
Market detail

/search
Search

/login
Login

/register
Register
```

## Utilisateur

```text
/portfolio
Portfolio

/orders
Orders

/activity
Activity

/watchlist
Watchlist

/profile
Profile
```

## Admin

```text
/admin
Dashboard

/admin/markets
Markets

/admin/markets/new
Create market

/admin/markets/[id]
Edit market

/admin/markets/[id]/resolve
Resolve market

/admin/users
Users

/admin/reports
Reports

/admin/audit
Audit logs
```

---

# 18. MARKET DETAIL

C'est l'écran principal.

Afficher :

```text
Question

YES probability
NO probability

YES price
NO price

Volume
Liquidity
Traders

Price chart

1H
1D
1W
1M
ALL

Order book

ASKS
Spread
BIDS

Trading panel

BUY YES
BUY NO

Market
Limit

Price
Quantity
Estimated cost
Potential payout
Potential profit

User position

Comments

Resolution criteria
Source
Close date
Resolution date
```

---

# 19. PORTFOLIO

Afficher :

```text
Virtual balance
Locked balance
Portfolio value
Invested
P&L
```

Positions :

```text
Market
Outcome
Quantity
Average price
Current price
P&L
```

Également :

```text
Open orders
Trade history
Activity
```

---

# 20. ADMIN DASHBOARD

Afficher :

```text
Total users
Active users
Total markets
Open markets
Volume
Trades
```

Charts :

```text
Trading volume
Users
Markets
Trades
```

Gestion :

```text
Create
Edit
Pause
Close
Resolve
Cancel
```

---

# 21. SIMULATION

Créer éventuellement un système de simulation contrôlé.

Il peut générer :

- orders ;
- trades ;
- variations de prix ;
- volume.

Les bots doivent être identifiés :

```text
DEMO BOT
```

Ne jamais présenter des bots comme de vrais utilisateurs.

---

# 22. DESIGN SYSTEM

Créer une identité propre.

Direction :

- sobre ;
- moderne ;
- data-driven ;
- professionnelle ;
- dense ;
- lisible.

Palette de départ :

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

Typographie :

```text
Inter
```

ou :

```text
Space Grotesk
```

Éviter les interfaces excessivement arrondies.

Privilégier :

- petites bordures ;
- cartes sobres ;
- boutons compacts ;
- tableaux ;
- badges ;
- graphiques.

---

# 23. COMPOSANTS RÉUTILISABLES

Utiliser shadcn/ui lorsque pertinent.

Créer une bibliothèque réutilisable :

```text
components/ui/

Button
Input
Select
Modal
Dialog
Drawer
Tabs
Badge
Card
Table
Pagination
Skeleton
EmptyState
ErrorState
Toast
Tooltip
Avatar
StatCard
```

Puis composants métier :

```text
components/market/
components/trading/
components/portfolio/
components/admin/
components/navigation/
components/charts/
```

NE PAS recréer le même composant plusieurs fois.

---

# 24. LIMITE STRICTE DES FICHIERS

### RÈGLE OBLIGATOIRE

Aucun fichier de code ne doit dépasser **350 lignes** environ.

Cela concerne notamment :

```text
.ts
.tsx
.js
.jsx
.css
.scss
```

Si un fichier approche 300-350 lignes :

STOP.

Refactoriser.

Exemple mauvais :

```text
MarketPage.tsx
900 lignes
```

Exemple correct :

```text
MarketPage.tsx
MarketHeader.tsx
MarketStats.tsx
MarketChart.tsx
MarketOrderBook.tsx
TradingPanel.tsx
PositionCard.tsx
ResolutionInfo.tsx
MarketComments.tsx
useMarket.ts
useOrderBook.ts
market.utils.ts
```

Chaque fichier doit avoir une responsabilité claire.

### Avant de terminer

Lance un script ou une commande qui détecte les fichiers dépassant 350 lignes.

Tout fichier de code dépassant cette limite doit être refactorisé avant la fin.

Ne te contente pas de le signaler.

---

# 25. ORGANISATION DES DOSSIERS

L'arborescence doit être propre.

Frontend :

```text
apps/web/
├── app/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── market/
│   ├── trading/
│   ├── portfolio/
│   ├── navigation/
│   ├── charts/
│   └── admin/
├── features/
│   ├── auth/
│   ├── markets/
│   ├── trading/
│   ├── portfolio/
│   ├── notifications/
│   └── admin/
├── hooks/
├── lib/
│   ├── api/
│   ├── auth/
│   ├── utils/
│   └── validations/
├── types/
└── styles/
```

Backend :

```text
apps/api/src/
├── auth/
├── users/
├── markets/
├── events/
├── orders/
├── orderbook/
├── trades/
├── positions/
├── portfolio/
├── wallet/
├── ledger/
├── settlement/
├── comments/
├── notifications/
├── admin/
├── audit/
├── common/
│   ├── guards/
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   ├── pipes/
│   └── utils/
└── config/
```

Évite un dossier contenant des dizaines de fichiers sans organisation.

---

# 26. MONOREPO

Structure recommandée :

```text
africa-prediction-market/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   ├── config/
│   └── shared/
├── docs/
├── prisma/
├── docker-compose.yml
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Si une autre structure est plus cohérente avec le projet existant, conserve une organisation équivalente.

---

# 27. LOGIQUE MÉTIER

Ne mélange jamais :

```text
UI
API
Business logic
Database
```

Mauvais :

```text
React component
→ matching
→ settlement
→ wallet
→ database
```

Bon :

```text
UI
↓
Hook
↓
API client
↓
Controller
↓
Service
↓
Domain logic
↓
Repository
↓
Database
```

---

# 28. BACKEND

NestJS :

```text
Controller
↓
DTO
↓
Service
↓
Domain
↓
Repository / Prisma
```

Exemple :

```text
orders/
├── orders.controller.ts
├── orders.service.ts
├── orders.repository.ts
├── dto/
│   ├── create-order.dto.ts
│   └── cancel-order.dto.ts
├── domain/
│   ├── order-matcher.ts
│   └── order-validator.ts
└── orders.module.ts
```

---

# 29. API CLIENT

Ne pas disperser des `fetch()` partout.

Créer :

```text
lib/api/client.ts
lib/api/auth.ts
lib/api/markets.ts
lib/api/orders.ts
lib/api/portfolio.ts
```

Puis utiliser des hooks/services.

---

# 30. TYPES

Ne pas répéter :

```ts
type Market = ...
```

dans plusieurs fichiers.

Centraliser les types importants :

```text
packages/types/
```

ou architecture équivalente.

Éviter `any`.

Le TypeScript doit être strict.

---

# 31. VALIDATION

Toute donnée externe est considérée comme non fiable.

Valider :

- body ;
- query ;
- params ;
- headers pertinents ;
- données externes.

Frontend :

```text
Zod
```

Backend :

```text
class-validator / Zod
```

Mais la validation backend est obligatoire.

---

# 32. SÉCURITÉ

Le projet doit être sécurisé dès le POC.

Implémenter :

- password hashing ;
- JWT ;
- refresh tokens ;
- RBAC ;
- guards ;
- validation ;
- rate limiting ;
- CORS ;
- Helmet ;
- audit logs ;
- transactions DB ;
- contrôle de concurrence ;
- idempotency ;
- protection double settlement ;
- protection double spending ;
- pagination ;
- limites de taille des requêtes.

NE JAMAIS :

- stocker les mots de passe en clair ;
- mettre des secrets dans Git ;
- exposer DATABASE_URL côté frontend ;
- exposer JWT_SECRET ;
- faire confiance au rôle du frontend ;
- faire confiance au balance du frontend ;
- permettre au client de modifier directement son solde ;
- permettre à un utilisateur normal de résoudre un marché.

---

# 33. AUTORISATIONS

Les permissions doivent être vérifiées côté backend.

Rôles :

```text
USER
MODERATOR
MARKET_CREATOR
ADMIN
SUPER_ADMIN
```

Exemple :

```text
USER
→ trading

MODERATOR
→ moderation

MARKET_CREATOR
→ create markets

ADMIN
→ users + markets + resolution

SUPER_ADMIN
→ full access
```

Ne jamais sécuriser une route uniquement en masquant le bouton dans le frontend.

---

# 34. DATABASE SAFETY

Ajouter les contraintes nécessaires :

```text
unique email
unique username
unique market slug
foreign keys
indexes
price constraints
quantity constraints
```

Opérations financières critiques :

```text
TRANSACTION
+
LOCK
+
IDEMPOTENCY
```

---

# 35. GESTION DES ERREURS

Créer une gestion d'erreurs cohérente.

Backend :

```text
Global Exception Filter
```

Format :

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient virtual balance"
  }
}
```

Codes utiles :

```text
INSUFFICIENT_BALANCE
MARKET_CLOSED
ORDER_NOT_FOUND
UNAUTHORIZED
FORBIDDEN
INVALID_PRICE
INVALID_QUANTITY
MARKET_ALREADY_RESOLVED
```

Le frontend doit afficher des messages compréhensibles.

---

# 36. LOGGING

Utiliser des logs structurés.

Éviter les `console.log()` partout.

Ne jamais logger :

- password ;
- JWT ;
- refresh token ;
- secrets ;
- données sensibles inutiles.

---

# 37. ENVIRONNEMENT

Créer :

```text
.env
.env.example
.gitignore
```

Ne jamais committer `.env`.

Variables :

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
```

---

# 38. CODE DUPLIQUÉ

Éviter absolument le copier-coller.

Si la même logique apparaît deux fois :

→ extraire une fonction.

Si le même UI apparaît deux fois :

→ créer un composant.

Si la même API apparaît deux fois :

→ créer un service/hook.

---

# 39. COMPLEXITÉ

Préférer :

```text
fonction de 30 lignes
```

à :

```text
fonction de 250 lignes
```

Une fonction doit idéalement avoir une responsabilité principale.

---

# 40. COMMENTS

Les commentaires doivent expliquer :

- pourquoi ;
- une règle métier non évidente ;
- une décision architecturale ;
- un workaround.

Éviter :

```ts
// set user
setUser(user)
```

---

# 41. NAMING

Utiliser des noms explicites.

Bon :

```text
calculateSettlementAmount()
getMarketOrderBook()
validateOrderPrice()
createMarket()
```

Mauvais :

```text
calc()
data()
doStuff()
tmp()
x()
```

---

# 42. IMPORTS

Utiliser des aliases propres :

```text
@/
@components
@features
@lib
@hooks
```

Éviter :

```text
../../../../../../components/...
```

Éviter les cycles d'import.

---

# 43. DEAD CODE

Supprimer :

- fichiers inutilisés ;
- composants inutilisés ;
- imports inutilisés ;
- variables inutilisées ;
- anciennes implémentations ;
- code commenté inutilement.

---

# 44. TODO / FIXME

Ne pas remplir le projet de :

```text
TODO
FIXME
LATER
IMPLEMENT THIS
```

Si une fonctionnalité est importante pour le POC :

→ implémente-la.

Si elle est volontairement reportée :

→ documente-la dans `IMPLEMENTATION_STATUS.md`.

---

# 45. TYPESCRIPT

Utiliser TypeScript strict.

Éviter :

```ts
any
```

sauf justification réelle.

Préférer :

```ts
unknown
```

avec validation appropriée.

Éviter les casts abusifs :

```ts
as any
as unknown as ...
```

---

# 46. LINT / FORMAT

Configurer :

```text
ESLint
Prettier
```

Avant de terminer :

```text
lint
typecheck
tests
build
```

doivent passer autant que possible.

---

# 47. API

Créer au minimum :

## Auth

```http
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET /auth/me
```

## Markets

```http
GET /markets
GET /markets/:id
POST /markets
PATCH /markets/:id
POST /markets/:id/close
POST /markets/:id/resolve
```

## Orders

```http
POST /orders
GET /orders
GET /orders/:id
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
GET /markets/:id/comments
POST /markets/:id/comments
DELETE /comments/:id
```

Ajouter Swagger/OpenAPI si possible.

---

# 48. TESTS

## Unit

Tester :

- price calculation ;
- probability ;
- order validation ;
- matching ;
- wallet ;
- ledger ;
- position ;
- P&L ;
- settlement ;
- permissions.

## Integration

Tester :

```text
register
→ login
→ create market
→ place order
→ match
→ trade
→ position
→ resolve
→ settlement
```

## E2E

Avec Playwright :

```text
register
→ receive 10k AFR
→ browse
→ open market
→ buy YES
→ check order
→ match
→ check position
→ resolve
→ settlement
→ check balance
```

Tu dois réellement lancer les tests.

---

# 49. FINAL QA

Avant de terminer, lancer :

```text
lint
typecheck
unit tests
integration tests
build frontend
build backend
E2E
```

Puis démarrer réellement l'application.

Tester réellement :

```text
Landing
Register
Login
Markets
Market detail
Trading
Orderbook
Portfolio
Admin
Resolution
Settlement
```

Corriger les problèmes.

---

# 50. DÉMARRAGE DU PROJET

Commence par inspecter le projet.

Vérifie :

```text
package.json
Node
pnpm
Docker
PostgreSQL
Redis
fichiers existants
```

Si le dossier est vide :

→ initialise le projet proprement.

Si le projet existe :

→ ne détruis rien sans raison.

---

# 51. ORDRE D'IMPLÉMENTATION

Travaille dans cet ordre :

```text
PHASE 1
Foundation

PHASE 2
Database

PHASE 3
Authentication

PHASE 4
Markets

PHASE 5
Wallet + Ledger

PHASE 6
Orders

PHASE 7
Matching Engine

PHASE 8
Trades + Positions

PHASE 9
Portfolio

PHASE 10
Resolution + Settlement

PHASE 11
Realtime

PHASE 12
Frontend polish

PHASE 13
Admin

PHASE 14
Comments + Watchlist + Notifications

PHASE 15
Seed

PHASE 16
Tests

PHASE 17
AI

PHASE 18
Final QA
```

---

# 52. APRÈS CHAQUE PHASE

Après chaque phase :

1. compile ;
2. typecheck ;
3. lance les tests pertinents ;
4. corrige les erreurs ;
5. continue.

Ne laisse pas volontairement le projet cassé.

---

# 53. SI UNE ERREUR APPARAÎT

Ne t'arrête pas.

Fais :

```text
diagnostic
↓
cause
↓
correction
↓
test
↓
validation
```

Si une dépendance pose problème :

→ utilise une alternative compatible.

---

# 54. SI UNE TECHNOLOGIE EST INDISPONIBLE

Ne bloque pas le projet.

Exemple :

Redis indisponible :

→ fallback local si raisonnable.

API IA indisponible :

→ mock provider.

Docker indisponible :

→ lancement local si possible.

Documente les limitations.

---

# 55. IA

Ajouter si possible :

```text
AI Market Analyst
```

Pour chaque marché :

```text
Market probability
AI estimated probability
Key factors
Confidence
Sources
```

Si aucune API IA n'est disponible :

créer une abstraction :

```ts
interface MarketAnalysisProvider {
  analyzeMarket(input): Promise<MarketAnalysis>;
}
```

et un mock provider.

Ne bloque surtout pas le projet à cause de l'IA.

---

# 56. ABSTRACTIONS FUTURES

Préparer :

```ts
interface SettlementProvider {
  createMarket(): Promise<void>;
  resolveMarket(): Promise<void>;
  settlePosition(): Promise<void>;
  getSettlementStatus(): Promise<string>;
}
```

POC :

```text
VirtualSettlementProvider
```

Future :

```text
BlockchainSettlementProvider
```

Même principe pour le trading et l'IA.

---

# 57. RÉGLEMENTATION

Le POC doit rester :

```text
VIRTUAL CREDITS
SIMULATION
NO CASH-OUT
NO REAL-MONEY BETTING
```

Avant un lancement public réel :

- legal review ;
- gambling/gaming analysis ;
- financial regulation analysis ;
- AML/KYC ;
- consumer protection ;
- data protection ;
- country-by-country compliance.

Ne suppose pas qu'un prediction market est automatiquement hors du cadre des jeux d'argent ou services financiers.

---

# 58. ARCHITECTURE FUTURE

Préparer conceptuellement :

```text
Web / Mobile
      ↓
API Gateway
      ↓
Market Service
Trading Service
User Service
      ↓
CLOB
      ↓
Settlement
      ↓
Payment / Wallet
```

Puis éventuellement :

```text
Blockchain
Stablecoin
Mobile Money
Banking APIs
```

Mais PAS dans le POC initial.

---

# 59. DEFINITION OF DONE

Le POC est terminé uniquement si un testeur peut :

```text
1. ouvrir le site
2. créer un compte
3. recevoir 10 000 AFR
4. explorer les marchés
5. rechercher "CAN"
6. ouvrir un marché
7. voir le graphique
8. voir l'order book
9. acheter YES
10. voir son ordre
11. faire matcher avec un autre utilisateur
12. voir sa position
13. voir son P&L
14. annuler un ordre
15. suivre un marché
16. commenter
17. recevoir une notification
18. résoudre via admin
19. voir le settlement
20. voir le nouveau solde
21. voir l'historique
```

---

# 60. CHECKLIST QUALITÉ OBLIGATOIRE

Avant de terminer :

```text
[ ] Aucun fichier de code > 350 lignes
[ ] Aucun secret commité
[ ] Aucun console.log inutile
[ ] Aucun any inutile
[ ] Aucun import inutilisé
[ ] Aucun composant dupliqué inutilement
[ ] Aucun endpoint admin non protégé
[ ] Aucun calcul financier critique uniquement côté frontend
[ ] Aucun TODO critique
[ ] Aucun fichier mort évident
[ ] TypeScript OK
[ ] ESLint OK
[ ] Prettier OK
[ ] Tests OK
[ ] Build OK
[ ] Seed OK
[ ] Login OK
[ ] Trading OK
[ ] Matching OK
[ ] Portfolio OK
[ ] Resolution OK
[ ] Settlement OK
[ ] Admin OK
[ ] Responsive OK
[ ] Loading states OK
[ ] Empty states OK
[ ] Error states OK
```

---

# 61. RAPPORT FINAL

À la fin seulement, créer :

```text
IMPLEMENTATION_STATUS.md
```

Il doit contenir :

```text
What was implemented
What works
Tests executed
Commands to run
Demo accounts
Important URLs
Architecture summary
Known limitations
Unresolved issues
Next steps
```

Ne prétends jamais qu'une fonctionnalité fonctionne si tu ne l'as pas réellement testée.

---

# 62. RÈGLE ABSOLUE

NE TE CONTENTE PAS DE M'EXPLIQUER COMMENT LE FAIRE.

**FAIS-LE.**

Tu es l'agent de développement responsable du projet.

Lis :

```text
AFRICA_PREDICTION_MARKET_POC.md
```

Construis.

Exécute.

Teste.

Corrige.

Refactorise.

Reteste.

Puis laisse le projet dans l'état le plus fonctionnel possible.

---

# 63. QUALITÉ FINALE ATTENDUE

Imagine que demain une autre développeuse doit reprendre ce projet.

Elle doit comprendre rapidement :

```text
où est l'authentification ;
où est le trading ;
où est le matching engine ;
où est le settlement ;
où est le wallet ;
où sont les composants UI ;
où est l'API ;
où est la database ;
où sont les tests.
```

Le projet doit être propre, modulaire, sécurisé et maintenable.

Je préfère :

```text
fonctionnalité légèrement plus simple
+
code propre
+
sécurité
+
tests
```

plutôt que :

```text
fonctionnalité impressionnante
+
code désordonné
+
fichiers énormes
+
failles
```

---

# 64. COMMENCE MAINTENANT

Ordre obligatoire :

```text
1. Lire AFRICA_PREDICTION_MARKET_POC.md
2. Inspecter le projet
3. Vérifier l'environnement
4. Construire l'architecture
5. Implémenter
6. Seed
7. Tester
8. Corriger
9. Refactoriser les fichiers > 350 lignes
10. Tester encore
11. Build
12. Final QA
13. Créer IMPLEMENTATION_STATUS.md
```

**Ne m'attends pas. Commence immédiatement.**
