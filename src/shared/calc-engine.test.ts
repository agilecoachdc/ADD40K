// Tests du moteur de calcul — le cœur critique de l'app (cf.
// scripts/release-check.sh, qui les fait tourner avant tout déploiement).
// Le cas "Stern Tack" fige les valeurs réelles connues du classeur Excel
// d'origine (PV=25, PSP=45) et documente l'effet du fix du bug "Dans les
// nuages" sur le solde de points (voir plan lively-rolling-comet.md).

import { describe, expect, it } from "vitest";
import {
  computeCharacter,
  getArmorTotals,
  getAttributeTotal,
  getHpMax,
  getPspMax,
  getPsyPowerTotal,
  getSkillCost,
  getSkillTotal,
  getWeaponTotals,
  parseSkillAttribute,
} from "./calc-engine";
import { referenceData } from "./reference-data";
import type { Character } from "./types";
import sternTackSeed from "../../scripts/characters.seed.json";

const sternTack = (sternTackSeed as Character[]).find((c) => c.name === "Stern Tack")!;

describe("getSkillCost", () => {
  it("suit la table listes!A14:B29", () => {
    expect(getSkillCost(0, referenceData.skillCostTable)).toBe(0);
    expect(getSkillCost(1, referenceData.skillCostTable)).toBe(5);
    expect(getSkillCost(6, referenceData.skillCostTable)).toBe(35);
    expect(getSkillCost(15, referenceData.skillCostTable)).toBe(175);
  });

  it("retombe sur le palier inférieur pour un score sans entrée exacte", () => {
    expect(getSkillCost(20, referenceData.skillCostTable)).toBe(175);
  });
});

describe("getAttributeTotal", () => {
  it("additionne base + bonus racial (gith: INT+1, VOL+1)", () => {
    const total = getAttributeTotal(sternTack, referenceData, "INT");
    expect(total).toBe(sternTack.attributeScores.INT + 1);
  });
});

describe("PV/PSP — cas réel Stern Tack", () => {
  it("PV max = 25 (valeur connue du classeur : (VIT_total -1 + taille 0) x 5 + 30)", () => {
    expect(getHpMax(sternTack, referenceData)).toBe(25);
  });

  it("PSP max = 45 (valeur connue du classeur : VOL_total 3 x 5 + 30)", () => {
    expect(getPspMax(sternTack, referenceData)).toBe(45);
  });
});

describe("parseSkillAttribute / getSkillTotal", () => {
  it("extrait le code d'attribut même au milieu du nom", () => {
    expect(parseSkillAttribute("Commandement (COM)")).toBe("COM");
    expect(parseSkillAttribute("Affinité (VOL) Téléportation")).toBe("VOL");
    expect(parseSkillAttribute("Corpsystème")).toBeNull();
  });

  it("additionne score de compétence + total d'attribut lié (cas réel Stern Tack : Commandement (COM) 6 + COM 2 = 8)", () => {
    const attributeTotals = computeCharacter(sternTack, referenceData).attributeTotals;
    const result = getSkillTotal("Commandement (COM)", 6, attributeTotals);
    expect(result.attribute).toBe("COM");
    expect(result.attributeValue).toBe(2);
    expect(result.total).toBe(8);
  });
});

describe("getArmorTotals", () => {
  it("ne somme que les armures actives", () => {
    const totals = getArmorTotals({
      armor: [
        { name: "A", vpTete: 1, vpBras: 1, vpTorse: 1, vpJambes: 1, active: true },
        { name: "B", vpTete: 10, vpBras: 10, vpTorse: 10, vpJambes: 10, active: false },
      ],
    });
    expect(totals).toEqual({ vpTete: 1, vpBras: 1, vpTorse: 1, vpJambes: 1 });
  });
});

describe("getWeaponTotals", () => {
  it("sans modificateur, le total = la base (comportement des armes existantes, inchangé)", () => {
    expect(getWeaponTotals({ ra: 6, damage: 8, baseScore: 7 })).toEqual({ ra: 6, damage: 8, baseScore: 7 });
  });

  it("cas réel Wild Predator de Conrad Lingus : +1 RA/Dégâts/Score justifiés par 'Améliorations WP : 1,1,1'", () => {
    const totals = getWeaponTotals({
      ra: 6,
      damage: 8,
      baseScore: 8,
      modifiers: [{ justification: "Améliorations WP : 1,1,1", ra: 1, damage: 1, score: 1 }],
    });
    expect(totals).toEqual({ ra: 7, damage: 9, baseScore: 9 });
  });

  it("cumule plusieurs modificateurs, chacun ne touchant pas forcément les 3 stats", () => {
    const totals = getWeaponTotals({
      ra: 5,
      damage: 5,
      baseScore: 5,
      modifiers: [
        { justification: "Viseur laser", score: 2 },
        { justification: "Chargeur amélioré", damage: 1 },
      ],
    });
    expect(totals).toEqual({ ra: 5, damage: 6, baseScore: 7 });
  });
});

describe("getPsyPowerTotal", () => {
  it("additionne score du pouvoir + VOL_total + compétence d'affinité (cas réel Stern Tack : Téléportation 6 + VOL 3 + Affinité 5 = 14)", () => {
    const attributeTotals = computeCharacter(sternTack, referenceData).attributeTotals;
    const power = sternTack.psyPowers.find((p) => p.name === "Téléportation")!;
    expect(getPsyPowerTotal(power, sternTack, attributeTotals)).toBe(14);
  });
});

describe("budget de points — cas réel Stern Tack", () => {
  it("solde recalculé : avantages coûtent, inconvénients donnent (-68, confirmé par le MJ — contre +2 dans le classeur bugué)", () => {
    const { budget } = computeCharacter(sternTack, referenceData);
    expect(budget.totalDispo).toBe(267);
    expect(budget.skillsCost).toBe(290);
    expect(budget.psyPowersCost).toBe(35);
    // Avantages dérivés du catalogue corrigé : ..., Dans les nuages -30 (pas +20).
    expect(budget.advantagesNet).toBe(10);
    // solde = totalDispo - skillsCost - psyPowersCost - advantagesNet (pas +)
    expect(budget.solde).toBe(-68);
  });
});
