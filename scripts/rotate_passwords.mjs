#!/usr/bin/env node
// Régénère un mot de passe aléatoire pour chaque compte SANS toucher aux
// personnages (contrairement à generate_seed_sql.mjs, qui ré-écrit tout
// migrations/0002_seed.sql via des INSERT — inutilisable sur une base déjà
// seedée sans la vider). Produit des UPDATE ciblés sur `users`, à appliquer
// avec `wrangler d1 execute` (hors suivi de migrations, c'est une opération
// de données ponctuelle, pas un changement de schéma).
//
// Usage : node scripts/rotate_passwords.mjs
// Écrit :
//   - scripts/rotate-passwords.sql     (à appliquer puis supprimer — pas un artefact durable)
//   - scripts/generated-credentials.md (mots de passe en clair, gitignored — à distribuer puis supprimer)

import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
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
  const characters = JSON.parse(readFileSync(path.join(ROOT, "scripts", "characters.seed.json"), "utf-8"));

  const accounts = [
    { username: "mj", displayName: "Maître du jeu", role: "MJ", character: "(accès à toutes les fiches)" },
    ...characters.map((ch) => ({ username: ch.ownerUsername, displayName: ch.name, role: "Joueur", character: ch.name })),
  ];

  const sqlLines = [
    "-- Généré par scripts/rotate_passwords.mjs — à appliquer une fois puis supprimer.",
    "-- Déconnecte tout le monde (sessions existantes invalidées) et fixe les nouveaux mots de passe.",
    "",
    "DELETE FROM sessions;",
  ];
  const credentialLines = [
    "# Identifiants générés — à distribuer par canal privé (jamais par email en clair) puis supprimer ce fichier",
    "",
    "| Rôle | Username | Mot de passe | Personnage |",
    "|---|---|---|---|",
  ];

  for (const acc of accounts) {
    const password = randomPassword();
    const { hash, salt } = await hashPassword(password);
    sqlLines.push(
      `UPDATE users SET password_hash = ${sqlString(hash)}, password_salt = ${sqlString(salt)} ` +
        `WHERE username = ${sqlString(acc.username)};`,
    );
    credentialLines.push(`| ${acc.role} | ${acc.username} | ${password} | ${acc.character} |`);
  }

  writeFileSync(path.join(ROOT, "scripts", "rotate-passwords.sql"), sqlLines.join("\n") + "\n", "utf-8");
  writeFileSync(path.join(ROOT, "scripts", "generated-credentials.md"), credentialLines.join("\n") + "\n", "utf-8");

  console.log("écrit scripts/rotate-passwords.sql (à appliquer avec wrangler d1 execute --file, puis supprimer)");
  console.log("écrit scripts/generated-credentials.md (mots de passe en clair — à distribuer puis supprimer)");
}

main();
