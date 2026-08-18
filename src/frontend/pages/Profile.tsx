// Page "Mon profil" — accessible à tout rôle (admin/gm/player). Montre
// l'identité du compte et le contexte plateforme (groupe de joueurs, règle,
// jeu) renvoyé par GET /api/profile. Un admin sans groupe voit un message
// dédié plutôt qu'un groupe vide.
//
// Joueurs et MJ peuvent aussi y rejoindre un groupe existant, et un MJ peut
// y créer un nouveau groupe (nom, image, règle) — cf. routes/catalog.ts
// (self-service, distinct des routes CRUD complètes /api/admin/*).

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PlayerGroup, ProfileInfo, Ruleset } from "@shared/types";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { resizePortraitToDataUrl } from "../lib/image";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  gm: "Maître du jeu",
  player: "Joueur",
};

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "Erreur";
}

function GroupThumb({ url, name }: { url: string | null; name: string }) {
  return url ? (
    <img src={url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
  ) : (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-600">
      {name.charAt(0)}
    </div>
  );
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [info, setInfo] = useState<ProfileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newRulesetId, setNewRulesetId] = useState("");
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const canJoinOrCreate = user?.role === "player" || user?.role === "gm";

  function loadProfile() {
    return api
      .getProfile()
      .then(setInfo)
      .catch((err) => setError(errMsg(err)));
  }

  function loadCatalog() {
    if (!canJoinOrCreate) return;
    Promise.all([api.browseGroups(), api.browseRulesets()])
      .then(([{ groups }, { rulesets }]) => {
        setGroups(groups);
        setRulesets(rulesets);
      })
      .catch((err) => setError(errMsg(err)));
  }

  useEffect(() => {
    loadProfile();
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJoin(groupId: string) {
    setError(null);
    setBusyGroupId(groupId);
    try {
      await api.joinGroup(groupId);
      await refreshUser();
      await loadProfile();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusyGroupId(null);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setNewImageUrl(await resizePortraitToDataUrl(file));
    } catch (err) {
      setError(errMsg(err));
    }
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newRulesetId) return;
    setCreating(true);
    setError(null);
    try {
      await api.createGroupSelf({
        name: newName.trim(),
        description: newDescription.trim(),
        rulesetId: newRulesetId,
        imageUrl: newImageUrl,
      });
      setNewName("");
      setNewDescription("");
      setNewRulesetId("");
      setNewImageUrl(null);
      await refreshUser();
      await loadProfile();
      loadCatalog();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setCreating(false);
    }
  }

  const joinableGroups = groups.filter((g) => g.id !== info?.group?.id);

  return (
    <div
      className="min-h-dvh bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "linear-gradient(rgba(2,6,23,.82), rgba(2,6,23,.82)), url('/r2t2-banner.jpg')" }}
    >
      <div className="mx-auto max-w-2xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Mon profil</h1>
          <Link to="/" className="text-sm text-indigo-400 hover:underline">
            ← Retour
          </Link>
        </header>

        {error && <p className="mb-4 text-red-400">{error}</p>}
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
                <div className="flex gap-3">
                  <GroupThumb url={info.group.imageUrl} name={info.group.name} />
                  <dl className="grid flex-1 grid-cols-2 gap-3 text-sm">
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
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {info.user.role === "admin"
                    ? "Compte administrateur — pas de groupe de joueurs assigné."
                    : "Aucun groupe de joueurs assigné pour l'instant."}
                </p>
              )}
            </section>

            {canJoinOrCreate && (
              <section className="rounded-xl bg-slate-900 p-4 shadow">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Rejoindre un groupe
                </h2>
                {joinableGroups.length === 0 && <p className="text-sm text-slate-500">Aucun autre groupe disponible.</p>}
                <ul className="space-y-2">
                  {joinableGroups.map((g) => (
                    <li key={g.id} className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-2">
                      <GroupThumb url={g.imageUrl} name={g.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">{g.name}</p>
                        {g.description && <p className="truncate text-xs text-slate-500">{g.description}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleJoin(g.id)}
                        disabled={busyGroupId === g.id}
                        className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {busyGroupId === g.id ? "…" : "Rejoindre"}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {user?.role === "gm" && (
              <section className="rounded-xl bg-slate-900 p-4 shadow">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Créer un nouveau groupe
                </h2>
                <form onSubmit={handleCreateGroup} className="space-y-3">
                  <div className="flex items-start gap-4">
                    <label className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-slate-800 text-slate-500 hover:bg-slate-700">
                      {newImageUrl ? (
                        <img src={newImageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs">Image</span>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        required
                        placeholder="Nom du groupe"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Description (optionnel)"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
                      />
                      <select
                        required
                        value={newRulesetId}
                        onChange={(e) => setNewRulesetId(e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
                      >
                        <option value="">— Règle —</option>
                        {rulesets.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {creating ? "Création…" : "Créer et rejoindre"}
                  </button>
                </form>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
