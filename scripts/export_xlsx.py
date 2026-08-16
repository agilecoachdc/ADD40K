#!/usr/bin/env python3
"""Génère une fiche Excel par personnage dans "Mon Drive/ADD40K/Fiches App/",
au format du classeur de Conrad Lingus (pris comme template), remplie avec
les données ACTUELLES de l'app (pas les données d'import d'origine — la
fiche évolue en jeu). Inverse de scripts/import_xlsx.py : mêmes coordonnées
de cellules, sens d'écriture opposé.

Usage : python3 scripts/export_xlsx.py <dossier contenant un .json par personnage>

Le dossier d'entrée doit contenir un fichier <id>.json par personnage, forme
`{ "character": Character, ... }` (sortie brute de GET /api/characters/:id)
ou directement un objet Character.

Cellules NON touchées (formules VLOOKUP contre la feuille `listes`,
préservées telles quelles) :
  - données!P13:S17 (VP armure — calculées depuis le nom en O13:O17)
  - données!K19:K23 col M (discipline pouvoir psy — depuis le nom en J)
  - données!K28:K39 (valeur avantage — depuis le libellé en J)
Cellules écrasées en LITTÉRAL (pas en formule) :
  - char_sheet armes (J/AO/AJ/AF/AY, lignes 83/86/89/92/95) — l'app lit déjà
    ces cellules en priorité sur données!O3:R7 (surcharges manuelles
    possibles, cf. import_xlsx.py) ; on écrit donc directement ici plutôt
    que dans données, pour rester cohérent avec ce que l'app relira.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_FILE = Path(
    "/Users/charles/Library/CloudStorage/GoogleDrive-charlesdeclarens@gmail.com/"
    "Mon Drive/ADD40K/Fiches persos/Conrad Lingus.xlsx"
)
OUTPUT_DIR = Path(
    "/Users/charles/Library/CloudStorage/GoogleDrive-charlesdeclarens@gmail.com/"
    "Mon Drive/ADD40K/Fiches App"
)

ATTRS = ["FO", "VIT", "DEX", "REF", "PER", "COM", "INT", "VOL"]
ATTR_ROWS = [6, 8, 10, 12, 14, 16, 18, 20]

SKILL_ROWS = range(3, 15)      # données!J3:K14 — 12 emplacements
ARMOR_ROWS = range(13, 18)     # données!O13:S17 — 5 emplacements (O=nom, P:S=formules VLOOKUP)
PSY_ROWS = range(19, 24)       # données!J19:M23 — 5 emplacements (J=nom, K=score, M=formule discipline)
ADV_ROWS = range(28, 40)       # données!J28:K39 — 12 emplacements (J=libellé, K=formule valeur)
WEAPON_ROWS = [83, 86, 89, 92, 95]  # char_sheet — 5 emplacements
EQUIPMENT_ROWS = range(15, 55, 3)   # char_sheet!DD15,18,...,54 — 14 emplacements (DD12="Neuromat" = en-tête, exclu)


def fmt_height(h) -> str:
    """Reproduit le format observé dans le classeur (virgule décimale, ex. '1.80' -> vu tel quel côté cellule)."""
    if h is None:
        return ""
    return f"{h:.2f}"


def write_character(character: dict, out_path: Path) -> None:
    wb = openpyxl.load_workbook(TEMPLATE_FILE)  # pas data_only : garde les formules
    dn = wb["données"]
    cs = wb["char_sheet"]

    dn["C2"] = character.get("race", "")

    scores = character.get("attributeScores", {})
    tech = character.get("attributeTechBonus", {})
    for attr, row in zip(ATTRS, ATTR_ROWS):
        dn[f"B{row}"] = scores.get(attr, 0)
        dn[f"F{row}"] = tech.get(attr)  # None -> cellule vidée

    # Compétences
    skills = character.get("skills", [])
    for i, row in enumerate(SKILL_ROWS):
        if i < len(skills):
            dn[f"J{row}"] = skills[i]["name"]
            dn[f"K{row}"] = skills[i]["score"]
        else:
            dn[f"J{row}"] = None
            dn[f"K{row}"] = None

    # Armures — seule la colonne nom (O) est écrite, P:S restent des VLOOKUP
    # contre le catalogue `listes` (cf. docstring).
    armor = character.get("armor", [])
    for i, row in enumerate(ARMOR_ROWS):
        dn[f"O{row}"] = armor[i]["name"] if i < len(armor) else None

    # Pouvoirs psy — nom + score écrits, discipline (M) reste formule.
    psy = character.get("psyPowers", [])
    for i, row in enumerate(PSY_ROWS):
        if i < len(psy):
            dn[f"J{row}"] = psy[i]["name"]
            dn[f"K{row}"] = psy[i]["score"]
        else:
            dn[f"J{row}"] = None
            dn[f"K{row}"] = None

    # Avantages/inconvénients — seul le libellé (J) est écrit, K reste VLOOKUP.
    advantages = character.get("advantages", [])
    for i, row in enumerate(ADV_ROWS):
        dn[f"J{row}"] = advantages[i]["label"] if i < len(advantages) else None

    dn["H23"] = character.get("pointsDepart", 0)
    dn["H24"] = character.get("xp", 0)

    # Identité (char_sheet)
    cs["N6"] = character.get("name", "")
    cs["AC6"] = character.get("age")
    cs["AD9"] = character.get("weightLabel", "")
    cs["AS9"] = character.get("fonction", "")
    cs["O9"] = character.get("loyaute", "")
    cs["AR6"] = fmt_height(character.get("heightM"))

    # Armes — écrasées en littéral (pas en formule), cf. docstring.
    weapons = character.get("weapons", [])
    for i, row in enumerate(WEAPON_ROWS):
        if i < len(weapons):
            w = weapons[i]
            cs[f"J{row}"] = w["name"]
            cs[f"AO{row}"] = w["type"]
            cs[f"AJ{row}"] = w["damage"]
            cs[f"AF{row}"] = w["ra"]
            cs[f"AY{row}"] = w["baseScore"]
        else:
            cs[f"J{row}"] = None
            cs[f"AO{row}"] = None
            cs[f"AJ{row}"] = None
            cs[f"AF{row}"] = None
            cs[f"AY{row}"] = None

    # Équipement — liste simple, un item toutes les 3 lignes (DD12 est un
    # en-tête de section fixe "Neuromat", jamais réutilisé comme emplacement).
    equipment = character.get("equipment", [])
    for i, row in enumerate(EQUIPMENT_ROWS):
        cs[f"DD{row}"] = equipment[i]["label"] if i < len(equipment) else None

    wb.save(out_path)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/export_xlsx.py <dossier de .json>")
    input_dir = Path(sys.argv[1])
    if not input_dir.is_dir():
        raise SystemExit(f"Dossier introuvable : {input_dir}")
    if not TEMPLATE_FILE.is_file():
        raise SystemExit(f"Template introuvable : {TEMPLATE_FILE}")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for json_path in sorted(input_dir.glob("*.json")):
        raw = json.loads(json_path.read_text(encoding="utf-8"))
        character = raw["character"] if "character" in raw else raw
        name = character["name"]
        out_path = OUTPUT_DIR / f"{name}.xlsx"
        write_character(character, out_path)
        print(f"écrit {out_path}")


if __name__ == "__main__":
    main()
