// Synchronisation fiche Excel <-> personnage app, dans les DEUX sens.
// Mêmes coordonnées de cellules que scripts/import_xlsx.py (Excel -> app)
// et scripts/export_xlsx.py (app -> Excel, le script qui a produit les
// fiches de "Mon Drive/ADD40K/Fiches App/") — garder les trois synchronisés
// si le format du classeur change.
//
// Comme scripts/import_xlsx.py, on ne fait JAMAIS confiance à la valeur
// mise en cache d'une cellule formule (armure/pouvoir psy/avantage — VLOOKUP
// contre la feuille `listes`) : on lit uniquement le nom/libellé saisi et on
// redérive la valeur depuis le catalogue de référence de l'app
// (src/shared/reference-data.ts). Ça évite de dépendre d'un recalcul Excel
// à jour, et ça absorbe le bug corrigé de "Dans les nuages" (cf. calc-engine.ts).
//
// Limite connue (acceptée) : XLSX.js (édition gratuite) ne préserve pas les
// images/mise en forme riche lors de la réécriture — l'export produit un
// classeur fonctionnel (mêmes cellules, mêmes formules) mais visuellement
// plus sobre que les fiches artisanales du dossier Fiches App.

import type * as XLSXType from "xlsx";
import type {
  AdvantageEntry,
  ArmorEntry,
  Attribute,
  AttributeScores,
  Character,
  EquipmentEntry,
  PsyPowerEntry,
  ReferenceData,
  SkillEntry,
  WeaponEntry,
  WeaponType,
} from "@shared/types";
import { ATTRIBUTES } from "@shared/types";
import { getWeaponTotals } from "@shared/calc-engine";

const ATTR_ROWS: Record<Attribute, number> = { FO: 6, VIT: 8, DEX: 10, REF: 12, PER: 14, COM: 16, INT: 18, VOL: 20 };
const SKILL_ROWS = range(3, 15); // données!J3:K14 — 12 emplacements
const ARMOR_ROWS = range(13, 18); // données!O13:S17 — 5 emplacements (O=nom saisi, P:S=formules VLOOKUP)
const PSY_ROWS = range(19, 24); // données!J19:M23 — 5 emplacements
const ADV_ROWS = range(28, 40); // données!J28:K39 — 12 emplacements
const WEAPON_ROWS = [83, 86, 89, 92, 95]; // char_sheet — 5 emplacements
const EQUIPMENT_ROWS = rangeStep(15, 55, 3); // char_sheet!DD15,18,...,54 — 14 emplacements (DD12="Neuromat" = en-tête fixe, exclu)

function range(start: number, endExclusive: number): number[] {
  return Array.from({ length: endExclusive - start }, (_, i) => start + i);
}
function rangeStep(start: number, endExclusive: number, step: number): number[] {
  const out: number[] = [];
  for (let i = start; i < endExclusive; i += step) out.push(i);
  return out;
}

function setCell(sheet: XLSXType.WorkSheet, ref: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    delete sheet[ref];
    return;
  }
  sheet[ref] = typeof value === "number" ? { t: "n", v: value } : { t: "s", v: String(value) };
}

function getCell(sheet: XLSXType.WorkSheet, ref: string): string | number | undefined {
  return sheet[ref]?.v as string | number | undefined;
}

function requiredSheets(wb: XLSXType.WorkBook): { dn: XLSXType.WorkSheet; cs: XLSXType.WorkSheet } {
  const dn = wb.Sheets["données"];
  const cs = wb.Sheets["char_sheet"];
  if (!dn || !cs) {
    throw new Error("Format de classeur inattendu (feuilles 'données'/'char_sheet' introuvables) — pas une fiche ADD40K.");
  }
  return { dn, cs };
}

/** Écrit le personnage dans un classeur (mutation en place) — utilisé par l'export. */
export function applyCharacterToWorkbook(wb: XLSXType.WorkBook, character: Character): void {
  const { dn, cs } = requiredSheets(wb);

  setCell(dn, "C2", character.race);

  for (const attr of ATTRIBUTES) {
    const row = ATTR_ROWS[attr];
    setCell(dn, `B${row}`, character.attributeScores[attr] ?? 0);
    setCell(dn, `F${row}`, character.attributeTechBonus[attr]);
  }

  SKILL_ROWS.forEach((row, i) => {
    const s = character.skills[i];
    setCell(dn, `J${row}`, s?.name);
    setCell(dn, `K${row}`, s?.score);
  });

  ARMOR_ROWS.forEach((row, i) => {
    setCell(dn, `O${row}`, character.armor[i]?.name);
  });

  PSY_ROWS.forEach((row, i) => {
    const p = character.psyPowers[i];
    setCell(dn, `J${row}`, p?.name);
    setCell(dn, `K${row}`, p?.score);
  });

  ADV_ROWS.forEach((row, i) => {
    setCell(dn, `J${row}`, character.advantages[i]?.label);
  });

  setCell(dn, "H23", character.pointsDepart);
  setCell(dn, "H24", character.xp);

  setCell(cs, "N6", character.name);
  setCell(cs, "AC6", character.age ?? undefined);
  setCell(cs, "AD9", character.weightLabel);
  setCell(cs, "AS9", character.fonction);
  setCell(cs, "O9", character.loyaute);
  setCell(cs, "AR6", character.heightM != null ? character.heightM.toFixed(2) : undefined);

  WEAPON_ROWS.forEach((row, i) => {
    const w = character.weapons[i];
    // Écrit le TOTAL joué (base + modificateurs justifiés), pas juste la
    // base — l'Excel exporté doit refléter les valeurs réellement utilisées
    // à table, comme les autres cellules calculées côté app. Le détail des
    // modificateurs (justification par ligne d'équipement) est une
    // nouveauté app, sans équivalent de cellule dans le classeur d'origine
    // — il ne survit donc pas à l'export (perte assumée, comme les images).
    const totals = w ? getWeaponTotals(w) : undefined;
    setCell(cs, `J${row}`, w?.name);
    setCell(cs, `AO${row}`, w?.type);
    setCell(cs, `AJ${row}`, totals?.damage);
    setCell(cs, `AF${row}`, totals?.ra);
    setCell(cs, `AY${row}`, totals?.baseScore);
  });

  EQUIPMENT_ROWS.forEach((row, i) => {
    setCell(cs, `DD${row}`, character.equipment[i]?.label);
  });
}

/** Lit un classeur et produit un patch de personnage — utilisé par l'import. */
export function readCharacterPatchFromWorkbook(wb: XLSXType.WorkBook, reference: ReferenceData): Partial<Character> {
  const { dn, cs } = requiredSheets(wb);

  const attributeScores = {} as AttributeScores;
  const attributeTechBonus: Partial<AttributeScores> = {};
  for (const attr of ATTRIBUTES) {
    const row = ATTR_ROWS[attr];
    attributeScores[attr] = Number(getCell(dn, `B${row}`)) || 0;
    const tech = getCell(dn, `F${row}`);
    if (typeof tech === "number" && tech !== 0) attributeTechBonus[attr] = tech;
  }

  const skills: SkillEntry[] = [];
  for (const row of SKILL_ROWS) {
    const name = getCell(dn, `J${row}`);
    if (name) skills.push({ name: String(name), score: Number(getCell(dn, `K${row}`)) || 0 });
  }

  const armorCatalog = new Map(reference.armor.map((a) => [a.name, a]));
  const armor: ArmorEntry[] = [];
  for (const row of ARMOR_ROWS) {
    const name = getCell(dn, `O${row}`);
    if (name) {
      const def = armorCatalog.get(String(name));
      armor.push({
        name: String(name),
        vpTete: def?.vpTete ?? 0,
        vpBras: def?.vpBras ?? 0,
        vpTorse: def?.vpTorse ?? 0,
        vpJambes: def?.vpJambes ?? 0,
        active: true,
      });
    }
  }

  const psyCatalog = new Map(reference.psyPowers.map((p) => [p.name, p]));
  const psyPowers: PsyPowerEntry[] = [];
  for (const row of PSY_ROWS) {
    const name = getCell(dn, `J${row}`);
    if (name) {
      psyPowers.push({
        name: String(name),
        score: Number(getCell(dn, `K${row}`)) || 0,
        discipline: psyCatalog.get(String(name))?.discipline ?? "",
      });
    }
  }

  const advCatalog = new Map(reference.advantages.map((a) => [a.label, a]));
  const advantages: AdvantageEntry[] = [];
  for (const row of ADV_ROWS) {
    const label = getCell(dn, `J${row}`);
    if (label) advantages.push({ label: String(label), value: advCatalog.get(String(label))?.value ?? 0 });
  }

  const weapons: WeaponEntry[] = [];
  for (const row of WEAPON_ROWS) {
    const name = getCell(cs, `J${row}`);
    if (name) {
      weapons.push({
        name: String(name),
        type: (getCell(cs, `AO${row}`) as WeaponType) || "Fire",
        damage: Number(getCell(cs, `AJ${row}`)) || 0,
        ra: Number(getCell(cs, `AF${row}`)) || 0,
        baseScore: Number(getCell(cs, `AY${row}`)) || 0,
      });
    }
  }

  const equipment: EquipmentEntry[] = [];
  for (const row of EQUIPMENT_ROWS) {
    const label = getCell(cs, `DD${row}`);
    if (label) equipment.push({ label: String(label) });
  }

  const patch: Partial<Character> = {
    attributeScores,
    attributeTechBonus,
    skills,
    armor,
    psyPowers,
    advantages,
    weapons,
    equipment,
    pointsDepart: Number(getCell(dn, "H23")) || 0,
    xp: Number(getCell(dn, "H24")) || 0,
  };

  const name = getCell(cs, "N6");
  const age = getCell(cs, "AC6");
  const weightLabel = getCell(cs, "AD9");
  const fonction = getCell(cs, "AS9");
  const loyaute = getCell(cs, "O9");
  const heightRaw = getCell(cs, "AR6");
  const race = getCell(dn, "C2");

  if (name) patch.name = String(name);
  if (typeof age === "number") patch.age = age;
  if (weightLabel) patch.weightLabel = String(weightLabel);
  if (fonction) patch.fonction = String(fonction);
  if (loyaute) patch.loyaute = String(loyaute);
  if (heightRaw) {
    const h = parseFloat(String(heightRaw).replace(",", "."));
    if (!Number.isNaN(h)) patch.heightM = h;
  }
  if (race) patch.race = String(race).toLowerCase();

  return patch;
}
