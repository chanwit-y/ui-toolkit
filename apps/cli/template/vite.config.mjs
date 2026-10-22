import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, requests the engine makes to these paths are proxied to your API, so
// `API_URL` can stay empty (same origin). Set API_PROXY_TARGET, or put the real
// base URL in the project's env / the `apiUrl` prop of <GummyApp> instead.
const apiTarget = process.env.API_PROXY_TARGET || "http://localhost:9000";

export default defineConfig({
  plugins: [react()],
  // Newer esbuild releases refuse to lower destructuring for Vite 5's default
  // browser targets; telling them the targets support it is harmless.
  esbuild: { supported: { destructuring: true } },
  optimizeDeps: { esbuildOptions: { supported: { destructuring: true } } },
  server: {
    port: 3400,
    host: true,
    proxy: {
      "/collection": { target: apiTarget, changeOrigin: true },
      "/upload": { target: apiTarget, changeOrigin: true },
      "/uploads": { target: apiTarget, changeOrigin: true },
    },
  },
});
