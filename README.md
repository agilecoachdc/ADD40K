# ADD40K — Fiches de personnage

Web app (laptop / tablette / téléphone) remplaçant les classeurs Excel de fiches de personnage
du jeu de rôle ADD40K. Déployée sur un Worker Cloudflare unique (Hono + D1 + SPA React).

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

## Comptes

Un compte par joueur (`role: player`, lié à un `character_id`, édite uniquement sa fiche) + un
compte MJ (`role: gm`, édite tout). Tout le monde peut **lire** toutes les fiches — utile en
séance pour consulter la fiche d'un coéquipier.

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
