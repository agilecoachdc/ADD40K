import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { Character, ReferenceData } from "@shared/types";
import { computeCharacter, type CharacterComputed } from "@shared/calc-engine";
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
  // Retour contextuel : la liste et le suivi des constantes passent chacun
  // leur origine via l'état de navigation (state.from) au clic sur une
  // fiche ; sans état (accès direct par URL), on retombe sur l'accueil.
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const backTo = from === "suivi" ? "/suivi" : "/";
  const backLabel = from === "suivi" ? "← Suivi des constantes" : "← Personnages";
  const [character, setCharacter] = useState<Character | null>(null);
  // Catalogue du groupe de ce personnage — renvoyé par GET /characters/:id
  // (scopé serveur via sa règle), plus d'import statique ADD40K.
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getCharacter(id)
      .then(({ character, canEdit, referenceData }) => {
        setCharacter(character);
        setCanEdit(canEdit);
        setReferenceData(referenceData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"));
  }, [id]);

  if (error) return <p className="p-6 text-red-400">{error}</p>;
  if (!character || !referenceData) return <p className="p-6 text-slate-400">Chargement…</p>;

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
  // PV/PSP : mêmes +/- toujours actifs (hors mode édition) que l'armure —
  // sauvegarde immédiate, sinon la valeur affichée divergeait silencieusement
  // de celle en base au premier rechargement (bug signalé).
  async function adjustVital(field: "hpCurrent" | "pspCurrent", value: number) {
    if (!character || !id) return;
    const previous = character[field];
    update({ [field]: value });
    try {
      await api.updateCharacter(id, { [field]: value });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la sauvegarde");
      update({ [field]: previous });
    }
  }

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
      const { character: saved, referenceData: savedReferenceData } = await api.updateCharacter(id, character);
      setCharacter(saved);
      setReferenceData(savedReferenceData);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh">
      {/* Bandeau de fond en haut de fiche uniquement — dégradé vers la
          couleur de fond (slate-950) pour rester lisible et se fondre avec
          le reste de la page, qui garde le fond uni. */}
      <div
        className="bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(2,6,23,.55), rgba(2,6,23,.93)), url('/background.jpg')",
        }}
      >
        <div className="mx-auto max-w-3xl space-y-4 px-4 pb-8 pt-6">
          <header className="flex items-center justify-between">
            <Link to={backTo} className="text-sm text-indigo-400 hover:underline">
              {backLabel}
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

          <IdentityHeader character={character} editing={editing} update={update} referenceData={referenceData} />
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-4">
        <HpPspBar character={character} computed={computed} onAdjust={adjustVital} />
      <AttributesPanel character={character} computed={computed} editing={editing} update={update} referenceData={referenceData} />
      <SkillsPanel character={character} computed={computed} editing={editing} update={update} referenceData={referenceData} />
      <WeaponsArmorPanel
        character={character}
        computed={computed}
        editing={editing}
        canEdit={canEdit}
        update={update}
        onToggleArmor={toggleArmor}
        referenceData={referenceData}
      />
      <PsyPowersPanel character={character} computed={computed} editing={editing} update={update} referenceData={referenceData} />
      <AdvantagesPanel character={character} editing={editing} update={update} referenceData={referenceData} />
      <EquipmentPanel character={character} editing={editing} update={update} />
      <BudgetPanel computed={computed} />
      <LocalisationsPanel />
      </div>
    </div>
  );
}
