// Page d'admin "Comptes" — vue d'ensemble de tous les comptes de la
// plateforme et de leur rôle/groupe, pour garder un œil sur les
// appartenances aux groupes sans avoir à ouvrir chaque groupe un par un
// (PlayerGroups.tsx reste la vue détaillée par groupe).
//
// Existe aussi pour repérer/corriger rapidement une assignation erronée :
// affecter un compte à un groupe depuis PlayerGroups.tsx force un rôle
// (joueur/MJ) — utilisé par erreur sur un compte admin, ça le rétrograde
// silencieusement (incident du 18/08). PlayerGroups.tsx exclut désormais
// les comptes admin de cette liste ; cette page permet en plus de voir tous
// les comptes d'un coup d'œil et de corriger un rôle/groupe directement.

import { useEffect, useState } from "react";
import type { PlayerGroup, PublicUser, UserRole } from "@shared/types";
import { api } from "../../lib/api";
import { AdminNav } from "../../components/AdminNav";

const ROLE_LABELS: Record<UserRole, string> = { admin: "Admin", gm: "MJ", player: "Joueur" };

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "Erreur";
}

interface Draft {
  role: UserRole;
  playerGroupId: string | null;
}

export default function Accounts() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function loadAll() {
    return Promise.all([api.listUsers(), api.listGroups()])
      .then(([{ users }, { groups }]) => {
        setUsers(users);
        setGroups(groups);
        setDrafts(Object.fromEntries(users.map((u) => [u.id, { role: u.role, playerGroupId: u.playerGroupId }])));
      })
      .catch((err) => setError(errMsg(err)));
  }

  useEffect(() => {
    loadAll();
  }, []);

  function groupName(id: string | null): string {
    if (!id) return "—";
    return groups.find((g) => g.id === id)?.name ?? id;
  }

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((d) => {
      const base = d[id] ?? { role: "player" as UserRole, playerGroupId: null };
      return { ...d, [id]: { ...base, ...patch } };
    });
  }

  async function handleSave(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    setError(null);
    try {
      // Un admin n'appartient à aucun groupe — cohérent avec la règle déjà
      // appliquée côté serveur (admin.ts, PUT /users/:id), mais on l'impose
      // aussi ici pour ne pas afficher un groupe qu'on sait sans effet.
      await api.updateUser(id, {
        role: draft.role,
        playerGroupId: draft.role === "admin" ? null : draft.playerGroupId,
      });
      await loadAll();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSavingId(null);
    }
  }

  const sorted = [...users].sort((a, b) => {
    const byGroup = groupName(a.playerGroupId).localeCompare(groupName(b.playerGroupId));
    return byGroup !== 0 ? byGroup : a.displayName.localeCompare(b.displayName);
  });

  return (
    <div className="min-h-dvh bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Comptes</h1>
          <AdminNav current="comptes" />
        </header>

        {error && <p className="mb-4 text-red-400">{error}</p>}

        <div className="overflow-x-auto rounded-xl bg-slate-900 shadow">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Identifiant</th>
                <th className="px-4 py-2">Rôle</th>
                <th className="px-4 py-2">Groupe</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => {
                const draft = drafts[u.id] ?? { role: u.role, playerGroupId: u.playerGroupId };
                const dirty = draft.role !== u.role || draft.playerGroupId !== u.playerGroupId;
                return (
                  <tr key={u.id} className="border-t border-slate-800">
                    <td className="px-4 py-2 text-slate-200">{u.displayName}</td>
                    <td className="px-4 py-2 text-slate-400">{u.username}</td>
                    <td className="px-4 py-2">
                      <select
                        value={draft.role}
                        onChange={(e) => updateDraft(u.id, { role: e.target.value as UserRole })}
                        className="rounded border border-slate-700 bg-slate-800 px-2 py-1"
                      >
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      {draft.role === "admin" ? (
                        <span className="text-slate-600">— (aucun groupe)</span>
                      ) : (
                        <select
                          value={draft.playerGroupId ?? ""}
                          onChange={(e) => updateDraft(u.id, { playerGroupId: e.target.value || null })}
                          className="rounded border border-slate-700 bg-slate-800 px-2 py-1"
                        >
                          <option value="">—</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleSave(u.id)}
                        disabled={!dirty || savingId === u.id}
                        className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
                      >
                        {savingId === u.id ? "…" : "Enregistrer"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm text-slate-500">
                    Aucun compte.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
