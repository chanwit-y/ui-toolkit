# @gummy-ui/cli

The `gummy` command line. It brings `@gummy-ui/studio`, the prebuilt studio, with it.

## Start an app

```bash
npx @gummy-ui/cli init my-app     # or: gummy init [dir] [--name <name>] [--force]
cd my-app && npm install
npm run dev                       # the app, rendering gummy/projects/my-app/
npm run studio                    # the studio, updating that folder on every save
```

`init` writes the starter: a Vite + React app whose `src/App.tsx` mounts
`<GummyApp>` over `gummy/projects/<key>/` (`src/project.ts` picks the project and
wires its lazy page loader),
`src/actions.ts` / `src/components.tsx` for the code only the app can supply, and a
one-page project to start from. `<key>` is the package name as a slug. A
non-empty folder is refused unless `--force`.

## Serve the studio in an existing app

```bash
npm install -D @gummy-ui/cli
npx gummy studio            # http://127.0.0.1:3300
```

`gummy studio` serves the studio and keeps your work in `./gummy/`:
`workspace.json` (the studio's state) and `projects/<key>/` (the runtime
document each project renders through `<GummyApp>`: `project.json` plus one
`pages/<page>.json` per page). Each save rewrites only the files that changed
and removes page files of deleted pages; a project folder is never deleted.
Options: `--port <n>`, `--host <h>`, `--dir <path>`, `--open`, `--demo` (a fresh
folder starts from the Country demo instead of an empty project).

Writes are version-checked: if `workspace.json` changes on disk under an open
studio, a tab with no unsaved edits reloads it in place; one with unsaved
edits pauses saving and shows a Reload banner.

## Let Claude author the workspace (MCP)

```bash
npx gummy mcp               # stdio MCP server over ./gummy (--dir <path> to change)
```

`gummy mcp` is an MCP server that edits `gummy/workspace.json` with the
studio's own editing rules (`@gummy-ui/studio/headless`) and, after every
write, rewrites the changed `projects/<key>/` folders exactly as the studio
would. Register it with your client, e.g. a `.mcp.json` in the app:

```json
{ "mcpServers": { "gummy": { "command": "npx", "args": ["gummy", "mcp"] } } }
```

Tools: reads (`get_workspace_summary`, `get_project`, `get_page`, `get_item`,
`list_item_types`, `describe_item_type`, `get_library`), structure (projects,
pages, `add_item` / `update_item` / `move_item` / `remove_item`, tabs, canvas
grids), the library (`upsert_model`, `upsert_endpoint`, attach / detach,
deletes) and `validate_project` / `export_project`; `batch` runs several
calls as one all-or-nothing save and every write takes `dryRun`. Config edits
are deep-merge patches checked against JSON Schemas generated from the
studio's types; references may be written by name. Guides are resources
(`gummy://guide/start`, one per component type, recipes).

Run it beside `gummy studio`: a studio tab with no unsaved edits reloads
by itself when the MCP writes; a tab with unsaved edits pauses saving and
shows the Reload banner, so nothing is overwritten. A workspace written by a
newer studio than the installed CLI is refused, never downgraded.

The CLI is plain Node 18+: [`bin/gummy.mjs`](bin/gummy.mjs), with `gummy mcp`
in [`bin/mcp.mjs`](bin/mcp.mjs) (its only dependency is the MCP SDK).
