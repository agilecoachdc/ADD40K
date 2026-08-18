// Routes /api/admin/* — gestion plateforme (jeux, règles, groupes de
// joueurs, comptes). Montées avec requireAuth + requireRole("admin") dans
// index.ts : tout accès ici suppose déjà un compte admin authentifié.
// Voir docs/API_REFERENCE.md pour le détail des routes.

import { Hono } from "hono";
import type { Env } from "../lib/session";
import { hashPassword } from "../lib/auth";
import { uniqueSlugId } from "../lib/ids";
import type {
  Game,
  GroupMember,
  PlayerGroup,
  PlayerGroupDetail,
  PublicUser,
  ReferenceData,
  Ruleset,
  RulesetDetail,
  UserRole,
} from "../../shared/types";

type HonoEnv = { Bindings: Env; Variables: { user: PublicUser } };

export const adminRoutes = new Hono<HonoEnv>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_REFERENCE_DATA: ReferenceData = {
  races: [],
  skillCostTable: {},
  skills: [],
  weapons: [],
  armor: [],
  psyPowers: [],
  advantages: [],
};

function randomPassword(): string {
  // Lisible à la main (pas de caractères ambigus 0/O/1/l) — mêmes règles que
  // scripts/add_user.mjs, affiché une seule fois côté admin.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

// ---------------------------------------------------------------------------
// Jeux
// ---------------------------------------------------------------------------

interface GameRow {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  created_at: string;
}

function toGame(row: GameRow): Game {
  return { id: row.id, name: row.name, description: row.description, imageUrl: row.image_url, createdAt: row.created_at };
}

adminRoutes.get("/games", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id, name, description, image_url, created_at FROM games ORDER BY name").all<GameRow>();
  return c.json({ games: (results ?? []).map(toGame) });
});

adminRoutes.post("/games", async (c) => {
  const body = await c.req.json<{ name?: string; description?: string; imageUrl?: string | null }>().catch(() => null);
  if (!body?.name?.trim()) return c.json({ error: "Nom requis" }, 400);

  const id = await uniqueSlugId(c.env.DB, "games", body.name);
  await c.env.DB.prepare("INSERT INTO games (id, name, description, image_url) VALUES (?1, ?2, ?3, ?4)")
    .bind(id, body.name.trim(), body.description?.trim() ?? "", body.imageUrl ?? null)
    .run();
  const row = await c.env.DB.prepare("SELECT id, name, description, image_url, created_at FROM games WHERE id = ?1").bind(id).first<GameRow>();
  return c.json({ game: toGame(row!) }, 201);
});

adminRoutes.put("/games/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ name?: string; description?: string; imageUrl?: string | null }>().catch(() => null);
  const existing = await c.env.DB.prepare("SELECT id, name, description, image_url, created_at FROM games WHERE id = ?1").bind(id).first<GameRow>();
  if (!existing) return c.json({ error: "Jeu introuvable" }, 404);

  const name = body?.name?.trim() || existing.name;
  const description = body?.description ?? existing.description;
  const imageUrl = body?.imageUrl !== undefined ? body.imageUrl : existing.image_url;
  await c.env.DB.prepare("UPDATE games SET name = ?1, description = ?2, image_url = ?3 WHERE id = ?4")
    .bind(name, description, imageUrl, id)
    .run();
  return c.json({ game: { id, name, description, imageUrl, createdAt: existing.created_at } });
});

adminRoutes.delete("/games/:id", async (c) => {
  const id = c.req.param("id");
  const inUse = await c.env.DB.prepare("SELECT 1 FROM rulesets WHERE game_id = ?1").bind(id).first();
  if (inUse) return c.json({ error: "Ce jeu a des règles rattachées — supprimez-les d'abord" }, 409);
  await c.env.DB.prepare("DELETE FROM games WHERE id = ?1").bind(id).run();
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Règles (rulesets)
// ---------------------------------------------------------------------------

interface RulesetRow {
  id: string;
  game_id: string;
  name: string;
  description: string;
  image_url: string | null;
  reference_data: string;
  created_at: string;
}

function toRuleset(row: RulesetRow): Ruleset {
  return {
    id: row.id,
    gameId: row.game_id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

adminRoutes.get("/rulesets", async (c) => {
  const gameId = c.req.query("gameId");
  const { results } = gameId
    ? await c.env.DB.prepare(
        "SELECT id, game_id, name, description, image_url, reference_data, created_at FROM rulesets WHERE game_id = ?1 ORDER BY name",
      )
        .bind(gameId)
        .all<RulesetRow>()
    : await c.env.DB.prepare(
        "SELECT id, game_id, name, description, image_url, reference_data, created_at FROM rulesets ORDER BY name",
      ).all<RulesetRow>();
  return c.json({ rulesets: (results ?? []).map(toRuleset) });
});

adminRoutes.get("/rulesets/:id", async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT id, game_id, name, description, image_url, reference_data, created_at FROM rulesets WHERE id = ?1",
  )
    .bind(c.req.param("id"))
    .first<RulesetRow>();
  if (!row) return c.json({ error: "Règle introuvable" }, 404);
  const detail: RulesetDetail = { ...toRuleset(row), referenceData: JSON.parse(row.reference_data) };
  return c.json({ ruleset: detail });
});

adminRoutes.post("/rulesets", async (c) => {
  const body = await c.req
    .json<{ gameId?: string; name?: string; description?: string; imageUrl?: string | null }>()
    .catch(() => null);
  if (!body?.gameId || !body.name?.trim()) return c.json({ error: "Jeu et nom requis" }, 400);

  const game = await c.env.DB.prepare("SELECT 1 FROM games WHERE id = ?1").bind(body.gameId).first();
  if (!game) return c.json({ error: "Jeu introuvable" }, 404);

  const id = await uniqueSlugId(c.env.DB, "rulesets", body.name);
  const referenceDataJson = JSON.stringify(EMPTY_REFERENCE_DATA);
  await c.env.DB.prepare(
    "INSERT INTO rulesets (id, game_id, name, description, image_url, reference_data) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
  )
    .bind(id, body.gameId, body.name.trim(), body.description?.trim() ?? "", body.imageUrl ?? null, referenceDataJson)
    .run();
  const row = await c.env.DB.prepare(
    "SELECT id, game_id, name, description, image_url, reference_data, created_at FROM rulesets WHERE id = ?1",
  )
    .bind(id)
    .first<RulesetRow>();
  const detail: RulesetDetail = { ...toRuleset(row!), referenceData: EMPTY_REFERENCE_DATA };
  return c.json({ ruleset: detail }, 201);
});

adminRoutes.put("/rulesets/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req
    .json<{ name?: string; description?: string; imageUrl?: string | null; referenceData?: ReferenceData }>()
    .catch(() => null);
  const existing = await c.env.DB.prepare(
    "SELECT id, game_id, name, description, image_url, reference_data, created_at FROM rulesets WHERE id = ?1",
  )
    .bind(id)
    .first<RulesetRow>();
  if (!existing) return c.json({ error: "Règle introuvable" }, 404);

  const name = body?.name?.trim() || existing.name;
  const description = body?.description ?? existing.description;
  const imageUrl = body?.imageUrl !== undefined ? body.imageUrl : existing.image_url;
  const referenceData = body?.referenceData ?? JSON.parse(existing.reference_data);
  await c.env.DB.prepare(
    "UPDATE rulesets SET name = ?1, description = ?2, image_url = ?3, reference_data = ?4 WHERE id = ?5",
  )
    .bind(name, description, imageUrl, JSON.stringify(referenceData), id)
    .run();
  const detail: RulesetDetail = {
    id,
    gameId: existing.game_id,
    name,
    description,
    imageUrl,
    createdAt: existing.created_at,
    referenceData,
  };
  return c.json({ ruleset: detail });
});

adminRoutes.delete("/rulesets/:id", async (c) => {
  const id = c.req.param("id");
  const inUse = await c.env.DB.prepare("SELECT 1 FROM player_groups WHERE ruleset_id = ?1").bind(id).first();
  if (inUse) return c.json({ error: "Cette règle est utilisée par un groupe — réassignez-le d'abord" }, 409);
  await c.env.DB.prepare("DELETE FROM rulesets WHERE id = ?1").bind(id).run();
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Groupes de joueurs
// ---------------------------------------------------------------------------

interface GroupRow {
  id: string;
  name: string;
  description: string;
  ruleset_id: string;
  image_url: string | null;
  created_at: string;
}

function toGroup(row: GroupRow): PlayerGroup {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    rulesetId: row.ruleset_id,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

adminRoutes.get("/groups", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, description, ruleset_id, image_url, created_at FROM player_groups ORDER BY name",
  ).all<GroupRow>();
  return c.json({ groups: (results ?? []).map(toGroup) });
});

adminRoutes.get("/groups/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(
    "SELECT id, name, description, ruleset_id, image_url, created_at FROM player_groups WHERE id = ?1",
  )
    .bind(id)
    .first<GroupRow>();
  if (!row) return c.json({ error: "Groupe introuvable" }, 404);

  const { results: memberRows } = await c.env.DB.prepare(
    "SELECT id, username, display_name, role, character_id FROM users WHERE player_group_id = ?1 ORDER BY display_name",
  )
    .bind(id)
    .all<{ id: string; username: string; display_name: string; role: UserRole; character_id: string | null }>();
  const members: GroupMember[] = (memberRows ?? []).map((m) => ({
    id: m.id,
    username: m.username,
    displayName: m.display_name,
    role: m.role,
    characterId: m.character_id,
  }));

  const detail: PlayerGroupDetail = { ...toGroup(row), members };
  return c.json({ group: detail });
});

adminRoutes.post("/groups", async (c) => {
  const body = await c.req
    .json<{ name?: string; description?: string; rulesetId?: string; imageUrl?: string | null }>()
    .catch(() => null);
  if (!body?.name?.trim() || !body.rulesetId) return c.json({ error: "Nom et règle requis" }, 400);

  const ruleset = await c.env.DB.prepare("SELECT 1 FROM rulesets WHERE id = ?1").bind(body.rulesetId).first();
  if (!ruleset) return c.json({ error: "Règle introuvable" }, 404);

  const id = await uniqueSlugId(c.env.DB, "player_groups", body.name);
  await c.env.DB.prepare(
    "INSERT INTO player_groups (id, name, description, ruleset_id, image_url) VALUES (?1, ?2, ?3, ?4, ?5)",
  )
    .bind(id, body.name.trim(), body.description?.trim() ?? "", body.rulesetId, body.imageUrl ?? null)
    .run();
  const row = await c.env.DB.prepare(
    "SELECT id, name, description, ruleset_id, image_url, created_at FROM player_groups WHERE id = ?1",
  )
    .bind(id)
    .first<GroupRow>();
  const detail: PlayerGroupDetail = { ...toGroup(row!), members: [] };
  return c.json({ group: detail }, 201);
});

adminRoutes.put("/groups/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req
    .json<{ name?: string; description?: string; rulesetId?: string; imageUrl?: string | null }>()
    .catch(() => null);
  const existing = await c.env.DB.prepare(
    "SELECT id, name, description, ruleset_id, image_url, created_at FROM player_groups WHERE id = ?1",
  )
    .bind(id)
    .first<GroupRow>();
  if (!existing) return c.json({ error: "Groupe introuvable" }, 404);

  if (body?.rulesetId) {
    const ruleset = await c.env.DB.prepare("SELECT 1 FROM rulesets WHERE id = ?1").bind(body.rulesetId).first();
    if (!ruleset) return c.json({ error: "Règle introuvable" }, 404);
  }

  const name = body?.name?.trim() || existing.name;
  const description = body?.description ?? existing.description;
  const rulesetId = body?.rulesetId ?? existing.ruleset_id;
  const imageUrl = body?.imageUrl !== undefined ? body.imageUrl : existing.image_url;
  await c.env.DB.prepare(
    "UPDATE player_groups SET name = ?1, description = ?2, ruleset_id = ?3, image_url = ?4 WHERE id = ?5",
  )
    .bind(name, description, rulesetId, imageUrl, id)
    .run();
  return c.json({ group: { id, name, description, rulesetId, imageUrl, createdAt: existing.created_at } });
});

adminRoutes.delete("/groups/:id", async (c) => {
  const id = c.req.param("id");
  const hasMembers = await c.env.DB.prepare("SELECT 1 FROM users WHERE player_group_id = ?1").bind(id).first();
  if (hasMembers) return c.json({ error: "Ce groupe a des comptes rattachés — réassignez-les d'abord" }, 409);
  await c.env.DB.prepare("DELETE FROM player_groups WHERE id = ?1").bind(id).run();
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Comptes
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  character_id: string | null;
  player_group_id: string | null;
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    characterId: row.character_id,
    playerGroupId: row.player_group_id,
  };
}

adminRoutes.get("/users", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, username, display_name, role, character_id, player_group_id FROM users ORDER BY display_name",
  ).all<UserRow>();
  return c.json({ users: (results ?? []).map(toPublicUser) });
});

const VALID_ROLES: UserRole[] = ["admin", "gm", "player"];

adminRoutes.post("/users", async (c) => {
  const body = await c.req
    .json<{ username?: string; displayName?: string; role?: UserRole; playerGroupId?: string | null }>()
    .catch(() => null);
  const username = body?.username?.trim().toLowerCase();
  if (!username || !body?.displayName?.trim()) return c.json({ error: "Identifiant et nom requis" }, 400);
  if (!body.role || !VALID_ROLES.includes(body.role)) return c.json({ error: "Rôle invalide" }, 400);

  const existing = await c.env.DB.prepare("SELECT 1 FROM users WHERE username = ?1").bind(username).first();
  if (existing) return c.json({ error: "Cet identifiant est déjà pris" }, 409);

  if (body.playerGroupId) {
    const group = await c.env.DB.prepare("SELECT 1 FROM player_groups WHERE id = ?1").bind(body.playerGroupId).first();
    if (!group) return c.json({ error: "Groupe introuvable" }, 404);
  }

  const id = crypto.randomUUID();
  const password = randomPassword();
  const { hash, salt } = await hashPassword(password);
  const playerGroupId = body.role === "admin" ? null : (body.playerGroupId ?? null);

  await c.env.DB.prepare(
    "INSERT INTO users (id, username, display_name, password_hash, password_salt, role, player_group_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
  )
    .bind(id, username, body.displayName.trim(), hash, salt, body.role, playerGroupId)
    .run();

  const user: PublicUser = {
    id,
    username,
    displayName: body.displayName.trim(),
    role: body.role,
    characterId: null,
    playerGroupId,
  };
  // Mot de passe généré renvoyé une seule fois — à communiquer hors-ligne, cf. scripts/add_user.mjs.
  return c.json({ user, password }, 201);
});

adminRoutes.put("/users/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req
    .json<{ displayName?: string; role?: UserRole; playerGroupId?: string | null }>()
    .catch(() => null);
  const existing = await c.env.DB.prepare(
    "SELECT id, username, display_name, role, character_id, player_group_id FROM users WHERE id = ?1",
  )
    .bind(id)
    .first<UserRow>();
  if (!existing) return c.json({ error: "Compte introuvable" }, 404);

  if (body?.role && !VALID_ROLES.includes(body.role)) return c.json({ error: "Rôle invalide" }, 400);
  if (body?.playerGroupId) {
    const group = await c.env.DB.prepare("SELECT 1 FROM player_groups WHERE id = ?1").bind(body.playerGroupId).first();
    if (!group) return c.json({ error: "Groupe introuvable" }, 404);
  }

  const displayName = body?.displayName?.trim() || existing.display_name;
  const role = body?.role ?? existing.role;
  const playerGroupId = role === "admin" ? null : (body?.playerGroupId ?? existing.player_group_id);

  await c.env.DB.prepare("UPDATE users SET display_name = ?1, role = ?2, player_group_id = ?3 WHERE id = ?4")
    .bind(displayName, role, playerGroupId, id)
    .run();

  return c.json({ user: toPublicUser({ ...existing, display_name: displayName, role, player_group_id: playerGroupId }) });
});
