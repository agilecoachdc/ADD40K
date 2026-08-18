# Référence API — r2t2

Doc dev-facing des routes `/api/*` (Hono, `src/worker/`). Tenue à jour via le hook
`.claude/hooks/api-reference-reminder.sh` à chaque édition d'une route.

Toutes les routes sauf `/api/auth/login` exigent une session valide (cookie httpOnly
`add40k_session`, middleware `requireAuth` dans `src/worker/lib/session.ts`).

## Auth (`src/worker/routes/auth.ts`)

### `POST /api/auth/login`
- Auth : aucune.
- Entrée : `{ username: string, password: string }`.
- Sortie : `{ user: PublicUser }`, pose le cookie de session.
- Erreurs : `400` (champs manquants), `401` (identifiants invalides).

### `POST /api/auth/logout`
- Auth : session (optionnelle, no-op si absente).
- Sortie : `{ ok: true }`, efface le cookie.

### `GET /api/auth/me`
- Auth : session.
- Sortie : `{ user: PublicUser }`.
- Erreurs : `401` si pas de session valide.

## Personnages (`src/worker/routes/characters.ts`)

Un compte (joueur ou MJ) peut désormais être membre de **plusieurs groupes en même temps**
(`group_memberships`, cf. migrations/0005_memberships.sql — remplace l'ancien
`users.player_group_id` unique, qui reste en base pour compat historique mais n'est plus la
source de vérité). Il n'y a donc plus de "groupe courant" implicite : toutes les routes
personnages exigent un `groupId` explicite (query param ou body), vérifié contre
`user.memberships`. Le catalogue de référence (`ReferenceData`) est chargé depuis la règle
assignée à ce groupe (`getReferenceDataForGroup`, `src/worker/lib/reference.ts`) et renvoyé dans
chaque réponse.

### `GET /api/characters?groupId=`
- Auth : session ; `groupId` doit être dans `user.memberships` (403 sinon).
- Sortie : `{ characters: CharacterSummary[], referenceData: ReferenceData, groupImageUrl: string | null, groupDriveUrl: string | null }`
  — résumé enrichi (portrait, statut `inGame`, `isNpc`, `archived`, PV/PSP courant + max calculé)
  utilisé par l'écran "Personnages" et l'écran "Suivi des constantes" (MJ), tous deux scopés
  `/groupe/:groupId` et `/suivi/:groupId`. `groupImageUrl` est l'image du groupe
  (`player_groups.image_url`, fond d'écran) ; `groupDriveUrl` est le lien Drive personnalisable du
  groupe (`player_groups.drive_url`, affiché en bouton "Dossier Drive" — plus de lien ADD40K en
  dur). Voir `src/shared/types.ts`.

### `GET /api/characters/:id`
- Auth : session ; lecture ouverte à tout membre du groupe du personnage.
- Sortie : `{ character: Character, computed: CharacterComputed, canEdit: boolean, referenceData: ReferenceData, groupImageUrl: string | null }`.
  `computed` est calculé côté serveur via `src/shared/calc-engine.ts` (mêmes fonctions que le
  frontend, pour rester la source de vérité en cas de divergence de version de code).
- Erreurs : `404` si le personnage n'existe pas *ou* appartient à un groupe dont l'appelant n'est
  pas membre (traité comme inexistant, pas de fuite d'existence).

### `POST /api/characters`
- Auth : session + rôle `gm`, membre du groupe ciblé.
- Entrée : `{ groupId: string, name: string, portraitUrl?: string | null, race?: string, vit?: number, vol?: number }`
  — crée un PNJ (`isNpc: true`, `inGame: true`) rattaché à `groupId`. PV/PSP max suivent
  exactement le même calcul que pour un personnage de joueur (VIT/VOL + bonus racial + taille,
  `calc-engine.ts`) ; les autres attributs restent à 0. `id` généré par slug du nom (suffixe
  numérique en cas de collision).
- Sortie : `{ character: Character, computed: CharacterComputed, canEdit: true, referenceData: ReferenceData }`, code `201`.
- Erreurs : `403` (pas MJ ou pas membre de `groupId`), `400` (nom manquant).

### `PUT /api/characters/:id`
- Auth : session + `canEditCharacter` (propriétaire du personnage — comparaison par
  `owner_username`, un même compte pouvant posséder des personnages dans plusieurs groupes — ou
  rôle `gm` membre du groupe du personnage).
- Entrée : `Partial<Character>` — fusionné avec les données existantes côté serveur
  (`id` et `ownerUsername` du client sont ignorés).
- Sortie : `{ character: Character, computed: CharacterComputed, canEdit: true, referenceData: ReferenceData }`.
- Erreurs : `403` (pas le propriétaire ni MJ du groupe), `404` (personnage introuvable), `400` (JSON invalide).

## Profil (`src/worker/routes/profile.ts`)

### `GET /api/profile`
- Auth : session (tout rôle).
- Sortie : `{ user: PublicUser, memberships: MembershipInfo[] }` où chaque `MembershipInfo` est
  `{ group: PlayerGroup, ruleset: Ruleset | null, game: Game | null }` — un par groupe dont
  l'appelant est membre (page "Mon profil", section "Mes groupes"). Tableau vide pour un compte
  sans groupe (admin).

## Administration (`src/worker/routes/admin.ts`)

Toutes les routes ci-dessous sont montées sous `/api/admin/*` avec
`requireAuth` + `requireRole("admin")` (`src/worker/index.ts`) — réservées au rôle `admin`,
`403` sinon.

- `GET/POST /api/admin/games`, `PUT/DELETE /api/admin/games/:id` — CRUD des jeux
  (`{ name, description, imageUrl? }`). `DELETE` refusé (`409`) si des règles y sont rattachées.
- `GET /api/admin/rulesets[?gameId=]`, `GET /api/admin/rulesets/:id` (avec `referenceData`),
  `POST /api/admin/rulesets` (`{ gameId, name, description, imageUrl? }`, catalogue vide par
  défaut), `PUT /api/admin/rulesets/:id` (`{ name?, description?, imageUrl?, referenceData? }`),
  `DELETE /api/admin/rulesets/:id` — CRUD des règles. `DELETE` refusé (`409`) si un groupe
  l'utilise.
- `GET /api/admin/groups`, `GET /api/admin/groups/:id` (avec `members: GroupMember[]`),
  `POST /api/admin/groups` (`{ name, description, rulesetId, imageUrl?, driveUrl? }`),
  `PUT /api/admin/groups/:id` (mêmes champs, tous optionnels), `DELETE /api/admin/groups/:id` —
  CRUD des groupes de joueurs. `driveUrl` est le lien du dossier Drive du groupe, personnalisable
  indépendamment pour chacun (`player_groups.drive_url`, cf. migrations/0005_memberships.sql).
  `DELETE` refusé (`409`) si des comptes ou personnages y sont rattachés.
- `POST /api/admin/groups/:id/members` — Entrée : `{ userId: string }`. Ajoute ce compte comme
  membre du groupe (idempotent — `INSERT OR IGNORE` sur `group_memberships`). Sortie : `{ ok: true }`.
- `DELETE /api/admin/groups/:id/members/:userId` — Retire ce compte du groupe. Sortie : `{ ok: true }`.
- `GET /api/admin/users`, `POST /api/admin/users` (`{ username, displayName, role, groupId? }`
  → `{ user, password }`, mot de passe généré renvoyé une seule fois, même principe que
  `scripts/add_user.mjs` ; `groupId` crée aussi la première appartenance), `PUT /api/admin/users/:id`
  (`{ displayName?, role? }` **uniquement** — ne touche jamais l'appartenance aux groupes, pour
  éviter toute rétrogradation accidentelle : cf. l'incident du 18/08 où un endpoint combiné
  rôle+groupe avait démis un admin en le "réassignant"). L'appartenance aux groupes se gère
  exclusivement via les deux routes `/members` ci-dessus. Passer `role: "admin"` retire
  automatiquement toutes les appartenances existantes (un admin n'est membre d'aucun groupe).

`imageUrl` (games/rulesets/groups) est soit une data URL (image importée depuis l'admin ou la
page Profil, redimensionnée côté client via `resizePortraitToDataUrl`, même principe que le
portrait de personnage), soit un chemin d'asset statique (ex. `"/background.jpg"` pour le groupe
historique `add40k`).

## Jeux / règles / groupes en self-service (`src/worker/routes/catalog.ts`)

Montées directement sous `/api/games`, `/api/rulesets`, `/api/groups` (pas de préfixe `/admin`) —
accessibles à tout compte authentifié, pour la page "Mon profil" (rejoindre/créer/quitter un
groupe, ou éditer son propre groupe) sans passer par les routes CRUD complètes ci-dessus.

- `GET /api/games` — liste des jeux (résumé, comme `/api/admin/games`).
- `GET /api/rulesets[?gameId=]` — liste des règles (résumé, sans `referenceData`).
- `GET /api/groups` — liste des groupes de joueurs (résumé, sans `members`, avec `driveUrl`).
- `POST /api/groups/join` — Auth : joueur ou MJ (403 si admin). Entrée : `{ groupId }`. Ajoute
  l'appelant comme membre de ce groupe (idempotent). Sortie : `{ user: PublicUser }`
  (`memberships` mis à jour).
- `POST /api/groups/leave` — Auth : joueur ou MJ. Entrée : `{ groupId }`. Retire l'appelant de ce
  groupe. Sortie : `{ user: PublicUser }`.
- `POST /api/groups` — Auth : MJ uniquement (403 sinon). Entrée :
  `{ name, description?, rulesetId, imageUrl?, driveUrl? }`. Crée un nouveau groupe et y rattache
  automatiquement le MJ créateur (un MJ doit appartenir à un groupe pour y créer des PNJ/gérer des
  personnages, cf. `characters.ts`). Sortie : `{ group: PlayerGroup, user: PublicUser }`, code `201`.
- `PUT /api/groups/:id` — Auth : MJ membre de ce groupe uniquement (403 sinon, y compris pour un
  MJ d'un autre groupe). Entrée : `{ name?, description?, imageUrl?, driveUrl? }` — édition
  self-service limitée (pas de changement de règle, réservé à `/api/admin/groups/:id`). Sortie :
  `{ group: PlayerGroup }`.

## Types

Voir `src/shared/types.ts` (`Character`, `PublicUser`, `ReferenceData`, `Game`, `Ruleset`,
`RulesetDetail`, `PlayerGroup`, `PlayerGroupDetail`, `GroupMember`, `MembershipInfo`,
`ProfileInfo`) et `src/shared/calc-engine.ts` (`CharacterComputed`, `BudgetSummary`).

## Vérification de dérive

- `grep -r "app.route\|app.get\|app.post\|app.put" src/worker/` doit lister exactement les
  routes documentées ci-dessus.
