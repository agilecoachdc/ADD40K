#!/usr/bin/env node
// Génère migrations/0003_platform.sql — schéma jeux/règles/groupes de
// joueurs, plus le backfill qui fait des données actuelles le jeu/règle/
// groupe "ADD40K". Réutilise tel quel le catalogue de
// src/shared/reference-data.ts (transpilé à la volée via le compilateur
// TypeScript, déjà en devDependency) plutôt que de le recopier à la main —
// ~1000 lignes, trop risqué à retaper.
//
// Usage : node scripts/generate_platform_seed_sql.mjs
// Écrit : migrations/0003_platform.sql

import ts from "typescript";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function loadReferenceData() {
  const source = readFileSync(path.join(ROOT, "src/shared/reference-data.ts"), "utf-8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  const tmpDir = mkdtempSync(path.join(tmpdir(), "add40k-refdata-"));
  const tmpFile = path.join(tmpDir, "reference-data.mjs");
  writeFileSync(tmpFile, outputText);
  try {
    const mod = await import(pathToFileURL(tmpFile).href);
    return mod.referenceData;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  const referenceData = await loadReferenceData();
  const referenceDataJson = JSON.stringify(referenceData);

  const sql = `-- Généré par scripts/generate_platform_seed_sql.mjs — NE PAS ÉDITER À LA MAIN.
-- Ajoute le modèle plateforme (jeux/règles/groupes de joueurs) et migre les
-- données existantes vers le jeu/règle/groupe "ADD40K".

-- ---------------------------------------------------------------------------
-- Schéma
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rulesets (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- ReferenceData (src/shared/types.ts) sérialisé JSON : races,
  -- skillCostTable, skills, weapons, armor, psyPowers, advantages. Éditable
  -- via la page d'admin Jeux & règles (routes /api/admin/rulesets).
  reference_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rulesets_game ON rulesets(game_id);

CREATE TABLE IF NOT EXISTS player_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ruleset_id TEXT NOT NULL REFERENCES rulesets(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_player_groups_ruleset ON player_groups(ruleset_id);

-- users.role doit désormais accepter 'admin' en plus de 'gm'/'player'.
-- SQLite n'autorise pas d'altérer un CHECK existant : on reconstruit la
-- table (pattern standard create/copy/drop/rename) plutôt que de la muter.
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gm', 'player')),
  character_id TEXT,
  -- Groupe de joueurs auquel ce compte est rattaché (NULL pour un admin
  -- plateforme). Rempli pour les comptes existants par le backfill ci-dessous.
  player_group_id TEXT REFERENCES player_groups(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO users_new (id, username, display_name, password_hash, password_salt, role, character_id, player_group_id, created_at)
  SELECT id, username, display_name, password_hash, password_salt, role, character_id, NULL, created_at FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- Personnages : rattachement à un groupe, pour l'isolation des données
-- entre groupes (GET /api/characters ne renvoie que celles du groupe de
-- l'appelant).
ALTER TABLE characters ADD COLUMN player_group_id TEXT REFERENCES player_groups(id);

-- ---------------------------------------------------------------------------
-- Backfill : les données actuelles deviennent le jeu/règle/groupe "ADD40K"
-- ---------------------------------------------------------------------------

INSERT INTO games (id, name, description) VALUES ('add40k', 'ADD40K', 'Jeu de rôle ADD40K.');

INSERT INTO rulesets (id, game_id, name, description, reference_data)
  VALUES ('add40k', 'add40k', 'ADD40K', 'Règle ADD40K (catalogue initial).', ${sqlString(referenceDataJson)});

INSERT INTO player_groups (id, name, description, ruleset_id)
  VALUES ('add40k', 'ADD40K', 'Groupe de joueurs historique (MJ + 8 joueurs).', 'add40k');

UPDATE users SET player_group_id = 'add40k' WHERE player_group_id IS NULL;
UPDATE characters SET player_group_id = 'add40k' WHERE player_group_id IS NULL;
`;

  writeFileSync(path.join(ROOT, "migrations/0003_platform.sql"), sql);
  console.log("Écrit migrations/0003_platform.sql");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
