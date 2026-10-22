import type { GummyProject } from "@gummy-ui/ui";

/**
 * Which project document the app renders. Every `gummy/projects/<key>.json`
 * is picked up (Vite reloads when one is added or saved), and one is chosen:
 *
 * 1. `VITE_GUMMY_PROJECT=<key>` when set (`.env` or the shell);
 * 2. otherwise the one named after this package (`gummy-demo`), which is what
 *    `gummy studio` creates in a fresh folder;
 * 3. otherwise any project the studio exported (anything but the shipped
 *    `demo` sample), alphabetically first;
 * 4. otherwise the shipped `demo` sample.
 *
 * The choice and the keys available are logged to the console once.
 */
const SAMPLE_KEY = "demo";
const PACKAGE_KEY = "gummy-demo";

const modules = import.meta.glob<{ default: GummyProject }>("../gummy/projects/*.json", { eager: true });
const projects = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [path.replace(/^.*\/([^/]+)\.json$/, "$1"), mod.default]),
) as Record<string, GummyProject>;

const keys = Object.keys(projects).sort();
const wanted = import.meta.env.VITE_GUMMY_PROJECT as string | undefined;
const exported = keys.filter((k) => k !== SAMPLE_KEY);

export const projectKey =
  (wanted && keys.includes(wanted) && wanted) ||
  (keys.includes(PACKAGE_KEY) && PACKAGE_KEY) ||
  exported[0] ||
  SAMPLE_KEY;

if (wanted && !keys.includes(wanted)) {
  console.warn(`[gummy-demo] VITE_GUMMY_PROJECT=${wanted} is not in gummy/projects (have: ${keys.join(", ")}).`);
}
console.info(`[gummy-demo] rendering gummy/projects/${projectKey}.json (available: ${keys.join(", ")}; set VITE_GUMMY_PROJECT to choose)`);

export const project: GummyProject = projects[projectKey];
