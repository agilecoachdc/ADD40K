import { Navigate, Route, Routes } from "react-router-dom";
import type { UserRole } from "@shared/types";
import { useAuth } from "./lib/auth-context";
import Login from "./pages/Login";
import Home from "./pages/Home";
import CharacterList from "./pages/CharacterList";
import CharacterSheet from "./pages/CharacterSheet";
import GmTracker from "./pages/GmTracker";
import Profile from "./pages/Profile";
import GamesRulesets from "./pages/admin/GamesRulesets";
import PlayerGroups from "./pages/admin/PlayerGroups";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <CenteredMessage>Chargement…</CenteredMessage>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Comme RequireAuth, mais exige aussi l'un des rôles donnés — sinon retour à l'accueil. */
function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <CenteredMessage>Chargement…</CenteredMessage>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center text-slate-400">{children}</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/groupe"
        element={
          <RequireAuth>
            <CharacterList />
          </RequireAuth>
        }
      />
      <Route
        path="/personnages/:id"
        element={
          <RequireAuth>
            <CharacterSheet />
          </RequireAuth>
        }
      />
      <Route
        path="/suivi"
        element={
          <RequireAuth>
            <GmTracker />
          </RequireAuth>
        }
      />
      <Route
        path="/profil"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/jeux"
        element={
          <RequireRole roles={["admin"]}>
            <GamesRulesets />
          </RequireRole>
        }
      />
      <Route
        path="/admin/groupes"
        element={
          <RequireRole roles={["admin"]}>
            <PlayerGroups />
          </RequireRole>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
