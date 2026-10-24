import { globPageLoader, type GummyProject, type PageBodyLoader } from "@gummy-ui/ui";

/**
 * Which project document the app renders. Every project under
 * `gummy/projects/` is picked up — the folder `<key>/project.json` that
 * `gummy studio` writes (each page in `<key>/pages/<page>.json`, loaded on its
 * first visit as its own chunk) and the older single file `<key>.json` — and
 * Vite reloads when one is added or saved. One is chosen:
 *
 * 1. `VITE_GUMMY_PROJECT=<key>` when set (`.env` or the shell);
 * 2. otherwise the one named after this package (`__KEY__`) — the starter
 *    project `gummy init` wrote, which `gummy studio` takes over;
 * 3. otherwise any other project in the folder, alphabetically first.
 *
 * The choice and the keys available are logged to the console once.
 */
const SAMPLE_KEY = "__KEY__";
const PACKAGE_KEY = "__KEY__";

const folders = import.meta.glob<GummyProject>("../gummy/projects/*/project.json", { eager: true, import: "default" });
const singleFiles = import.meta.glob<GummyProject>("../gummy/projects/*.json", { eager: true, import: "default" });
// Lazy: a page file is fetched (one chunk each) only when its page is first visited.
const pageFiles = import.meta.glob("../gummy/projects/*/pages/*.json", { import: "default" });

const projects: Record<string, { project: GummyProject; dir?: string }> = {};
for (const [path, project] of Object.entries(singleFiles)) projects[path.replace(/^.*\/([^/]+)\.json$/, "$1")] = { project };
for (const [path, project] of Object.entries(folders)) {
  const key = path.replace(/^.*\/([^/]+)\/project\.json$/, "$1");
  if (projects[key])
    console.warn(`[__NAME__] gummy/projects/${key}/ and ${key}.json both exist — rendering the folder (what gummy studio writes); delete the old file.`);
  projects[key] = { project, dir: path.replace(/\/project\.json$/, "") };
}

const keys = Object.keys(projects).sort();
const wanted = import.meta.env.VITE_GUMMY_PROJECT as string | undefined;
const exported = keys.filter((k) => k !== SAMPLE_KEY);

export const projectKey =
  (wanted && keys.includes(wanted) && wanted) ||
  (keys.includes(PACKAGE_KEY) && PACKAGE_KEY) ||
  exported[0] ||
  SAMPLE_KEY;

if (wanted && !keys.includes(wanted)) {
  console.warn(`[__NAME__] VITE_GUMMY_PROJECT=${wanted} is not in gummy/projects (have: ${keys.join(", ")}).`);
}
const picked = projects[projectKey];
console.info(
  `[__NAME__] rendering gummy/projects/${projectKey}${picked?.dir ? "/" : ".json"} (available: ${keys.join(", ")}; set VITE_GUMMY_PROJECT to choose)`,
);

export const project: GummyProject = picked.project;
/** Loads the picked project's page files (none for a single-file project, whose pages are inline). */
export const loadPage: PageBodyLoader | undefined = picked.dir ? globPageLoader(pageFiles, picked.dir) : undefined;
