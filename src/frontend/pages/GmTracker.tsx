// Écran "Suivi des constantes" — vue MJ uniquement : tous les personnages
// (joueurs + PNJ) actuellement "en jeu". Chaque tuile est volontairement
// minimale (nom, photo, anneaux PV/PSP, silhouette d'armure) pour tout voir
// d'un coup d'œil en séance. Rafraîchi automatiquement (polling léger)
// puisque les PV/PSP bougent côté joueurs pendant que cet écran reste
// ouvert côté MJ.
//
// Les PNJ sont créés directement depuis cet écran (pas de fiche complète —
// juste nom/photo/PV max/PSP max, cf. characters.ts POST) et ont, à la
// différence des personnages de joueurs, des boutons +/- pour ajuster leurs
// PV/PSP en direct : ils n'ont pas de joueur pour le faire depuis leur
// propre fiche.

import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { CharacterSummary } from "@shared/types";
import { referenceData } from "@shared/reference-data";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { RaceArmorSilhouette } from "../components/RaceArmorSilhouette";
import { resizePortraitToDataUrl } from "../lib/image";

const POLL_INTERVAL_MS = 5000;
const RING_SIZE = 160;

/**
 * Anneaux concentriques façon Apple Fitness : PV (rouge) à l'extérieur, PSP
 * (bleu) à l'intérieur. Chaque anneau est un cercle SVG plein tracé en
 * pointillés (stroke-dasharray = circonférence) dont on masque une partie
 * (stroke-dashoffset) selon le pourcentage restant — même technique que les
 * "activity rings". Rotation -90° pour démarrer en haut (12h) comme Apple
 * plutôt qu'à 3h (défaut SVG). Les chiffres PV/PSP sont superposés en HTML
 * normal (pas de rotation) par-dessus le SVG tourné.
 */
function ConstantsRings({
  hpCurrent,
  hpMax,
  pspCurrent,
  pspMax,
  size = 72,
}: {
  hpCurrent: number;
  hpMax: number;
  pspCurrent: number;
  pspMax: number;
  size?: number;
}) {
  const strokeWidth = Math.max(6, Math.round(size / 9));
  const gap = Math.max(2, Math.round(size / 24));
  const center = size / 2;
  const outerRadius = center - strokeWidth / 2;
  const innerRadius = outerRadius - strokeWidth - gap;

  const hpPct = hpMax > 0 ? Math.max(0, Math.min(1, hpCurrent / hpMax)) : 0;
  const pspPct = pspMax > 0 ? Math.max(0, Math.min(1, pspCurrent / pspMax)) : 0;

  function ring(radius: number, pct: number, trackColor: string, fillColor: string) {
    const circumference = 2 * Math.PI * radius;
    return (
      <>
        <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </>
    );
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {ring(outerRadius, hpPct, "rgba(248,113,113,0.15)", "#f87171")}
        {ring(innerRadius, pspPct, "rgba(56,189,248,0.15)", "#38bdf8")}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
        <span className="font-bold text-red-400" style={{ fontSize: size * 0.15 }}>
          {hpCurrent}
        </span>
        <span className="font-bold text-sky-400" style={{ fontSize: size * 0.15 }}>
          {pspCurrent}
        </span>
      </div>
    </div>
  );
}

/** Petit bouton +/- qui n'active pas la navigation de la tuile (nichée dans un <Link>). */
function StepButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="h-6 w-6 rounded bg-slate-800 text-sm leading-none text-slate-200 hover:bg-slate-700"
    >
      {label}
    </button>
  );
}

function CharacterTile({
  c,
  isNpc,
  onAdjust,
  onRemove,
}: {
  c: CharacterSummary;
  isNpc: boolean;
  onAdjust?: (field: "hpCurrent" | "pspCurrent", delta: number) => void;
  onRemove?: () => void;
}) {
  return (
    <Link
      to={`/personnages/${c.id}`}
      state={{ from: "suivi" }}
      className="flex items-stretch overflow-hidden rounded-xl bg-slate-900 shadow transition hover:bg-slate-800"
    >
      {/* Silhouette d'armure sur toute la hauteur — même taille (110) que sur la fiche personnage. */}
      <div className="flex shrink-0 items-center justify-center self-stretch bg-slate-950/40 px-3">
        <RaceArmorSilhouette race={c.race} armorTotals={c.armorTotals} size={110} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-100">{c.name}</p>
          {isNpc && onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              title="Retirer du suivi"
              aria-label={`Retirer ${c.name} du suivi`}
              className="shrink-0 text-slate-500 hover:text-red-400"
            >
              ×
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-1 items-center gap-3">
          <ConstantsRings hpCurrent={c.hpCurrent} hpMax={c.hpMax} pspCurrent={c.pspCurrent} pspMax={c.pspMax} size={RING_SIZE} />
          {c.portraitUrl ? (
            <img src={c.portraitUrl} alt={c.name} className="h-[160px] w-[160px] shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-[160px] w-[160px] shrink-0 items-center justify-center rounded-lg bg-slate-800 text-4xl text-slate-600">
              {c.name.charAt(0)}
            </div>
          )}
        </div>
        {isNpc && onAdjust && (
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="text-red-400">PV</span>
              <StepButton label="−" onClick={() => onAdjust("hpCurrent", -1)} />
              <StepButton label="+" onClick={() => onAdjust("hpCurrent", 1)} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sky-400">PSP</span>
              <StepButton label="−" onClick={() => onAdjust("pspCurrent", -1)} />
              <StepButton label="+" onClick={() => onAdjust("pspCurrent", 1)} />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function GmTracker() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CharacterSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showNpcForm, setShowNpcForm] = useState(false);
  const [npcName, setNpcName] = useState("");
  const [npcRace, setNpcRace] = useState("");
  const [npcHpMax, setNpcHpMax] = useState(20);
  const [npcPspMax, setNpcPspMax] = useState(20);
  const [npcPortraitUrl, setNpcPortraitUrl] = useState<string | null>(null);
  const [npcSaving, setNpcSaving] = useState(false);
  const [npcError, setNpcError] = useState<string | null>(null);
  const npcFileInputRef = useRef<HTMLInputElement>(null);

  function loadCharacters() {
    return api
      .listCharacters()
      .then(({ characters }) => setRows(characters))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"));
  }

  useEffect(() => {
    loadCharacters();
    const interval = setInterval(loadCharacters, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Vue réservée au MJ — un joueur qui atterrit ici (URL directe) repart à l'accueil.
  if (user && user.role !== "gm") return <Navigate to="/" replace />;

  const players = rows?.filter((c) => c.inGame && !c.isNpc) ?? null;
  const npcs = rows?.filter((c) => c.inGame && c.isNpc) ?? null;

  // Ajuste PV/PSP d'un PNJ et sauvegarde immédiatement — pas de fiche à
  // ouvrir, c'est tout l'intérêt de ces boutons pour le MJ en cours de jeu.
  async function adjustNpc(npc: CharacterSummary, field: "hpCurrent" | "pspCurrent", delta: number) {
    if (!rows) return;
    const max = field === "hpCurrent" ? npc.hpMax : npc.pspMax;
    const next = Math.max(0, Math.min(max, npc[field] + delta));
    setRows(rows.map((r) => (r.id === npc.id ? { ...r, [field]: next } : r)));
    try {
      await api.updateCharacter(npc.id, { [field]: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la sauvegarde");
      setRows((current) => current?.map((r) => (r.id === npc.id ? { ...r, [field]: npc[field] } : r)) ?? current);
    }
  }

  async function removeNpc(npc: CharacterSummary) {
    if (!rows) return;
    setRows(rows.map((r) => (r.id === npc.id ? { ...r, inGame: false } : r)));
    try {
      await api.updateCharacter(npc.id, { inGame: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la sauvegarde");
      setRows((current) => current?.map((r) => (r.id === npc.id ? { ...r, inGame: true } : r)) ?? current);
    }
  }

  async function handleNpcPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setNpcPortraitUrl(await resizePortraitToDataUrl(file));
    } catch (err) {
      setNpcError(err instanceof Error ? err.message : "Échec du chargement de l'image");
    }
  }

  async function handleCreateNpc(e: React.FormEvent) {
    e.preventDefault();
    if (!npcName.trim()) return;
    setNpcSaving(true);
    setNpcError(null);
    try {
      await api.createNpc({
        name: npcName.trim(),
        portraitUrl: npcPortraitUrl,
        race: npcRace || undefined,
        hpMax: npcHpMax,
        pspMax: npcPspMax,
      });
      setNpcName("");
      setNpcRace("");
      setNpcHpMax(20);
      setNpcPspMax(20);
      setNpcPortraitUrl(null);
      setShowNpcForm(false);
      await loadCharacters();
    } catch (err) {
      setNpcError(err instanceof Error ? err.message : "Échec de la création");
    } finally {
      setNpcSaving(false);
    }
  }

  return (
    <div
      className="min-h-dvh bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "linear-gradient(rgba(2,6,23,.82), rgba(2,6,23,.82)), url('/background.jpg')",
      }}
    >
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Suivi des constantes</h1>
            <p className="text-sm text-slate-400">Personnages en jeu — PV / PSP en direct</p>
          </div>
          <Link to="/" className="text-sm text-indigo-400 hover:underline">
            ← Personnages
          </Link>
        </header>

        {error && <p className="mb-3 text-red-400">{error}</p>}
        {!rows && !error && <p className="text-slate-400">Chargement…</p>}

        {rows && (
          <>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Joueurs</h2>
            {players && players.length === 0 && (
              <p className="mb-6 text-sm text-slate-500">
                Aucun personnage en jeu. Coche "En jeu" sur l'écran d'accueil pour l'ajouter ici.
              </p>
            )}
            {/*
              Passage à 2 colonnes repoussé à `lg` (1024px) plutôt que `sm`
              (640px) : entre 640 et 1023px, une tuile en 2 colonnes serait
              trop étroite pour loger silhouette + anneaux + photo agrandis
              sans déborder.
            */}
            <ul className="mb-8 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {players?.map((c) => (
                <li key={c.id}>
                  <CharacterTile c={c} isNpc={false} />
                </li>
              ))}
            </ul>

            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">PNJ</h2>
              <button
                type="button"
                onClick={() => setShowNpcForm((v) => !v)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
              >
                {showNpcForm ? "Annuler" : "+ Nouveau PNJ"}
              </button>
            </div>

            {showNpcForm && (
              <form onSubmit={handleCreateNpc} className="mb-4 rounded-xl bg-slate-900 p-4 shadow">
                <div className="flex flex-wrap items-start gap-4">
                  <button
                    type="button"
                    onClick={() => npcFileInputRef.current?.click()}
                    className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800 text-slate-500 hover:bg-slate-700"
                  >
                    {npcPortraitUrl ? (
                      <img src={npcPortraitUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs">Photo</span>
                    )}
                  </button>
                  <input
                    ref={npcFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleNpcPhotoChange}
                  />
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">Nom</label>
                      <input
                        type="text"
                        required
                        value={npcName}
                        onChange={(e) => setNpcName(e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">Race</label>
                        <select
                          value={npcRace}
                          onChange={(e) => setNpcRace(e.target.value)}
                          className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
                        >
                          <option value="">—</option>
                          {referenceData.races.map((r) => (
                            <option key={r.race} value={r.race}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">PV max</label>
                        <input
                          type="number"
                          min={1}
                          value={npcHpMax}
                          onChange={(e) => setNpcHpMax(Number(e.target.value))}
                          className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-500">PSP max</label>
                        <input
                          type="number"
                          min={0}
                          value={npcPspMax}
                          onChange={(e) => setNpcPspMax(Number(e.target.value))}
                          className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {npcError && <p className="mt-3 text-sm text-red-400">{npcError}</p>}
                <button
                  type="submit"
                  disabled={npcSaving}
                  className="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {npcSaving ? "Création…" : "Créer le PNJ"}
                </button>
              </form>
            )}

            {npcs && npcs.length === 0 && !showNpcForm && (
              <p className="text-sm text-slate-500">Aucun PNJ en jeu.</p>
            )}
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {npcs?.map((c) => (
                <li key={c.id}>
                  <CharacterTile
                    c={c}
                    isNpc
                    onAdjust={(field, delta) => adjustNpc(c, field, delta)}
                    onRemove={() => removeNpc(c)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
