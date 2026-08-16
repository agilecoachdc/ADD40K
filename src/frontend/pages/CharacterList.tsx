import { useEffect, useRef, useState } from "react";
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const isGm = user?.role === "gm";

  // Un seul input file caché, réutilisé pour toutes les tuiles — on retient
  // quelle fiche est visée dans une ref (pas de state, pas besoin de re-render).
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importTargetId = useRef<string | null>(null);

  function loadCharacters() {
    return api
      .listCharacters()
      .then(({ characters }) => setRows(characters))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"));
  }

  useEffect(() => {
    loadCharacters();
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

  // Export App -> Excel : charge le template embarqué (public/character-template.xlsx,
  // une copie allégée du classeur de Conrad — sans images, cf. src/frontend/lib/xlsxSync.ts),
  // y écrit les données actuelles du personnage, déclenche le téléchargement.
  async function handleExport(id: string, name: string) {
    setError(null);
    setBusyId(id);
    try {
      const [{ character }, XLSX, templateRes] = await Promise.all([
        api.getCharacter(id),
        import("xlsx"),
        fetch("/character-template.xlsx"),
      ]);
      if (!templateRes.ok) throw new Error("Template Excel introuvable");
      const buf = await templateRes.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const { applyCharacterToWorkbook } = await import("../lib/xlsxSync");
      applyCharacterToWorkbook(wb, character);
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'export");
    } finally {
      setBusyId(null);
    }
  }

  function handleImportClick(id: string) {
    importTargetId.current = id;
    fileInputRef.current?.click();
  }

  // Import Excel -> App : ne fait jamais confiance à une valeur de cellule
  // formule (armure/pouvoir psy/avantage) mise en cache par Excel — cf.
  // xlsxSync.ts, même principe que scripts/import_xlsx.py.
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const id = importTargetId.current;
    e.target.value = ""; // permet de re-sélectionner le même fichier ensuite
    if (!file || !id) return;
    setError(null);
    setBusyId(id);
    try {
      const [buf, XLSX] = await Promise.all([file.arrayBuffer(), import("xlsx")]);
      const wb = XLSX.read(buf, { type: "array" });
      const { readCharacterPatchFromWorkbook } = await import("../lib/xlsxSync");
      const patch = readCharacterPatchFromWorkbook(wb, referenceData);
      await api.updateCharacter(id, patch);
      await loadCharacters();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'import — le fichier n'est peut-être pas au bon format");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="min-h-dvh bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "linear-gradient(rgba(2,6,23,.82), rgba(2,6,23,.82)), url('/background.jpg')",
      }}
    >
      <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileSelected} />
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
            <a
              href="https://drive.google.com/drive/folders/1bCHRg2AuKnBwizC9arAxvLRCQ8ikCJ6s"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              Dossier Drive
            </a>
            <span>{user?.displayName}</span>
            <button onClick={() => logout()} className="text-indigo-400 hover:underline">
              Déconnexion
            </button>
          </div>
        </header>

        {error && <p className="text-red-400">{error}</p>}
        {!rows && !error && <p className="text-slate-400">Chargement…</p>}

        {isGm && <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Joueurs</h2>}
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows?.filter((c) => !c.isNpc).map((c) => {
            const canEdit = isGm || c.owner_username === user?.username;
            const busy = busyId === c.id;
            return (
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
                <div className="flex shrink-0 flex-col items-center gap-1">
                  {isGm && (
                    <label className="flex flex-col items-center gap-0.5 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={c.inGame}
                        onChange={() => toggleInGame(c)}
                        aria-label={`${c.name} en jeu`}
                      />
                      En jeu
                    </label>
                  )}
                  <div className="flex gap-1">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleImportClick(c.id)}
                        disabled={busy}
                        title="Importer depuis une fiche Excel"
                        aria-label={`Importer la fiche de ${c.name} depuis Excel`}
                        className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                      >
                        ⬆︎ Excel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleExport(c.id, c.name)}
                      disabled={busy}
                      title="Exporter vers une fiche Excel"
                      aria-label={`Exporter la fiche de ${c.name} vers Excel`}
                      className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                    >
                      ⬇︎ Excel
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/*
          Section PNJ — MJ uniquement : les PNJ n'ont pas de joueur pour
          cocher "En jeu" depuis leur propre fiche (contrairement aux
          personnages joueurs ci-dessus), donc c'est ici que le MJ décide
          lesquels apparaissent sur l'écran "Suivi des constantes"
          (rows.inGame filtré côté GmTracker.tsx).
        */}
        {isGm && rows && rows.some((c) => c.isNpc) && (
          <>
            <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">PNJ</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rows.filter((c) => c.isNpc).map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <Link
                    to={`/personnages/${c.id}`}
                    className="flex flex-1 items-center justify-between rounded-xl bg-slate-900 px-4 py-3 shadow transition hover:bg-slate-800"
                  >
                    <div>
                      <p className="font-medium text-slate-100">{c.name}</p>
                      <p className="text-sm text-slate-400">{raceLabel(c.race)}</p>
                    </div>
                  </Link>
                  <label className="flex shrink-0 flex-col items-center gap-0.5 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={c.inGame}
                      onChange={() => toggleInGame(c)}
                      aria-label={`${c.name} en jeu`}
                    />
                    En jeu
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
