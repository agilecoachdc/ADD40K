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

## Comptes et plateforme

Trois rôles : `admin` (gère jeux/règles/groupes de joueurs et les comptes, pages `/admin/jeux` et
`/admin/groupes` — pas de groupe ni de personnage assigné), `gm` (MJ d'un groupe : édite tous les
personnages de son groupe, crée des PNJ) et `player` (lié à un `character_id`, édite uniquement sa
fiche). Un compte appartient à un seul groupe de joueurs (`player_group_id`, sauf admin) ; les
données (personnages, catalogue de règle) sont isolées par groupe — un joueur ou MJ ne voit que
les personnages de son propre groupe, lisibles par tous ses membres (utile en séance pour
consulter la fiche d'un coéquipier).

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
et accord explicite. Avant le tout premier déploiement : `wrangler d1 create add40k`, reporter
le `database_id` dans `wrangler.jsonc`, puis `npm run db:migrate:remote`.

## Documentation

- `docs/API_REFERENCE.md` — routes `/api/*`.
- `docs/TESTS.md` — inventaire de scénarios (automatisés + manuels).
- `.claude/skills/cloudflare-add40k/SKILL.md` — bindings, migrations, pièges connus.

## Hors périmètre (v1)

Assistant de création de personnage complet, aides de jeu visuelles de combat (bonus
situationnels), édition en ligne du catalogue de règles — cf. plan de conception.
