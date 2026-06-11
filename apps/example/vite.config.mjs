import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.API_PROXY_TARGET || "http://localhost:9000";

export default defineConfig({
  plugins: [react()],
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
