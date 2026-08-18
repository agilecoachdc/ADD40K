// Routes /api/auth/* — voir docs/API_REFERENCE.md.

import { Hono } from "hono";
import type { Env } from "../lib/session";
import { createSession, destroySession, getMembershipsForUser, getUserForToken, toPublicUser } from "../lib/session";
import { verifyPassword, parseSessionCookie, serializeSessionCookie, clearSessionCookie } from "../lib/auth";
import type { UserRole } from "../../shared/types";

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  password_salt: string;
  role: UserRole;
  character_id: string | null;
}

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.post("/login", async (c) => {
  const body = await c.req
    .json<{ username?: string; password?: string }>()
    .catch(() => ({}) as { username?: string; password?: string });
  const { username, password } = body;
  if (!username || !password) {
    return c.json({ error: "username et password requis" }, 400);
  }

  const row = await c.env.DB.prepare("SELECT * FROM users WHERE username = ?1")
    .bind(username.trim().toLowerCase())
    .first<UserRow>();
  if (!row || !(await verifyPassword(password, row.password_hash, row.password_salt))) {
    return c.json({ error: "Identifiants invalides" }, 401);
  }

  const token = await createSession(c.env.DB, row.id);
  c.header("Set-Cookie", serializeSessionCookie(token));
  const memberships = await getMembershipsForUser(c.env.DB, row.id);
  const user = toPublicUser(row, memberships);
  return c.json({ user });
});

authRoutes.post("/logout", async (c) => {
  const token = parseSessionCookie(c.req.header("Cookie"));
  if (token) await destroySession(c.env.DB, token);
  c.header("Set-Cookie", clearSessionCookie());
  return c.json({ ok: true });
});

authRoutes.get("/me", async (c) => {
  const token = parseSessionCookie(c.req.header("Cookie"));
  const user = token ? await getUserForToken(c.env.DB, token) : null;
  if (!user) return c.json({ error: "Non authentifié" }, 401);
  return c.json({ user });
});
