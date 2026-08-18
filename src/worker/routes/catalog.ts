// Routes /api/games, /api/rulesets, /api/groups — en libre accès à tout
// compte authentifié (pas seulement admin) : parcourir les jeux/règles/
// groupes existants pour rejoindre un groupe (joueur ou MJ) ou en créer un
// nouveau (MJ uniquement). Le CRUD complet (édition/suppression, catalogue
// détaillé d'une règle, gestion fine des membres) reste réservé à l'admin
// sous /api/admin/* (routes/admin.ts) — ces routes-ci n'exposent que le
// minimum nécessaire aux écrans joueur/MJ (page Profil).

import { Hono } from "hono";
import type { Env } from "../lib/session";
import { uniqueSlugId } from "../lib/ids";
import type { Game, PlayerGroup, PublicUser, Ruleset } from "../../shared/types";

type HonoEnv = { Bindings: Env; Variables: { user: PublicUser } };

export const catalogRoutes = new Hono<HonoEnv>();

// ---------------------------------------------------------------------------
// Jeux — lecture seule ici (création/édition réservées à l'admin)
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

catalogRoutes.get("/games", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, description, image_url, created_at FROM games ORDER BY name",
  ).all<GameRow>();
  return c.json({ games: (results ?? []).map(toGame) });
});

// ---------------------------------------------------------------------------
// Règles — résumé (sans catalogue complet), pour le sélecteur de création de groupe
// ---------------------------------------------------------------------------

interface RulesetRow {
  id: string;
  game_id: string;
  name: string;
  description: string;
  image_url: string | null;
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

catalogRoutes.get("/rulesets", async (c) => {
  const gameId = c.req.query("gameId");
  const { results } = gameId
    ? await c.env.DB.prepare(
        "SELECT id, game_id, name, description, image_url, created_at FROM rulesets WHERE game_id = ?1 ORDER BY name",
      )
        .bind(gameId)
        .all<RulesetRow>()
    : await c.env.DB.prepare(
        "SELECT id, game_id, name, description, image_url, created_at FROM rulesets ORDER BY name",
      ).all<RulesetRow>();
  return c.json({ rulesets: (results ?? []).map(toRuleset) });
});

// ---------------------------------------------------------------------------
// Groupes — parcourir, rejoindre, ou (MJ) créer
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

catalogRoutes.get("/groups", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, description, ruleset_id, image_url, created_at FROM player_groups ORDER BY name",
  ).all<GroupRow>();
  return c.json({ groups: (results ?? []).map(toGroup) });
});

// Rejoindre un groupe existant — joueur ou MJ (un admin n'appartient à
// aucun groupe par construction, cf. lib/session.ts requireRole/canEditCharacter).
catalogRoutes.post("/groups/join", async (c) => {
  const user = c.get("user");
  if (user.role === "admin") return c.json({ error: "Un compte admin n'appartient à aucun groupe" }, 403);

  const body = await c.req.json<{ groupId?: string }>().catch(() => null);
  if (!body?.groupId) return c.json({ error: "Groupe requis" }, 400);

  const group = await c.env.DB.prepare("SELECT 1 FROM player_groups WHERE id = ?1").bind(body.groupId).first();
  if (!group) return c.json({ error: "Groupe introuvable" }, 404);

  await c.env.DB.prepare("UPDATE users SET player_group_id = ?1 WHERE id = ?2").bind(body.groupId, user.id).run();
  const updated: PublicUser = { ...user, playerGroupId: body.groupId };
  return c.json({ user: updated });
});

// Créer un nouveau groupe — réservé au MJ (un joueur rejoint une table déjà
// menée par un MJ, il n'en crée pas). Le MJ créateur rejoint automatiquement
// son propre groupe — un MJ sans groupe ne pourrait pas y créer de PNJ ni y
// gérer de personnages (cf. characters.ts, POST réservé à gm + playerGroupId).
catalogRoutes.post("/groups", async (c) => {
  const user = c.get("user");
  if (user.role !== "gm") return c.json({ error: "Réservé au MJ" }, 403);

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
  await c.env.DB.prepare("UPDATE users SET player_group_id = ?1 WHERE id = ?2").bind(id, user.id).run();

  const row = await c.env.DB.prepare(
    "SELECT id, name, description, ruleset_id, image_url, created_at FROM player_groups WHERE id = ?1",
  )
    .bind(id)
    .first<GroupRow>();
  const updatedUser: PublicUser = { ...user, playerGroupId: id };
  return c.json({ group: toGroup(row!), user: updatedUser }, 201);
});
