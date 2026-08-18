// Contexte React pour l'utilisateur connecté. Vérifie la session au
// montage (cookie httpOnly existant ?) avant de décider d'afficher /login
// ou l'app.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PublicUser } from "@shared/types";
import { api } from "./api";

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Recharge l'utilisateur depuis /auth/me — utilisé après un changement de
   * groupe (rejoindre/créer, page Profil) pour que le reste de l'app (écran
   * d'accueil, etc.) reflète immédiatement le nouveau playerGroupId. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const { user } = await api.login(username, password);
    setUser(user);
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  async function refreshUser() {
    const { user } = await api.me();
    setUser(user);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé sous AuthProvider");
  return ctx;
}
