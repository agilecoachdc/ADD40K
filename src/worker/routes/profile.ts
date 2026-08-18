// Route /api/profile — contexte plateforme de l'utilisateur connecté (son
// groupe de joueurs, la règle et le jeu qui en découlent). Accessible à tout
// rôle authentifié (contrairement à /api/admin/*) : un joueur ou un MJ doit
// pouvoir voir dans quel groupe il se trouve (page Profil, frontend). Un
// admin sans groupe reçoit group/ruleset/game à null.

import { Hono } from "hono";
import type { Env } from "../lib/session";
import type { Game, PlayerGroup, PublicUser, ProfileInfo, Ruleset } from "../../shared/types";

type HonoEnv = { Bindings: Env; Variables: { user: PublicUser } };

interface GroupRow {
  id: string;
  name: string;
  description: string;
  ruleset_id: string;
  created_at: string;
}

interface RulesetRow {
  id: string;
  game_id: string;
  name: string;
  description: string;
  created_at: string;
}

interface GameRow {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export const profileRoutes = new Hono<HonoEnv>();

profileRoutes.get("/", async (c) => {
  const user = c.get("user");

  if (!user.playerGroupId) {
    const info: ProfileInfo = { user, group: null, ruleset: null, game: null };
    return c.json(info);
  }

  const groupRow = await c.env.DB.prepare(
    "SELECT id, name, description, ruleset_id, created_at FROM player_groups WHERE id = ?1",
  )
    .bind(user.playerGroupId)
    .first<GroupRow>();
  if (!groupRow) {
    const info: ProfileInfo = { user, group: null, ruleset: null, game: null };
    return c.json(info);
  }

  const rulesetRow = await c.env.DB.prepare(
    "SELECT id, game_id, name, description, created_at FROM rulesets WHERE id = ?1",
  )
    .bind(groupRow.ruleset_id)
    .first<RulesetRow>();
  const gameRow = rulesetRow
    ? await c.env.DB.prepare("SELECT id, name, description, created_at FROM games WHERE id = ?1")
        .bind(rulesetRow.game_id)
        .first<GameRow>()
    : null;

  const group: PlayerGroup = {
    id: groupRow.id,
    name: groupRow.name,
    description: groupRow.description,
    rulesetId: groupRow.ruleset_id,
    createdAt: groupRow.created_at,
  };
  const ruleset: Ruleset | null = rulesetRow
    ? {
        id: rulesetRow.id,
        gameId: rulesetRow.game_id,
        name: rulesetRow.name,
        description: rulesetRow.description,
        createdAt: rulesetRow.created_at,
      }
    : null;
  const game: Game | null = gameRow
    ? { id: gameRow.id, name: gameRow.name, description: gameRow.description, createdAt: gameRow.created_at }
    : null;

  const info: ProfileInfo = { user, group, ruleset, game };
  return c.json(info);
});
