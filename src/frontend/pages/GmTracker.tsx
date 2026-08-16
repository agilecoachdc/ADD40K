// Écran "Suivi des constantes" — vue MJ uniquement : tous les personnages
// actuellement "en jeu" (coché sur l'écran d'accueil). Chaque tuile est
// volontairement minimale (nom, photo, anneaux PV/PSP — rien d'autre) pour
// tout voir d'un coup d'œil sur un seul écran en séance. Rafraîchi
// automatiquement (polling léger) puisque les PV/PSP bougent côté joueurs
// pendant que cet écran reste ouvert côté MJ.

import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { CharacterSummary } from "@shared/types";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { RaceArmorSilhouette } from "../components/RaceArmorSilhouette";

const POLL_INTERVAL_MS = 5000;

/**
 * Anneaux concentriques façon Apple Fitness : PV (rouge) à l'extérieur, PSP
 * (bleu) à l'intérieur. Chaque anneau est un cercle SVG plein tracé en
 * pointillés (stroke-dasharray = circonférence) dont on masque une partie
 * (stroke-dashoffset) selon le pourcentage restant — même technique que les
 * "activity rings". Rotation -90° pour démarrer en haut (12h) comme Apple
 * plutôt qu'à 3h (défaut SVG). Purement visuel, pas de texte superposé.
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
  const strokeWidth = 8;
  const gap = 3;
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
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      {ring(outerRadius, hpPct, "rgba(248,113,113,0.15)", "#f87171")}
      {ring(innerRadius, pspPct, "rgba(56,189,248,0.15)", "#38bdf8")}
    </svg>
  );
}

export default function GmTracker() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CharacterSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    function load() {
      api
        .listCharacters()
        .then(({ characters }) => {
          if (!cancelled) setRows(characters);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Erreur");
        });
    }
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Vue réservée au MJ — un joueur qui atterrit ici (URL directe) repart à l'accueil.
  if (user && user.role !== "gm") return <Navigate to="/" replace />;

  const inGame = rows?.filter((c) => c.inGame) ?? null;

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

        {error && <p className="text-red-400">{error}</p>}
        {!rows && !error && <p className="text-slate-400">Chargement…</p>}

        {inGame && inGame.length === 0 && (
          <p className="text-slate-400">
            Aucun personnage en jeu. Coche "En jeu" sur l'écran d'accueil pour l'ajouter ici.
          </p>
        )}

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {inGame?.map((c) => (
            <li key={c.id}>
              <Link
                to={`/personnages/${c.id}`}
                className="flex items-stretch overflow-hidden rounded-xl bg-slate-900 shadow transition hover:bg-slate-800"
              >
                {/* Silhouette d'armure sur toute la hauteur — même taille (110) que sur la fiche personnage. */}
                <div className="flex shrink-0 items-center justify-center self-stretch bg-slate-950/40 px-3">
                  <RaceArmorSilhouette race={c.race} armorTotals={c.armorTotals} size={110} />
                </div>
                <div className="min-w-0 flex-1 p-3">
                  <p className="truncate text-sm font-medium text-slate-100">{c.name}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <ConstantsRings hpCurrent={c.hpCurrent} hpMax={c.hpMax} pspCurrent={c.pspCurrent} pspMax={c.pspMax} size={64} />
                    {c.portraitUrl ? (
                      <img src={c.portraitUrl} alt={c.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xl text-slate-600">
                        {c.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
