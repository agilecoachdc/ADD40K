# Référence API — add40k

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

### `GET /api/characters`
- Auth : session (tout utilisateur connecté).
- Sortie : `{ characters: CharacterSummary[] }` — résumé enrichi (portrait, statut `inGame`,
  `isNpc`, `archived`, PV/PSP courant + max calculé) utilisé par l'écran d'accueil et l'écran
  "Suivi des constantes" (MJ). `archived` masque la fiche des deux écrans sans la supprimer
  (bouton "Archiver"/"Désarchiver", MJ uniquement, écran d'accueil) ; `isNpc` peut être basculé
  dans les deux sens par le MJ (boutons "→ PNJ"/"→ Joueur"). Voir `src/shared/types.ts`.

### `GET /api/characters/:id`
- Auth : session (lecture ouverte à tout utilisateur connecté).
- Sortie : `{ character: Character, computed: CharacterComputed, canEdit: boolean }`.
  `computed` est calculé côté serveur via `src/shared/calc-engine.ts` (mêmes fonctions que le
  frontend, pour rester la source de vérité en cas de divergence de version de code).
- Erreurs : `404` si le personnage n'existe pas.

### `POST /api/characters`
- Auth : session + rôle `gm` uniquement.
- Entrée : `{ name: string, portraitUrl?: string | null, race?: string, vit?: number, vol?: number }`
  — crée un PNJ (`isNpc: true`, `inGame: true`). PV/PSP max suivent exactement le même calcul
  que pour un personnage de joueur (VIT/VOL + bonus racial + taille, `calc-engine.ts`) ; les
  autres attributs restent à 0. `id` généré
  par slug du nom (suffixe numérique en cas de collision).
- Sortie : `{ character: Character, computed: CharacterComputed, canEdit: true }`, code `201`.
- Erreurs : `403` (pas MJ), `400` (nom manquant).

### `PUT /api/characters/:id`
- Auth : session + `canEditCharacter` (propriétaire du personnage ou rôle `gm`).
- Entrée : `Partial<Character>` — fusionné avec les données existantes côté serveur
  (`id` et `ownerUsername` du client sont ignorés).
- Sortie : `{ character: Character, computed: CharacterComputed, canEdit: true }`.
- Erreurs : `403` (pas le propriétaire), `404` (personnage introuvable), `400` (JSON invalide).

## Types

Voir `src/shared/types.ts` (`Character`, `PublicUser`, `ReferenceData`) et
`src/shared/calc-engine.ts` (`CharacterComputed`, `BudgetSummary`).

## Vérification de dérive

- `grep -r "app.route\|app.get\|app.post\|app.put" src/worker/` doit lister exactement les
  routes documentées ci-dessus.
