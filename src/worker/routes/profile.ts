// Route /api/profile — contexte plateforme de l'utilisateur connecté : un
// par groupe dont il est membre OU a une demande d'adhésion en attente (un
// compte peut désormais appartenir à plusieurs groupes en même temps, cf.
// migrations/0005_memberships.sql ; une demande passe par un statut
// 'pending' tant qu'un MJ du groupe ne l'a pas approuvée, cf.
// migrations/0006_join_approval.sql), avec la règle et le jeu qui en
// découlent pour chacun. Accessible à tout rôle authentifié (contrairement
// à /api/admin/*) — un admin reçoit une liste vide (il n'appartient à aucun
// groupe). Contrairement à `user.memberships` (approuvées uniquement, pour
// les contrôles d'accès), cette route interroge group_memberships
// directement afin d'inclure les demandes en attente, pour que l'écran
// Profil affiche "en attente d'approbation" plutôt que de les faire
// disparaître silencieusement.

import { Hono } from "hono";
import type { Env } from "../lib/session";
import type { Game, Language, MembershipInfo, MembershipStatus, PlayerGroup, PublicUser, ProfileInfo, Ruleset } from "../../shared/types";

const VALID_LANGUAGES: Language[] = ["fr", "en"];

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

  const { results: membershipRows } = await c.env.DB.prepare(
    "SELECT group_id, status FROM group_memberships WHERE user_id = ?1 ORDER BY created_at",
  )
    .bind(user.id)
    .all<{ group_id: string; status: MembershipStatus }>();

  if (!membershipRows || membershipRows.length === 0) {
    const info: ProfileInfo = { user, memberships: [] };
    return c.json(info);
  }
  const statusByGroupId = new Map(membershipRows.map((r) => [r.group_id, r.status]));

  const placeholders = membershipRows.map((_, i) => `?${i + 1}`).join(",");
  const { results: groupRows } = await c.env.DB.prepare(
    `SELECT id, name, description, ruleset_id, image_url, drive_url, created_at FROM player_groups WHERE id IN (${placeholders}) ORDER BY name`,
  )
    .bind(...membershipRows.map((r) => r.group_id))
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

    memberships.push({ group, ruleset, game, status: statusByGroupId.get(groupRow.id) ?? "approved" });
  }

  const info: ProfileInfo = { user, memberships };
  return c.json(info);
});

// Préférence de langue d'affichage — self-service, tout rôle (cf.
// migrations/0007_language.sql, Language dans shared/types.ts). Route
// dédiée plutôt qu'un PUT générique sur /profile : c'est le seul champ que
// le compte peut modifier lui-même sur son propre profil.
profileRoutes.put("/language", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ language?: Language }>().catch(() => null);
  if (!body?.language || !VALID_LANGUAGES.includes(body.language)) {
    return c.json({ error: "Langue invalide" }, 400);
  }
  await c.env.DB.prepare("UPDATE users SET language = ?1 WHERE id = ?2").bind(body.language, user.id).run();
  const updated: PublicUser = { ...user, language: body.language };
  return c.json({ user: updated });
});
