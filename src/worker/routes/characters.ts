// Routes /api/characters/* — voir docs/API_REFERENCE.md.
// Lecture ouverte à tout utilisateur connecté (utile en jeu pour consulter
// la fiche d'un coéquipier) ; écriture réservée au propriétaire ou au MJ
// (canEditCharacter, lib/session.ts). Création (PNJ) réservée au MJ.

import { Hono } from "hono";
import type { Env } from "../lib/session";
import { canEditCharacter } from "../lib/session";
import type { PublicUser } from "../../shared/types";
import type { AttributeScores, Character, CharacterSummary } from "../../shared/types";
import { ATTRIBUTES } from "../../shared/types";
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
    const { hpMax, pspMax, armorTotals } = computeCharacter(parsed, referenceData);
    return {
      id: row.id,
      name: row.name,
      race: row.race,
      owner_username: row.owner_username,
      portraitUrl: parsed.portraitUrl,
      inGame: parsed.inGame ?? false,
      isNpc: parsed.isNpc ?? false,
      hpCurrent: parsed.hpCurrent,
      hpMax,
      pspCurrent: parsed.pspCurrent,
      pspMax,
      armorTotals,
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

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "pnj"
  );
}

async function uniqueId(db: D1Database, name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (await db.prepare("SELECT 1 FROM characters WHERE id = ?1").bind(candidate).first()) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}

const EMPTY_ATTRIBUTE_SCORES: AttributeScores = Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])) as AttributeScores;

// Création d'un PNJ : fiche volontairement minimale (nom, photo, race pour
// la silhouette, PV/PSP max fixés directement via hpMaxOverride/
// pspMaxOverride — pas d'attributs à saisir). Réservé au MJ : un PNJ n'a pas
// de joueur propriétaire, seul le MJ doit pouvoir le créer/modifier (déjà
// garanti par canEditCharacter côté PUT, qui autorise role=gm sur n'importe
// quel id).
characterRoutes.post("/", async (c) => {
  const user = c.get("user");
  if (user.role !== "gm") {
    return c.json({ error: "Réservé au MJ" }, 403);
  }

  const body = await c.req
    .json<{ name?: string; portraitUrl?: string | null; race?: string; vit?: number; vol?: number }>()
    .catch(() => null);
  if (!body?.name?.trim()) {
    return c.json({ error: "Nom requis" }, 400);
  }

  const id = await uniqueId(c.env.DB, body.name);
  const now = new Date().toISOString();
  const race = body.race?.trim() || "humain";
  // PV/PSP suivent exactement le même calcul que pour un personnage de
  // joueur (VIT/VOL + bonus racial + taille, cf. calc-engine.ts) — le MJ
  // saisit juste VIT/VOL, les autres attributs restent à 0 (un PNJ n'a pas
  // de compétences à calculer dessus dans ce flux minimal).
  const raceDef = referenceData.races.find((r) => r.race === race);

  const character: Character = {
    id,
    ownerUsername: user.username,
    name: body.name.trim(),
    age: null,
    heightM: null,
    weightLabel: "",
    race,
    faction: "",
    fonction: "",
    loyaute: "",
    portraitUrl: body.portraitUrl ?? null,
    attributeScores: { ...EMPTY_ATTRIBUTE_SCORES, VIT: body.vit ?? 0, VOL: body.vol ?? 0 },
    attributeTechBonus: {},
    tailleModifier: raceDef?.tailleBonus ?? 0,
    hpCurrent: 0, // recalculé juste après via computeCharacter
    pspCurrent: 0,
    inGame: true, // visible tout de suite là où le MJ vient de le créer (Suivi des constantes)
    isNpc: true,
    skills: [],
    psyPowers: [],
    weapons: [],
    armor: [],
    advantages: [],
    equipment: [],
    pointsDepart: 0,
    xp: 0,
    reputations: "",
    notes: "",
    updatedAt: now,
  };
  const { hpMax, pspMax } = computeCharacter(character, referenceData);
  character.hpCurrent = hpMax;
  character.pspCurrent = pspMax;

  await c.env.DB.prepare(
    "INSERT INTO characters (id, name, race, owner_username, data, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
  )
    .bind(character.id, character.name, character.race, character.ownerUsername, JSON.stringify(character), now)
    .run();

  const computed = computeCharacter(character, referenceData);
  return c.json({ character, computed, canEdit: true }, 201);
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
