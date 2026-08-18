-- Généré par scripts/generate_platform_seed_sql.mjs — NE PAS ÉDITER À LA MAIN.
-- Ajoute le modèle plateforme (jeux/règles/groupes de joueurs) et migre les
-- données existantes vers le jeu/règle/groupe "ADD40K".

-- ---------------------------------------------------------------------------
-- Schéma
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rulesets (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  -- ReferenceData (src/shared/types.ts) sérialisé JSON : races,
  -- skillCostTable, skills, weapons, armor, psyPowers, advantages. Éditable
  -- via la page d'admin Jeux & règles (routes /api/admin/rulesets).
  reference_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rulesets_game ON rulesets(game_id);

CREATE TABLE IF NOT EXISTS player_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ruleset_id TEXT NOT NULL REFERENCES rulesets(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_player_groups_ruleset ON player_groups(ruleset_id);

-- users.role doit désormais accepter 'admin' en plus de 'gm'/'player'.
-- SQLite n'autorise pas d'altérer un CHECK existant : on reconstruit la
-- table (pattern standard create/copy/drop/rename) plutôt que de la muter.
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'gm', 'player')),
  character_id TEXT,
  -- Groupe de joueurs auquel ce compte est rattaché (NULL pour un admin
  -- plateforme). Rempli pour les comptes existants par le backfill ci-dessous.
  player_group_id TEXT REFERENCES player_groups(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO users_new (id, username, display_name, password_hash, password_salt, role, character_id, player_group_id, created_at)
  SELECT id, username, display_name, password_hash, password_salt, role, character_id, NULL, created_at FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- Personnages : rattachement à un groupe, pour l'isolation des données
-- entre groupes (GET /api/characters ne renvoie que celles du groupe de
-- l'appelant).
ALTER TABLE characters ADD COLUMN player_group_id TEXT REFERENCES player_groups(id);

-- ---------------------------------------------------------------------------
-- Backfill : les données actuelles deviennent le jeu/règle/groupe "ADD40K"
-- ---------------------------------------------------------------------------

INSERT INTO games (id, name, description) VALUES ('add40k', 'ADD40K', 'Jeu de rôle ADD40K.');

INSERT INTO rulesets (id, game_id, name, description, reference_data)
  VALUES ('add40k', 'add40k', 'ADD40K', 'Règle ADD40K (catalogue initial).', '{"races":[{"race":"eldar","label":"Eldar","attributeBonus":{"FO":0,"VIT":-1,"DEX":1,"REF":0,"PER":1,"COM":0,"INT":1,"VOL":1},"tailleBonus":0,"skillPoints":10},{"race":"rohirim","label":"Rohirim","attributeBonus":{"FO":0,"VIT":1,"DEX":1,"REF":-1,"PER":0,"COM":0,"INT":1,"VOL":1},"tailleBonus":-1,"skillPoints":15},{"race":"gith","label":"Gith","attributeBonus":{"FO":0,"VIT":0,"DEX":0,"REF":0,"PER":0,"COM":0,"INT":1,"VOL":1},"tailleBonus":0,"skillPoints":15},{"race":"rakshasa","label":"Rakshasa","attributeBonus":{"FO":0,"VIT":0,"DEX":0,"REF":1,"PER":0,"COM":1,"INT":0,"VOL":0},"tailleBonus":0,"skillPoints":15},{"race":"hobbit","label":"Hobbit","attributeBonus":{"FO":0,"VIT":-1,"DEX":1,"REF":1,"PER":1,"COM":1,"INT":0,"VOL":0},"tailleBonus":-1,"skillPoints":15},{"race":"orc","label":"Orc","attributeBonus":{"FO":1,"VIT":1,"DEX":0,"REF":0,"PER":-1,"COM":0,"INT":0,"VOL":0},"tailleBonus":1,"skillPoints":20},{"race":"gnome","label":"Gnome","attributeBonus":{"FO":-1,"VIT":0,"DEX":1,"REF":0,"PER":0,"COM":0,"INT":0,"VOL":0},"tailleBonus":-1,"skillPoints":20},{"race":"humain","label":"Humain","attributeBonus":{"FO":0,"VIT":0,"DEX":0,"REF":0,"PER":0,"COM":0,"INT":0,"VOL":0},"tailleBonus":0,"skillPoints":20}],"skillCostTable":{"0":0,"1":5,"2":10,"3":15,"4":20,"5":25,"6":35,"7":45,"8":55,"9":65,"10":75,"11":95,"12":115,"13":135,"14":155,"15":175},"skills":[{"name":"Arme de poing (PER)","attribute":"PER"},{"name":"Fusils (PER)","attribute":"PER"},{"name":"Mêlée (DEX)","attribute":"DEX"},{"name":"Esquive (REF)","attribute":"REF"},{"name":"Commandement (COM)","attribute":"COM"},{"name":"Etiquette (COM)","attribute":"COM"},{"name":"interview (COM)","attribute":"COM"},{"name":"Persuasion (COM)","attribute":"COM"},{"name":"Sciences théo (INT)","attribute":"INT"},{"name":"Informatique (INT)","attribute":"INT"},{"name":"Sciences dures (DEX)","attribute":"DEX"},{"name":"Médecine (INT) (DEX)","attribute":"INT"},{"name":"Gestion (INT)","attribute":"INT"},{"name":"Histoire, (INT)","attribute":"INT"},{"name":"Athlétisme (VIT)","attribute":"VIT"},{"name":"Résistance aux tortures et drogues (VIT)","attribute":"VIT"},{"name":"Survie (zone) (VIT)","attribute":"VIT"},{"name":"Discretion (DEX)","attribute":"DEX"},{"name":"Contrefaçon (DEX)","attribute":"DEX"},{"name":"Déguisement (DEX)","attribute":"DEX"},{"name":"Pickpocket (DEX)","attribute":"DEX"},{"name":"Chercher (PER)","attribute":"PER"},{"name":"Sens (PER)","attribute":"PER"},{"name":"Sécurité (DEX)","attribute":"DEX"},{"name":"Conn. des rues (PER)","attribute":"PER"},{"name":"Pilotage définir type (REF)","attribute":"REF"},{"name":"Explosifs,demolition (INT)","attribute":"INT"},{"name":"Corp système (INT)","attribute":"INT"},{"name":"Affinité (VOL) Téléportation","attribute":"VOL"}],"weapons":[{"name":"Mains nues","damage":-1,"price":0,"ra":0,"type":"Mêl"},{"name":"Poing américain","damage":1,"price":10,"ra":0,"type":"Mêl"},{"name":"couteaux","damage":3,"price":"10-100","ra":1,"type":"Mêl"},{"name":"Épées, haches 1 main","damage":4,"price":400,"ra":2,"type":"Mêl"},{"name":"Epées haches 2 mains","damage":5,"price":500,"ra":2,"type":"Mêl"},{"name":"Armes d’hast","damage":5,"price":800,"ra":3,"type":"Mêl"},{"name":"Katana","damage":4,"price":3000,"ra":2,"type":"Mêl"},{"name":"Rippers","damage":4,"price":2000,"ra":2,"type":"Mêl"},{"name":"Power Knife","damage":5,"price":5000,"ra":2,"type":"Mêl"},{"name":"Tronçonneuse","damage":5,"price":500,"ra":3,"type":"Mêl"},{"name":"Sharpness","damage":6,"price":10000,"ra":2,"type":"Mêl"},{"name":"Boneripp","damage":7,"price":null,"ra":null,"type":"Mêl"},{"name":"Griffes rétractables","damage":7,"price":null,"ra":null,"type":"Mêl"},{"name":"Rippers","damage":8,"price":null,"ra":null,"type":"Mêl"},{"name":"Wolfers","damage":9,"price":null,"ra":null,"type":"Mêl"},{"name":"Cyclope","damage":5,"price":null,"ra":null,"type":"Mêl"},{"name":"Queue de combat","damage":6,"price":null,"ra":null,"type":"Mêl"},{"name":"Sourire du requin","damage":6,"price":null,"ra":null,"type":"Mêl"},{"name":"Slice N Dice","damage":7,"price":null,"ra":null,"type":"Mêl"},{"name":"Snake fangs","damage":5,"price":null,"ra":null,"type":"Mêl"},{"name":"Arc court / arbalète légère","damage":3,"price":500,"ra":2,"type":"Jet"},{"name":"Arc long /arbalète lourde","damage":4,"price":1000,"ra":3,"type":"Jet"},{"name":"Arbalète à répétition","damage":4,"price":2500,"ra":3,"type":"Jet"},{"name":"Couteau de lancer","damage":2,"price":20,"ra":1,"type":"Jet"},{"name":"caillou","damage":0,"price":0,"ra":1,"type":"Jet"},{"name":"Shuriken","damage":1,"price":25,"ra":1,"type":"Jet"},{"name":"Grenades incapacitantes","damage":1,"price":300,"ra":2,"type":"Jet"},{"name":"Grenades à plasma","damage":8,"price":1500,"ra":2,"type":"Jet"},{"name":"Grenade à fragmentation","damage":6,"price":300,"ra":2,"type":"Jet"},{"name":"Street line palm pistol","damage":4,"price":500,"ra":1,"type":"Fire"},{"name":"Cybertech secutity","damage":4,"price":800,"ra":1,"type":"Fire"},{"name":"Colt Python","damage":5,"price":2000,"ra":2,"type":"Fire"},{"name":"Wild Predator","damage":6,"price":6000,"ra":2,"type":"Fire"},{"name":"Cybertech Silverhawk","damage":7,"price":7000,"ra":3,"type":"Fire"},{"name":"Pistolet Gauss","damage":7,"price":15000,"ra":3,"type":"Fire"},{"name":"INDRA","damage":7,"price":3000,"ra":3,"type":"Fire"},{"name":"Leader AF4","damage":8,"price":4000,"ra":4,"type":"Fire"},{"name":"Redfield 540","damage":9,"price":6000,"ra":4,"type":"Fire"},{"name":"Widowmaker","damage":11,"price":20000,"ra":5,"type":"Fire"},{"name":"Devastator","damage":9,"price":12000,"ra":5,"type":"Fire"},{"name":"Railgun","damage":10,"price":15000,"ra":5,"type":"Fire"},{"name":"Inferno","damage":8,"price":4000,"ra":5,"type":"Fire"},{"name":"C-Tech Tsunami","damage":15,"price":30000,"ra":6,"type":"Fire"},{"name":"Wild RPG","damage":13,"price":9000,"ra":5,"type":"Fire"},{"name":"Amélioration Toucher Wild Predator","damage":null,"price":null,"ra":1,"type":null},{"name":"Amélioration dégats Wild Predator","damage":null,"price":null,"ra":1,"type":null},{"name":"Amélioration RA Wild Predator","damage":null,"price":null,"ra":1,"type":null}],"armor":[{"name":"Champ de stase","vpTete":5,"vpBras":5,"vpTorse":5,"vpJambes":5},{"name":"Cuir souple (torse, bras)","vpTete":0,"vpBras":4,"vpTorse":4,"vpJambes":0},{"name":"Jambières souples (jambes)","vpTete":0,"vpBras":0,"vpTorse":0,"vpJambes":4},{"name":"Cuir épais (torse, bras)","vpTete":0,"vpBras":5,"vpTorse":5,"vpJambes":0},{"name":"Jambières en cuir épais (jambes)","vpTete":0,"vpBras":0,"vpTorse":0,"vpJambes":5},{"name":"Peau tissée (tout) cyber ou bio","vpTete":5,"vpBras":5,"vpTorse":5,"vpJambes":5},{"name":"Kevlar (torse)","vpTete":0,"vpBras":0,"vpTorse":6,"vpJambes":0},{"name":"Casque (fibres de nylon)","vpTete":6,"vpBras":0,"vpTorse":0,"vpJambes":0},{"name":"Veste blindée légère (10 KG)","vpTete":0,"vpBras":7,"vpTorse":7,"vpJambes":0},{"name":"Veste blindée (20KG)","vpTete":0,"vpBras":8,"vpTorse":8,"vpJambes":0},{"name":"Dragoon","vpTete":10,"vpBras":10,"vpTorse":10,"vpJambes":10}],"psyPowers":[{"name":"Acuité sensorielle","discipline":"Mental"},{"name":"Charme","discipline":"Mental"},{"name":"Hypnagogie","discipline":"Mental"},{"name":"Illusion","discipline":"Mental"},{"name":"Télépathie","discipline":"Mental"},{"name":"Préscience","discipline":"Mental"},{"name":"Cryokinésie","discipline":"Psychokinésie"},{"name":"Electrokinésie","discipline":"Psychokinésie"},{"name":"Kinésie","discipline":"Psychokinésie"},{"name":"Télékinésie","discipline":"Psychokinésie"},{"name":"Pyrokinésie","discipline":"Psychokinésie"},{"name":"Téléportation","discipline":"Psychokinésie"},{"name":"Concentration psy","discipline":"Maîtrise de soi"},{"name":"Soin","discipline":"Maîtrise de soi"},{"name":"Modification de la matière","discipline":"Maîtrise de soi"},{"name":"Maîtrise du corps","discipline":"Maîtrise de soi"},{"name":"Régénération","discipline":"Maîtrise de soi"}],"advantages":[{"label":"Affinité : +10","value":10},{"label":"Affinité : + 20","value":20},{"label":"Affinité : +30","value":30},{"label":"Immunité (maladies): +10","value":10},{"label":"Immunité (maladies graves) : + 20","value":20},{"label":"Immunité (radiations) : + 30","value":30},{"label":"Réputation: + 10","value":10},{"label":"Réputation : +20","value":20},{"label":"Revenus: +10","value":10},{"label":"Revenus : +20","value":20},{"label":"Revenus : +30","value":30},{"label":"Revenus : + 40","value":40},{"label":"Revenus : +50","value":50},{"label":"Richesse: + 10","value":10},{"label":"Richesse : + 20","value":20},{"label":"Richesse : +30","value":30},{"label":"Ambidextre: +10","value":10},{"label":"Attentif: +10","value":10},{"label":"Berserk: +10","value":10},{"label":"Bonne constitution: +10","value":10},{"label":"Concentration: +10","value":10},{"label":"Contacts sociaux : +10","value":10},{"label":"Convalescence rapide : +10","value":10},{"label":"Esprit attentif : +10","value":10},{"label":"Liens familiaux étroits : +10","value":10},{"label":"Orientation: +10","value":10},{"label":"Sommeil léger : +10","value":10},{"label":"Téméraire : +10","value":10},{"label":"Volonté de fer : +10","value":10},{"label":"Apprentissage rapide·: +10","value":10},{"label":"Mémoire Eidétique: +10","value":10},{"label":"Chantage: +10","value":10},{"label":"Chef de bande: +10","value":10},{"label":"Grand: +10","value":10},{"label":"Mentor: +10","value":10},{"label":"Réflexes éclairs: +10","value":10},{"label":"Touche-à-tout: +10","value":10},{"label":"Concentration rapide: +10","value":10},{"label":"Chic: +10","value":10},{"label":"Maîtrise psychique: +20","value":20},{"label":"Prestige corporatiste: +20","value":20},{"label":"Protection : +20","value":20},{"label":"Réserve de PSP : +20","value":20},{"label":"Taille de géant : +30","value":30},{"label":"Affinité Science : +40","value":40},{"label":"Ennemis : -10","value":-10},{"label":"Ennemis : -20","value":-20},{"label":"Ennemis : -30","value":-30},{"label":"Mauvaise réputation : -10","value":-10},{"label":"Mauvaise réputation : -20","value":-20},{"label":"Circonstance nuisible : -10","value":-10},{"label":"Allergie : -10","value":-10},{"label":"Aversion : -10","value":-10},{"label":"Cauchemars : -10","value":-10},{"label":"Cœur sensible : -10","value":-10},{"label":"Compulsion: -10","value":-10},{"label":"Frêle constitution : -10","value":-10},{"label":"Illusion: -10","value":-10},{"label":"Secret: -10","value":-10},{"label":"Sommeil lourd: -10","value":-10},{"label":"Timidité: -10","value":-10},{"label":"Difficultés: -10","value":-10},{"label":"Don tapageur: -10","value":-10},{"label":"Effets secondaires nuisibles: -10","value":-10},{"label":"Infaillibilité illusoire: -20","value":-20},{"label":"Manque de concentration: -20","value":-20},{"label":"Faible -20","value":-20},{"label":"Haine: -20","value":-20},{"label":"Mauvaise aura: -20","value":-20},{"label":"Emporté: -20","value":-20},{"label":"Petit: -20","value":-20},{"label":"Vengeance: -20","value":-20},{"label":"Concentration lente: -20","value":-20},{"label":"Défaillance majeure : -20","value":-20},{"label":"Esprit fragile: -20","value":-20},{"label":"Dépendance: -30","value":-30},{"label":"Pouvoir douloureux: -30","value":-30},{"label":"Nanisme: -40","value":-40},{"label":"Protection mentale inexistante: -40","value":-40},{"label":"Dans les nuages: -30","value":-30}]}');

INSERT INTO player_groups (id, name, description, ruleset_id)
  VALUES ('add40k', 'ADD40K', 'Groupe de joueurs historique (MJ + 8 joueurs).', 'add40k');

UPDATE users SET player_group_id = 'add40k' WHERE player_group_id IS NULL;
UPDATE characters SET player_group_id = 'add40k' WHERE player_group_id IS NULL;
