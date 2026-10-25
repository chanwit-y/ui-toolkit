# Gummy MCP server

Grilled design (2026-10-25, see memory `mcp-server`). An MCP server that lets
Claude author Gummy projects with every ability of the studio, kept current as
the studio grows.

## Decisions

1. **What it edits — the studio workspace.** `gummy/workspace.json` is the
   source of truth; the runtime `projects/<key>/project.json` + `pages/*.json`
   are always derived with the studio's own `projectToRuntime`. The MCP never
   edits runtime JSON by hand.
2. **Headless on the files.** Works with or without `gummy studio` running. The
   edit logic moves out of the zustand stores (`workspaceStore`, `gridStore`)
   into pure **commands** — `(workspace, command) → workspace` — that both the
   stores and the MCP call. One implementation.
3. **Packaging — `gummy mcp [--dir gummy]`**, a subcommand of `@gummy-ui/cli`
   over stdio with `@modelcontextprotocol/sdk` (the CLI's first dependency). It
   loads `@gummy-ui/studio`'s `dist/headless.mjs` (commands, migrations,
   defaults, export, generated schemas, guides), so studio and MCP ship as one
   version. Root `.mcp.json` points at `demo/gummy`; `gummy init` writes one.
4. **Live tab.** On an SSE `changed`, a **clean** studio tab (nothing waiting
   in the autosave) reloads the workspace in place (route + selection kept); a
   dirty tab goes `stale` as today. The MCP checks the content-hash revision
   before each write and retries when the file moved.
5. **Scope — everything persisted in `workspace.json`**: projects, pages, items
   in every canvas, menu, shell, theme, env, sign-in, page / global loads,
   custom actions / components, attached endpoints, the library (endpoints,
   models, groups, templates, sign-in entries). Plus `insert_template`,
   `test_endpoint` (real request through the engine client, response checked
   against the model) and activity logged as "Claude (MCP)". Out: selection,
   preview breakpoint, undo, screenshots, the app's real `actions.ts` /
   `components.tsx`.
6. **Tool surface — small, generic, schema-driven** (~15–25 tools): reads
   (`get_workspace_summary`, `list_projects`, `get_page`, `get_item`,
   `list_item_types`, `describe_item_type`), structure (`add_page` /
   `update_page` / `delete_page`, `add_item`, `move_item`, `remove_item`),
   config patches per area (`update_item_config`, endpoint, model, menu, shell,
   theme, env, …), `validate_project`, `export_project`, `batch`.
7. **Schemas generated from the studio's TS types** at build time
   (`ts-json-schema-generator`, JSDoc → descriptions); defaults from the
   `createDefault*Config` factories; cross-field rules live in the commands.
8. **Guides shipped as MCP resources** (`gummy://guide/<topic>`): a "start
   here", one per item type, concept guides, recipes. `describe_item_type`
   returns its guide with the schema and defaults.
9. **Keeping it current**: drift tests (every catalog type needs schema +
   default + guide + tool path; a pending allowlist that must reach empty), a
   workspace-version guard (migrate older, refuse to write newer), a scenario
   test (build a project through the tool handlers → `assertGummyProject` +
   persist round-trip), a CLAUDE.md "MCP" section and a feedback memory.
10. **Addressing**: stateless — every tool names `project` (id or key); items by
    id, child canvases as `{ item, canvas: <index> }`; references in a patch
    accept an id or a unique name/key and are stored as ids; structured errors
    with a path.
11. **Writes**: every write tool saves immediately (workspace + the changed
    projects' runtime folders, same rules as the CLI's `writeProjectFolder`);
    `batch` is all-or-nothing with `$n` references to earlier results;
    `dryRun` on every write returns the diff + validation. Errors block;
    warnings are written and returned.
12. **Destructive tools** (`delete_project`, `delete_page`, library deletes)
    need `confirm: true`; without it they answer a dry run listing what would
    be removed and which references would dangle.

## Phases

- **Phase 1** — pure commands extracted (projects, pages, items / canvases, item
  config, library endpoints / models), stores call them; schema generation +
  defaults registry + `dist/headless.mjs`; `gummy mcp` with read / page / item /
  config / endpoint / model / validate / export / batch / dryRun; clean-tab
  auto-reload; core guides (start-here, textfield, select family, button,
  datatable, container, modal, tab, repeater, card); drift tests with a pending
  list; root `.mcp.json`.
- **Phase 2** — menu, shell, theme, env, sign-in, loads, custom actions /
  components, templates, `test_endpoint`, activity; every remaining guide,
  concept guides, recipes; scenario test; `gummy init` `.mcp.json`; CLAUDE.md
  section + memory; pending list empty. Proof: rebuild a small Portal-like
  project through the MCP and open it in the studio and the demo app.
