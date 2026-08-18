// Chargement du catalogue de référence (ReferenceData) d'un groupe de
// joueurs, via la règle (ruleset) qui lui est assignée. Remplace l'ancien
// import statique de src/shared/reference-data.ts (qui ne couvrait que
// ADD40K) — chaque groupe a désormais son propre catalogue, stocké en JSON
// dans rulesets.reference_data (cf. migrations/0003_platform.sql).

import type { ReferenceData } from "../../shared/types";

interface RulesetRow {
  reference_data: string;
}

/**
 * Récupère le ReferenceData de la règle assignée à un groupe. Lève une
 * erreur si le groupe n'existe pas ou n'a pas de règle assignée — ne
 * devrait pas arriver en usage normal (un groupe est toujours créé avec une
 * règle, cf. routes/admin.ts), donc pas de valeur de repli silencieuse.
 */
export async function getReferenceDataForGroup(db: D1Database, groupId: string): Promise<ReferenceData> {
  const row = await db
    .prepare(
      `SELECT r.reference_data
       FROM player_groups g JOIN rulesets r ON r.id = g.ruleset_id
       WHERE g.id = ?1`,
    )
    .bind(groupId)
    .first<RulesetRow>();
  if (!row) throw new Error(`Groupe ou règle introuvable pour le groupe ${groupId}`);
  return JSON.parse(row.reference_data) as ReferenceData;
}
