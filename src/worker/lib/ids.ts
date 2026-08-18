// Génération d'identifiants lisibles (slug) pour les entités plateforme
// (games/rulesets/player_groups) — extrait de routes/admin.ts pour être
// réutilisé par routes/groups.ts (création de groupe en self-service par un MJ).

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

// Table cible fixée par l'appelant (jamais depuis une entrée utilisateur) —
// pas de risque d'injection à interpoler son nom dans la requête.
export async function uniqueSlugId(
  db: D1Database,
  table: "games" | "rulesets" | "player_groups",
  name: string,
): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (await db.prepare(`SELECT 1 FROM ${table} WHERE id = ?1`).bind(candidate).first()) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}
