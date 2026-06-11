import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodeModules = path.join(root, "node_modules");

for (const pkg of ["vite", "tsup"]) {
  const nestedEsbuild = path.join(nodeModules, pkg, "node_modules", "esbuild");
  if (!fs.existsSync(nestedEsbuild)) {
    continue;
  }

  fs.rmSync(nestedEsbuild, { recursive: true, force: true });
  console.log(`Removed nested esbuild from ${pkg}`);
}
