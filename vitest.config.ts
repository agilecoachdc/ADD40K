import { defineConfig } from "vitest/config";

// Config Vitest séparée de vite.config.ts : ce dernier fixe `root` à
// src/frontend (pour le build SPA), ce qui ferait chercher les tests
// uniquement dans ce sous-dossier. Les tests visés ici sont ceux du moteur
// de calcul partagé (src/shared), pas du frontend.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
