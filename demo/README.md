# Gummy demo — the consumer starter

The smallest app that uses Gummy UI the way an external team would: install the
library, let the studio write the project document, render it with the engine.
Nothing in `src/` describes a screen; the screens live in
`gummy/projects/demo.json`.

```
demo/
├─ gummy/
│  ├─ workspace.json       the studio's state (written by `gummy studio`; absent until the first save)
│  └─ projects/demo.json   a project document — what `gummy studio` writes per project on save
├─ src/
│  ├─ main.tsx             BrowserRouter + the library stylesheet
│  ├─ App.tsx              <GummyApp project={demo.json} …/>
│  ├─ actions.ts           custom button actions the configs name as "fn:<name>"
│  └─ components.tsx       custom React components the configs place by name
├─ index.html
├─ vite.config.mjs         proxies /collection to the mock API in dev
└─ package.json
```

## Run it

From the monorepo root (the demo is a workspace, so `@gummy-ui/ui` resolves to
`packages/ui/dist` — build the library first):

```bash
bun run --filter @gummy-ui/ui build
bun run api                      # mock API on :9000
bun run --cwd demo dev           # http://localhost:3400
bun run --cwd demo studio        # the studio over demo/gummy (see below)
```

A real app does the same with `npm install @gummy-ui/ui` and its own API.

## How it fits together

- **`@gummy-ui/ui`** is the runtime dependency. `import "@gummy-ui/ui/styles.css"`
  brings the compiled stylesheet (Radix Themes, the engine partials, every
  utility the components use) — the app needs no Tailwind.
- **`<GummyApp>`** (`src/App.tsx`) renders the project document: theme,
  app shell + menu, page data loads and the page router, all from the JSON. It
  mounts inside the app's own `<BrowserRouter>`, like `PageRouter`, so other
  routes can live beside it. The app supplies only what JSON cannot carry:
  - `getToken` — the bearer token for API calls;
  - `env` — per-environment overrides of the project's `env` (`API_URL` is the HTTP base URL);
  - `actions` — the functions behind `"fn:<name>"` button actions;
  - `components` — the React components behind `type: "custom"` bins;
  - `header` / `footer` / `brand` — the shell slots; `shell={false}` drops the shell.
- **`gummy/projects/demo.json`** is validated at mount (`schemaVersion`, model
  references, page paths); a broken document throws with the reason instead of
  rendering blank. Names in `customActions` / `customComponents` that the app
  forgot to register are reported with a console warning.

## Editing the screens

The studio owns the document. `@gummy-ui/studio` is a devDependency, so from
this folder:

```bash
bun run studio          # = gummy studio → http://127.0.0.1:3300
```

`gummy studio` serves the prebuilt studio and keeps your work **in this folder**:

- `gummy/workspace.json` — the studio's own state (projects, shared library,
  activity). Commit it; it is what your teammates open.
- `gummy/projects/<key>.json` — one runtime document per project, rewritten on
  every save (`<key>` is the project name as a slug). The app imports the one it
  renders; Vite reloads on change.

A fresh folder starts with one empty project named after this package
(`gummy-demo`). Pass `--demo` on the first run to start from the Country demo
instead, `--port <n>` for another port, `--open` to open the browser.

Saves are version-checked: if `workspace.json` changes on disk under an open
studio (a `git pull`, another tab), the studio pauses saving and shows a
Reload banner instead of overwriting the file.

The hand-written `gummy/projects/demo.json` this starter ships with is not in
the studio's workspace; once your own project exists, point `src/App.tsx` at
its file (`./gummy/projects/<key>.json`) and delete `demo.json`.

## What the demo shows

- `/` — a data table over `POST /collection/get-all`; a row opens `/countries/:id`.
- `/countries/:id` — a page data load (`country`, skeleton mode) feeding a card,
  a typography, a custom `StatBadge`, a `Reload` action, a `Navigate` button
  back and a `fn:greet` custom action that reads the loaded country.
