# Gummy Studio through MCP — start here

Gummy renders a CRUD app from config. You author it the way the studio does:
the MCP edits `gummy/workspace.json` (the studio's own state) and, on every
write, regenerates `gummy/projects/<key>/project.json` + `pages/*.json` — the
runtime document `<GummyApp>` renders. An open studio tab with no unsaved edits
reloads by itself, so the user watches you build.

## The model

- **Workspace** → projects + a **shared library** (models, endpoints, groups,
  templates, sign-in entries).
- **Project** → pages, menu, shell (app bar / sidebar), theme, env, page and
  global data loads, custom action / component declarations, and the library
  endpoints it **attaches** (only attached endpoints reach the app).
- **Page** → `key` (identifier, unique per project), `name`, `path`
  (`/books/:id` — `:params` are URL parameters; no page claims `/`, the app
  sends `/` to the first page), a **canvas** of items.
- **Item** → `type` (see `list_item_types`), `label` (editor name), `config`
  (per-type, see `describe_item_type`), `settings` (grid layout) and optional
  `condition` (Show when) / `enabledWhen` / `valueFormula` / `initialValue`
  (gummy://guide/concepts/logic).
- **Canvas** → a 12-column responsive grid. Container-hosting items own **child
  canvases** (`get_page` labels each: a modal's content, a data table's edit
  modal and filter form, a repeater's item template, one per tab…). Address one
  as `parent: { item: "<item id>", canvas: <index> }`.

## Workflow

1. `get_workspace_summary` → pick or `create_project`.
2. Library first: `upsert_model` (shapes), `upsert_endpoint` (url, method and
   model refs by name), then `attach_endpoints` to the project (a config
   referencing a library endpoint attaches it for you).
3. `add_page`, then `add_item` per component. Read `describe_item_type` before
   configuring a type — it returns the JSON Schema, the defaults and the guide.
4. `update_item` with a **deep-merge patch** of `config` (objects merge, arrays
   and scalars replace). Unknown keys and wrong enum values are rejected.
5. `validate_project` — errors (the runtime document fails its checks) and
   warnings (`MISSING_*` references, unattached endpoints…).
6. Use `batch` for anything that must not exist half-done (a table and its
   modal form); every write tool also takes `dryRun: true`.

## Layout

`settings.colSpan` is per breakpoint `{ xs, sm, md, lg }` out of the canvas'
columns (default `xs 4 · sm 6 · md 8 · lg 12`). Full width =
`{ xs: 4, sm: 6, md: 8, lg: 12 }`; half on desktop = `{ xs: 4, sm: 6, md: 4, lg: 6 }`.
`add_item` gives each type a sensible default (tables, containers, cards full
width; inputs a third on desktop). Pass `layout: { colSpan: {...} }` to
`add_item` / `update_item` to change it; `update_canvas` sets the grid itself
(`columns`, `gap`, …).

## References

Config fields that point at something store its **id**, but you may write the
name instead — the MCP resolves it (and errors when it matches nothing or
several things):

| field | refers to | write |
|---|---|---|
| `pageId` (in `navigate`, `rowNavigate`, `itemNavigate`) | a page | its key, name or path |
| `endpointId`, `deleteEndpointId`, `*EndpointId`, `dataSource.endpointId`, `read.endpointId` | a library endpoint | its name |
| `loadId`, a `{ type: "state" }` / `{ source: "state" }` `key` | a page / global load | its key |
| `modalItemId`, `observeToItemId`, `reloadTableItemId`, `exportTableItemId`, `enabledWhen.itemId` | an item on the page | its binding `name`, modal `id` or label |
| `componentId` | a declared custom component | its name |
| `"fn:<x>"` in `actions` / `confirmTrue` / `confirmFalse` | a declared custom action | its name |

## Bindings and sources

- `ItemBinding` = `{ key, path, source? }` or `null` (static). Inside a
  repeater's item template `source: "row"` reads the item (`key: "none"` = the
  item itself); `source: "state"` reads a page load (`key` = the load).
- `NavParamSource` (a navigate `:param`, a request param) =
  `{ type: "value", value }` | `{ type: "url", key, source: "param" | "query" }` |
  `{ type: "state", key: <load>, path }` | `{ type: "row", key: <row field> }`.
- `StudioNavigate` = `{ pageId, params: { <:param>: NavParamSource }, replace }`.

## Engine facts worth knowing

- A form's submit fills a URL `:id` from the form's own `_id` / `id` value, so
  an edit form needs a `hidden` field named `_id`.
- Bin conditions on a data table's modal: `condition: "adding" | "editing"`
  (any condition / formula: gummy://guide/concepts/logic).
- `SubmitFormToDeleteAPI` does nothing — delete through a POST endpoint or the
  table's own delete (`canDelete` + `deleteEndpointId`).

## Beyond the pages

`update_menu`, `update_shell`, `update_theme`, `set_env` (API_URL is the base
URL every endpoint is called against), `upsert_load` / `delete_load` (page
and global data), `upsert_custom_action` / `upsert_custom_component`,
`upsert_auth` + `set_project_auth` (sign-in), `list_templates` /
`insert_template` / `save_as_template`, `test_endpoint` (a real request,
checked against the response model) and `get_activity`.

Guides: `gummy://guide/<topic>` — one per item type (`describe_item_type`
returns the right one), the concepts `concepts/page-data`,
`concepts/navigation`, `concepts/shell-theme`, `concepts/custom-code`,
`concepts/sign-in`, and the recipes `recipes/crud-page`,
`recipes/detail-page`, `recipes/master-detail`.
