// Client API minimal — fetch() + cookie de session (httpOnly, envoyé
// automatiquement par le navigateur via `credentials: "include"`). Voir
// docs/API_REFERENCE.md pour la forme exacte des réponses.

import type { Character, CharacterSummary, PublicUser } from "@shared/types";
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
  listCharacters: () => request<{ characters: CharacterSummary[] }>("/characters"),
  getCharacter: (id: string) =>
    request<{ character: Character; computed: CharacterComputed; canEdit: boolean }>(`/characters/${id}`),
  updateCharacter: (id: string, patch: Partial<Character>) =>
    request<{ character: Character; computed: CharacterComputed; canEdit: boolean }>(`/characters/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
};
