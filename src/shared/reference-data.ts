// Fichier généré par scripts/import_xlsx.py — NE PAS ÉDITER À LA MAIN.
// Source : listes de "Stern Tack.xlsx" (identiques dans les 8 fiches
// de Mon Drive/ADD40K/Fiches persos), croisées avec Règles ADD40K - V0.2.docx.
// Pour mettre à jour : relancer `npm run import:xlsx`.

import type { ReferenceData } from "./types";

export const referenceData: ReferenceData = {
  "races": [
    {
      "race": "eldar",
      "label": "Eldar",
      "attributeBonus": {
        "FO": 0,
        "VIT": -1,
        "DEX": 1,
        "REF": 0,
        "PER": 1,
        "COM": 0,
        "INT": 1,
        "VOL": 1
      },
      "tailleBonus": 0,
      "skillPoints": 10
    },
    {
      "race": "rohirim",
      "label": "Rohirim",
      "attributeBonus": {
        "FO": 0,
        "VIT": 1,
        "DEX": 1,
        "REF": -1,
        "PER": 0,
        "COM": 0,
        "INT": 1,
        "VOL": 1
      },
      "tailleBonus": -1,
      "skillPoints": 15
    },
    {
      "race": "gith",
      "label": "Gith",
      "attributeBonus": {
        "FO": 0,
        "VIT": 0,
        "DEX": 0,
        "REF": 0,
        "PER": 0,
        "COM": 0,
        "INT": 1,
        "VOL": 1
      },
      "tailleBonus": 0,
      "skillPoints": 15
    },
    {
      "race": "rakshasa",
      "label": "Rakshasa",
      "attributeBonus": {
        "FO": 0,
        "VIT": 0,
        "DEX": 0,
        "REF": 1,
        "PER": 0,
        "COM": 1,
        "INT": 0,
        "VOL": 0
      },
      "tailleBonus": 0,
      "skillPoints": 15
    },
    {
      "race": "hobbit",
      "label": "Hobbit",
      "attributeBonus": {
        "FO": 0,
        "VIT": -1,
        "DEX": 1,
        "REF": 1,
        "PER": 1,
        "COM": 1,
        "INT": 0,
        "VOL": 0
      },
      "tailleBonus": -1,
      "skillPoints": 15
    },
    {
      "race": "orc",
      "label": "Orc",
      "attributeBonus": {
        "FO": 1,
        "VIT": 1,
        "DEX": 0,
        "REF": 0,
        "PER": -1,
        "COM": 0,
        "INT": 0,
        "VOL": 0
      },
      "tailleBonus": 1,
      "skillPoints": 20
    },
    {
      "race": "gnome",
      "label": "Gnome",
      "attributeBonus": {
        "FO": -1,
        "VIT": 0,
        "DEX": 1,
        "REF": 0,
        "PER": 0,
        "COM": 0,
        "INT": 0,
        "VOL": 0
      },
      "tailleBonus": -1,
      "skillPoints": 20
    },
    {
      "race": "humain",
      "label": "Humain",
      "attributeBonus": {
        "FO": 0,
        "VIT": 0,
        "DEX": 0,
        "REF": 0,
        "PER": 0,
        "COM": 0,
        "INT": 0,
        "VOL": 0
      },
      "tailleBonus": 0,
      "skillPoints": 20
    }
  ],
  "skillCostTable": {
    "0": 0,
    "1": 5,
    "2": 10,
    "3": 15,
    "4": 20,
    "5": 25,
    "6": 35,
    "7": 45,
    "8": 55,
    "9": 65,
    "10": 75,
    "11": 95,
    "12": 115,
    "13": 135,
    "14": 155,
    "15": 175
  },
  "skills": [
    {
      "name": "Arme de poing (PER)",
      "attribute": "PER"
    },
    {
      "name": "Fusils (PER)",
      "attribute": "PER"
    },
    {
      "name": "Mêlée (DEX)",
      "attribute": "DEX"
    },
    {
      "name": "Esquive (REF)",
      "attribute": "REF"
    },
    {
      "name": "Commandement (COM)",
      "attribute": "COM"
    },
    {
      "name": "Etiquette (COM)",
      "attribute": "COM"
    },
    {
      "name": "interview (COM)",
      "attribute": "COM"
    },
    {
      "name": "Persuasion (COM)",
      "attribute": "COM"
    },
    {
      "name": "Sciences théo (INT)",
      "attribute": "INT"
    },
    {
      "name": "Informatique (INT)",
      "attribute": "INT"
    },
    {
      "name": "Sciences dures (DEX)",
      "attribute": "DEX"
    },
    {
      "name": "Médecine (INT) (DEX)",
      "attribute": "INT"
    },
    {
      "name": "Gestion (INT)",
      "attribute": "INT"
    },
    {
      "name": "Histoire, (INT)",
      "attribute": "INT"
    },
    {
      "name": "Athlétisme (VIT)",
      "attribute": "VIT"
    },
    {
      "name": "Résistance aux tortures et drogues (VIT)",
      "attribute": "VIT"
    },
    {
      "name": "Survie (zone) (VIT)",
      "attribute": "VIT"
    },
    {
      "name": "Discretion (DEX)",
      "attribute": "DEX"
    },
    {
      "name": "Contrefaçon (DEX)",
      "attribute": "DEX"
    },
    {
      "name": "Déguisement (DEX)",
      "attribute": "DEX"
    },
    {
      "name": "Pickpocket (DEX)",
      "attribute": "DEX"
    },
    {
      "name": "Chercher (PER)",
      "attribute": "PER"
    },
    {
      "name": "Sens (PER)",
      "attribute": "PER"
    },
    {
      "name": "Sécurité (DEX)",
      "attribute": "DEX"
    },
    {
      "name": "Conn. des rues (PER)",
      "attribute": "PER"
    },
    {
      "name": "Pilotage définir type (REF)",
      "attribute": "REF"
    },
    {
      "name": "Explosifs,demolition (INT)",
      "attribute": "INT"
    },
    {
      "name": "Corp système (INT)",
      "attribute": "INT"
    },
    {
      "name": "Affinité (VOL) Téléportation",
      "attribute": "VOL"
    }
  ],
  "weapons": [
    {
      "name": "Mains nues",
      "damage": -1.0,
      "price": 0.0,
      "ra": 0.0,
      "type": "Mêl"
    },
    {
      "name": "Poing américain",
      "damage": 1.0,
      "price": 10.0,
      "ra": 0.0,
      "type": "Mêl"
    },
    {
      "name": "couteaux",
      "damage": 3.0,
      "price": "10-100",
      "ra": 1.0,
      "type": "Mêl"
    },
    {
      "name": "Épées, haches 1 main",
      "damage": 4.0,
      "price": 400.0,
      "ra": 2.0,
      "type": "Mêl"
    },
    {
      "name": "Epées haches 2 mains",
      "damage": 5.0,
      "price": 500.0,
      "ra": 2.0,
      "type": "Mêl"
    },
    {
      "name": "Armes d’hast",
      "damage": 5.0,
      "price": 800.0,
      "ra": 3.0,
      "type": "Mêl"
    },
    {
      "name": "Katana",
      "damage": 4.0,
      "price": 3000.0,
      "ra": 2.0,
      "type": "Mêl"
    },
    {
      "name": "Rippers",
      "damage": 4.0,
      "price": 2000.0,
      "ra": 2.0,
      "type": "Mêl"
    },
    {
      "name": "Power Knife",
      "damage": 5.0,
      "price": 5000.0,
      "ra": 2.0,
      "type": "Mêl"
    },
    {
      "name": "Tronçonneuse",
      "damage": 5.0,
      "price": 500.0,
      "ra": 3.0,
      "type": "Mêl"
    },
    {
      "name": "Sharpness",
      "damage": 6.0,
      "price": 10000.0,
      "ra": 2.0,
      "type": "Mêl"
    },
    {
      "name": "Boneripp",
      "damage": 7.0,
      "price": null,
      "ra": null,
      "type": "Mêl"
    },
    {
      "name": "Griffes rétractables",
      "damage": 7.0,
      "price": null,
      "ra": null,
      "type": "Mêl"
    },
    {
      "name": "Rippers",
      "damage": 8.0,
      "price": null,
      "ra": null,
      "type": "Mêl"
    },
    {
      "name": "Wolfers",
      "damage": 9.0,
      "price": null,
      "ra": null,
      "type": "Mêl"
    },
    {
      "name": "Cyclope",
      "damage": 5.0,
      "price": null,
      "ra": null,
      "type": "Mêl"
    },
    {
      "name": "Queue de combat",
      "damage": 6.0,
      "price": null,
      "ra": null,
      "type": "Mêl"
    },
    {
      "name": "Sourire du requin",
      "damage": 6.0,
      "price": null,
      "ra": null,
      "type": "Mêl"
    },
    {
      "name": "Slice N Dice",
      "damage": 7.0,
      "price": null,
      "ra": null,
      "type": "Mêl"
    },
    {
      "name": "Snake fangs",
      "damage": 5.0,
      "price": null,
      "ra": null,
      "type": "Mêl"
    },
    {
      "name": "Arc court / arbalète légère",
      "damage": 3.0,
      "price": 500.0,
      "ra": 2.0,
      "type": "Jet"
    },
    {
      "name": "Arc long /arbalète lourde",
      "damage": 4.0,
      "price": 1000.0,
      "ra": 3.0,
      "type": "Jet"
    },
    {
      "name": "Arbalète à répétition",
      "damage": 4.0,
      "price": 2500.0,
      "ra": 3.0,
      "type": "Jet"
    },
    {
      "name": "Couteau de lancer",
      "damage": 2.0,
      "price": 20.0,
      "ra": 1.0,
      "type": "Jet"
    },
    {
      "name": "caillou",
      "damage": 0.0,
      "price": 0.0,
      "ra": 1.0,
      "type": "Jet"
    },
    {
      "name": "Shuriken",
      "damage": 1.0,
      "price": 25.0,
      "ra": 1.0,
      "type": "Jet"
    },
    {
      "name": "Grenades incapacitantes",
      "damage": 1.0,
      "price": 300.0,
      "ra": 2.0,
      "type": "Jet"
    },
    {
      "name": "Grenades à plasma",
      "damage": 8.0,
      "price": 1500.0,
      "ra": 2.0,
      "type": "Jet"
    },
    {
      "name": "Grenade à fragmentation",
      "damage": 6.0,
      "price": 300.0,
      "ra": 2.0,
      "type": "Jet"
    },
    {
      "name": "Street line palm pistol",
      "damage": 4.0,
      "price": 500.0,
      "ra": 1.0,
      "type": "Fire"
    },
    {
      "name": "Cybertech secutity",
      "damage": 4.0,
      "price": 800.0,
      "ra": 1.0,
      "type": "Fire"
    },
    {
      "name": "Colt Python",
      "damage": 5.0,
      "price": 2000.0,
      "ra": 2.0,
      "type": "Fire"
    },
    {
      "name": "Wild Predator",
      "damage": 6.0,
      "price": 6000.0,
      "ra": 2.0,
      "type": "Fire"
    },
    {
      "name": "Cybertech Silverhawk",
      "damage": 7.0,
      "price": 7000.0,
      "ra": 3.0,
      "type": "Fire"
    },
    {
      "name": "Pistolet Gauss",
      "damage": 7.0,
      "price": 15000.0,
      "ra": 3.0,
      "type": "Fire"
    },
    {
      "name": "INDRA",
      "damage": 7.0,
      "price": 3000.0,
      "ra": 3.0,
      "type": "Fire"
    },
    {
      "name": "Leader AF4",
      "damage": 8.0,
      "price": 4000.0,
      "ra": 4.0,
      "type": "Fire"
    },
    {
      "name": "Redfield 540",
      "damage": 9.0,
      "price": 6000.0,
      "ra": 4.0,
      "type": "Fire"
    },
    {
      "name": "Widowmaker",
      "damage": 11.0,
      "price": 20000.0,
      "ra": 5.0,
      "type": "Fire"
    },
    {
      "name": "Devastator",
      "damage": 9.0,
      "price": 12000.0,
      "ra": 5.0,
      "type": "Fire"
    },
    {
      "name": "Railgun",
      "damage": 10.0,
      "price": 15000.0,
      "ra": 5.0,
      "type": "Fire"
    },
    {
      "name": "Inferno",
      "damage": 8.0,
      "price": 4000.0,
      "ra": 5.0,
      "type": "Fire"
    },
    {
      "name": "C-Tech Tsunami",
      "damage": 15.0,
      "price": 30000.0,
      "ra": 6.0,
      "type": "Fire"
    },
    {
      "name": "Wild RPG",
      "damage": 13.0,
      "price": 9000.0,
      "ra": 5.0,
      "type": "Fire"
    },
    {
      "name": "Amélioration Toucher Wild Predator",
      "damage": null,
      "price": null,
      "ra": 1.0,
      "type": null
    },
    {
      "name": "Amélioration dégats Wild Predator",
      "damage": null,
      "price": null,
      "ra": 1.0,
      "type": null
    },
    {
      "name": "Amélioration RA Wild Predator",
      "damage": null,
      "price": null,
      "ra": 1.0,
      "type": null
    }
  ],
  "armor": [
    {
      "name": "Champ de stase",
      "vpTete": 5.0,
      "vpBras": 5.0,
      "vpTorse": 5.0,
      "vpJambes": 5.0
    },
    {
      "name": "Cuir souple (torse, bras)",
      "vpTete": 0,
      "vpBras": 4.0,
      "vpTorse": 4.0,
      "vpJambes": 0
    },
    {
      "name": "Jambières souples (jambes)",
      "vpTete": 0,
      "vpBras": 0,
      "vpTorse": 0,
      "vpJambes": 4.0
    },
    {
      "name": "Cuir épais (torse, bras)",
      "vpTete": 0,
      "vpBras": 5.0,
      "vpTorse": 5.0,
      "vpJambes": 0
    },
    {
      "name": "Jambières en cuir épais (jambes)",
      "vpTete": 0,
      "vpBras": 0,
      "vpTorse": 0,
      "vpJambes": 5.0
    },
    {
      "name": "Peau tissée (tout) cyber ou bio",
      "vpTete": 5.0,
      "vpBras": 5.0,
      "vpTorse": 5.0,
      "vpJambes": 5.0
    },
    {
      "name": "Kevlar (torse)",
      "vpTete": 0,
      "vpBras": 0,
      "vpTorse": 6.0,
      "vpJambes": 0
    },
    {
      "name": "Casque (fibres de nylon)",
      "vpTete": 6.0,
      "vpBras": 0,
      "vpTorse": 0,
      "vpJambes": 0
    },
    {
      "name": "Veste blindée légère (10 KG)",
      "vpTete": 0,
      "vpBras": 7.0,
      "vpTorse": 7.0,
      "vpJambes": 0
    },
    {
      "name": "Veste blindée (20KG)",
      "vpTete": 0,
      "vpBras": 8.0,
      "vpTorse": 8.0,
      "vpJambes": 0
    },
    {
      "name": "Dragoon",
      "vpTete": 10.0,
      "vpBras": 10.0,
      "vpTorse": 10.0,
      "vpJambes": 10.0
    }
  ],
  "psyPowers": [
    {
      "name": "Acuité sensorielle",
      "discipline": "Mental"
    },
    {
      "name": "Charme",
      "discipline": "Mental"
    },
    {
      "name": "Hypnagogie",
      "discipline": "Mental"
    },
    {
      "name": "Illusion",
      "discipline": "Mental"
    },
    {
      "name": "Télépathie",
      "discipline": "Mental"
    },
    {
      "name": "Préscience",
      "discipline": "Mental"
    },
    {
      "name": "Cryokinésie",
      "discipline": "Psychokinésie"
    },
    {
      "name": "Electrokinésie",
      "discipline": "Psychokinésie"
    },
    {
      "name": "Kinésie",
      "discipline": "Psychokinésie"
    },
    {
      "name": "Télékinésie",
      "discipline": "Psychokinésie"
    },
    {
      "name": "Pyrokinésie",
      "discipline": "Psychokinésie"
    },
    {
      "name": "Téléportation",
      "discipline": "Psychokinésie"
    },
    {
      "name": "Concentration psy",
      "discipline": "Maîtrise de soi"
    },
    {
      "name": "Soin",
      "discipline": "Maîtrise de soi"
    },
    {
      "name": "Modification de la matière",
      "discipline": "Maîtrise de soi"
    },
    {
      "name": "Maîtrise du corps",
      "discipline": "Maîtrise de soi"
    },
    {
      "name": "Régénération",
      "discipline": "Maîtrise de soi"
    }
  ],
  "advantages": [
    {
      "label": "Affinité : +10",
      "value": 10.0
    },
    {
      "label": "Affinité : + 20",
      "value": 20.0
    },
    {
      "label": "Affinité : +30",
      "value": 30.0
    },
    {
      "label": "Immunité (maladies): +10",
      "value": 10.0
    },
    {
      "label": "Immunité (maladies graves) : + 20",
      "value": 20.0
    },
    {
      "label": "Immunité (radiations) : + 30",
      "value": 30.0
    },
    {
      "label": "Réputation: + 10",
      "value": 10.0
    },
    {
      "label": "Réputation : +20",
      "value": 20.0
    },
    {
      "label": "Revenus: +10",
      "value": 10.0
    },
    {
      "label": "Revenus : +20",
      "value": 20.0
    },
    {
      "label": "Revenus : +30",
      "value": 30.0
    },
    {
      "label": "Revenus : + 40",
      "value": 40.0
    },
    {
      "label": "Revenus : +50",
      "value": 50.0
    },
    {
      "label": "Richesse: + 10",
      "value": 10.0
    },
    {
      "label": "Richesse : + 20",
      "value": 20.0
    },
    {
      "label": "Richesse : +30",
      "value": 30.0
    },
    {
      "label": "Ambidextre: +10",
      "value": 10.0
    },
    {
      "label": "Attentif: +10",
      "value": 10.0
    },
    {
      "label": "Berserk: +10",
      "value": 10.0
    },
    {
      "label": "Bonne constitution: +10",
      "value": 10.0
    },
    {
      "label": "Concentration: +10",
      "value": 10.0
    },
    {
      "label": "Contacts sociaux : +10",
      "value": 10.0
    },
    {
      "label": "Convalescence rapide : +10",
      "value": 10.0
    },
    {
      "label": "Esprit attentif : +10",
      "value": 10.0
    },
    {
      "label": "Liens familiaux étroits : +10",
      "value": 10.0
    },
    {
      "label": "Orientation: +10",
      "value": 10.0
    },
    {
      "label": "Sommeil léger : +10",
      "value": 10.0
    },
    {
      "label": "Téméraire : +10",
      "value": 10.0
    },
    {
      "label": "Volonté de fer : +10",
      "value": 10.0
    },
    {
      "label": "Apprentissage rapide·: +10",
      "value": 10.0
    },
    {
      "label": "Mémoire Eidétique: +10",
      "value": 10.0
    },
    {
      "label": "Chantage: +10",
      "value": 10.0
    },
    {
      "label": "Chef de bande: +10",
      "value": 10.0
    },
    {
      "label": "Grand: +10",
      "value": 10.0
    },
    {
      "label": "Mentor: +10",
      "value": 10.0
    },
    {
      "label": "Réflexes éclairs: +10",
      "value": 10.0
    },
    {
      "label": "Touche-à-tout: +10",
      "value": 10.0
    },
    {
      "label": "Concentration rapide: +10",
      "value": 10.0
    },
    {
      "label": "Chic: +10",
      "value": 10.0
    },
    {
      "label": "Maîtrise psychique: +20",
      "value": 20.0
    },
    {
      "label": "Prestige corporatiste: +20",
      "value": 20.0
    },
    {
      "label": "Protection : +20",
      "value": 20.0
    },
    {
      "label": "Réserve de PSP : +20",
      "value": 20.0
    },
    {
      "label": "Taille de géant : +30",
      "value": 30.0
    },
    {
      "label": "Affinité Science : +40",
      "value": 40.0
    },
    {
      "label": "Ennemis : -10",
      "value": -10.0
    },
    {
      "label": "Ennemis : -20",
      "value": -20.0
    },
    {
      "label": "Ennemis : -30",
      "value": -30.0
    },
    {
      "label": "Mauvaise réputation : -10",
      "value": -10.0
    },
    {
      "label": "Mauvaise réputation : -20",
      "value": -20.0
    },
    {
      "label": "Circonstance nuisible : -10",
      "value": -10.0
    },
    {
      "label": "Allergie : -10",
      "value": -10.0
    },
    {
      "label": "Aversion : -10",
      "value": -10.0
    },
    {
      "label": "Cauchemars : -10",
      "value": -10.0
    },
    {
      "label": "Cœur sensible : -10",
      "value": -10.0
    },
    {
      "label": "Compulsion: -10",
      "value": -10.0
    },
    {
      "label": "Frêle constitution : -10",
      "value": -10.0
    },
    {
      "label": "Illusion: -10",
      "value": -10.0
    },
    {
      "label": "Secret: -10",
      "value": -10.0
    },
    {
      "label": "Sommeil lourd: -10",
      "value": -10.0
    },
    {
      "label": "Timidité: -10",
      "value": -10.0
    },
    {
      "label": "Difficultés: -10",
      "value": -10.0
    },
    {
      "label": "Don tapageur: -10",
      "value": -10.0
    },
    {
      "label": "Effets secondaires nuisibles: -10",
      "value": -10.0
    },
    {
      "label": "Infaillibilité illusoire: -20",
      "value": -20.0
    },
    {
      "label": "Manque de concentration: -20",
      "value": -20.0
    },
    {
      "label": "Faible -20",
      "value": -20.0
    },
    {
      "label": "Haine: -20",
      "value": -20.0
    },
    {
      "label": "Mauvaise aura: -20",
      "value": -20.0
    },
    {
      "label": "Emporté: -20",
      "value": -20.0
    },
    {
      "label": "Petit: -20",
      "value": -20.0
    },
    {
      "label": "Vengeance: -20",
      "value": -20.0
    },
    {
      "label": "Concentration lente: -20",
      "value": -20.0
    },
    {
      "label": "Défaillance majeure : -20",
      "value": -20.0
    },
    {
      "label": "Esprit fragile: -20",
      "value": -20.0
    },
    {
      "label": "Dépendance: -30",
      "value": -30.0
    },
    {
      "label": "Pouvoir douloureux: -30",
      "value": -30.0
    },
    {
      "label": "Nanisme: -40",
      "value": -40.0
    },
    {
      "label": "Protection mentale inexistante: -40",
      "value": -40.0
    },
    {
      "label": "Dans les nuages: -30",
      "value": -30.0
    }
  ]
};

/** Table des localisations de blessure (char_sheet, identique sur toutes les fiches). */
export const LOCALISATIONS = "1-2 jambe g.\n3-4 jambe d.\n5,6,7 torse\n8 bras g.\n9 bras d.\n10 tête";
