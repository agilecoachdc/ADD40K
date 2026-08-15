import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Character } from "@shared/types";
import { computeCharacter, type CharacterComputed } from "@shared/calc-engine";
import { referenceData } from "@shared/reference-data";
import { api } from "../lib/api";
import {
  IdentityHeader,
  HpPspBar,
  AttributesPanel,
  SkillsPanel,
  WeaponsArmorPanel,
  PsyPowersPanel,
  AdvantagesPanel,
  EquipmentPanel,
  BudgetPanel,
  LocalisationsPanel,
} from "../components/CharacterSheetPanels";

export default function CharacterSheet() {
  const { id } = useParams<{ id: string }>();
  const [character, setCharacter] = useState<Character | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getCharacter(id)
      .then(({ character, canEdit }) => {
        setCharacter(character);
        setCanEdit(canEdit);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"));
  }, [id]);

  if (error) return <p className="p-6 text-red-400">{error}</p>;
  if (!character) return <p className="p-6 text-slate-400">Chargement…</p>;

  const computed: CharacterComputed = computeCharacter(character, referenceData);

  function update(patch: Partial<Character>) {
    setCharacter((c) => (c ? { ...c, ...patch } : c));
  }

  // Bascule active/inactive d'une armure et sauvegarde immédiatement, sans
  // passer par le mode édition (Modifier/Enregistrer) : l'utilisateur veut
  // voir le calcul de protection (armorTotals) se mettre à jour en jouant,
  // sans devoir éditer toute la fiche. On envoie uniquement `{ armor }` —
  // le PUT fusionne côté worker (characters.ts), le reste de la fiche n'est
  // pas touché.
  async function toggleArmor(index: number) {
    if (!character || !id) return;
    const previousArmor = character.armor;
    const nextArmor = previousArmor.map((a, i) => (i === index ? { ...a, active: !a.active } : a));
    update({ armor: nextArmor });
    try {
      await api.updateCharacter(id, { armor: nextArmor });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la sauvegarde de l'armure");
      update({ armor: previousArmor });
    }
  }

  async function save() {
    if (!character || !id) return;
    setSaving(true);
    setError(null);
    try {
      const { character: saved } = await api.updateCharacter(id, character);
      setCharacter(saved);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 pb-16">
      <header className="flex items-center justify-between">
        <Link to="/" className="text-sm text-indigo-400 hover:underline">
          ← Personnages
        </Link>
        {canEdit &&
          (editing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
            >
              Modifier
            </button>
          ))}
      </header>

      {error && <p className="text-red-400">{error}</p>}

      <IdentityHeader character={character} editing={editing} update={update} />
      <HpPspBar character={character} computed={computed} update={update} />
      <AttributesPanel character={character} computed={computed} editing={editing} update={update} />
      <SkillsPanel character={character} computed={computed} editing={editing} update={update} />
      <WeaponsArmorPanel
        character={character}
        computed={computed}
        editing={editing}
        canEdit={canEdit}
        update={update}
        onToggleArmor={toggleArmor}
      />
      <PsyPowersPanel character={character} computed={computed} editing={editing} update={update} />
      <AdvantagesPanel character={character} editing={editing} update={update} />
      <EquipmentPanel character={character} editing={editing} update={update} />
      <BudgetPanel computed={computed} />
      <LocalisationsPanel />
    </div>
  );
}
