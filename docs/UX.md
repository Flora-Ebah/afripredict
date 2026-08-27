# UX

Principe directeur (cadrage §63) : **« Je peux comprendre un marché en 5 secondes. »**

## Market card

Chaque carte répond aux 4 questions : quoi (question), probabilité (jauge + %), quand (temps restant), combien (volume). Badge pays/catégorie, badge d'état (Résolu YES/NO, DEMO).

## Écrans livrés

**Public** : Landing (hero, trending, pays, derniers marchés), Markets (filtres tri/catégorie/région + recherche + pagination), Détail marché, Login, Register.

**Authentifié** : Portfolio (4 KPI + onglets Positions/Activité/Trades), Mes ordres (ouverts/historique + annulation), Watchlist, Profil (stats, win rate), Leaderboard, notifications (cloche temps réel).

**Admin** : Dashboard (KPI + table de gestion avec Fermer/Résoudre/Annuler), Création de marché (validation : question en « ? », critères ≥ 20 caractères, source obligatoire, dates cohérentes), modal de résolution (preuve + notes + case de confirmation), Utilisateurs (suspendre/réactiver/reset solde).

## États UI (cadrage §65)

Chaque écran gère : loading (skeletons animés), empty (message + CTA), error (message explicite), unauthorized (invite à la connexion), not found (retour aux marchés). Marché fermé/résolu → panneau de trading remplacé par le statut.

## Design system

Palette du cadrage §37 (primary #111827, secondary #2563EB, success #16A34A, danger #DC2626, fond #F8FAFC), Inter, radius faibles, cards sobres, tables denses, badges simples. Identité propre — aucun asset copié d'une plateforme existante.

## Transparence simulation

Bandeau permanent « SIMULATION / DEMO », badge DEMO sur chaque marché, mention « crédits virtuels » sous le bouton d'ordre, disclaimer IA, footer légal. Les probabilités sont présentées comme « probabilité implicite du marché ».

## Responsive

Grilles 1→2→4 colonnes, tables scrollables horizontalement sur mobile, priorité à l'expérience desktop de trading + navigation mobile des marchés.
