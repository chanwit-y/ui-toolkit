import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react/jsx-runtime", "react-router-dom"],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
  loader: {
    ".css": "css",
  },
});
