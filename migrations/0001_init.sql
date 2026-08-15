-- Schéma initial. Voir docs/API_REFERENCE.md pour les routes qui lisent/
-- écrivent ces tables, et src/shared/types.ts pour la forme de la colonne
-- `data` (JSON) de `characters`.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('gm', 'player')),
  character_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  race TEXT NOT NULL,
  owner_username TEXT NOT NULL,
  -- Objet Character (src/shared/types.ts) sérialisé. Les colonnes ci-dessus
  -- sont dupliquées depuis ce JSON uniquement pour permettre le tri/filtre
  -- dans la liste des personnages sans désérialiser côté SQL.
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_characters_owner ON characters(owner_username);
