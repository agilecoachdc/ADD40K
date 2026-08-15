import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const sharedDir = fileURLToPath(new URL("./src/shared", import.meta.url));

// Frontend build config. Output goes to ./dist, served by the Worker via
// the `assets` binding declared in wrangler.jsonc. API calls under /api/*
// are proxied to `wrangler dev` during local development.
export default defineConfig({
  root: "src/frontend",
  publicDir: "../../public",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@shared": sharedDir,
    },
  },
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
