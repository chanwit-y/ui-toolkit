import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev the engine calls the API through this origin; `/api` is proxied to the
// Book shop mock API (`bun run api`, port 9100 — see api/README.md). A real app
// sets `API_URL` in the project's env (or `apiUrl` on <GummyApp>) instead.
const apiTarget = process.env.API_PROXY_TARGET || "http://localhost:9100";

export default defineConfig({
  plugins: [react()],
  // esbuild 0.27.7 (pinned at the monorepo root) errors when lowering
  // destructuring for older targets; Vite 5 lacks the workaround Vite 7.3.3+ ships.
  esbuild: { supported: { destructuring: true } },
  optimizeDeps: { esbuildOptions: { supported: { destructuring: true } } },
  server: {
    port: 3400,
    host: true,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
});
