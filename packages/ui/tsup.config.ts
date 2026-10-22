import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  // `build` wipes dist/ itself: with `clean: true` the `--watch` run would also
  // delete the compiled dist/styles.css that `build:css` emits beside the JS.
  clean: false,
  external: ["react", "react-dom", "react/jsx-runtime", "react-router-dom"],
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
  loader: {
    ".css": "css",
  },
});
