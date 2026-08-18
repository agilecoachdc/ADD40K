// Page "Mon profil" — accessible à tout rôle (admin/gm/player). Montre
// l'identité du compte et le contexte plateforme (groupe de joueurs, règle,
// jeu) renvoyé par GET /api/profile. Un admin sans groupe voit un message
// dédié plutôt qu'un groupe vide.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ProfileInfo } from "@shared/types";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  gm: "Maître du jeu",
  player: "Joueur",
};

export default function Profile() {
  const { user } = useAuth();
  const [info, setInfo] = useState<ProfileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProfile()
      .then(setInfo)
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"));
  }, []);

  return (
    <div className="min-h-dvh bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "linear-gradient(rgba(2,6,23,.82), rgba(2,6,23,.82)), url('/background.jpg')" }}>
      <div className="mx-auto max-w-2xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Mon profil</h1>
          <Link to="/" className="text-sm text-indigo-400 hover:underline">
            ← Retour
          </Link>
        </header>

        {error && <p className="text-red-400">{error}</p>}
        {!info && !error && <p className="text-slate-400">Chargement…</p>}

        {info && (
          <div className="space-y-4">
            <section className="rounded-xl bg-slate-900 p-4 shadow">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Identité</h2>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-slate-500">Nom</dt>
                  <dd className="text-slate-200">{info.user.displayName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Identifiant</dt>
                  <dd className="text-slate-200">{info.user.username}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Rôle</dt>
                  <dd className="text-slate-200">{ROLE_LABELS[info.user.role] ?? info.user.role}</dd>
                </div>
                {user?.characterId && (
                  <div>
                    <dt className="text-slate-500">Personnage</dt>
                    <dd>
                      <Link to={`/personnages/${user.characterId}`} className="text-indigo-400 hover:underline">
                        Voir la fiche
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="rounded-xl bg-slate-900 p-4 shadow">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Groupe de joueurs</h2>
              {info.group && info.ruleset && info.game ? (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Groupe</dt>
                    <dd className="text-slate-200">{info.group.name}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Jeu</dt>
                    <dd className="text-slate-200">{info.game.name}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Règle</dt>
                    <dd className="text-slate-200">{info.ruleset.name}</dd>
                  </div>
                  {info.group.description && (
                    <div className="col-span-2">
                      <dt className="text-slate-500">Description</dt>
                      <dd className="text-slate-300">{info.group.description}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-slate-500">
                  {info.user.role === "admin"
                    ? "Compte administrateur — pas de groupe de joueurs assigné."
                    : "Aucun groupe de joueurs assigné pour l'instant."}
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
