// Écran d'accueil — première étage de la navigation : liste des groupes de
// l'utilisateur (un seul pour un joueur/MJ dans le modèle actuel — chaque
// compte n'appartient qu'à un groupe à la fois, cf. routes/catalog.ts —
// mais présenté comme une liste pour rester cohérent si ça change, et pour
// couvrir le cas d'un admin qui voit tous les groupes de la plateforme).
// Cliquer un groupe mène à /groupe (ses personnages, cf. CharacterList.tsx)
// pour un joueur/MJ, ou à la gestion admin pour un admin.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PlayerGroup } from "@shared/types";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { GroupThumb } from "../components/GroupThumb";

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "Erreur";
}

export default function Home() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const [groups, setGroups] = useState<PlayerGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      api
        .browseGroups()
        .then(({ groups }) => setGroups(groups))
        .catch((err) => setError(errMsg(err)));
    } else {
      api
        .getProfile()
        .then((info) => setGroups(info.group ? [info.group] : []))
        .catch((err) => setError(errMsg(err)));
    }
  }, [isAdmin]);

  return (
    <div
      className="min-h-dvh bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "linear-gradient(rgba(2,6,23,.82), rgba(2,6,23,.82)), url('/r2t2-banner.jpg')" }}
    >
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">R2T2</h1>
          <div className="flex items-center gap-3 text-sm text-slate-400">
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
            <Link to="/profil" className="text-indigo-400 hover:underline">
              Mon profil
            </Link>
            <span>{user?.displayName}</span>
            <button onClick={() => logout()} className="text-indigo-400 hover:underline">
              Déconnexion
            </button>
          </div>
        </header>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Groupes</h2>

        {error && <p className="text-red-400">{error}</p>}
        {!groups && !error && <p className="text-slate-400">Chargement…</p>}

        {groups && groups.length === 0 && (
          <p className="text-sm text-slate-500">
            {isAdmin ? (
              "Aucun groupe pour l'instant — créez un jeu et une règle depuis « Jeux & règles », puis un groupe depuis « Groupes »."
            ) : (
              <>
                Vous n'êtes rattaché à aucun groupe.{" "}
                <Link to="/profil" className="text-indigo-400 hover:underline">
                  Rejoindre ou créer un groupe
                </Link>
                .
              </>
            )}
          </p>
        )}

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {groups?.map((g) => (
            <li key={g.id}>
              <Link
                to={isAdmin ? "/admin/groupes" : "/groupe"}
                className="flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 shadow transition hover:bg-slate-800"
              >
                <GroupThumb url={g.imageUrl} name={g.name} sizePx={56} />
                <div className="min-w-0">
                  <p className="font-medium text-slate-100">{g.name}</p>
                  {g.description && <p className="truncate text-sm text-slate-400">{g.description}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
