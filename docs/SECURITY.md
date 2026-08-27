# Sécurité (POC)

## Implémenté

- **Validation serveur systématique** : class-validator sur tous les DTO (prix 1–99 centimes, quantités bornées, enums stricts) + `whitelist: true`.
- **Rate limiting** : global 200/min ; register 5/min ; login 10/min ; orders 30/min.
- **Helmet** + CORS restreint aux origines configurées.
- **Auth** : bcrypt (cost 10), JWT access 15 min, refresh tokens 7 j stockés **hashés** (SHA-256) avec rotation et révocation au refresh/logout.
- **RBAC** : rôles USER/MODERATOR/MARKET_CREATOR/ADMIN/SUPER_ADMIN, gardés par `RolesGuard` sur les routes admin.
- **Atomicité financière** : transactions PostgreSQL Serializable avec retry sur conflit ; verrouillage des fonds (BUY) et des parts (SELL) avant mise au book.
- **Anti-double-settlement** : statut vérifié dans la transaction de résolution ; re-résolution → `409 ALREADY_RESOLVED` (couvert par l'E2E).
- **Idempotency keys** sur le placement d'ordres (`idempotencyKey` unique en base).
- **Audit log** : MARKET_CREATED/CLOSED/RESOLVED/CANCELLED, USER_SUSPENDED, BALANCE_ADJUSTED… avec acteur, before/after.
- **Ledger append-only** avec soldes avant/après — toute incohérence est détectable (invariant vérifié par l'E2E).
- **Zéro confiance frontend** : soldes, prix, statuts de marché, permissions et settlement sont exclusivement calculés côté serveur.
- **Secrets** uniquement via `.env` (jamais commités, `.gitignore` en place).

## Limites assumées du POC (à corriger avant toute prod)

1. La gateway WebSocket accepte `user.subscribe {userId}` sans vérifier le JWT → un client pourrait écouter les notifications d'un autre utilisateur. Correction : valider le token dans le handshake.
2. Pas de 2FA/step-up sur la résolution admin (le cadrage §34 le prévoit) — seule une confirmation UI existe.
3. Les mots de passe de comptes démo sont partagés et documentés — supprimer les seeds hors démo.
4. Pas de lockout brute-force par compte (seulement du rate limiting par IP).
5. CSP/headers à durcir pour un déploiement public ; pas de HTTPS géré ici.

## Rappel réglementaire

Le POC reste strictement : crédits virtuels, simulation, aucun cash-out, aucun pari en argent réel. Avant tout lancement réel : revue juridique jeux d'argent + régulation financière + AML/KYC + protection des consommateurs + données personnelles, pays par pays (cadrage §69).
