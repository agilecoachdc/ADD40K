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

Toutes les routes ci-dessous sont scopées au groupe de joueurs de l'appelant
(`user.playerGroupId`, cf. migrations/0003_platform.sql) : un compte ne voit et
ne modifie que les personnages de son propre groupe. Le catalogue de référence
(`ReferenceData`) n'est plus un import statique ADD40K : il est chargé depuis
la règle assignée au groupe (`getReferenceDataForGroup`,
`src/worker/lib/reference.ts`) et renvoyé dans chaque réponse.

### `GET /api/characters`
- Auth : session (tout utilisateur connecté).
- Sortie : `{ characters: CharacterSummary[], referenceData: ReferenceData | null, groupImageUrl: string | null }`
  — résumé enrichi (portrait, statut `inGame`, `isNpc`, `archived`, PV/PSP courant + max calculé)
  utilisé par l'écran d'accueil et l'écran "Suivi des constantes" (MJ). `referenceData`/
  `groupImageUrl` sont `null` pour un compte sans groupe (admin) ; `groupImageUrl` est l'image du
  groupe (`player_groups.image_url`) utilisée comme fond d'écran — plus de fond ADD40K en dur.
  `archived` masque la fiche des deux écrans sans la supprimer (bouton "Archiver"/"Désarchiver",
  MJ uniquement, écran d'accueil) ; `isNpc` peut être basculé dans les deux sens par le MJ
  (boutons "→ PNJ"/"→ Joueur"). Voir `src/shared/types.ts`.

### `GET /api/characters/:id`
- Auth : session ; lecture ouverte à tout membre du même groupe que le personnage.
- Sortie : `{ character: Character, computed: CharacterComputed, canEdit: boolean, referenceData: ReferenceData, groupImageUrl: string | null }`.
  `computed` est calculé côté serveur via `src/shared/calc-engine.ts` (mêmes fonctions que le
  frontend, pour rester la source de vérité en cas de divergence de version de code).
- Erreurs : `404` si le personnage n'existe pas *ou* appartient à un autre groupe (traité comme
  inexistant, pas de fuite d'existence).

### `POST /api/characters`
- Auth : session + rôle `gm` uniquement, avec un groupe assigné.
- Entrée : `{ name: string, portraitUrl?: string | null, race?: string, vit?: number, vol?: number }`
  — crée un PNJ (`isNpc: true`, `inGame: true`) rattaché au groupe du MJ créateur. PV/PSP max
  suivent exactement le même calcul que pour un personnage de joueur (VIT/VOL + bonus racial +
  taille, `calc-engine.ts`) ; les autres attributs restent à 0. `id` généré par slug du nom
  (suffixe numérique en cas de collision).
- Sortie : `{ character: Character, computed: CharacterComputed, canEdit: true, referenceData: ReferenceData }`, code `201`.
- Erreurs : `403` (pas MJ ou pas de groupe), `400` (nom manquant).

### `PUT /api/characters/:id`
- Auth : session + `canEditCharacter` (propriétaire du personnage, ou rôle `gm` du même groupe).
- Entrée : `Partial<Character>` — fusionné avec les données existantes côté serveur
  (`id` et `ownerUsername` du client sont ignorés).
- Sortie : `{ character: Character, computed: CharacterComputed, canEdit: true, referenceData: ReferenceData }`.
- Erreurs : `403` (pas le propriétaire ni MJ du groupe), `404` (personnage introuvable), `400` (JSON invalide).

## Profil (`src/worker/routes/profile.ts`)

### `GET /api/profile`
- Auth : session (tout rôle).
- Sortie : `{ user: PublicUser, group: PlayerGroup | null, ruleset: Ruleset | null, game: Game | null }`
  — contexte plateforme de l'appelant (page "Mon profil"). `group`/`ruleset`/`game` sont `null`
  pour un compte sans groupe (admin).

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
  `POST /api/admin/groups` (`{ name, description, rulesetId, imageUrl? }`),
  `PUT /api/admin/groups/:id`, `DELETE /api/admin/groups/:id` — CRUD des groupes de joueurs.
  `DELETE` refusé (`409`) si des comptes y sont rattachés.
- `GET /api/admin/users`, `POST /api/admin/users` (`{ username, displayName, role, playerGroupId? }`
  → `{ user, password }`, mot de passe généré renvoyé une seule fois, même principe que
  `scripts/add_user.mjs`), `PUT /api/admin/users/:id` (`{ displayName?, role?, playerGroupId? }`,
  réassignation de rôle/groupe) — gestion des comptes.

`imageUrl` (games/rulesets/groups) est soit une data URL (image importée depuis l'admin ou la
page Profil, redimensionnée côté client via `resizePortraitToDataUrl`, même principe que le
portrait de personnage), soit un chemin d'asset statique (ex. `"/background.jpg"` pour le groupe
historique `add40k`).

## Jeux / règles / groupes en self-service (`src/worker/routes/catalog.ts`)

Montées directement sous `/api/games`, `/api/rulesets`, `/api/groups` (pas de préfixe `/admin`) —
accessibles à tout compte authentifié, pour la page "Mon profil" (rejoindre/créer un groupe) sans
passer par les routes CRUD complètes ci-dessus.

- `GET /api/games` — liste des jeux (résumé, comme `/api/admin/games`).
- `GET /api/rulesets[?gameId=]` — liste des règles (résumé, sans `referenceData`).
- `GET /api/groups` — liste des groupes de joueurs (résumé, sans `members`).
- `POST /api/groups/join` — Auth : joueur ou MJ (403 si admin). Entrée : `{ groupId }`. Rattache
  l'appelant à ce groupe (`users.player_group_id`). Sortie : `{ user: PublicUser }`.
- `POST /api/groups` — Auth : MJ uniquement (403 sinon). Entrée :
  `{ name, description?, rulesetId, imageUrl? }`. Crée un nouveau groupe et y rattache
  automatiquement le MJ créateur (un MJ doit appartenir à un groupe pour y créer des PNJ/gérer des
  personnages, cf. `characters.ts`). Sortie : `{ group: PlayerGroup, user: PublicUser }`, code `201`.

## Types

Voir `src/shared/types.ts` (`Character`, `PublicUser`, `ReferenceData`, `Game`, `Ruleset`,
`RulesetDetail`, `PlayerGroup`, `PlayerGroupDetail`, `GroupMember`, `ProfileInfo`) et
`src/shared/calc-engine.ts` (`CharacterComputed`, `BudgetSummary`).

## Vérification de dérive

- `grep -r "app.route\|app.get\|app.post\|app.put" src/worker/` doit lister exactement les
  routes documentées ci-dessus.
