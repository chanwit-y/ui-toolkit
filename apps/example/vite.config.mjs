import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.API_PROXY_TARGET || "http://localhost:9000";

export default defineConfig({
  plugins: [react()],
  // esbuild 0.27.7+ errors when lowering destructuring for older browser
  // targets; Vite 5 does not include the workaround shipped in Vite 7.3.3+.
  esbuild: {
    supported: {
      destructuring: true,
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      supported: {
        destructuring: true,
      },
    },
  },
  server: {
    port: 3200,
    host: true,
    proxy: {
      "/collection": { target: apiTarget, changeOrigin: true },
      "/upload": { target: apiTarget, changeOrigin: true },
      "/uploads": { target: apiTarget, changeOrigin: true },
      "/health": { target: apiTarget, changeOrigin: true },
    },
  },
});
