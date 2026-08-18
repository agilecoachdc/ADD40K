-- Appartenance à plusieurs groupes en même temps (joueur ou MJ) : la
-- relation users <-> player_groups devient many-to-many via une table de
-- jointure, au lieu du player_group_id unique sur users. Le rôle
-- (gm/player) reste global sur users.role (un MJ est MJ dans tous ses
-- groupes, un joueur est joueur dans tous les siens) — seule
-- l'appartenance devient plurielle, pas le rôle par groupe.
--
-- users.role / users.player_group_id restent en base (colonnes trop
-- coûteuses à retirer proprement en SQLite) mais ne sont plus la source de
-- vérité pour l'appartenance à un groupe : c'est group_memberships qui
-- l'est désormais (cf. src/worker/lib/session.ts).
--
-- Dossier Drive personnalisable par groupe (remplace le lien Google Drive
-- en dur dans CharacterList.tsx, spécifique à ADD40K).

CREATE TABLE group_memberships (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL REFERENCES player_groups(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, group_id)
);
CREATE INDEX idx_group_memberships_group ON group_memberships(group_id);

INSERT INTO group_memberships (user_id, group_id)
SELECT id, player_group_id FROM users
WHERE role IN ('gm', 'player') AND player_group_id IS NOT NULL;

ALTER TABLE player_groups ADD COLUMN drive_url TEXT;

UPDATE player_groups
SET drive_url = 'https://drive.google.com/drive/folders/1bCHRg2AuKnBwizC9arAxvLRCQ8ikCJ6s'
WHERE id = 'add40k';
