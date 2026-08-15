import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CharacterSummary } from "@shared/types";
import { referenceData } from "@shared/reference-data";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";

function raceLabel(race: string) {
  return referenceData.races.find((r) => r.race === race)?.label ?? race;
}

export default function CharacterList() {
  const { user, logout } = useAuth();
  const [rows, setRows] = useState<CharacterSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isGm = user?.role === "gm";

  useEffect(() => {
    api
      .listCharacters()
      .then(({ characters }) => setRows(characters))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"));
  }, []);

  // Bascule le statut "en jeu" et sauvegarde immédiatement (MJ uniquement),
  // même principe que le toggle d'armure sur la fiche : pas de mode édition
  // à ouvrir pour ça.
  async function toggleInGame(row: CharacterSummary) {
    if (!rows) return;
    const nextInGame = !row.inGame;
    setRows(rows.map((r) => (r.id === row.id ? { ...r, inGame: nextInGame } : r)));
    try {
      await api.updateCharacter(row.id, { inGame: nextInGame });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la sauvegarde du statut en jeu");
      setRows((current) => current?.map((r) => (r.id === row.id ? { ...r, inGame: row.inGame } : r)) ?? current);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Personnages ADD40K</h1>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          {isGm && (
            <Link
              to="/suivi"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Suivi des constantes
            </Link>
          )}
          <span>{user?.displayName}</span>
          <button onClick={() => logout()} className="text-indigo-400 hover:underline">
            Déconnexion
          </button>
        </div>
      </header>

      {error && <p className="text-red-400">{error}</p>}
      {!rows && !error && <p className="text-slate-400">Chargement…</p>}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows?.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <Link
              to={`/personnages/${c.id}`}
              className="flex flex-1 items-center justify-between rounded-xl bg-slate-900 px-4 py-3 shadow transition hover:bg-slate-800"
            >
              <div>
                <p className="font-medium text-slate-100">{c.name}</p>
                <p className="text-sm text-slate-400">{raceLabel(c.race)}</p>
              </div>
              {c.owner_username === user?.username && (
                <span className="rounded-full bg-indigo-600/20 px-2 py-1 text-xs text-indigo-300">Ma fiche</span>
              )}
            </Link>
            {isGm && (
              <label className="flex shrink-0 flex-col items-center gap-0.5 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={c.inGame}
                  onChange={() => toggleInGame(c)}
                  aria-label={`${c.name} en jeu`}
                />
                En jeu
              </label>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
