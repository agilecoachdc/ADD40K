#!/usr/bin/env node
// Génère migrations/0002_seed.sql (personnages + comptes) à partir de
// characters.seed.json (produit par import_xlsx.py). Régénère aussi un
// nouveau mot de passe aléatoire à chaque exécution — relancer ce script
// invalide donc les mots de passe précédents (les sessions existantes en
// D1 restent valides tant qu'elles ne sont pas explicitement révoquées).
//
// Usage : node scripts/generate_seed_sql.mjs
// Écrit :
//   - migrations/0002_seed.sql        (à appliquer avec `npm run db:migrate:local/remote`)
//   - scripts/generated-credentials.md (mots de passe en clair, gitignored — à distribuer par le MJ puis supprimer)

import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PBKDF2_ITERATIONS = 210_000; // doit rester identique à src/worker/lib/auth.ts

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
  // Lisible à la main (pas de caractères ambigus 0/O/1/l), suffisant pour un
  // mot de passe temporaire distribué hors-ligne puis changé par le joueur.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  const characters = JSON.parse(readFileSync(path.join(ROOT, "scripts", "characters.seed.json"), "utf-8"));

  const sqlLines = [
    "-- Généré par scripts/generate_seed_sql.mjs — NE PAS ÉDITER À LA MAIN.",
    "-- Contient les 8 personnages importés + un compte par joueur + le compte MJ.",
    "",
  ];
  const credentialLines = [
    "# Identifiants générés — à distribuer par canal privé (jamais par email en clair) puis supprimer ce fichier",
    "",
    "| Rôle | Username | Mot de passe | Personnage |",
    "|---|---|---|---|",
  ];

  // Personnages
  for (const ch of characters) {
    sqlLines.push(
      `INSERT INTO characters (id, name, race, owner_username, data, updated_at) VALUES (` +
        `${sqlString(ch.id)}, ${sqlString(ch.name)}, ${sqlString(ch.race)}, ` +
        `${sqlString(ch.ownerUsername)}, ${sqlString(JSON.stringify(ch))}, ${sqlString(ch.updatedAt)});`,
    );
  }
  sqlLines.push("");

  // Compte MJ
  const gmPassword = randomPassword();
  const gm = await hashPassword(gmPassword);
  sqlLines.push(
    `INSERT INTO users (id, username, display_name, password_hash, password_salt, role, character_id) VALUES (` +
      `${sqlString(randomUUID())}, 'mj', 'Maître du jeu', ${sqlString(gm.hash)}, ${sqlString(gm.salt)}, 'gm', NULL);`,
  );
  credentialLines.push(`| MJ | mj | ${gmPassword} | (accès à toutes les fiches) |`);

  // Un compte par personnage
  for (const ch of characters) {
    const password = randomPassword();
    const { hash, salt } = await hashPassword(password);
    sqlLines.push(
      `INSERT INTO users (id, username, display_name, password_hash, password_salt, role, character_id) VALUES (` +
        `${sqlString(randomUUID())}, ${sqlString(ch.ownerUsername)}, ${sqlString(ch.name)}, ` +
        `${sqlString(hash)}, ${sqlString(salt)}, 'player', ${sqlString(ch.id)});`,
    );
    credentialLines.push(`| Joueur | ${ch.ownerUsername} | ${password} | ${ch.name} |`);
  }

  writeFileSync(path.join(ROOT, "migrations", "0002_seed.sql"), sqlLines.join("\n") + "\n", "utf-8");
  writeFileSync(path.join(ROOT, "scripts", "generated-credentials.md"), credentialLines.join("\n") + "\n", "utf-8");

  console.log("écrit migrations/0002_seed.sql");
  console.log("écrit scripts/generated-credentials.md (mots de passe en clair — à distribuer puis supprimer)");
  console.log(
    "\nRappel usernames provisoires (cf. scripts/import-report.md) : à corriger en base après distribution " +
      "si un joueur a un pseudo différent de son nom de personnage slugifié.",
  );
}

main();
