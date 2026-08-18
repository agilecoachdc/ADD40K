// Résolution de session D1 + middleware Hono. Sépare les primitives crypto
// (lib/auth.ts) de l'accès base de données, pour rester testable/lisible.

import type { Context, Next } from "hono";
import type { PublicUser, UserRole } from "../../shared/types";
import { generateSessionToken, parseSessionCookie, sessionExpiry } from "./auth";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  character_id: string | null;
  player_group_id: string | null;
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = generateSessionToken();
  await db
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?1, ?2, ?3)")
    .bind(token, userId, sessionExpiry())
    .run();
  return token;
}

export async function destroySession(db: D1Database, token: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE token = ?1").bind(token).run();
}

export async function getUserForToken(db: D1Database, token: string): Promise<PublicUser | null> {
  const row = await db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.role, u.character_id, u.player_group_id
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?1 AND s.expires_at > datetime('now')`,
    )
    .bind(token)
    .first<UserRow>();
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    characterId: row.character_id,
    playerGroupId: row.player_group_id,
  };
}

type HonoEnv = { Bindings: Env; Variables: { user: PublicUser } };

/** Middleware : exige une session valide, sinon 401. Attache `user` au contexte. */
export async function requireAuth(c: Context<HonoEnv>, next: Next) {
  const token = parseSessionCookie(c.req.header("Cookie"));
  const user = token ? await getUserForToken(c.env.DB, token) : null;
  if (!user) {
    return c.json({ error: "Non authentifié" }, 401);
  }
  c.set("user", user);
  await next();
}

/**
 * Un joueur ne peut modifier que sa propre fiche ; le MJ peut modifier tout
 * personnage de son groupe (le sien exclu ne serait pas assigné à un MJ,
 * mais un MJ peut aussi avoir un personnage). `characterGroupId` est le
 * `player_group_id` du personnage visé — null pour une fiche pas encore
 * rattachée à un groupe (ne devrait plus arriver après migration).
 */
export function canEditCharacter(
  user: PublicUser,
  characterId: string,
  characterGroupId: string | null,
): boolean {
  if (user.role === "gm") return characterGroupId !== null && characterGroupId === user.playerGroupId;
  return user.characterId === characterId;
}

/** Middleware : exige que l'utilisateur ait l'un des rôles donnés, sinon 403. */
export function requireRole(...roles: UserRole[]) {
  return async (c: Context<HonoEnv>, next: Next) => {
    const user = c.get("user");
    if (!roles.includes(user.role)) {
      return c.json({ error: "Accès réservé" }, 403);
    }
    await next();
  };
}
