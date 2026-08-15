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

import type {
  Attribute,
  AttributeScores,
  Character,
  ReferenceData,
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

/** Score total d'une compétence = score + total de l'attribut lié (si identifiable dans le nom). */
export function getSkillTotal(skillName: string, score: number, attributeTotals: AttributeScores): SkillTotal {
  const attribute = parseSkillAttribute(skillName);
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

/** PV max = (VIT_total + taille) x 5 + 30 (données!E24). */
export function getHpMax(
  character: Pick<
    Character,
    "attributeScores" | "attributeTechBonus" | "race" | "tailleModifier"
  >,
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

export function getSkillsCostTotal(
  character: Pick<Character, "skills">,
  reference: ReferenceData,
): number {
  return character.skills.reduce(
    (sum, skill) => sum + getSkillCost(skill.score, reference.skillCostTable),
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
  };
}
