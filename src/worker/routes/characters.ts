// Routes /api/characters/* — voir docs/API_REFERENCE.md.
// Lecture ouverte à tout utilisateur connecté (utile en jeu pour consulter
// la fiche d'un coéquipier) ; écriture réservée au propriétaire ou au MJ
// (canEditCharacter, lib/session.ts).

import { Hono } from "hono";
import type { Env } from "../lib/session";
import { canEditCharacter } from "../lib/session";
import type { PublicUser } from "../../shared/types";
import type { Character, CharacterSummary } from "../../shared/types";
import { computeCharacter } from "../../shared/calc-engine";
import { referenceData } from "../../shared/reference-data";

type HonoEnv = { Bindings: Env; Variables: { user: PublicUser } };

interface CharacterRow {
  id: string;
  data: string;
}

export const characterRoutes = new Hono<HonoEnv>();

characterRoutes.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, race, owner_username, data FROM characters ORDER BY name",
  ).all<{ id: string; name: string; race: string; owner_username: string; data: string }>();

  // Résumé enrichi (portrait, statut en jeu, PV/PSP) pour l'écran d'accueil
  // et l'écran "Suivi des constantes" du MJ — computeCharacter recalcule
  // hpMax/pspMax comme pour la fiche détaillée, même source de vérité.
  const characters: CharacterSummary[] = (results ?? []).map((row) => {
    const parsed: Character = JSON.parse(row.data);
    const { hpMax, pspMax } = computeCharacter(parsed, referenceData);
    return {
      id: row.id,
      name: row.name,
      race: row.race,
      owner_username: row.owner_username,
      portraitUrl: parsed.portraitUrl,
      inGame: parsed.inGame ?? false,
      hpCurrent: parsed.hpCurrent,
      hpMax,
      pspCurrent: parsed.pspCurrent,
      pspMax,
    };
  });

  return c.json({ characters });
});

characterRoutes.get("/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT id, data FROM characters WHERE id = ?1")
    .bind(c.req.param("id"))
    .first<CharacterRow>();
  if (!row) return c.json({ error: "Personnage introuvable" }, 404);

  const character: Character = JSON.parse(row.data);
  const computed = computeCharacter(character, referenceData);
  const user = c.get("user");
  return c.json({ character, computed, canEdit: canEditCharacter(user, row.id) });
});

characterRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  if (!canEditCharacter(user, id)) {
    return c.json({ error: "Vous ne pouvez modifier que votre propre fiche" }, 403);
  }

  const existing = await c.env.DB.prepare("SELECT id, data FROM characters WHERE id = ?1")
    .bind(id)
    .first<CharacterRow>();
  if (!existing) return c.json({ error: "Personnage introuvable" }, 404);

  const incoming = await c.req.json<Partial<Character>>().catch(() => null);
  if (!incoming) return c.json({ error: "JSON invalide" }, 400);

  const current: Character = JSON.parse(existing.data);
  // On fusionne plutôt que remplacer intégralement : le client peut n'envoyer
  // que la section modifiée (ex. juste `skills`), le reste de la fiche reste
  // intact même si un autre onglet a été édité entre-temps par erreur.
  const updated: Character = {
    ...current,
    ...incoming,
    id: current.id, // non modifiable par le client
    ownerUsername: current.ownerUsername, // idem — changement de propriétaire hors périmètre MVP
    updatedAt: new Date().toISOString(),
  };

  await c.env.DB.prepare(
    "UPDATE characters SET name = ?1, race = ?2, data = ?3, updated_at = ?4 WHERE id = ?5",
  )
    .bind(updated.name, updated.race, JSON.stringify(updated), updated.updatedAt, id)
    .run();

  const computed = computeCharacter(updated, referenceData);
  return c.json({ character: updated, computed, canEdit: true });
});
