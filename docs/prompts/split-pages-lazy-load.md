# Prompt: one JSON per page + a fast engine load for large projects

> Grilled design, 2026-10-23 — **implemented the same day** (see the Split pages bullet in `CLAUDE.md`). Kept as the record of the decisions; implement it as
> written and follow `CLAUDE.md` (rtk-prefixed commands, theming rule, `bun:test`, the public surface
> in `packages/ui/src/index.ts`, workspace migrations, grilled-design memory `split-pages-lazy-load`).

## Why

A project is one file, `gummy/projects/<key>.json`, bundled whole by an eager Vite glob in
`demo/src/project.ts`. `PageRouter` constructs `new Core(...).run()` for **every** page at mount and
each `Core` builds its own `ApiMaster`, which converts every model to TypeBox again — pages ×
endpoints of work before the first page paints. The router, menu and breadcrumbs only need each
page's `path` / `title` / `parent` / `breadcrumb`; `containers` + `loads` are needed only when that
route is visited.

## Decisions (the design tree, resolved)

1. **Layout on disk — a folder per project.** `gummy/projects/<key>/project.json` holds everything
   except page bodies; `pages[key]` keeps the route meta (`path`, `title`, `parent`, `breadcrumb`)
   plus `src: "pages/<pageKey>.json"`. Each `gummy/projects/<key>/pages/<pageKey>.json` is a
   `GummyPageBody = { containers, loads? }`. The single-file `<key>.json` with inline pages stays
   valid.
2. **Loading a body — a resolver prop.** `GummyApp` (and `PageRouter`) take
   `loadPage?: (src: string, key: string) => Promise<GummyPageBody>`. Default: `fetch(src)` resolved
   against a `projectUrl` prop (static hosts). The `demo/` starter and the CLI template wire a
   **lazy** Vite glob (`import.meta.glob("../gummy/projects/*/pages/*.json")`), so each page is its
   own chunk, loaded on first visit, reloaded by Vite on save. The engine never assumes a bundler.
3. **Engine cost — both fixes, for inline pages too.**
   - **One `ApiMaster` per app**: built once in `PageRouter` from `model` + `api`, shared by every
     page's `Core` and by `GlobalLoads`; the TypeBox conversion gets a per-model memo so a model
     referenced by ten endpoints converts once.
   - **Lazy page construction**: a page's `Core` is built the first time its route matches and
     cached by key (revisits must not remount / refetch, as the current memo guarantees). Split
     pages resolve their body first (Suspense), inline pages build synchronously. Unvisited pages
     cost only their route entry.
4. **Loading / failure UX — app-level.** `GummyApp.pageFallback?: ReactNode` (default: a centred
   spinner in Radix vars, rendered inside the shell so the top bar + menu stay). A rejected
   resolver renders a page-level error card ("Couldn't load this page", the key, a Retry button)
   and `console.error`s; the shell stays up. Bodies are cached per key for the session.
5. **No prefetch in v1.** The cache exposes `prefetchPage(key)` so menu-hover prefetch is a
   one-liner later; nothing calls it yet.
6. **Studio + CLI write the folder, prune pages only.** `PUT /__gummy/workspace` payload becomes
   `projects: { [key]: { project, pages: { [pageKey]: body } } }`; the CLI writes
   `projects/<key>/project.json` + `pages/<pageKey>.json`, **skips a file whose content is
   unchanged** (no needless Vite reload), and **deletes `pages/*.json` not in that project's
   manifest** (page files are derived from `workspace.json`, nothing is lost). A project folder is
   never deleted (a renamed project leaves its old folder, as today). `saveToProject.ts`'s File
   System Access path writes the same tree.
7. **Picker + schema.** `schemaVersion` stays `1`: `src` is an additive optional field;
   `assertGummyProject` accepts a page with `containers` **or** `src`, rejects one with neither.
   The consumer picker globs `*.json` and `*/project.json` eagerly into one keyed map (file name
   or folder name = key) and feeds the lazy page glob to `loadPage`. The shipped `demo` sample is
   converted to the folder layout (the starter dogfoods the lazy path); a single-file fixture keeps
   the inline path tested.
8. **Studio save serializes only the active project.** The autosave ships the runtime document of
   the project being edited (the workspace payload still carries everything); a shared-library
   change (models / endpoints / auth) marks every project dirty. The Live Preview keeps building
   inline and inherits the lazy per-route `Core`.
9. **Proof — a checked-in benchmark.** A generator builds ~200 pages × ~40 bins over ~150 models /
   120 endpoints; a `bun:test` measures time-to-first-route in `PageRouter` and the number of
   TypeBox conversions (a counter in the converter). Pass: first-render cost independent of page
   count; conversions = distinct models. `vite build` of the demo shows one chunk per page.
10. **Download fallback = single file.** Without the CLI and without the folder picker, Save /
    Export downloads one `<key>.json` with inline pages (still schema 1); folders arrive the moment
    `gummy studio` runs.

## Out of scope

Prefetch on hover (5), deleting project folders (6), a `schemaVersion` bump (7), a zip export (10),
splitting `model` / `api` out of `project.json`.

## Where things live

- Library: `components/core/project.ts` (`GummyPageBody`, `src`, assertion), `core/PageRouter.tsx`
  (shared `ApiMaster`, lazy `Core` per route, Suspense + error card, `loadPage`),
  `model/` (conversion memo + counter), `components/GummyApp.tsx` (`loadPage`, `projectUrl`,
  `pageFallback`), exports in `src/index.ts`.
- Studio: `Workspace/runtimeProject.ts` (manifest + bodies), `cli/cliStorage.ts` (active-project
  payload), `cli/saveToProject.ts`, `Workspace/exportFiles.ts`.
- CLI: `apps/cli/bin/gummy.mjs` (folder writes, unchanged skip, page prune), `template/src/project.ts`.
- Starter: `demo/src/project.ts`, `demo/gummy/projects/demo/`.
- Docs: the **Library runtime** bullet in `CLAUDE.md`.
