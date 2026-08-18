// Moteur de calcul partagé (Worker + frontend). Réimplémentation propre des
// formules de la feuille `données` du classeur Excel d'origine — voir
// scripts/import_xlsx.py pour la correspondance avec les cellules Excel, et
// le plan (lively-rolling-comet.md) pour la justification des choix.
//
// Écarts assumés avec la formule Excel du solde de points (données!H26),
// confirmés explicitement par le MJ :
//   1. Catalogue : l'inconvénient "Dans les nuages" (-30, tier -3) pointait
//      vers la mauvaise cellule dans le classeur (VLOOKUP sur la ligne d'un
//      autre avantage) et se calculait comme +20. Fix appliqué au niveau de
//      la donnée de référence (reference-data.ts) : les avantages/inconvénients
//      sont toujours dérivés du catalogue par libellé, jamais de la cellule
//      mise en cache par personnage.
//   2. Sens du calcul (getBudgetSummary.solde) : le classeur fait `+K40`
//      (somme brute des avantages/inconvénients). Or un avantage doit COÛTER
//      des points et un inconvénient doit en DONNER — c'est l'inverse. Ce
//      moteur fait donc `- advantagesNet`, pas `+`.
//   3. Rang d'Action (getWeaponTotals.ra) : la réimplémentation du 16/08
//      (cf. investigation weapon-modifiers) avait traité le RA comme les
//      autres stats d'arme (base + somme des modificateurs), en oubliant la
//      partie "BASE_RA - Réflexe" de la formule — confirmé par le MJ le
//      18/08 sur le cas réel Wild Predator de Conrad Lingus. Deux
//      corrections ultérieures du MJ, mêmes échanges du 19/08 : (a) la
//      constante elle-même est 5, pas 8 (valeur initialement supposée pour
//      coller au premier calcul manuel) ; (b) le RA de catalogue d'une arme
//      (ex. 2 pour Wild Predator) est déjà un rang à part entière, lu tel
//      quel dans la table du classeur — il s'ADDITIONNE au socle BASE_RA -
//      Réflexe (avec les modificateurs justifiés, ex. -1 "Améliorations
//      WP"), il ne s'en soustrait pas. RA final confirmé pour ce cas : 6
//      (5 - 0 + 2 - 1). Voir BASE_RA plus bas.

import type {
  Attribute,
  AttributeScores,
  Character,
  ReferenceData,
  WeaponEntry,
  WeaponType,
} from "./types";
import { ATTRIBUTES } from "./types";

/**
 * Extrait le code d'attribut (COM/INT/DEX/PER/VOL/VIT/REF/FO) depuis un nom
 * de compétence tel que stocké sur les fiches, ex. "Commandement (COM)" ou
 * "Affinité (VOL) Téléportation" (le code peut ne pas être en fin de nom).
 */
export function parseSkillAttribute(name: string): Attribute | null {
  const match = name.match(/\b(FO|VIT|DEX|REF|PER|COM|INT|VOL)\b/);
  return (match?.[1] as Attribute | undefined) ?? null;
}

export interface SkillTotal {
  attribute: Attribute | null;
  attributeValue: number;
  total: number;
}

/**
 * Score total d'une compétence = score + total de l'attribut lié.
 * `attributeOverride` (SkillEntry.attribute) prend le pas sur le parsing du
 * nom quand renseigné — nécessaire pour une compétence hors catalogue (texte
 * libre, ex. compétence `free` justifiée par un avantage/du matériel) dont
 * le nom ne suit pas la convention "Nom (ATTR)" du catalogue.
 */
export function getSkillTotal(
  skillName: string,
  score: number,
  attributeTotals: AttributeScores,
  attributeOverride?: Attribute | null,
): SkillTotal {
  const attribute = attributeOverride ?? parseSkillAttribute(skillName);
  const attributeValue = attribute ? attributeTotals[attribute] : 0;
  return { attribute, attributeValue, total: score + attributeValue };
}

/** Bonus racial + bonus tech appliqués au score de base, par attribut. */
export function getAttributeTotal(
  character: Pick<Character, "attributeScores" | "attributeTechBonus" | "race">,
  reference: ReferenceData,
  attribute: Attribute,
): number {
  const raceDef = reference.races.find((r) => r.race === character.race);
  const base = character.attributeScores[attribute] ?? 0;
  const racial = raceDef?.attributeBonus[attribute] ?? 0;
  const tech = character.attributeTechBonus[attribute] ?? 0;
  return base + racial + tech;
}

export function getAllAttributeTotals(
  character: Pick<Character, "attributeScores" | "attributeTechBonus" | "race">,
  reference: ReferenceData,
): AttributeScores {
  const result = {} as AttributeScores;
  for (const attribute of ATTRIBUTES) {
    result[attribute] = getAttributeTotal(character, reference, attribute);
  }
  return result;
}

/** Somme des 8 totaux d'attributs — doit valoir +7 à la création (données!B22), informatif seulement en édition. */
export function getAttributeSum(
  character: Pick<Character, "attributeScores" | "attributeTechBonus" | "race">,
  reference: ReferenceData,
): number {
  const totals = getAllAttributeTotals(character, reference);
  return ATTRIBUTES.reduce((sum, attr) => sum + totals[attr], 0);
}

/**
 * PV max = (VIT_total + taille) x 5 + 30 (données!E24). Même formule pour
 * un PNJ : le MJ saisit juste VIT à la création (cf. characters.ts POST),
 * les autres attributs restant à 0.
 */
export function getHpMax(
  character: Pick<Character, "attributeScores" | "attributeTechBonus" | "race" | "tailleModifier">,
  reference: ReferenceData,
): number {
  const vit = getAttributeTotal(character, reference, "VIT");
  return (vit + character.tailleModifier) * 5 + 30;
}

/** PSP max = VOL_total x 5 + 30 (données!E25). */
export function getPspMax(
  character: Pick<Character, "attributeScores" | "attributeTechBonus" | "race">,
  reference: ReferenceData,
): number {
  const vol = getAttributeTotal(character, reference, "VOL");
  return vol * 5 + 30;
}

/**
 * Coût en points pour un score de compétence/pouvoir psy donné
 * (listes!A14:B29, table partagée). Un score sans entrée exacte retombe sur
 * le palier inférieur le plus proche ; un score de 0 ou négatif coûte 0.
 */
export function getSkillCost(score: number, table: ReferenceData["skillCostTable"]): number {
  if (score <= 0) return 0;
  if (table[score] !== undefined) return table[score]!;
  const knownScores = Object.keys(table)
    .map(Number)
    .filter((s) => s <= score)
    .sort((a, b) => b - a);
  const nearest = knownScores[0];
  return nearest !== undefined ? table[nearest]! : 0;
}

/**
 * Coût total des compétences — exclut les compétences `free` (déjà
 * justifiées par un avantage/du matériel de la fiche plutôt qu'achetées en
 * XP, cf. SkillEntry.free), qui restent dans la même liste mais ne
 * réduisent pas le solde de points.
 */
export function getSkillsCostTotal(
  character: Pick<Character, "skills">,
  reference: ReferenceData,
): number {
  return character.skills.reduce(
    (sum, skill) => sum + (skill.free ? 0 : getSkillCost(skill.score, reference.skillCostTable)),
    0,
  );
}

export function getPsyPowersCostTotal(
  character: Pick<Character, "psyPowers">,
  reference: ReferenceData,
): number {
  return character.psyPowers.reduce(
    (sum, power) => sum + getSkillCost(power.score, reference.skillCostTable),
    0,
  );
}

export interface ArmorTotals {
  vpTete: number;
  vpBras: number;
  vpTorse: number;
  vpJambes: number;
}

/** Total de protection = somme des VP des seules armures actives (équipées). Remplace l'affichage détaillé par armure — cf. char_sheet, qui n'affiche déjà que les noms, pas le détail VP par pièce. */
export function getArmorTotals(character: Pick<Character, "armor">): ArmorTotals {
  return character.armor
    .filter((a) => a.active)
    .reduce(
      (sum, a) => ({
        vpTete: sum.vpTete + a.vpTete,
        vpBras: sum.vpBras + a.vpBras,
        vpTorse: sum.vpTorse + a.vpTorse,
        vpJambes: sum.vpJambes + a.vpJambes,
      }),
      { vpTete: 0, vpBras: 0, vpTorse: 0, vpJambes: 0 },
    );
}

/**
 * Score total d'un pouvoir psy = score du pouvoir + VOL_total + score de la
 * compétence d'affinité correspondante si le personnage la possède (ex.
 * "Affinité (VOL) Téléportation" pour le pouvoir "Téléportation" — cf.
 * char_sheet!AK114 = données!H20 + K12(affinité) + K19(pouvoir)).
 */
export function getPsyPowerTotal(
  power: { name: string; score: number },
  character: Pick<Character, "skills">,
  attributeTotals: AttributeScores,
): number {
  const affinity = character.skills.find((s) => s.name === `Affinité (VOL) ${power.name}`);
  return power.score + attributeTotals.VOL + (affinity?.score ?? 0);
}

export interface WeaponTotals {
  ra: number;
  damage: number;
  baseScore: number;
}

/**
 * Rang d'Action par défaut avant réflexes/arme : plus le RA final est bas,
 * plus le personnage agit tôt (confirmé par le MJ le 18/08 ; valeur 5
 * confirmée le 19/08, après un premier calcul manuel supposant 8). Le RA de
 * catalogue d'une arme (WeaponEntry.ra, ex. 2 pour Wild Predator) et ses
 * modificateurs justifiés ne sont donc pas le RA final — ils viennent en
 * déduction de ce socle, avec le Réflexe total du personnage.
 */
const BASE_RA = 5;

/**
 * Dégâts/Score réellement joués = valeur de base + somme des modificateurs
 * justifiés (cf. WeaponEntry.modifiers dans types.ts). RA réellement joué =
 * BASE_RA - Réflexe total + (RA de catalogue + modificateurs) : le RA de
 * catalogue d'une arme (ex. 2 pour Wild Predator) est déjà un rang à part
 * entière — lu directement dans la table du classeur, pas un malus à
 * soustraire (correction du 19/08 : la première version de cette formule
 * l'avait soustrait par erreur, oubliant que "le RA de l'arme est déjà dans
 * la table"). S'ADDITIONNE donc au socle BASE_RA - Réflexe, avec les
 * modificateurs justifiés (ex. -1 "Améliorations WP", qui réduit d'autant
 * le total puisqu'ajouté avec son propre signe). Remplace le bricolage du
 * classeur Excel d'origine (une formule figée référençant 3 lignes fixes du
 * catalogue, uniquement câblée pour le 1er emplacement d'arme, propagée par
 * copier-coller à des personnages qui n'avaient pourtant pas l'amélioration
 * — cf. investigation du 16/08).
 */
/** RA de catalogue d'une arme + ses modificateurs justifiés — terme de la formule complète (cf. getWeaponTotals/getActionRank), pas une valeur jouée en soi. */
function getWeaponRaModifier(weapon: Pick<WeaponEntry, "ra" | "modifiers">): number {
  const modifiers = weapon.modifiers ?? [];
  return weapon.ra + modifiers.reduce((sum, m) => sum + (m.ra ?? 0), 0);
}

export function getWeaponTotals(
  weapon: Pick<WeaponEntry, "ra" | "damage" | "baseScore" | "modifiers">,
  refTotal: number,
): WeaponTotals {
  const modifiers = weapon.modifiers ?? [];
  return {
    ra: BASE_RA - refTotal + getWeaponRaModifier(weapon),
    damage: weapon.damage + modifiers.reduce((sum, m) => sum + (m.damage ?? 0), 0),
    baseScore: weapon.baseScore + modifiers.reduce((sum, m) => sum + (m.score ?? 0), 0),
  };
}

// ---------------------------------------------------------------------------
// Rang d'Action "courant" du personnage (écran MJ "Suivi des constantes") —
// même socle BASE_RA - Réflexe + arme équipée que getWeaponTotals ci-dessus,
// avec en plus les deux seuls éléments du catalogue (Règles ADD40K V0.2, cf.
// investigation du 18/08) qui modifient le Réflexe pour le calcul du RA :
//   - Avantages "Concentration rapide" (+10, REF+3) / "Concentration lente"
//     (-20, REF-3) — ne s'appliquent QUE quand le personnage a un pouvoir
//     actif ("quand vous utilisez vos pouvoirs" / "pour actionner vos
//     pouvoirs" dans le texte des avantages), pas en combat normal à l'arme.
//   - Pouvoir "Concentration psy" (Maîtrise de soi), activé "à la demande"
//     (Character.activePsyPowers) à un palier ≤ son score : seul pouvoir du
//     catalogue à moduler le Réflexe parmi les ~19 décrits dans les règles —
//     tous les autres pouvoirs peuvent être activés via la même UI mais
//     n'ont aucun effet chiffré sur le RA (portée hors périmètre de ce
//     calcul : dégâts, création de matière, téléportation...).
// ---------------------------------------------------------------------------

const CONCENTRATION_RAPIDE_LABEL = "Concentration rapide";
const CONCENTRATION_LENTE_LABEL = "Concentration lente";
const CONCENTRATION_PSY_NAME = "Concentration psy";

/**
 * +3/-3 de Réflexe pour l'activation de pouvoirs (Concentration rapide/lente,
 * cf. catalogue avantages) — appliqué seulement si le personnage a
 * effectivement un pouvoir actif (`hasActivePower`), conformément au texte
 * des avantages ("quand vous utilisez vos pouvoirs").
 */
function getConcentrationAdvantageRefDelta(
  character: Pick<Character, "advantages">,
  hasActivePower: boolean,
): number {
  if (!hasActivePower) return 0;
  const labels = character.advantages.map((a) => a.label);
  if (labels.some((l) => l.startsWith(CONCENTRATION_RAPIDE_LABEL))) return 3;
  if (labels.some((l) => l.startsWith(CONCENTRATION_LENTE_LABEL))) return -3;
  return 0;
}

/**
 * Bonus de Réflexe du pouvoir "Concentration psy" actif, selon le palier
 * choisi et le score du personnage dans ce pouvoir (Règles ADD40K V0.2,
 * §Maîtrise de soi) :
 *   Niveau 15 : +1 REF par tranche de 5 dans le score — seulement si REF
 *     est l'attribut choisi à l'activation (le pouvoir ne boost qu'un seul
 *     attribut physique à ce palier).
 *   Niveau 20 : +1 REF par tranche de 2 dans le score — idem, un seul
 *     attribut choisi.
 *   Niveau 25 : +1 par tranche de 3, sur TOUTES les caractéristiques
 *     physiques (donc REF inclus sans avoir à le choisir).
 *   Niveau 30 : +1 par point de score, toutes caractéristiques physiques.
 *   Niveau 35 ("Appel de l'avatar") : +5 fixe, toutes caractéristiques
 *     physiques.
 * PRE (Présence) du classeur d'origine n'a pas d'équivalent dans les 8
 * attributs de l'app (cf. ATTRIBUTES) — hors périmètre, seul REF/DEX/VIT
 * sont proposés au choix pour les paliers 15/20 (cf. ActivePsyPower).
 */
function getActivePsyPowerRefBonus(character: Pick<Character, "psyPowers" | "activePsyPowers">): number {
  const active = (character.activePsyPowers ?? []).find((p) => p.name === CONCENTRATION_PSY_NAME);
  if (!active) return 0;
  const score = character.psyPowers.find((p) => p.name === CONCENTRATION_PSY_NAME)?.score ?? 0;
  switch (active.level) {
    case 15:
      return active.attribute === "REF" ? Math.floor(score / 5) : 0;
    case 20:
      return active.attribute === "REF" ? Math.floor(score / 2) : 0;
    case 25:
      return Math.floor(score / 3);
    case 30:
      return score;
    case 35:
      return 5;
    default:
      return 0;
  }
}

/**
 * Rang d'Action courant du personnage, tous éléments combinés — cf. les
 * commentaires ci-dessus pour le détail de chaque terme. Plus la valeur est
 * basse, plus le personnage agit tôt (confirmé par le MJ le 18/08).
 */
export function getActionRank(
  character: Pick<Character, "race" | "attributeScores" | "attributeTechBonus" | "weapons" | "advantages" | "psyPowers" | "activePsyPowers">,
  reference: ReferenceData,
): number {
  const refTotal = getAttributeTotal(character, reference, "REF");
  const hasActivePower = (character.activePsyPowers ?? []).length > 0;
  const effectiveRef =
    refTotal + getConcentrationAdvantageRefDelta(character, hasActivePower) + getActivePsyPowerRefBonus(character);
  const equippedWeapon = character.weapons.find((w) => w.equipped);
  const weaponRaModifier = equippedWeapon ? getWeaponRaModifier(equippedWeapon) : 0;
  return BASE_RA - effectiveRef + weaponRaModifier;
}

// Armes -> compétence liée, pour dériver le score de base (cf. getWeaponSuggestedScore).
// Le classeur d'origine ne fait cette association nulle part de façon fiable
// (une seule colonne "type" Mêl/Fire/Jet, aucune liaison arme->compétence) —
// construite manuellement à partir du catalogue (listes!I:R), confirmée avec
// le MJ le 16/08 sur les cas Vagar (Mêlée) et Jonas (Arme de poing). Les
// armes de jet (arcs, grenades) n'ont pas de compétence fiable identifiée et
// restent donc hors mapping (score de base reste manuel pour ce type).
const PISTOL_WEAPONS = new Set([
  "Street line palm pistol",
  "Cybertech secutity",
  "Colt Python",
  "Wild Predator",
  "Cybertech Silverhawk",
  "Pistolet Gauss",
]);
const RIFLE_WEAPONS = new Set([
  "INDRA",
  "Leader AF4",
  "Redfield 540",
  "Widowmaker",
  "Devastator",
  "Railgun",
  "Inferno",
  "C-Tech Tsunami",
  "Wild RPG",
]);

/** Nom de la compétence liée à une arme (par nom + type), ou null si aucune correspondance fiable (armes de jet). */
export function getWeaponSkillName(weaponName: string, weaponType: WeaponType): string | null {
  if (weaponType === "Mêl") return "Mêlée (DEX)";
  if (weaponType === "Fire") {
    if (PISTOL_WEAPONS.has(weaponName)) return "Arme de poing (PER)";
    if (RIFLE_WEAPONS.has(weaponName)) return "Fusils (PER)";
  }
  return null;
}

/**
 * Score de base suggéré pour une arme = total de la compétence liée (score +
 * attribut, cf. getSkillTotal) si le personnage possède cette compétence sur
 * sa fiche — null sinon (le score de base reste alors manuel). Utilisé pour
 * pré-remplir le score au choix d'une arme dans le catalogue ; n'écrase pas
 * une saisie manuelle existante si aucune compétence ne correspond.
 */
export function getWeaponSuggestedScore(
  character: Pick<Character, "skills">,
  attributeTotals: AttributeScores,
  weaponName: string,
  weaponType: WeaponType,
): number | null {
  const skillName = getWeaponSkillName(weaponName, weaponType);
  if (!skillName) return null;
  const skill = character.skills.find((s) => s.name === skillName);
  if (!skill) return null;
  return getSkillTotal(skillName, skill.score, attributeTotals, skill.attribute).total;
}

/** Somme signée des avantages/inconvénients (données!K40). */
export function getAdvantagesNet(character: Pick<Character, "advantages">): number {
  return character.advantages.reduce((sum, adv) => sum + adv.value, 0);
}

export function getRaceSkillPoints(character: Pick<Character, "race">, reference: ReferenceData): number {
  return reference.races.find((r) => r.race === character.race)?.skillPoints ?? 0;
}

/** Total disponible = points raciaux + points de départ + XP (données!H25). */
export function getTotalDispo(
  character: Pick<Character, "race" | "pointsDepart" | "xp">,
  reference: ReferenceData,
): number {
  return getRaceSkillPoints(character, reference) + character.pointsDepart + character.xp;
}

export interface BudgetSummary {
  raceSkillPoints: number;
  totalDispo: number;
  skillsCost: number;
  psyPowersCost: number;
  advantagesNet: number;
  /**
   * Solde = total dispo - coût compétences - coût pouvoirs psy - net avantages.
   * Un avantage COÛTE des points (réduit le solde), un inconvénient EN DONNE
   * (augmente le solde) — ex. "Dans les nuages" (inconvénient -3, valeur
   * catalogue -30) ajoute +30 au solde. C'est l'inverse de la formule brute
   * du classeur Excel (qui faisait `+K40`) : confirmé explicitement par le
   * MJ, cf. plan lively-rolling-comet.md. Négatif = personnage hors budget.
   */
  solde: number;
}

export function getBudgetSummary(
  character: Pick<
    Character,
    "race" | "pointsDepart" | "xp" | "skills" | "psyPowers" | "advantages"
  >,
  reference: ReferenceData,
): BudgetSummary {
  const totalDispo = getTotalDispo(character, reference);
  const skillsCost = getSkillsCostTotal(character, reference);
  const psyPowersCost = getPsyPowersCostTotal(character, reference);
  const advantagesNet = getAdvantagesNet(character);
  return {
    raceSkillPoints: getRaceSkillPoints(character, reference),
    totalDispo,
    skillsCost,
    psyPowersCost,
    advantagesNet,
    solde: totalDispo - skillsCost - psyPowersCost - advantagesNet,
  };
}

export interface CharacterComputed {
  attributeTotals: AttributeScores;
  attributeSum: number;
  hpMax: number;
  pspMax: number;
  budget: BudgetSummary;
  armorTotals: ArmorTotals;
  actionRank: number;
}

/** Calcule en une passe tout ce que l'UI a besoin d'afficher en lecture seule. */
export function computeCharacter(character: Character, reference: ReferenceData): CharacterComputed {
  return {
    attributeTotals: getAllAttributeTotals(character, reference),
    attributeSum: getAttributeSum(character, reference),
    hpMax: getHpMax(character, reference),
    pspMax: getPspMax(character, reference),
    budget: getBudgetSummary(character, reference),
    armorTotals: getArmorTotals(character),
    actionRank: getActionRank(character, reference),
  };
}
