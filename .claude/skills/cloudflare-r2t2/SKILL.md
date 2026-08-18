---
name: cloudflare-r2t2
description: Configure et déploie ce Worker Cloudflare (Hono + D1 + SPA React) pour R2T2, la plateforme de fiches de personnage multi-jeux (née du jeu ADD40K, désormais un jeu/règle/groupe parmi d'autres). Utiliser quand il est question de "wrangler.jsonc", "binding D1", "migration", "seed", "deploy", "worker r2t2", ou d'ajouter une route API.
---

# Cloudflare (Worker unique — r2t2)

Équivalent allégé de la skill `cloudflare-features` de Peakabox (ex-CrossfitCarnotzet) : ce
projet est un seul Worker Cloudflare (pas de monorepo, pas d'OpenNext/Next.js, pas de
Supabase — cf. plan `lively-rolling-comet.md`), donc pas de `getCloudflareContext()` ni
d'Access JWT ici.

## Stack

- **Backend** : Hono (`src/worker/index.ts`), routes sous `src/worker/routes/`.
- **Frontend** : Vite + React + TypeScript + Tailwind v4 (`src/frontend/`), buildé dans `./dist`.
- **Base** : D1 (SQLite), binding `DB` — schéma dans `migrations/`.
- **Assets** : binding `ASSETS` sert `./dist` (SPA, `not_found_handling: "single-page-application"`).
- Config complète : `wrangler.jsonc`.

## Bindings actuels

| Binding | Type | Usage |
|---|---|---|
| `DB` | D1Database | `users`, `sessions`, `characters`, `games`, `rulesets`, `player_groups` (cf. `migrations/0001_init.sql`, `0003_platform.sql`) |
| `ASSETS` | Fetcher | Sert le SPA buildé (`./dist`) |

### Ajouter un nouveau binding

1. Déclarer dans `wrangler.jsonc`.
2. Ajouter le type dans `src/worker/lib/session.ts` (`interface Env`).
3. Accéder via `c.env.<BINDING>` dans les routes Hono.
4. Secrets de prod : `npx wrangler secret put NOM`.

## Piège : `wrangler dev` ne recharge pas le frontend tout seul

Le binding `ASSETS` sert le contenu **statique** de `./dist` (généré par `npm run build`).
`wrangler dev` recharge automatiquement le code du Worker (esbuild watch), mais **pas** ce
dossier — éditer `src/frontend/*` ou `src/shared/*` (utilisé par le frontend, ex.
`calc-engine.ts`) sans relancer `npm run build` fait tourner l'ancien bundle en silence (pas
d'erreur, juste un comportement périmé). Toujours `npm run build` après une modification
touchant le frontend, avant de vérifier dans le navigateur.

## Base de données locale (dev)

```bash
npm run db:migrate:local          # applique migrations/*.sql en local
node scripts/generate_seed_sql.mjs  # régénère migrations/0002_seed.sql + mots de passe
npm run db:migrate:local          # réapplique (seed inclus)
```

**Piège** : `wrangler d1 migrations apply` suit les migrations déjà appliquées **par nom de
fichier** dans une table `d1_migrations`. Régénérer le contenu de `migrations/0002_seed.sql`
sans supprimer l'état local (`.wrangler/state/v3/d1`) au préalable ne le réapplique PAS — il
faudra soit supprimer cet état et tout réappliquer dans l'ordre (régénérer le seed **avant**
d'appliquer, pas après), soit passer par `wrangler d1 execute --local --file=...` qui ignore le
suivi de migration. Après avoir supprimé `.wrangler/state/v3/d1`, **redémarrer** `wrangler dev`
(il garde un handle ouvert sur l'ancien fichier SQLite, sinon erreurs D1 "internal error").

## Import des données Excel

`scripts/import_xlsx.py` (Python + openpyxl) lit les 8 fiches de `Fiches persos/*.xlsx` et
régénère `src/shared/reference-data.ts` (catalogue de règles) + `scripts/characters.seed.json`.
Toujours relancer ce script — **puis** `node scripts/generate_seed_sql.mjs` — dans cet ordre
avant de réappliquer les migrations, sinon le seed contient des données périmées (piège vécu
lors du premier import, cf. rapport `scripts/import-report.md`).

## Déploiement

```bash
npm run deploy   # release-check.sh (typecheck + tests) -> vite build -> wrangler deploy
```

Avant le tout premier déploiement remote : `wrangler d1 create add40k`, reporter le
`database_id` retourné dans `wrangler.jsonc` (actuellement `REPLACE_WITH_D1_DATABASE_ID`), puis
`npm run db:migrate:remote`. Note : la base D1 garde son nom interne historique `add40k` (visible
uniquement dans `wrangler.jsonc`/commandes `wrangler d1`) même si le projet/Worker s'appelle
désormais `r2t2` — renommer une base D1 existante n'apporte rien et ajoute un risque de migration
inutile.

**`wrangler deploy` expose l'app publiquement — ne jamais l'exécuter sans confirmation explicite
de l'utilisateur** (cf. plan, section Déploiement).
