# @gummy-ui/cli

The `gummy` command line. It brings `@gummy-ui/studio`, the prebuilt studio, with it.

## Start an app

```bash
npx @gummy-ui/cli init my-app     # or: gummy init [dir] [--name <name>] [--force]
cd my-app && npm install
npm run dev                       # the app, rendering gummy/projects/my-app.json
npm run studio                    # the studio, rewriting that file on every save
```

`init` writes the starter: a Vite + React app whose `src/App.tsx` mounts
`<GummyApp>` over `gummy/projects/<key>.json` (`src/project.ts` picks the file),
`src/actions.ts` / `src/components.tsx` for the code only the app can supply, and a
one-page project to start from. `<key>` is the package name as a slug. A
non-empty folder is refused unless `--force`.

## Serve the studio in an existing app

```bash
npm install -D @gummy-ui/cli
npx gummy studio            # http://127.0.0.1:3300
```

`gummy studio` serves the studio and keeps your work in `./gummy/`:
`workspace.json` (the studio's state) and `projects/<key>.json` (the runtime
document each project renders through `<GummyApp>`), rewritten on every save.
Options: `--port <n>`, `--host <h>`, `--dir <path>`, `--open`, `--demo` (a fresh
folder starts from the Country demo instead of an empty project).

Writes are version-checked: if `workspace.json` changes on disk under an open
studio, saving pauses and the studio shows a Reload banner.

One file, no dependencies beyond Node 18: [`bin/gummy.mjs`](bin/gummy.mjs).
