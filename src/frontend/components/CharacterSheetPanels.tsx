// Sections de la fiche personnage. Chaque panneau reçoit le personnage
// "en cours d'édition" (état local de CharacterSheet.tsx), les valeurs
// calculées en direct (calc-engine), et — en mode édition — un `update`
// pour muter une portion du personnage. Tout est lecture seule si `editing`
// est faux.

import { useRef, useState } from "react";
import { ATTRIBUTES, WEAPON_TYPES, type Attribute, type Character, type WeaponType } from "@shared/types";
import type { CharacterComputed } from "@shared/calc-engine";
import { getPsyPowerTotal, getSkillTotal } from "@shared/calc-engine";
import { referenceData, LOCALISATIONS } from "@shared/reference-data";
import { RaceArmorSilhouette } from "./RaceArmorSilhouette";
import { resizePortraitToDataUrl } from "../lib/image";

type Update = (patch: Partial<Character>) => void;

const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  FO: "Force",
  VIT: "Vitalité",
  DEX: "Dextérité",
  REF: "Réflexe",
  PER: "Perception",
  COM: "Communication",
  INT: "Intelligence",
  VOL: "Volonté",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-slate-900 p-4 shadow">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

function NumberInput({ value, onChange, className = "" }: { value: number; onChange: (n: number) => void; className?: string }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-16 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-center text-sm ${className}`}
    />
  );
}

function TextInput({ value, onChange, className = "" }: { value: string; onChange: (s: string) => void; className?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm ${className}`}
    />
  );
}

/**
 * Sélecteur d'un nom/libellé depuis le catalogue de référence (feuille
 * `listes` du classeur Excel — src/shared/reference-data.ts), plutôt qu'un
 * champ texte libre : évite les fautes de frappe et permet d'auto-remplir
 * les caractéristiques associées (dégâts/RA d'une arme, VP d'une armure,
 * discipline d'un pouvoir, valeur d'un avantage...) au choix, via `onPick`.
 */
function CatalogSelect({
  value,
  options,
  onPick,
  placeholder = "— choisir —",
  className = "",
}: {
  value: string;
  options: string[];
  onPick: (name: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onPick(e.target.value)}
      className={`rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------

export function IdentityHeader({
  character,
  editing,
  update,
}: {
  character: Character;
  editing: boolean;
  update: Update;
}) {
  const fields: [string, keyof Character][] = [
    ["Faction", "faction"],
    ["Fonction", "fonction"],
    ["Loyauté", "loyaute"],
    ["Poids", "weightLabel"],
  ];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [portraitError, setPortraitError] = useState<string | null>(null);

  async function handlePortraitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de resélectionner le même fichier ensuite
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPortraitError("Le fichier doit être une image");
      return;
    }
    try {
      const dataUrl = await resizePortraitToDataUrl(file);
      update({ portraitUrl: dataUrl });
      setPortraitError(null);
    } catch (err) {
      setPortraitError(err instanceof Error ? err.message : "Échec du chargement de l'image");
    }
  }

  return (
    <Section title="Identité">
      <div className="flex flex-wrap items-start gap-4">
        {editing ? (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-24 w-24 overflow-hidden rounded-lg bg-slate-800 text-3xl text-slate-600"
            >
              {character.portraitUrl ? (
                <img src={character.portraitUrl} alt={character.name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center">{character.name.charAt(0)}</span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                Changer
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePortraitChange} />
            {character.portraitUrl && (
              <button
                type="button"
                onClick={() => update({ portraitUrl: null })}
                className="text-xs text-slate-500 hover:text-red-400"
              >
                Retirer la photo
              </button>
            )}
            {portraitError && <p className="w-24 text-center text-xs text-red-400">{portraitError}</p>}
          </div>
        ) : character.portraitUrl ? (
          <img src={character.portraitUrl} alt={character.name} className="h-24 w-24 rounded-lg object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-slate-800 text-3xl text-slate-600">
            {character.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 space-y-2">
          {editing ? (
            <TextInput value={character.name} onChange={(v) => update({ name: v })} className="text-lg font-semibold" />
          ) : (
            <h1 className="text-lg font-semibold text-slate-100">{character.name}</h1>
          )}
          <p className="text-sm text-slate-400">
            {referenceData.races.find((r) => r.race === character.race)?.label ?? character.race}
            {character.age != null && ` · ${character.age} ans`}
            {character.heightM != null && ` · ${character.heightM} m`}
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {fields.map(([label, key]) => (
              <div key={key}>
                <p className="text-slate-500">{label}</p>
                {editing ? (
                  <TextInput
                    value={String(character[key] ?? "")}
                    onChange={(v) => update({ [key]: v } as Partial<Character>)}
                    className="w-full"
                  />
                ) : (
                  <p className="text-slate-200">{String(character[key] ?? "—")}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

export function HpPspBar({
  character,
  computed,
  onAdjust,
}: {
  character: Character;
  computed: CharacterComputed;
  onAdjust: (field: "hpCurrent" | "pspCurrent", value: number) => void;
}) {
  function Bar(label: string, current: number, max: number, onChange: (n: number) => void, color: string) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    return (
      <div className="flex-1">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-300">{label}</span>
          <span className="text-slate-400">
            {current} / {max}
          </span>
        </div>
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onChange(Math.max(0, current - 1))}
            className="h-8 w-8 rounded bg-slate-800 text-lg text-slate-200 hover:bg-slate-700"
            aria-label={`-1 ${label}`}
          >
            −
          </button>
          <button
            onClick={() => onChange(Math.min(max, current + 1))}
            className="h-8 w-8 rounded bg-slate-800 text-lg text-slate-200 hover:bg-slate-700"
            aria-label={`+1 ${label}`}
          >
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    <Section title="PV / PSP">
      <div className="flex gap-6">
        {Bar("PV", character.hpCurrent, computed.hpMax, (n) => onAdjust("hpCurrent", n), "bg-red-500")}
        {Bar("PSP", character.pspCurrent, computed.pspMax, (n) => onAdjust("pspCurrent", n), "bg-sky-500")}
      </div>
    </Section>
  );
}

/**
 * Attributs : la fiche n'affiche toujours que le total (comme l'Excel), mais
 * en édition on peut "drill through" un attribut pour voir/éditer sa
 * décomposition base + racial (lecture seule, dépend de la race) + tech.
 */
export function AttributesPanel({
  character,
  computed,
  editing,
  update,
}: {
  character: Character;
  computed: CharacterComputed;
  editing: boolean;
  update: Update;
}) {
  const [selected, setSelected] = useState<Attribute | null>(null);
  const raceDef = referenceData.races.find((r) => r.race === character.race);

  return (
    <Section title="Attributs">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {ATTRIBUTES.map((attr) => {
          const isOpen = editing && selected === attr;
          return (
            <div key={attr} className="overflow-hidden rounded-lg bg-slate-800/50">
              <button
                type="button"
                onClick={() => editing && setSelected(isOpen ? null : attr)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left ${editing ? "cursor-pointer hover:bg-slate-800" : "cursor-default"}`}
              >
                <span className="text-sm text-slate-300">{ATTRIBUTE_LABELS[attr]}</span>
                <span className="text-lg font-semibold text-slate-100">{computed.attributeTotals[attr]}</span>
              </button>
              {isOpen && (
                <div className="space-y-1.5 border-t border-slate-700 px-3 py-2 text-xs text-slate-400" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <span>Base</span>
                    <NumberInput
                      value={character.attributeScores[attr]}
                      onChange={(n) => update({ attributeScores: { ...character.attributeScores, [attr]: n } })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Racial ({raceDef?.label ?? character.race})</span>
                    <span className="text-slate-300">{raceDef?.attributeBonus[attr] ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tech</span>
                    <NumberInput
                      value={character.attributeTechBonus[attr] ?? 0}
                      onChange={(n) =>
                        update({ attributeTechBonus: { ...character.attributeTechBonus, [attr]: n } })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-700 pt-1.5 font-semibold text-slate-200">
                    <span>Total</span>
                    <span>{computed.attributeTotals[attr]}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-500">Total des 8 attributs : {computed.attributeSum} (règle : +7 à la création)</p>
    </Section>
  );
}

export function SkillsPanel({
  character,
  computed,
  editing,
  update,
}: {
  character: Character;
  computed: CharacterComputed;
  editing: boolean;
  update: Update;
}) {
  const skills = character.skills;
  function setSkill(i: number, patch: Partial<(typeof skills)[number]>) {
    update({ skills: skills.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  }
  return (
    <Section title="Compétences">
      <div className="mb-1 hidden grid-cols-[1fr_auto_auto_auto] gap-2 px-1 text-xs text-slate-500 sm:grid">
        <span>Compétence</span>
        <span className="text-right">Score</span>
        <span className="text-right">Attribut</span>
        <span className="text-right">Total</span>
      </div>
      <ul className="space-y-1">
        {skills.map((s, i) => {
          const { attribute, attributeValue, total } = getSkillTotal(s.name, s.score, computed.attributeTotals);
          return (
            <li key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 text-sm">
              {editing ? (
                <CatalogSelect
                  value={s.name}
                  options={referenceData.skills.map((sd) => sd.name)}
                  onPick={(name) => setSkill(i, { name })}
                  placeholder="— choisir une compétence —"
                  className="flex-1"
                />
              ) : (
                <span className="text-slate-200">{s.name}</span>
              )}
              {editing ? (
                <NumberInput value={s.score} onChange={(n) => setSkill(i, { score: n })} />
              ) : (
                <span className="text-right text-slate-300">{s.score}</span>
              )}
              <span className="w-14 text-right text-xs text-slate-500">
                {attribute ? `+${attributeValue} ${attribute}` : "—"}
              </span>
              <span className="w-8 text-right font-semibold text-indigo-300">{total}</span>
              {editing && (
                <button
                  onClick={() => update({ skills: skills.filter((_, idx) => idx !== i) })}
                  className="text-slate-500 hover:text-red-400"
                  aria-label="Retirer"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {editing && (
        <button
          onClick={() => update({ skills: [...skills, { name: "", score: 0 }] })}
          className="mt-2 text-sm text-indigo-400 hover:underline"
        >
          + Ajouter une compétence
        </button>
      )}
    </Section>
  );
}

export function WeaponsArmorPanel({
  character,
  computed,
  editing,
  canEdit,
  update,
  onToggleArmor,
}: {
  character: Character;
  computed: CharacterComputed;
  editing: boolean;
  canEdit: boolean;
  update: Update;
  onToggleArmor: (index: number) => void;
}) {
  const weapons = character.weapons;
  const armor = character.armor;
  const activeArmor = armor.filter((a) => a.active);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Section title="Armes">
        <ul className="space-y-2">
          {weapons.map((w, i) => (
            <li key={i} className="rounded-lg bg-slate-800/50 p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                {editing ? (
                  <CatalogSelect
                    value={w.name}
                    options={referenceData.weapons.map((wd) => wd.name)}
                    onPick={(name) => {
                      // Auto-remplit type/dégâts/RA depuis le catalogue (listes!I:R) —
                      // le score de base reste manuel (dépend du personnage, pas du catalogue).
                      const def = referenceData.weapons.find((wd) => wd.name === name);
                      update({
                        weapons: weapons.map((x, idx) =>
                          idx === i
                            ? {
                                ...x,
                                name,
                                type: (def?.type as WeaponType) ?? x.type,
                                damage: def?.damage ?? x.damage,
                                ra: def?.ra ?? x.ra,
                              }
                            : x,
                        ),
                      });
                    }}
                    placeholder="— choisir une arme —"
                    className="flex-1"
                  />
                ) : (
                  <span className="font-medium text-slate-100">{w.name}</span>
                )}
                {editing && (
                  <button
                    onClick={() => update({ weapons: weapons.filter((_, idx) => idx !== i) })}
                    className="text-slate-500 hover:text-red-400"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-slate-400">
                <span>
                  Score{" "}
                  {editing ? (
                    <NumberInput
                      value={w.baseScore}
                      onChange={(n) => update({ weapons: weapons.map((x, idx) => (idx === i ? { ...x, baseScore: n } : x)) })}
                    />
                  ) : (
                    <span className="font-semibold text-indigo-300">{w.baseScore}</span>
                  )}
                </span>
                <span>
                  Dmg{" "}
                  {editing ? (
                    <NumberInput
                      value={w.damage}
                      onChange={(n) => update({ weapons: weapons.map((x, idx) => (idx === i ? { ...x, damage: n } : x)) })}
                    />
                  ) : (
                    w.damage
                  )}
                </span>
                <span>
                  RA{" "}
                  {editing ? (
                    <NumberInput
                      value={w.ra}
                      onChange={(n) => update({ weapons: weapons.map((x, idx) => (idx === i ? { ...x, ra: n } : x)) })}
                    />
                  ) : (
                    w.ra
                  )}
                </span>
                {editing ? (
                  <select
                    value={w.type}
                    onChange={(e) =>
                      update({ weapons: weapons.map((x, idx) => (idx === i ? { ...x, type: e.target.value as WeaponType } : x)) })
                    }
                    className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-xs"
                  >
                    {WEAPON_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{w.type}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
        {editing && (
          <button
            onClick={() => update({ weapons: [...weapons, { name: "", type: "Fire", damage: 0, ra: 0, baseScore: 0 }] })}
            className="mt-2 text-sm text-indigo-400 hover:underline"
          >
            + Ajouter une arme
          </button>
        )}
      </Section>

      <Section title="Armures">
        <div className="mb-3 flex justify-center">
          <RaceArmorSilhouette race={character.race} armorTotals={computed.armorTotals} size={110} />
        </div>

        {!editing && canEdit && (
          <ul className="space-y-1 text-sm text-slate-300">
            {armor.length === 0 && <li className="text-slate-500">Aucune armure sur la fiche</li>}
            {armor.map((a, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={a.active}
                  onChange={() => onToggleArmor(i)}
                  aria-label={`${a.name} équipée`}
                />
                <span className={a.active ? "" : "text-slate-500 line-through"}>{a.name}</span>
              </li>
            ))}
          </ul>
        )}

        {!editing && !canEdit && (
          <ul className="space-y-1 text-sm text-slate-300">
            {activeArmor.length === 0 && <li className="text-slate-500">Aucune armure équipée</li>}
            {activeArmor.map((a, i) => (
              <li key={i}>{a.name}</li>
            ))}
          </ul>
        )}

        {editing && (
          <ul className="space-y-2">
            {armor.map((a, i) => (
              <li key={i} className="rounded-lg bg-slate-800/50 p-2 text-sm">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={a.active}
                    onChange={(e) => update({ armor: armor.map((x, idx) => (idx === i ? { ...x, active: e.target.checked } : x)) })}
                    aria-label={`${a.name} équipée`}
                  />
                  <CatalogSelect
                    value={a.name}
                    options={referenceData.armor.map((ad) => ad.name)}
                    onPick={(name) => {
                      // Auto-remplit les VP tête/bras/torse/jambes depuis le
                      // catalogue (listes!T:AD) — restent éditables si le
                      // joueur veut surcharger (ex. armure améliorée).
                      const def = referenceData.armor.find((ad) => ad.name === name);
                      update({
                        armor: armor.map((x, idx) =>
                          idx === i
                            ? {
                                ...x,
                                name,
                                vpTete: def?.vpTete ?? x.vpTete,
                                vpBras: def?.vpBras ?? x.vpBras,
                                vpTorse: def?.vpTorse ?? x.vpTorse,
                                vpJambes: def?.vpJambes ?? x.vpJambes,
                              }
                            : x,
                        ),
                      });
                    }}
                    placeholder="— choisir une armure —"
                    className="flex-1"
                  />
                  <button
                    onClick={() => update({ armor: armor.filter((_, idx) => idx !== i) })}
                    className="text-slate-500 hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-slate-400">
                  <span>
                    Tête <NumberInput value={a.vpTete} onChange={(n) => update({ armor: armor.map((x, idx) => (idx === i ? { ...x, vpTete: n } : x)) })} />
                  </span>
                  <span>
                    Bras <NumberInput value={a.vpBras} onChange={(n) => update({ armor: armor.map((x, idx) => (idx === i ? { ...x, vpBras: n } : x)) })} />
                  </span>
                  <span>
                    Torse <NumberInput value={a.vpTorse} onChange={(n) => update({ armor: armor.map((x, idx) => (idx === i ? { ...x, vpTorse: n } : x)) })} />
                  </span>
                  <span>
                    Jambes <NumberInput value={a.vpJambes} onChange={(n) => update({ armor: armor.map((x, idx) => (idx === i ? { ...x, vpJambes: n } : x)) })} />
                  </span>
                </div>
              </li>
            ))}
            <button
              onClick={() => update({ armor: [...armor, { name: "", vpTete: 0, vpBras: 0, vpTorse: 0, vpJambes: 0, active: true }] })}
              className="text-sm text-indigo-400 hover:underline"
            >
              + Ajouter une armure
            </button>
          </ul>
        )}
      </Section>
    </div>
  );
}

export function PsyPowersPanel({
  character,
  computed,
  editing,
  update,
}: {
  character: Character;
  computed: CharacterComputed;
  editing: boolean;
  update: Update;
}) {
  const powers = character.psyPowers;
  if (powers.length === 0 && !editing) return null;
  return (
    <Section title="Pouvoirs Psy">
      <ul className="space-y-1">
        {powers.map((p, i) => {
          const total = getPsyPowerTotal(p, character, computed.attributeTotals);
          return (
            <li key={i} className="flex items-center justify-between gap-2 text-sm">
              {editing ? (
                <CatalogSelect
                  value={p.name}
                  options={referenceData.psyPowers.map((pd) => pd.name)}
                  onPick={(name) => {
                    const def = referenceData.psyPowers.find((pd) => pd.name === name);
                    update({
                      psyPowers: powers.map((x, idx) =>
                        idx === i ? { ...x, name, discipline: def?.discipline ?? x.discipline } : x,
                      ),
                    });
                  }}
                  placeholder="— choisir un pouvoir —"
                  className="flex-1"
                />
              ) : (
                <span className="text-slate-200">
                  {p.name} <span className="text-slate-500">({p.discipline})</span>
                </span>
              )}
              <div className="flex items-center gap-3">
                {editing ? (
                  <NumberInput
                    value={p.score}
                    onChange={(n) => update({ psyPowers: powers.map((x, idx) => (idx === i ? { ...x, score: n } : x)) })}
                  />
                ) : (
                  <span className="text-slate-300">{p.score}</span>
                )}
                <span className="w-8 text-right text-xs text-slate-500" title="Score + Volonté + Affinité">
                  Σ
                </span>
                <span className="w-8 text-right font-semibold text-indigo-300">{total}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {editing && (
        <button
          onClick={() => update({ psyPowers: [...powers, { name: "", score: 0, discipline: "" }] })}
          className="mt-2 text-sm text-indigo-400 hover:underline"
        >
          + Ajouter un pouvoir
        </button>
      )}
    </Section>
  );
}

export function AdvantagesPanel({
  character,
  editing,
  update,
}: {
  character: Character;
  editing: boolean;
  update: Update;
}) {
  const advantages = character.advantages;
  return (
    <Section title="Avantages et inconvénients">
      <ul className="space-y-1">
        {advantages.map((a, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-sm">
            {editing ? (
              <CatalogSelect
                value={a.label}
                options={referenceData.advantages.map((ad) => ad.label)}
                onPick={(label) => {
                  // La valeur (points) vient toujours du catalogue par
                  // libellé, jamais saisie à la main — c'est ce qui a
                  // corrigé le bug "Dans les nuages" à l'import (cf.
                  // calc-engine.ts) ; laisser la même règle ici évite de
                  // le réintroduire.
                  const def = referenceData.advantages.find((ad) => ad.label === label);
                  update({
                    advantages: advantages.map((x, idx) => (idx === i ? { label, value: def?.value ?? 0 } : x)),
                  });
                }}
                placeholder="— choisir —"
                className="flex-1"
              />
            ) : (
              <span className="text-slate-200">{a.label}</span>
            )}
            <span className={a.value >= 0 ? "text-emerald-400" : "text-red-400"}>
              {a.value >= 0 ? "+" : ""}
              {a.value}
            </span>
            {editing && (
              <button
                onClick={() => update({ advantages: advantages.filter((_, idx) => idx !== i) })}
                className="text-slate-500 hover:text-red-400"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      {editing && (
        <button
          onClick={() => update({ advantages: [...advantages, { label: "", value: 0 }] })}
          className="mt-2 text-sm text-indigo-400 hover:underline"
        >
          + Ajouter un avantage/inconvénient
        </button>
      )}
    </Section>
  );
}

export function EquipmentPanel({
  character,
  editing,
  update,
}: {
  character: Character;
  editing: boolean;
  update: Update;
}) {
  const equipment = character.equipment;
  return (
    <Section title="Équipement">
      <ul className="list-inside list-disc space-y-1 text-sm text-slate-200">
        {equipment.map((e, i) => (
          <li key={i} className="flex items-center gap-2">
            {editing ? (
              <TextInput
                value={e.label}
                onChange={(v) => update({ equipment: equipment.map((x, idx) => (idx === i ? { label: v } : x)) })}
                className="flex-1"
              />
            ) : (
              e.label
            )}
          </li>
        ))}
      </ul>
      {editing && (
        <button
          onClick={() => update({ equipment: [...equipment, { label: "" }] })}
          className="mt-2 text-sm text-indigo-400 hover:underline"
        >
          + Ajouter un objet
        </button>
      )}
    </Section>
  );
}

export function BudgetPanel({ computed }: { computed: CharacterComputed }) {
  const { budget } = computed;
  return (
    <Section title="Budget de points">
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <Metric label="Points raciaux" value={budget.raceSkillPoints} />
        <Metric label="Total dispo" value={budget.totalDispo} />
        <Metric label="Coût compétences" value={-budget.skillsCost} />
        <Metric label="Coût pouvoirs psy" value={-budget.psyPowersCost} />
        <Metric label="Net avantages" value={budget.advantagesNet} />
        <Metric label="Solde" value={budget.solde} emphasis />
      </dl>
      {budget.solde < 0 && (
        <p className="mt-3 rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
          ⚠️ Solde négatif : ce personnage dépasse son budget de points de {Math.abs(budget.solde)}.
        </p>
      )}
    </Section>
  );
}

function Metric({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className={emphasis ? `text-lg font-semibold ${value < 0 ? "text-red-400" : "text-emerald-400"}` : "text-slate-200"}>
        {value}
      </dd>
    </div>
  );
}

export function LocalisationsPanel() {
  return (
    <Section title="Localisations">
      <pre className="whitespace-pre-wrap text-sm text-slate-300">{LOCALISATIONS}</pre>
    </Section>
  );
}
