// Écran "Suivi des constantes" — vue MJ uniquement : tous les personnages
// actuellement "en jeu" (coché sur l'écran d'accueil), avec photo, nom, et
// une jauge compacte PV/PSP par personnage, pour tout voir sur un seul
// écran en séance. Rafraîchi automatiquement (polling léger) puisque les
// PV/PSP bougent côté joueurs pendant que cet écran reste ouvert côté MJ.

import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import type { CharacterSummary } from "@shared/types";
import { referenceData } from "@shared/reference-data";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";

const POLL_INTERVAL_MS = 5000;

function raceLabel(race: string) {
  return referenceData.races.find((r) => r.race === race)?.label ?? race;
}

function GaugeBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const low = max > 0 && current / max <= 0.25;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>{label}</span>
        <span className={low ? "font-semibold text-red-400" : "text-slate-300"}>
          {current} / {max}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
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

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {inGame?.map((c) => (
            <li key={c.id} className="rounded-xl bg-slate-900 p-3 shadow">
              <div className="mb-2 flex items-center gap-2">
                {c.portraitUrl ? (
                  <img src={c.portraitUrl} alt={c.name} className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-lg text-slate-600">
                    {c.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">{c.name}</p>
                  <p className="truncate text-xs text-slate-500">{raceLabel(c.race)}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <GaugeBar label="PV" current={c.hpCurrent} max={c.hpMax} color="bg-red-500" />
                <GaugeBar label="PSP" current={c.pspCurrent} max={c.pspMax} color="bg-sky-500" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
