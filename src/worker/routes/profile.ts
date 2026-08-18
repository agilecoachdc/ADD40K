// Route /api/profile — contexte plateforme de l'utilisateur connecté : un
// par groupe dont il est membre (un compte peut désormais appartenir à
// plusieurs groupes en même temps, cf. migrations/0005_memberships.sql),
// avec la règle et le jeu qui en découlent pour chacun. Accessible à tout
// rôle authentifié (contrairement à /api/admin/*) — un admin reçoit une
// liste vide (il n'appartient à aucun groupe).

import { Hono } from "hono";
import type { Env } from "../lib/session";
import type { Game, MembershipInfo, PlayerGroup, PublicUser, ProfileInfo, Ruleset } from "../../shared/types";

type HonoEnv = { Bindings: Env; Variables: { user: PublicUser } };

interface GroupRow {
  id: string;
  name: string;
  description: string;
  ruleset_id: string;
  image_url: string | null;
  drive_url: string | null;
  created_at: string;
}

interface RulesetRow {
  id: string;
  game_id: string;
  name: string;
  description: string;
  image_url: string | null;
  created_at: string;
}

interface GameRow {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  created_at: string;
}

export const profileRoutes = new Hono<HonoEnv>();

profileRoutes.get("/", async (c) => {
  const user = c.get("user");

  if (user.memberships.length === 0) {
    const info: ProfileInfo = { user, memberships: [] };
    return c.json(info);
  }

  const placeholders = user.memberships.map((_, i) => `?${i + 1}`).join(",");
  const { results: groupRows } = await c.env.DB.prepare(
    `SELECT id, name, description, ruleset_id, image_url, drive_url, created_at FROM player_groups WHERE id IN (${placeholders}) ORDER BY name`,
  )
    .bind(...user.memberships)
    .all<GroupRow>();

  const memberships: MembershipInfo[] = [];
  for (const groupRow of groupRows ?? []) {
    const rulesetRow = await c.env.DB.prepare(
      "SELECT id, game_id, name, description, image_url, created_at FROM rulesets WHERE id = ?1",
    )
      .bind(groupRow.ruleset_id)
      .first<RulesetRow>();
    const gameRow = rulesetRow
      ? await c.env.DB.prepare("SELECT id, name, description, image_url, created_at FROM games WHERE id = ?1")
          .bind(rulesetRow.game_id)
          .first<GameRow>()
      : null;

    const group: PlayerGroup = {
      id: groupRow.id,
      name: groupRow.name,
      description: groupRow.description,
      rulesetId: groupRow.ruleset_id,
      imageUrl: groupRow.image_url,
      driveUrl: groupRow.drive_url,
      createdAt: groupRow.created_at,
    };
    const ruleset: Ruleset | null = rulesetRow
      ? {
          id: rulesetRow.id,
          gameId: rulesetRow.game_id,
          name: rulesetRow.name,
          description: rulesetRow.description,
          imageUrl: rulesetRow.image_url,
          createdAt: rulesetRow.created_at,
        }
      : null;
    const game: Game | null = gameRow
      ? {
          id: gameRow.id,
          name: gameRow.name,
          description: gameRow.description,
          imageUrl: gameRow.image_url,
          createdAt: gameRow.created_at,
        }
      : null;

    memberships.push({ group, ruleset, game });
  }

  const info: ProfileInfo = { user, memberships };
  return c.json(info);
});
