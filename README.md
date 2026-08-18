# R2T2 — Fiches de personnage multi-jeux

Plateforme web (laptop / tablette / téléphone) de fiches de personnage pour plusieurs jeux de
rôle et groupes de joueurs, chacun avec sa propre règle (catalogue races/compétences/armes/
armures/pouvoirs/avantages). Née du jeu ADD40K, dont les données historiques forment aujourd'hui
le premier jeu/règle/groupe hébergé (remplace les classeurs Excel d'origine). Déployée sur un
Worker Cloudflare unique (Hono + D1 + SPA React).

Voir le plan de conception : `~/.claude/plans/lively-rolling-comet.md` (contexte complet,
décisions actées, hors-périmètre MVP).

## Stack

- **Worker** : [Hono](https://hono.dev) (`src/worker/`), sert l'API `/api/*` et le SPA buildé.
- **Frontend** : Vite + React + TypeScript + Tailwind v4 (`src/frontend/`).
- **Base** : Cloudflare D1 (`migrations/`), schéma `users` / `sessions` / `characters`.
- **Moteur de calcul** : `src/shared/calc-engine.ts`, partagé Worker + frontend (mêmes formules
  affichées en direct côté client et revalidées côté serveur à la sauvegarde).
- **Import** : `scripts/import_xlsx.py` (Python + openpyxl) extrait les 8 fiches Excel du
  dossier `Mon Drive/ADD40K/Fiches persos` vers `src/shared/reference-data.ts` (catalogue de
  règles) et `scripts/characters.seed.json`.

## Démarrage local

```bash
npm install
npm run db:migrate:local            # applique migrations/0001_init.sql (+0002_seed.sql si présent)
npm run build                       # build le SPA dans ./dist
npm run dev                         # wrangler dev sur http://localhost:8787
```

Identifiants de test : voir `scripts/generated-credentials.md` (généré, gitignored — relancer
`node scripts/generate_seed_sql.mjs` si absent).

## Régénérer les données depuis les fiches Excel

```bash
python3 scripts/import_xlsx.py        # -> reference-data.ts + characters.seed.json + rapport
node scripts/generate_seed_sql.mjs    # -> migrations/0002_seed.sql + mots de passe
npm run db:migrate:local              # applique (voir piège ci-dessous)
```

**Toujours dans cet ordre.** `wrangler d1 migrations apply` suit les migrations déjà appliquées
par nom de fichier : régénérer `0002_seed.sql` sans avoir d'abord supprimé l'état D1 local
(`.wrangler/state/v3/d1`) ne le réapplique pas. Voir
`.claude/skills/cloudflare-add40k/SKILL.md` pour le détail du piège et la procédure de reset.

Lire `scripts/import-report.md` après chaque import : il liste les écarts connus (races hors
catalogue, avantages introuvables, XP invalide...) qui nécessitent une vérification manuelle.

## Synchro fiche Excel <-> app

Chaque personnage a une fiche Excel dans `Mon Drive/ADD40K/Fiches App/<Nom>.xlsx` (générée par
`python3 scripts/export_xlsx.py <dossier de .json>`, au format du classeur de Conrad Lingus pris
comme template). Sur l'écran d'accueil, chaque tuile a deux boutons :

- **⬆︎ Excel** (import, propriétaire du personnage ou MJ) : lit un `.xlsx` sélectionné localement
  et met à jour la fiche dans l'app.
- **⬇︎ Excel** (export, tout le monde) : télécharge un `.xlsx` avec les données actuelles de l'app.

Les deux sens utilisent les mêmes coordonnées de cellules que `scripts/import_xlsx.py` (voir
`src/frontend/lib/xlsxSync.ts`) et re-dérivent les valeurs d'armure/pouvoir psy/avantage depuis
`reference-data.ts` plutôt que de faire confiance à la cellule formule mise en cache par Excel.
**Limite connue** : l'export (bibliothèque XLSX.js gratuite, `public/character-template.xlsx`)
ne préserve pas les images ni la mise en forme riche du classeur original — fonctionnel, pas
identique visuellement aux fiches de `Fiches App/`.

## Distribution d'XP

Le pool d'XP d'un personnage (`Character.xp`, additionné aux points de départ dans le budget de
points) est distribué par le MJ, jamais auto-attribué par le joueur : un bouton "Donner de l'XP"
apparaît, pour le MJ uniquement, sur la fiche détaillée (panneau "Budget de points") et sur chaque
tuile de l'écran "Suivi des constantes", qui affiche aussi le pool XP actuel et l'XP total jamais
distribué (`Character.xpTotal`, compteur qui ne fait qu'augmenter, purement informatif).

Un montant positif alimente directement le pool. Un montant négatif — une pénalité ou une
correction, décidée par le MJ, ce qui vaut son approbation — est absorbé dans les points de départ
plutôt que de rendre le pool XP négatif : `xp` ne descend jamais sous 0, y compris via un import
Excel qui enverrait une valeur négative (clampée à 0 côté `PUT /api/characters/:id`). Voir
`POST /api/characters/:id/xp` dans `docs/API_REFERENCE.md`.

## Comptes et plateforme

Trois rôles : `admin` (gère jeux/règles/groupes de joueurs et les comptes, pages `/admin/jeux` et
`/admin/groupes` — membre d'aucun groupe), `gm` (MJ d'un ou plusieurs groupes : édite tous les
personnages de chacun, y crée des PNJ) et `player` (lié à un `character_id` par groupe, édite
uniquement sa fiche). Un compte peut appartenir à **plusieurs groupes de joueurs en même temps**
(table `group_memberships`, `migrations/0005_memberships.sql` — remplace l'ancien
`player_group_id` unique) ; les données (personnages, catalogue de règle) restent isolées par
groupe — un joueur ou MJ ne voit que les personnages des groupes dont il est membre, lisibles par
tous les autres membres de chacun (utile en séance pour consulter la fiche d'un coéquipier).
L'accueil liste les groupes du compte ; chacun a son propre lien de dossier Drive personnalisable
(`player_groups.drive_url`, réglable par un admin ou en self-service par un MJ membre du groupe).

Rejoindre un groupe passe désormais par une **demande d'adhésion** : un joueur ou MJ qui demande à
rejoindre un groupe (page Profil) n'y a accès qu'une fois la demande approuvée par un MJ déjà
membre de ce groupe (panneau "Demandes d'adhésion en attente" sur l'écran Personnages du groupe,
`group_memberships.status`, `migrations/0006_join_approval.sql`) — avant approbation, la demande
est visible côté joueur ("en attente d'approbation") mais ne donne aucun accès aux personnages ni
au catalogue du groupe. Un admin garde un raccourci d'ajout direct, toujours approuvé, qui
contourne ce circuit.

Les données existantes (import Excel initial) forment le jeu/règle/groupe "ADD40K"
(`migrations/0003_platform.sql`, généré par `scripts/generate_platform_seed_sql.mjs`) — un admin
peut créer d'autres jeux/règles/groupes pour d'autres tables via l'interface, sans toucher au
groupe ADD40K existant. Le catalogue d'une règle (races/compétences/armes/armures/pouvoirs
psy/avantages/table de coût) est éditable depuis `/admin/jeux` ; une nouvelle règle démarre avec
un catalogue vide.

## Tests et déploiement

```bash
npm run typecheck
npm run test              # Vitest, src/shared/calc-engine.test.ts
npm run deploy            # release-check.sh -> build -> wrangler deploy
```

`npm run deploy` **met l'app en ligne publiquement** — ne l'exécuter qu'après validation locale
et accord explicite. Avant le tout premier déploiement : `wrangler d1 create r2t2`, reporter
le `database_id` dans `wrangler.jsonc`, puis `npm run db:migrate:remote`.

## Documentation

- `docs/API_REFERENCE.md` — routes `/api/*`.
- `docs/TESTS.md` — inventaire de scénarios (automatisés + manuels).
- `.claude/skills/cloudflare-add40k/SKILL.md` — bindings, migrations, pièges connus.

## Hors périmètre (v1)

Assistant de création de personnage complet, aides de jeu visuelles de combat (bonus
situationnels), édition en ligne du catalogue de règles — cf. plan de conception.
