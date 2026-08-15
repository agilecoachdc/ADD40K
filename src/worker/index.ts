// Point d'entrée du Worker : sert l'API sous /api/*, et le SPA (React,
// buildé dans ./dist) pour tout le reste via le binding `assets`.
// Voir docs/API_REFERENCE.md pour le détail des routes, et wrangler.jsonc
// pour la config des bindings (DB, ASSETS).

import { Hono } from "hono";
import type { Env } from "./lib/session";
import { requireAuth } from "./lib/session";
import { authRoutes } from "./routes/auth";
import { characterRoutes } from "./routes/characters";

const app = new Hono<{ Bindings: Env }>();

app.route("/api/auth", authRoutes);
app.use("/api/characters/*", requireAuth);
app.route("/api/characters", characterRoutes);

// Tout ce qui n'est pas /api/* est délégué aux assets statiques (le SPA).
// `not_found_handling: "single-page-application"` dans wrangler.jsonc fait
// retomber les routes client-side (ex. /personnages/stern-tack) sur
// index.html plutôt que de renvoyer un 404 brut.
app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
