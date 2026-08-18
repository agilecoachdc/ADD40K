import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { CharacterSummary, ReferenceData } from "@shared/types";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";

export default function CharacterList() {
  const { user, logout } = useAuth();
  const [rows, setRows] = useState<CharacterSummary[] | null>(null);
  // Catalogue du groupe de l'utilisateur — renvoyé par GET /characters
  // (scopé serveur), plus d'import statique ADD40K (cf. lib/reference.ts).
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  // Image du groupe (fond d'écran) — remplace le fond ADD40K en dur : chaque
  // groupe a la sienne (cf. migrations/0004_images.sql), plateforme par
  // défaut si le groupe n'en a pas (ou pour un admin, sans groupe).
  const [groupImageUrl, setGroupImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const isGm = user?.role === "gm";
  const isAdmin = user?.role === "admin";
  const backgroundUrl = groupImageUrl ?? "/r2t2-banner.jpg";

  function raceLabel(race: string) {
    return referenceData?.races.find((r) => r.race === race)?.label ?? race;
  }

  // Un seul input file caché, réutilisé pour toutes les tuiles — on retient
  // quelle fiche est visée dans une ref (pas de state, pas besoin de re-render).
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importTargetId = useRef<string | null>(null);

  function loadCharacters() {
    if (isAdmin) return Promise.resolve(); // pas de groupe/personnages pour un admin
    return api
      .listCharacters()
      .then(({ characters, referenceData, groupImageUrl }) => {
        setRows(characters);
        setReferenceData(referenceData);
        setGroupImageUrl(groupImageUrl);
      })
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

  // Bascule joueur <-> PNJ (MJ uniquement), même principe optimiste que
  // toggleInGame ci-dessus.
  async function toggleIsNpc(row: CharacterSummary) {
    if (!rows) return;
    const nextIsNpc = !row.isNpc;
    setRows(rows.map((r) => (r.id === row.id ? { ...r, isNpc: nextIsNpc } : r)));
    try {
      await api.updateCharacter(row.id, { isNpc: nextIsNpc });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du changement de statut joueur/PNJ");
      setRows((current) => current?.map((r) => (r.id === row.id ? { ...r, isNpc: row.isNpc } : r)) ?? current);
    }
  }

  // Archive/désarchive (MJ uniquement) : masque la fiche des écrans
  // "Personnages" et "Suivi des constantes" sans la supprimer.
  async function setArchived(row: CharacterSummary, archived: boolean) {
    if (!rows) return;
    setRows(rows.map((r) => (r.id === row.id ? { ...r, archived } : r)));
    try {
      await api.updateCharacter(row.id, { archived });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'archivage");
      setRows((current) => current?.map((r) => (r.id === row.id ? { ...r, archived: row.archived } : r)) ?? current);
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
    if (!file || !id || !referenceData) return;
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
        backgroundImage: `linear-gradient(rgba(2,6,23,.82), rgba(2,6,23,.82)), url('${backgroundUrl}')`,
      }}
    >
      <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileSelected} />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">{isAdmin ? "Administration" : "Personnages ADD40K"}</h1>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            {isGm && (
              <Link
                to="/suivi"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Suivi des constantes
              </Link>
            )}
            {isAdmin && (
              <>
                <Link to="/admin/jeux" className="text-indigo-400 hover:underline">
                  Jeux &amp; règles
                </Link>
                <Link to="/admin/groupes" className="text-indigo-400 hover:underline">
                  Groupes
                </Link>
              </>
            )}
            {!isAdmin && (
              <a
                href="https://drive.google.com/drive/folders/1bCHRg2AuKnBwizC9arAxvLRCQ8ikCJ6s"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline"
              >
                Dossier Drive
              </a>
            )}
            <Link to="/profil" className="text-indigo-400 hover:underline">
              Mon profil
            </Link>
            <span>{user?.displayName}</span>
            <button onClick={() => logout()} className="text-indigo-400 hover:underline">
              Déconnexion
            </button>
          </div>
        </header>

        {isAdmin && (
          <p className="text-slate-400">
            Compte administrateur — pas de groupe de joueurs assigné. Utilisez « Jeux &amp; règles » pour créer un
            jeu et une règle, puis « Groupes » pour créer un groupe de joueurs et y rattacher des comptes.
          </p>
        )}

        {!isAdmin && (
        <>
        {error && <p className="text-red-400">{error}</p>}
        {!rows && !error && <p className="text-slate-400">Chargement…</p>}

        {isGm && <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Joueurs</h2>}
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows?.filter((c) => !c.isNpc && !c.archived).map((c) => {
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
                  {isGm && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => toggleIsNpc(c)}
                        title="Passer ce personnage en PNJ"
                        aria-label={`Passer ${c.name} en PNJ`}
                        className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        → PNJ
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchived(c, true)}
                        title="Archiver ce personnage"
                        aria-label={`Archiver ${c.name}`}
                        className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        Archiver
                      </button>
                    </div>
                  )}
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
        {isGm && rows && rows.some((c) => c.isNpc && !c.archived) && (
          <>
            <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">PNJ</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rows.filter((c) => c.isNpc && !c.archived).map((c) => (
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
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <label className="flex flex-col items-center gap-0.5 text-xs text-slate-400">
                      <input
                        type="checkbox"
                        checked={c.inGame}
                        onChange={() => toggleInGame(c)}
                        aria-label={`${c.name} en jeu`}
                      />
                      En jeu
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => toggleIsNpc(c)}
                        title="Passer ce PNJ en personnage joueur"
                        aria-label={`Passer ${c.name} en personnage joueur`}
                        className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        → Joueur
                      </button>
                      <button
                        type="button"
                        onClick={() => setArchived(c, true)}
                        title="Archiver ce PNJ"
                        aria-label={`Archiver ${c.name}`}
                        className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        Archiver
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/*
          Bouton d'accès aux personnages archivés — toujours visible côté MJ
          (sous la section PNJ), qu'il y en ait ou non, pour rester un point
          d'entrée stable plutôt qu'apparaître/disparaître selon le contenu.
        */}
        {isGm && rows && (
          <>
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="mb-3 mt-8 text-sm text-indigo-400 hover:underline"
            >
              {showArchived ? "▾" : "▸"} Personnages archivés ({rows.filter((c) => c.archived).length})
            </button>

            {showArchived && (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rows
                  .filter((c) => c.archived)
                  .map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-xl bg-slate-900/60 px-4 py-3 shadow"
                    >
                      <div>
                        <p className="font-medium text-slate-300">{c.name}</p>
                        <p className="text-sm text-slate-500">
                          {raceLabel(c.race)} · {c.isNpc ? "PNJ" : "Joueur"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setArchived(c, false)}
                        title="Désarchiver ce personnage"
                        aria-label={`Désarchiver ${c.name}`}
                        className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        Désarchiver
                      </button>
                    </li>
                  ))}
                {rows.filter((c) => c.archived).length === 0 && (
                  <p className="text-sm text-slate-500">Aucun personnage archivé.</p>
                )}
              </ul>
            )}
          </>
        )}
        </>
        )}
      </div>
    </div>
  );
}
