# Gummy `filecollection` item type — specification

Extracted from Synapse's `FileSidebar` (`src/components/common/FileTree/`) on
2026-10-28 for implementation as a **new built-in palette item type** in the
Gummy engine and studio. The Synapse component is the reference behaviour;
Synapse-specific features (document kinds, imports, favorites, vault sync,
graph view) are out of scope and listed under *Non-goals*.

Decisions in this document were grilled one by one and are final for v1.

---

## 1. Purpose and scope

A **file collection** is a tree of *collections* (top-level groups), each
holding *folders* and *files* nested to any depth. The item lets a person
browse, select, create, rename, move, duplicate and delete those nodes against
a set of endpoints, and exposes the selected node to the rest of the page.

| In scope (v1) | Out of scope (v1) |
|---|---|
| Collection create / inline rename / delete (confirm) | Favorites group and star toggle |
| Folder and file create via a configurable **New** menu | Import popover (Azure DevOps, SharePoint, PDF, Excel, local upload) |
| Inline rename, delete (confirm), duplicate (files) | Convert to canvas / mind map, open to side |
| Move via drag-and-drop (within a collection) and a **Move to** picker (anywhere) | Vault sync dots, graph view toggle, reveal-from-breadcrumb |
| Single selection → page state slice + optional navigate | Drag-to-resize width (Gummy's grid owns sizing) |
| Expand / collapse per collection and per folder | Per-file extension / editor selection |
| Read-only mode | Browser persistence of expand state |
| Header with title, add-collection button, optional collapse to an icon rail | Cross-collection drag-and-drop |

**Why a built-in type and not `custom`:** the component needs nine endpoint
slots, confirm/snackbar authoring, a selection state slice and a navigate
target. Gummy's `custom` type carries only string props and one bound value,
so it cannot express that wiring. `datatable` is the closest existing type and
its conventions are reused throughout (`endpointId` + `:param` maps,
`deleteConfirm*` / `*Snackbar*` groups, `<name>Selected` state, `StudioNavigate`).

---

## 2. Data contract

### 2.1 Node model

Two structural kinds only. Everything type-specific is carried by free-text
`kind` and resolved through config (§3.3).

```ts
type FileCollectionNode = {
  id: string;
  collectionId: string;
  parentId: string | null;        // null = collection root
  name: string;
  type: "folder" | "file";
  kind?: string | null;           // free text, e.g. "markdown", "canvas", "invoice"
  icon?: string | null;           // IconData key; overrides the kind → icon map
  createdAt?: number;
  updatedAt?: number;
  children?: FileCollectionNode[]; // folders only
};

type FileCollection = {
  id: string;
  name: string;
  directories: FileCollectionNode[];   // root-level nodes, nested via children
};
```

Rules:
- `type` decides structure (nesting, drop targets, duplicate, chevron).
  `kind` decides nothing structural; it only drives the icon and is echoed on
  `createItem`.
- `parentId` on the wire is optional; the engine derives it while walking the
  nested response. It is always present on the node the engine emits to state.
- Sibling order is the response order. The engine never sorts.

### 2.2 `list` response

The `list` endpoint returns an array of `FileCollection`, nested. `apiPaths`
(a dot path, `''` = the response is the array) locates the array inside a
wrapped response, exactly like the data table.

```json
[
  {
    "id": "c1",
    "name": "Catalog",
    "directories": [
      { "id": "f1", "collectionId": "c1", "name": "2026", "type": "folder",
        "children": [
          { "id": "i1", "collectionId": "c1", "name": "Q1 price list", "type": "file", "kind": "sheet" }
        ] },
      { "id": "i2", "collectionId": "c1", "name": "README", "type": "file", "kind": "markdown" }
    ]
  }
]
```

A string response is tolerated: the engine `JSON.parse`s it (twice if the
first parse yields a string) before applying `apiPaths`. Synapse ships
double-encoded directories from one legacy path and the tolerance is cheap.

### 2.3 Endpoint slots

Nine slots, each `{ endpointId: string | null, params: Record<string, string> }`.
`params` maps every `:param` in the endpoint URL to a field of the **subject
node or collection** (`id`, `collectionId`, `parentId`, `name`, `kind`); keys
derive from the URL placeholders, the panel prunes them on endpoint change and
the export drops empty values (same as `deleteParams` on the data table).

Request bodies are **fixed by the engine**. A backend with a different shape
adapts in its endpoint definition; there is no per-slot request mapping.

| Slot | Method intent | Subject | Body the engine sends |
|---|---|---|---|
| `list` | read | — | none |
| `createCollection` | create | — | `{ name }` |
| `renameCollection` | update | collection | `{ name }` |
| `deleteCollection` | delete | collection | none |
| `createItem` | create | target folder (or root) | `{ collectionId, parentId, name, type, kind }` — `parentId` null at root, `kind` null when the New entry has none |
| `renameItem` | update | node | `{ name }` |
| `deleteItem` | delete | node | none |
| `moveItem` | update | node | `{ collectionId, parentId }` — `parentId` null = destination root |
| `duplicateItem` | create | node | none |

Response handling: every mutation's response body is ignored. After a 2xx the
engine **re-fetches `list`** (decision: no optimistic patching in v1). A
non-2xx shows the slot's error snackbar (`snackbarErrorException` → the API
error message) and leaves the tree as it was.

**Unwired slot ⇒ hidden affordance.** The engine hides whatever a slot
powers when its `endpointId` is null:

| Unwired | Hidden |
|---|---|
| `createCollection` | header **+** button |
| `renameCollection` | collection rename (double-click / F2 / menu entry) |
| `deleteCollection` | "Delete collection" menu entry |
| `createItem` | every **New** popover and folder "New" submenu |
| `renameItem` | node rename |
| `deleteItem` | node "Delete" menu entry |
| `moveItem` | drag-and-drop **and** "Move to" |
| `duplicateItem` | "Duplicate" menu entry |

When every mutation slot is unwired the item behaves as read-only. `list`
unwired renders the empty state with a dashed "No list endpoint" note in the
studio preview only.

---

## 3. Studio config (`FileCollectionConfig`)

Deep-merge patched through `update_item`, validated against the JSON schema
below. Defaults are what `add_item` creates.

### 3.1 Schema (abridged TypeScript form)

```ts
type EndpointSlot = { endpointId: string | null; params: Record<string, string> };

type NewItemEntry = {
  id: string;               // studio-only stable identity, never exported
  label: string;            // "New folder"
  icon: string;             // IconData key, '' = none
  type: "folder" | "file";
  kind: string;             // '' = none
};

type ConfirmGroup = {
  confirmEnabled: boolean;
  confirmTitle: string;
  confirmDescription: string;   // may contain {{name}} and {{count}}
  snackbarSuccessEnabled: boolean;
  snackbarSuccessType: "success" | "error" | "info" | "warning" | "neutral";
  snackbarSuccessMessage: string;
  snackbarErrorException: boolean;
};

type FileCollectionConfig = {
  name: string;             // binding name; state slice defaults to `${name}Selected`
  title: string;            // header text; '' = no header text (buttons still render)
  collapsible: boolean;     // header shows a collapse toggle; collapsed = 48px icon rail
  readOnly: boolean;        // no menus, no drag, no rename; select + expand still work

  endpoints: {
    list: EndpointSlot & { apiPaths: string };
    createCollection: EndpointSlot;
    renameCollection: EndpointSlot;
    deleteCollection: EndpointSlot & ConfirmGroup;
    createItem: EndpointSlot;
    renameItem: EndpointSlot;
    deleteItem: EndpointSlot & ConfirmGroup;
    moveItem: EndpointSlot;
    duplicateItem: EndpointSlot;
  };

  newItems: NewItemEntry[];
  kindIcons: Record<string, string>;   // kind → IconData key

  selection: {
    stateKey: string;       // '' = `${name}Selected`
  };
  selectNavigate?: StudioNavigate;   // absent = off; played on FILE click only
};
```

All keys are `required` except `selectNavigate`, mirroring how `rowNavigate`
is optional on the data table. `additionalProperties: false` everywhere.

### 3.2 Defaults

```json
{
  "name": "fileCollection_1",
  "title": "Files",
  "collapsible": false,
  "readOnly": false,
  "endpoints": {
    "list":             { "endpointId": null, "params": {}, "apiPaths": "" },
    "createCollection": { "endpointId": null, "params": {} },
    "renameCollection": { "endpointId": null, "params": {} },
    "deleteCollection": { "endpointId": null, "params": {},
      "confirmEnabled": true, "confirmTitle": "Delete collection",
      "confirmDescription": "Delete \"{{name}}\" and its {{count}} files? This cannot be undone.",
      "snackbarSuccessEnabled": false, "snackbarSuccessType": "success",
      "snackbarSuccessMessage": "", "snackbarErrorException": true },
    "createItem":       { "endpointId": null, "params": {} },
    "renameItem":       { "endpointId": null, "params": {} },
    "deleteItem":       { "endpointId": null, "params": {},
      "confirmEnabled": true, "confirmTitle": "Delete item",
      "confirmDescription": "Delete \"{{name}}\"? This cannot be undone.",
      "snackbarSuccessEnabled": false, "snackbarSuccessType": "success",
      "snackbarSuccessMessage": "", "snackbarErrorException": true },
    "moveItem":         { "endpointId": null, "params": {} },
    "duplicateItem":    { "endpointId": null, "params": {} }
  },
  "newItems": [
    { "id": "ni-folder", "label": "New folder", "icon": "folder", "type": "folder", "kind": "" },
    { "id": "ni-file",   "label": "New file",   "icon": "file",   "type": "file",   "kind": "" }
  ],
  "kindIcons": {},
  "selection": { "stateKey": "" }
}
```

Default layout: `colSpan { xs: 4, sm: 6, md: 3, lg: 3 }`, `alignSelf: stretch`
(a sidebar-shaped cell; authors widen it as needed).

### 3.3 Icon resolution

For a node row, in order: `node.icon` → `kindIcons[node.kind]` → built-in
fallback (`folder` / `folder-open` for folders by expand state, `file` for
files). All values are `IconData` keys, the same glyph map buttons use.

### 3.4 Property panel

Sections, top to bottom: **General** (name, title, collapsible, readOnly) ·
**Data** (one endpoint picker + param map per slot; `apiPaths` under list;
confirm/snackbar fields under the two delete slots, shown only while that
slot is wired) · **New menu** (sortable cards, same card pattern as data-table
columns) · **Icons** (key/value rows for `kindIcons`) · **Selection**
(stateKey, navigate target editor shared with the data table's row navigate).

---

## 4. Export → engine `FileCollectionElement`

Export resolves stable ids to current names, drops defaults, and emits:

```ts
type FileCollectionElement = {
  type: "filecollection";
  name: string;
  title?: string;                     // omitted when ''
  collapsible?: true;                 // omitted when false
  readOnly?: true;                    // omitted when false
  api: {
    list: { endpoint: string; paths?: string[]; params?: Record<string,string> };
    createCollection?: APICall; renameCollection?: APICall; deleteCollection?: APIDelete;
    createItem?: APICall; renameItem?: APICall; deleteItem?: APIDelete;
    moveItem?: APICall; duplicateItem?: APICall;
  };
  newItems?: { label: string; icon?: string; type: "folder" | "file"; kind?: string }[];
  kindIcons?: Record<string, string>;
  selection?: { stateKey: string };   // omitted when it equals `${name}Selected`
  selectNavigate?: NavigateTarget;    // page id resolved to its key
};
```

- `APICall` = `{ endpoint, params }` (endpoint by **name**). Unwired slots are
  omitted, which is what the runtime reads as "hide the affordance".
- `APIDelete` = `APICall` + the existing engine `confirmBox` / `snackbar*`
  shape used by the data table's `apiDeleteInfo`, with `isReload` baked to
  `true` (the runtime always re-fetches).
- `apiPaths` is split on `.` into `paths`, as the data table does.
- `newItems` is omitted only when it equals the default two entries; `id` is
  never exported.
- `confirmDescription` placeholders `{{name}}` / `{{count}}` pass through
  untouched; the runtime substitutes them.

---

## 5. Runtime behaviour

### 5.1 Loading and states

| State | Render |
|---|---|
| First fetch in flight | Skeleton: one 16px×128px bar and one 12px×96px bar (a fake header), then 10 rows of a 12px square + a bar shrinking from 160px to 90px, all pulsing on the surface-strong colour. |
| Fetch failed | Centred muted text "Couldn't load files" with a text-variant **Retry** button that re-fetches. |
| Loaded, zero collections | Centred muted text "No collections yet"; when `createCollection` is wired, a text-variant **Add collection** button beneath it. |
| Collection with zero nodes | Under its header, one muted row at indent 8px: "Empty". It is still a root drop target. |
| Re-fetch after a mutation | The current tree stays rendered (no skeleton); the header shows a 14px spinner at the right until the fetch settles. Expand state and selection survive by id. |

A selected node that disappears after a re-fetch (deleted, or moved by someone
else) clears the selection slice to `null`.

### 5.2 Layout and chrome

- The item fills its grid cell; height comes from the cell and the tree body
  scrolls vertically inside it. No drag-to-resize.
- **Header**: a 40px row. Left: `title` in the heading style (small, semibold,
  muted). Right: the **+** add-collection button (28px, icon `plus`,
  tooltip "Add collection"), hidden when `createCollection` is unwired or
  `readOnly`; then, when `collapsible`, a toggle (icon `panel-left-close` /
  `panel-left-open`).
- **Collapsed** (`collapsible` only): the item becomes a 48px-wide rail
  showing only the expand toggle; the tree is hidden but keeps its state.

### 5.3 Collection header row

- 32px row, 8px horizontal padding; text small, semibold, uppercase,
  letter-spaced, muted foreground; hover fills surface-strong.
- Left: chevron (`chevron-down` open / `chevron-right` closed, 14px) then the
  name, truncated with a native tooltip.
- Click anywhere on the row toggles expand. Collections start **open**.
- Hover reveals, at the right: a **+** button (opens the New popover,
  targeting the collection root, hidden when `createItem` unwired) and a
  **…** button (menu: Rename · Delete collection). Both hidden in `readOnly`.
- Expanding/collapsing animates height over 150ms.
- The collection body is the **root drop zone** (§5.7); while a drag hovers
  it and no folder row is the target, the body gets a 5% accent fill and a
  1px accent ring.

### 5.4 Node rows

Geometry, from the Synapse implementation:

- Indent: `level * 20 + 8` px left margin (`level` 0 = collection root).
- Row: 8px horizontal padding, 6px vertical padding, 4px gap between parts,
  left corners rounded, pointer cursor. Approximate row height 32px.
- Parts left→right: a 16px chevron slot (chevron only on a folder **with
  children**; otherwise an empty 16px spacer so icons align), a 16px icon
  (folders: brand/accent colour; files: muted unless `node.icon`), the name
  (small text, truncated, native tooltip), then at the far right the hover
  **…** button (hidden until hover or focus, always visible while its menu is
  open).
- **Connector lines**: every row draws its own dotted elbow in the border
  colour: a vertical stub from the row's top to its vertical centre (16px) at
  `x = indent − 12`, a 12px horizontal tick at the centre, and, unless the
  row is the last sibling, a vertical continuation from the centre to the
  row's bottom edge. The missing continuation on the last sibling yields the
  └ terminator. Lines ignore pointer events.
- **Fills**: selected → 10% accent fill, accent text; drop-target folder →
  20% accent fill + 1px 50% accent ring (only when a *different* node is
  dragged over it); hover (otherwise) → surface-strong; dragging source →
  40% opacity.
- Rows are keyboard-focusable (`tabindex=0`, `role=treeitem`, `aria-expanded`
  on folders, `aria-selected`).

### 5.5 Expand state

- Kept **in memory, keyed by node id**, outside the fetched data, so a
  re-fetch after any mutation preserves it. Not persisted across reloads.
- Collections default open; folders default closed.
- Clicking a folder row toggles it **and** selects it (one click does both,
  as in Synapse). Clicking a file row selects it.
- Automatic expansion: creating an item expands the target folder; a "Move
  to" expands the destination folder; selecting a node (programmatically or
  by click) expands every ancestor folder so the selection is visible.

### 5.6 Selection

- Single selection across all collections. Clicking a folder or file sets
  it; clicking a collection header does not change it.
- The page state slice `selection.stateKey` (default `${name}Selected`) holds
  the selected node or `null`:

  ```json
  { "id": "i1", "collectionId": "c1", "parentId": "f1", "name": "Q1 price list",
    "type": "file", "kind": "sheet", "path": "Catalog/2026/Q1 price list" }
  ```

  `path` is the slash-joined chain of collection name and ancestor names.
  Other items bind with `{ "source": "state", "key": "<name>Selected", "path": "id" }`.
- `selectNavigate` (a `NavigateTarget`) is played on a **file** click only,
  with `row` param sources reading the selected node's fields. Folder clicks
  never navigate.
- **Creation target** derives from selection (the Synapse rule): a New entry
  invoked from a collection header's **+** targets the selected folder when
  the selection is a folder in that collection, the selected file's parent
  when it is a file in that collection, and the collection root when nothing
  in that collection is selected. A New entry from a folder's **…** menu
  always targets that folder, whatever is selected.

### 5.7 Drag-and-drop (requires `moveItem`, disabled in `readOnly`)

- Draggable: folder and file rows. Collection headers are not draggable.
- Activation: 5px pointer movement, so a plain click still selects.
- Drag overlay: a floating chip with the node's icon and name.
- Drop targets: every folder row (drop **into** it, appended last); every
  file row **forwards to its parent** (its folder, or the collection root
  when top-level) so dropping "between files" works; the collection body as
  the root zone.
- Ignored drops: no target; target in a different collection; target equals
  the node's current parent; a folder onto itself or any of its descendants.
- On a valid drop the engine calls `moveItem` with
  `{ collectionId, parentId }` and re-fetches. The dragged row stays in its
  old place until the re-fetch lands (no optimistic move). A failure shows
  the error snackbar.

### 5.8 Menus and modals

**New popover** (from a collection **+** or a folder's "New" entry): one
entry per `newItems` element, icon + label, 32px rows. Choosing an entry
opens the **name modal**: title "Add <label>", one required text field
labelled "<label> name", **Cancel** / **Add**. Add is disabled while the
trimmed value is empty; Enter submits. The target folder follows §5.6. On
success the modal closes, the target folder expands, and the new node
becomes the selection once the re-fetch returns it (matched by target +
name, newest `createdAt` wins; if it can't be found, selection is unchanged).

**Add collection modal**: title "Add collection", field "Collection name",
same rules, calls `createCollection`.

**… menu**

| Row | Entries (in order) |
|---|---|
| Collection | Rename · Delete collection (destructive tone) |
| Folder | New ▸ (`newItems` targeting this folder) · Rename · Move to · Delete (destructive) |
| File | Rename · Move to · Duplicate · Delete (destructive) |

Each entry is hidden when its slot is unwired (§2.3); the **…** button itself
is hidden when no entry remains or in `readOnly`.

**Inline rename**: triggered by double-clicking the name, pressing F2 on a
focused row, or the menu entry. The name becomes a text input pre-filled and
fully selected. Enter commits, Escape cancels, blur commits. An empty or
unchanged trimmed value cancels silently. Commit calls `renameItem` /
`renameCollection`; on failure the old name is restored and the error
snackbar shown. Duplicate names are **allowed** (Synapse allows them).

**Delete** (`deleteItem` / `deleteCollection`): when `confirmEnabled`, a
modal with `confirmTitle`, `confirmDescription` (placeholders substituted:
`{{name}}` = node/collection name, `{{count}}` = number of files beneath it),
**Cancel** / **Delete** (destructive). A **non-empty folder cannot be
deleted**: the modal body instead reads "Folder is not empty. Remove items
before deleting." and Delete is disabled. Collections *can* be deleted
non-empty (the count in the description is the warning). On success the
snackbar fires if enabled and, if the deleted node contained the selection,
the slice clears.

**Duplicate** (`duplicateItem`, files only): no modal. After the re-fetch the
copy is wherever the backend placed it; the engine does not reposition it.

**Move to** (`moveItem`): modal titled "Move <folder|file>" with two selects:
**Collection** (all collections) and **Folder** (that collection's folders,
flattened with "/"-joined paths, plus a first entry "(Collection root)").
Defaults to the node's current collection and parent. **Move** is disabled
while the destination equals the current location, or when moving a folder
into itself or a descendant (those folders are omitted from the list). On
success the destination folder expands.

### 5.9 Read-only mode

`readOnly: true` (or every mutation slot unwired) removes: the header **+**,
collection **+** and **…**, node **…**, inline rename triggers, drag handles
and drop targets. Selection, expand/collapse, `selectNavigate` and the
state slice keep working.

---

## 6. Visual spec

Structure is prescriptive; colours are **theme roles**, never literal
values, so the item honours the project theme and the Glass surface.

| Element | Spec |
|---|---|
| Header | 40px; title small/semibold/muted; buttons 28px square, icon 16px, muted → foreground on hover, surface-strong hover fill |
| Collection row | 32px; text 12px semibold uppercase tracking-wide muted; hover surface-strong |
| Node row | ≈32px; text 14px; indent 20px/level + 8px; icon 16px; chevron 14px in a 16px slot |
| Connectors | 1px dotted, border colour; trunk at `indent − 12`; tick 12px |
| Selected | accent 10% fill, accent text (dark theme: accent 20% fill, light accent text) |
| Drop target | accent 20% fill, 1px ring accent 50%; root zone accent 5% fill, ring accent 40% |
| Dragging source | opacity 0.4 |
| Reveal/focus ring | 2px inset ring accent 70% (keyboard focus uses the same) |
| … menu / popover | 4px radius, surface background, border; entries 12px text, 8px × 6px padding, 8px gap icon→label, surface-strong hover; destructive entries use the destructive tone |
| Modals | the engine's standard Modal with a title, body text 14px muted, right-aligned Cancel (text variant) + primary action |
| Skeleton | pulsing bars on surface-strong, as §5.1 |
| Icon rail (collapsed) | 48px wide, toggle centred at top |

Icons (IconData keys): `plus`, `more-horizontal`, `chevron-right`,
`chevron-down`, `folder`, `folder-open`, `file`, `copy` (Duplicate),
`folder-input` (Move to), `trash` (Delete), `panel-left-close`,
`panel-left-open`. Any key missing from IconData falls back to `file`.

Accessibility: the tree is `role=tree`; rows `role=treeitem` with
`aria-level`, `aria-expanded`, `aria-selected`; arrow keys move focus
(Up/Down between visible rows, Right expands or enters, Left collapses or
goes to parent), Enter selects (and navigates for a file), F2 renames.

---

## 7. Non-goals and later work

Deliberately excluded from v1; none changes the data model above.

- **Favorites**: a `toggleFavorite` slot and a pinned read-only "Favorites"
  group above the collections.
- **Expand persistence**: `expandPersist: local | session | none` like the
  data table's `columnPersist`.
- **Optimistic updates** instead of a re-fetch per mutation.
- **Cross-collection drag**; today that path is the Move to picker only.
- **Multi-select**, **search/filter box**, **sort options**.
- **Reveal API** (`revealTarget` from a breadcrumb) — would need an engine
  action; could be `ReloadDataTable`-style by name.
- **Import entries** and **kind-specific menu entries** (Synapse's convert /
  open-to-side) — would be custom actions on a per-kind menu config.
- **File-extension / editor semantics** — Synapse's `.md` / `.rt` / `.html`
  naming belongs to its editor, not the tree.

---

## 8. Acceptance checklist

Studio
- [ ] `list_item_types` shows `filecollection` (label "File Collection", category "Data").
- [ ] `describe_item_type` returns the schema, the defaults in §3.2 and the guide in §9.
- [ ] `add_item` creates the defaults; `update_item` deep-merges and rejects unknown keys.
- [ ] Endpoint pickers resolve by name; `params` keys follow the URL placeholders and prune on endpoint change.
- [ ] `validate_project` flags a wired slot whose URL `:param` is unmapped.
- [ ] Export matches §4: unwired slots omitted, defaults dropped, ids resolved to names, `selectNavigate` page id → key.

Runtime
- [ ] Skeleton → tree → empty/failed states render as §5.1.
- [ ] Nested `list` response, `apiPaths`, and double-encoded string responses all load.
- [ ] Collections open / folders closed by default; expand state survives a mutation re-fetch.
- [ ] Clicking a folder toggles and selects; clicking a file selects; `<name>Selected` holds the §5.6 shape; `selectNavigate` fires for files only.
- [ ] New popover → name modal → `createItem` with the §2.3 body; parent expands; new node selected.
- [ ] Inline rename via double-click / F2 / menu; Enter, Escape, blur, empty and unchanged rules; failure restores the name.
- [ ] Delete confirms with substituted placeholders; non-empty folder blocked; non-empty collection allowed.
- [ ] Duplicate (files only) and Move to (collection + folder selects, root entry, self/descendant excluded, same-location disabled).
- [ ] Drag: 5px activation, overlay chip, folder/file-forward/root targets, all ignored cases in §5.7, no optimistic move, failure snackbar.
- [ ] Every unwired slot hides exactly the affordance listed in §2.3; `readOnly` hides all of them.
- [ ] Collapsible rail at 48px when enabled.
- [ ] Theme roles only; Glass surface renders correctly; keyboard navigation and ARIA as §6.

---

## 9. Authoring guide (text for `describe_item_type`)

```
# filecollection

A tree of collections → folders → files over a `list` endpoint, with create /
rename / move / duplicate / delete through eight more endpoint slots. `name`
is its binding name; the selected node is page data `<name>Selected`
(`{ id, collectionId, parentId, name, type, kind, path }`).

- `endpoints.list` — `{ endpointId, apiPaths }`; the response is a nested
  array of `{ id, name, directories: [{ id, name, type: folder | file, kind?,
  icon?, children? }] }`.
- Mutation slots `createCollection`, `renameCollection`, `deleteCollection`,
  `createItem`, `renameItem`, `deleteItem`, `moveItem`, `duplicateItem` —
  each `{ endpointId, params: { ":param": "<node field>" } }`. Bodies are
  fixed (`{ name }`, `{ collectionId, parentId, name, type, kind }`,
  `{ collectionId, parentId }`). An unwired slot hides its menu entry or
  gesture; unwire `moveItem` to disable drag-and-drop.
- The two delete slots carry `confirm*` / `snackbar*` fields like a data
  table's delete; `{{name}}` and `{{count}}` work in the description.
- `newItems` — the New menu: `[{ id, label, icon, type, kind }]`.
- `kindIcons` — `{ "<kind>": "<IconData key>" }`; a node's own `icon` wins.
- `selectNavigate` — a navigate target played when a **file** is clicked;
  params may use `{ type: "row", key: "id" }`.
- `title`, `collapsible` (48px icon rail), `readOnly`.

{ "name": "docs", "title": "Documents",
  "endpoints": { "list": { "endpointId": "listCollections", "params": {}, "apiPaths": "data" },
                 "createItem": { "endpointId": "createDoc", "params": {} },
                 "renameItem": { "endpointId": "renameDoc", "params": { "id": "id" } },
                 "deleteItem": { "endpointId": "deleteDoc", "params": { "id": "id" },
                                 "confirmEnabled": true, "confirmTitle": "Delete",
                                 "confirmDescription": "Delete \"{{name}}\"?", "snackbarErrorException": true },
                 "moveItem": { "endpointId": "moveDoc", "params": { "id": "id" } } },
  "kindIcons": { "markdown": "file-text", "sheet": "table" },
  "selectNavigate": { "pageId": "doc-detail", "params": { "id": { "type": "row", "key": "id" } }, "replace": false } }
```

---

## 10. Amendments (grilled 2026-10-28 against the Gummy codebase)

These override the sections above where they differ.

1. **Endpoint slots are `FormListCrudRef`s** (§2.3, §3.1). Every slot is
   `{ endpointId, params: Record<":param", NavParamSource>, extra }`, the form
   list's shape, edited by the existing `CrudRefEditor`. A `row` source means a
   **node field**, picked from the fixed list `id | collectionId | parentId |
   name | kind`; `url` / `state` / `value` sources export as `extraParams`
   DataValues, so a backend scoped by a route param
   (`/api/projects/:projectId/items/:id`) is expressible. `list` has no row
   source; its `extra` map is the query, and it runs through `useReadApi`
   (held until every `:param` resolves, refetched when one changes). Mutation
   `extra` maps are hidden — bodies stay fixed. Engine refs reuse the form
   list's types: `list` = `FormListReadApiRef` (`name`, `paths`, DataValue
   `params` / `query`), mutations = `FormListMutationApiRef`, the two deletes
   = `FormListDeleteApiRef` (`confirmBox: { title, description }` + snackbars).
   The key is `name`, not `endpoint`.
2. **Icon keys are camelCase `IconData` keys** (§3.3, §6): `puls` (the plus
   glyph), `moreHorizontal`, `chevronRight`, `chevronDown`, `folder`,
   `folderOpen` (new), `file`, `fileText` (new), `copy`, `folderInput` (new),
   `trash`, `panelLeftClose`, `panelLeftOpen`.
3. **`height`** — an optional CSS length on the config (`''` = fill the cell,
   exported only when set). A tree alone in a row otherwise grows with its
   data and never scrolls.
4. **Failed non-delete mutations always show the exception snackbar**
   (`snackbarError: "$exception"`); no per-slot snackbar config outside the
   two delete slots (§2.3).
5. **Body-model warning** (§2.3): the engine passes a body only when the
   endpoint declares a `body` model, so the panel hints under
   `createCollection` / `renameCollection` / `createItem` / `renameItem` /
   `moveItem` when the picked endpoint has none, and `validate_project`
   reports it beside the unmapped-`:param` check. The seeded library ships
   the three body models.
6. **Demo** (§8): a `/collection/file-collections` family on the mock API
   (`apps/api`), the example app's **File collection** page (a wired tree
   beside a card bound to `<name>Selected`, and a read-only tree with
   `moveItem` unwired), and the same page seeded into the studio's Country
   manager by `migrateV57` (workspace v58). No `demo/` project.
7. Reference implementation: `synapse-rag/src/components/common/FileTree`
   (the copy with `InlineEditInput` and `MoveItemModal`).
