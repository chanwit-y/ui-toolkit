import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * One paint path for surfaces (grilled design `glass-surface`): a component
 * paints its panel through the `gummy-surface*` classes / `--gummy-surface-*`
 * vars, never a hardcoded white or Tailwind grey, or it would not turn glass.
 * The three paths this replaced grew back once already.
 */
const ROOT = join(import.meta.dir, "..");
const FORBIDDEN = [
  /\bbg-white\b/,
  /\bdark:bg-gray-9\d\d\b/,
  /\bdark:bg-gray-800\b/,
  /background(?:-color)?:\s*(?:white|#fff\b|#ffffff\b|rgb\(17 24 39\)|rgb\(31 41 55\))/,
];
const ALLOW = new Set(["styles/surface.css", "components/Snackbar.css"]);

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) yield p;
  }
}

describe("surface paint", () => {
  test("no component hardcodes a panel colour outside surface.css", () => {
    const hits: string[] = [];
    for (const file of files(ROOT)) {
      const rel = file.slice(ROOT.length + 1);
      if (ALLOW.has(rel)) continue;
      const text = readFileSync(file, "utf8");
      text.split("\n").forEach((line, i) => {
        if (FORBIDDEN.some((re) => re.test(line))) hits.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(hits).toEqual([]);
  });
});
