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

L'XP d'un personnage est distribuée par le MJ, jamais auto-attribuée par le joueur : un bouton
"Donner de l'XP" apparaît, pour le MJ uniquement, sur la fiche détaillée (panneau "Budget de
points") et sur chaque tuile de l'écran "Suivi des constantes". Deux champs distincts, à ne pas
confondre :

- **`Character.xp`** ("XP gagnée (depuis la création)" à l'écran) — total net : la valeur importée
  depuis la fiche Excel d'origine, plus/moins toutes les distributions du MJ depuis (positives ou
  négatives — un retrait décidé par le MJ vaut son approbation). Contribue au budget total dispo
  (additionné aux points raciaux + points de départ, cf. calc-engine.getTotalDispo).
- **`Character.xpAvailable`** ("XP disponible" à l'écran) — pool d'appoint géré par le MJ, séparé
  du budget total dispo (n'y contribue pas). Bouge du même montant que `xp` à chaque distribution/
  retrait du MJ, et diminue aussi séparément quand le coût de la fiche augmente (compétence/pouvoir
  psy monté, avantage ajouté — remboursé symétriquement en cas d'allègement). Peut devenir négatif
  dans les deux cas (aucun plancher).

Voir `POST /api/characters/:id/xp` dans `docs/API_REFERENCE.md`.

## Rang d'Action (RA)

Le Rang d'Action détermine l'ordre de jeu en combat : plus le RA final est bas, plus le personnage
agit tôt. Calculé (`calc-engine.getActionRank`, jamais stocké) comme `BASE_RA(5) - Réflexe total +
(RA de l'arme équipée + ses modificateurs)` — le RA de catalogue d'une arme (ex. 2 pour Wild
Predator) est déjà un rang à part entière, lu tel quel dans la table du classeur : il s'additionne
au socle, il ne s'en soustrait pas. Une arme non équipée compte comme mains nues (RA 0 de
catalogue). Une seule arme peut être marquée "équipée" à la fois (case à cocher sur la fiche, à
côté du nom de chaque arme, même principe que l'armure).

Deux éléments du catalogue (Règles ADD40K V0.2) modifient le Réflexe pris en compte, mais
seulement pendant qu'un pouvoir est actif :
- Avantages "Concentration rapide" (+10, REF+3) / "Concentration lente" (-20, REF-3).
- Pouvoir "Concentration psy" — activé "à la demande" sur la fiche (bouton dédié sous chaque
  pouvoir, réservé au propriétaire ou au MJ) à un palier ≤ son score (`Character.activePsyPowers`,
  cf. `ActivePsyPower` dans `shared/types.ts`) ; seul pouvoir du catalogue à avoir un effet chiffré
  sur le RA parmi la vingtaine décrite dans les règles.

L'écran "Suivi des constantes" affiche le RA de chaque personnage sur sa tuile, un rang courant en
haut de l'écran (boutons Précédent/Suivant pour dérouler le round — "Suivant" reboucle à 0 une fois
dépassé le plus haut RA parmi les personnages en jeu) et surligne les tuiles dont le RA correspond
exactement au rang affiché — plusieurs personnages peuvent agir au même rang.

## Descriptions du catalogue et infobulles

Compétences, avantages/inconvénients et pouvoirs psy portent chacun une `description` extraite des
Règles ADD40K V0.2 (`src/shared/reference-data.ts`, croisé avec le classeur Excel dès l'origine —
cf. l'en-tête du fichier). Affichée en infobulle native (attribut `title`) au survol du nom, en
lecture seule, sur la fiche personnage. Quelques entrées du catalogue n'ont pas d'équivalent
identifiable dans les règles (ex. "Sciences théo", "Affinité (VOL) Téléportation") et restent sans
description plutôt que d'en inventer une. Armes et armures n'ont pas de description : les règles ne
décrivent que le tableau chiffré (dégâts/RA/VP/prix), sans texte par objet.

## Fiche repliable

Chaque section de la fiche personnage (Identité, Attributs, Compétences, Armes, Armures, Pouvoirs
psy, Avantages, Équipement, Budget de points...) se replie/déplie au clic sur son titre
(`Section` dans `CharacterSheetPanels.tsx`) — pratique sur mobile pour ne garder ouvert que ce dont
on a besoin en séance. Ouvertes par défaut, état non persisté (juste un confort d'affichage pendant
la session).

## Localisations

La table de localisation des touches (d10 : 1-2 jambe g., 3-4 jambe d., 5-7 torse, 8 bras g., 9 bras
d., 10 tête) est affichée comme une silhouette (`LocalisationSilhouette`,
`RaceArmorSilhouette.tsx`) à côté de la silhouette d'armure sur la fiche (section "Armures"), et en
repère générique en haut de l'écran "Suivi des constantes" — remplace l'ancienne section texte
"Localisations" en fin de fiche.

## Budget de points hors limites

Un solde négatif (dépense au-delà du budget) bloque l'enregistrement de la fiche en mode édition —
il faut d'abord ajuster la fiche, ou passer par le MJ : soit une distribution d'XP (ci-dessus), soit
le bouton "Accepter" du message d'avertissement rouge, qui absorbe le déficit dans les points de
départ pour ramener le solde à 0 (`onAcceptDeficit`, `BudgetPanel`).

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
