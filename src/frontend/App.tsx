import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth-context";
import Login from "./pages/Login";
import CharacterList from "./pages/CharacterList";
import CharacterSheet from "./pages/CharacterSheet";
import GmTracker from "./pages/GmTracker";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <CenteredMessage>Chargement…</CenteredMessage>;
  if (!user) return <Navigate to="/login" replace />;
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
