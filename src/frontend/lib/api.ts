// Client API minimal — fetch() + cookie de session (httpOnly, envoyé
// automatiquement par le navigateur via `credentials: "include"`). Voir
// docs/API_REFERENCE.md pour la forme exacte des réponses.

import type {
  Character,
  CharacterSummary,
  Game,
  PlayerGroup,
  PlayerGroupDetail,
  ProfileInfo,
  PublicUser,
  ReferenceData,
  Ruleset,
  RulesetDetail,
  UserRole,
} from "@shared/types";
import type { CharacterComputed } from "@shared/calc-engine";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ user: PublicUser }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: PublicUser }>("/auth/me"),
  getProfile: () => request<ProfileInfo>("/profile"),

  listCharacters: () =>
    request<{ characters: CharacterSummary[]; referenceData: ReferenceData | null }>("/characters"),
  getCharacter: (id: string) =>
    request<{ character: Character; computed: CharacterComputed; canEdit: boolean; referenceData: ReferenceData }>(
      `/characters/${id}`,
    ),
  updateCharacter: (id: string, patch: Partial<Character>) =>
    request<{ character: Character; computed: CharacterComputed; canEdit: boolean; referenceData: ReferenceData }>(
      `/characters/${id}`,
      { method: "PUT", body: JSON.stringify(patch) },
    ),
  createNpc: (input: { name: string; portraitUrl?: string | null; race?: string; vit: number; vol: number }) =>
    request<{ character: Character; computed: CharacterComputed; canEdit: boolean; referenceData: ReferenceData }>(
      "/characters",
      { method: "POST", body: JSON.stringify(input) },
    ),

  // ---------------------------------------------------------------------
  // Administration (jeux / règles / groupes / comptes) — réservé au rôle admin.
  // ---------------------------------------------------------------------

  listGames: () => request<{ games: Game[] }>("/admin/games"),
  createGame: (input: { name: string; description?: string }) =>
    request<{ game: Game }>("/admin/games", { method: "POST", body: JSON.stringify(input) }),
  updateGame: (id: string, patch: { name?: string; description?: string }) =>
    request<{ game: Game }>(`/admin/games/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteGame: (id: string) => request<{ ok: true }>(`/admin/games/${id}`, { method: "DELETE" }),

  listRulesets: (gameId?: string) =>
    request<{ rulesets: Ruleset[] }>(`/admin/rulesets${gameId ? `?gameId=${encodeURIComponent(gameId)}` : ""}`),
  getRuleset: (id: string) => request<{ ruleset: RulesetDetail }>(`/admin/rulesets/${id}`),
  createRuleset: (input: { gameId: string; name: string; description?: string }) =>
    request<{ ruleset: RulesetDetail }>("/admin/rulesets", { method: "POST", body: JSON.stringify(input) }),
  updateRuleset: (id: string, patch: { name?: string; description?: string; referenceData?: ReferenceData }) =>
    request<{ ruleset: RulesetDetail }>(`/admin/rulesets/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteRuleset: (id: string) => request<{ ok: true }>(`/admin/rulesets/${id}`, { method: "DELETE" }),

  listGroups: () => request<{ groups: PlayerGroup[] }>("/admin/groups"),
  getGroup: (id: string) => request<{ group: PlayerGroupDetail }>(`/admin/groups/${id}`),
  createGroup: (input: { name: string; description?: string; rulesetId: string }) =>
    request<{ group: PlayerGroupDetail }>("/admin/groups", { method: "POST", body: JSON.stringify(input) }),
  updateGroup: (id: string, patch: { name?: string; description?: string; rulesetId?: string }) =>
    request<{ group: PlayerGroup }>(`/admin/groups/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteGroup: (id: string) => request<{ ok: true }>(`/admin/groups/${id}`, { method: "DELETE" }),

  listUsers: () => request<{ users: PublicUser[] }>("/admin/users"),
  createUser: (input: { username: string; displayName: string; role: UserRole; playerGroupId?: string | null }) =>
    request<{ user: PublicUser; password: string }>("/admin/users", { method: "POST", body: JSON.stringify(input) }),
  updateUser: (id: string, patch: { displayName?: string; role?: UserRole; playerGroupId?: string | null }) =>
    request<{ user: PublicUser }>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
};
