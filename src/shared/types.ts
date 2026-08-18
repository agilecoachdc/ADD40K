// Types partagés entre le Worker (API) et le frontend. Le personnage est
// stocké comme un objet JSON structuré (colonne `data` de la table
// `characters` en D1) plutôt que reconstruit ligne à ligne comme le classeur
// Excel d'origine. Voir docs/API_REFERENCE.md pour la forme des routes qui
// manipulent ces types, et le plan (lively-rolling-comet.md) pour le
// contexte de chaque champ.

export const ATTRIBUTES = [
  "FO",
  "VIT",
  "DEX",
  "REF",
  "PER",
  "COM",
  "INT",
  "VOL",
] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export const RACES = [
  "eldar",
  "rohirim",
  "gith",
  "rakshasa",
  "hobbit",
  "orc",
  "gnome",
  "humain",
] as const;
export type Race = (typeof RACES)[number];

export const WEAPON_TYPES = ["Mêl", "Jet", "Fire"] as const;
export type WeaponType = (typeof WEAPON_TYPES)[number];

/** Score de base saisi par attribut, avant bonus racial/tech. */
export type AttributeScores = Record<Attribute, number>;

export interface SkillEntry {
  /** Nom de la compétence, idéalement une entrée de skills_catalog mais texte libre accepté. */
  name: string;
  score: number;
}

export interface PsyPowerEntry {
  name: string;
  score: number;
  /** Discipline (Mental / Psychokinésie / Maîtrise de soi ...). */
  discipline: string;
}

export interface WeaponEntry {
  name: string;
  type: WeaponType;
  /** Dégâts et RA pré-remplis depuis weapons_catalog mais éditables (surcharges possibles, ex. armes améliorées par un avantage). */
  damage: number;
  ra: number;
  /** Score de base pour toucher avec cette arme (tel qu'affiché sur char_sheet, ex. PER + compétence liée + bonus éventuel). Éditable — pas recalculé automatiquement, le classeur d'origine n'associe pas une arme à une compétence de façon fiable. */
  baseScore: number;
  /** Munitions ou notes libres. */
  notes?: string;
  /**
   * Bonus ponctuels (améliorations tech, boosters...) justifiés chacun par
   * une ligne d'équipement — ex. "Améliorations WP : 1,1,1" sur la Wild
   * Predator de Conrad Lingus. `damage`/`ra`/`baseScore` ci-dessus restent
   * la valeur DE BASE ; le total réellement joué = base + somme des
   * modificateurs (cf. calc-engine.getWeaponTotals). Absent/vide = pas de
   * modificateur, total = base (comportement inchangé pour les armes
   * existantes — champ ajouté après coup, cf. plan de la fiche PNJ/Excel).
   */
  modifiers?: WeaponModifier[];
}

export interface WeaponModifier {
  /** Ligne justifiant le bonus — reprise de l'équipement de la fiche, ou texte libre si l'objet n'y est pas encore. */
  justification: string;
  ra?: number;
  damage?: number;
  score?: number;
}

export interface ArmorEntry {
  name: string;
  vpTete: number;
  vpBras: number;
  vpTorse: number;
  vpJambes: number;
  /** Équipée ou non — seules les armures actives comptent dans le total de protection affiché. */
  active: boolean;
}

export interface AdvantageEntry {
  /** Libellé tel qu'affiché, ex. "Réputation : +20". */
  label: string;
  /** Valeur signée (positive = avantage, négative = inconvénient). */
  value: number;
}

export interface EquipmentEntry {
  label: string;
}

export interface Character {
  id: string;
  /** username du joueur propriétaire (édition réservée à ce joueur + MJ). */
  ownerUsername: string;

  // Identité
  name: string;
  age: number | null;
  heightM: number | null;
  weightLabel: string;
  /** Normalement une valeur de `Race`, mais certaines fiches importées utilisent une race hors catalogue (ex. "Illitide") — le moteur de calcul tombe alors sur un bonus racial nul plutôt que de planter. */
  race: Race | (string & {});
  faction: string;
  fonction: string;
  loyaute: string;
  portraitUrl: string | null;

  // Attributs
  attributeScores: AttributeScores;
  /** Bonus "tech" manuel, rare, ajouté au-dessus du bonus racial (ex. cyberware). */
  attributeTechBonus: Partial<AttributeScores>;
  /** Modificateur de taille (-2 à +2 selon race/avantages), utilisé dans le calcul des PV. */
  tailleModifier: number;

  // PV / PSP — max calculé par le moteur, "actuel" suivi en jeu (nouveau vs. l'Excel)
  hpCurrent: number;
  pspCurrent: number;
  /**
   * Coché par le MJ sur l'écran d'accueil : personnage actuellement en jeu
   * (visible sur l'écran "Suivi des constantes"). Absent des fiches
   * importées avant l'ajout de ce champ — traité comme `false` côté route
   * (GET /api/characters), pas de migration nécessaire (colonne `data` JSON
   * libre).
   */
  inGame: boolean;
  /**
   * PNJ créé rapidement par le MJ (bouton dédié sur l'écran "Suivi des
   * constantes"), par opposition à un personnage de joueur importé depuis
   * une fiche Excel. Un PNJ n'a en général ni compétences ni équipement
   * détaillé, mais PV/PSP max suivent exactement le même calcul que pour
   * un joueur (VIT/VOL + race + taille, cf. calc-engine.ts) — le MJ saisit
   * juste VIT/VOL à la création plutôt que les 8 attributs.
   */
  isNpc: boolean;
  /**
   * Archivé par le MJ (bouton "Archiver" sur l'écran d'accueil) : masqué des
   * écrans "Personnages" et "Suivi des constantes" sans être supprimé —
   * même principe que `inGame`, absent des fiches existantes avant l'ajout
   * de ce champ, traité comme `false` côté route (GET /api/characters).
   */
  archived: boolean;

  // Listes
  skills: SkillEntry[];
  psyPowers: PsyPowerEntry[];
  weapons: WeaponEntry[];
  armor: ArmorEntry[];
  advantages: AdvantageEntry[];
  equipment: EquipmentEntry[];

  // Budget de points
  pointsDepart: number;
  xp: number;

  // Texte libre
  reputations: string;
  notes: string;

  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Données de référence (catalogue), extraites une fois de la feuille `listes`
// du classeur Excel. Versionnées dans le repo (src/shared/reference-data.ts),
// pas en base — voir la section "Données de référence" du plan.
// ---------------------------------------------------------------------------

export interface RaceDefinition {
  /**
   * Normalement une valeur de `Race`, mais un catalogue de règle créée par
   * un admin (autre jeu que ADD40K) peut définir des races hors de cette
   * liste fixe — même assouplissement que `Character.race` ci-dessus.
   */
  race: Race | (string & {});
  label: string;
  /** Bonus par attribut appliqué au score de base (extrait des formules IF de la feuille données). */
  attributeBonus: AttributeScores;
  /** Modificateur de taille racial (données!B24), utilisé par défaut pour Character.tailleModifier. */
  tailleBonus: number;
  /** Points de compétence de départ accordés par la race. */
  skillPoints: number;
}

/** Table de coût par score, partagée entre compétences et pouvoirs psy (listes!A14:B29 dédupliqué). */
export type SkillCostTable = Record<number, number>;

export interface SkillDefinition {
  name: string;
  /** Attribut lié, ex. "COM" pour Commandement. */
  attribute: Attribute | null;
  description?: string;
}

export interface WeaponDefinition {
  name: string;
  /** Certaines armes "naturelles" (griffes, queue de combat...) n'ont pas de type/prix renseigné dans le classeur. */
  type: WeaponType | null;
  damage: number | null;
  price: number | string | null;
  ra: number | null;
}

export interface ArmorDefinition {
  name: string;
  vpTete: number;
  vpBras: number;
  vpTorse: number;
  vpJambes: number;
}

export interface PsyPowerDefinition {
  name: string;
  discipline: string;
  description?: string;
}

export interface AdvantageDefinition {
  label: string;
  value: number;
  description?: string;
}

export interface ReferenceData {
  races: RaceDefinition[];
  skillCostTable: SkillCostTable;
  skills: SkillDefinition[];
  weapons: WeaponDefinition[];
  armor: ArmorDefinition[];
  psyPowers: PsyPowerDefinition[];
  advantages: AdvantageDefinition[];
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type UserRole = "admin" | "gm" | "player";

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  /** Personnage possédé par ce joueur (null pour le MJ ou l'admin). */
  characterId: string | null;
  /** Groupe de joueurs auquel ce compte est rattaché (null pour un admin plateforme). */
  playerGroupId: string | null;
}

// ---------------------------------------------------------------------------
// Plateforme : jeux, règles (rulesets), groupes de joueurs
// ---------------------------------------------------------------------------

export interface Game {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

/** Résumé d'une règle — sans le catalogue complet, pour les listes (sélecteurs...). */
export interface Ruleset {
  id: string;
  gameId: string;
  name: string;
  description: string;
  createdAt: string;
}

/** Règle avec son catalogue complet — utilisé par l'éditeur admin. */
export interface RulesetDetail extends Ruleset {
  referenceData: ReferenceData;
}

export interface PlayerGroup {
  id: string;
  name: string;
  description: string;
  rulesetId: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  characterId: string | null;
}

export interface PlayerGroupDetail extends PlayerGroup {
  members: GroupMember[];
}

/** Contexte plateforme de l'utilisateur connecté — voir GET /api/profile. */
export interface ProfileInfo {
  user: PublicUser;
  group: PlayerGroup | null;
  ruleset: Ruleset | null;
  game: Game | null;
}

// ---------------------------------------------------------------------------
// Listes
// ---------------------------------------------------------------------------

/**
 * Résumé d'un personnage pour les vues de liste (écran d'accueil et écran
 * "Suivi des constantes" du MJ) — pas la fiche complète. `hpMax`/`pspMax`
 * sont calculés côté serveur (GET /api/characters) via calc-engine, comme
 * pour la fiche détaillée.
 */
export interface CharacterSummary {
  id: string;
  name: string;
  race: string;
  owner_username: string;
  portraitUrl: string | null;
  inGame: boolean;
  isNpc: boolean;
  archived: boolean;
  hpCurrent: number;
  hpMax: number;
  pspCurrent: number;
  pspMax: number;
  /** VP de protection par membre — mêmes clés que calc-engine.ArmorTotals, dupliquées ici pour éviter un import croisé types.ts ↔ calc-engine.ts. */
  armorTotals: { vpTete: number; vpBras: number; vpTorse: number; vpJambes: number };
}
