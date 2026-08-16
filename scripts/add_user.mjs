#!/usr/bin/env node
// Crée un compte isolé (MJ ou joueur), sans passer par le re-seed complet
// de generate_seed_sql.mjs (qui ré-écrit tous les personnages) ni par
// rotate_passwords.mjs (qui suppose que le compte existe déjà). Utile pour
// ajouter un joueur en cours de route, avec ou sans personnage assigné.
//
// Usage : node scripts/add_user.mjs <username> "<Nom affiché>" [character_id] [--gm]
// Écrit :
//   - scripts/add-user.sql (à appliquer avec wrangler d1 execute --file, puis supprimer)
//   - affiche le mot de passe généré dans la console (pas de fichier séparé,
//     un seul compte à la fois — contrairement à generated-credentials.md
//     qui liste tout le monde)

import { randomBytes, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PBKDF2_ITERATIONS = 100_000; // doit rester identique à src/worker/lib/auth.ts (plafond runtime Workers en prod)

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return { hash: toHex(bits), salt: toHex(salt.buffer) };
}

function randomPassword() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  const args = process.argv.slice(2);
  const isGm = args.includes("--gm");
  const positional = args.filter((a) => a !== "--gm");
  const [username, displayName, characterId] = positional;

  if (!username || !displayName) {
    console.error('Usage: node scripts/add_user.mjs <username> "<Nom affiché>" [character_id] [--gm]');
    process.exit(1);
  }

  const password = randomPassword();
  const { hash, salt } = await hashPassword(password);
  const role = isGm ? "gm" : "player";

  const sql =
    `INSERT INTO users (id, username, display_name, password_hash, password_salt, role, character_id) VALUES (` +
    `${sqlString(randomUUID())}, ${sqlString(username.trim().toLowerCase())}, ${sqlString(displayName)}, ` +
    `${sqlString(hash)}, ${sqlString(salt)}, ${sqlString(role)}, ${characterId ? sqlString(characterId) : "NULL"});\n`;

  writeFileSync(path.join(ROOT, "scripts", "add-user.sql"), sql, "utf-8");

  console.log("écrit scripts/add-user.sql (à appliquer avec wrangler d1 execute --file, puis supprimer)");
  console.log(`\nCompte : ${username} (${role}${characterId ? `, personnage : ${characterId}` : ", sans personnage"})`);
  console.log(`Mot de passe : ${password}`);
}

main();
