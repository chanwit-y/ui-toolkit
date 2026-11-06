# filecollection

A tree of collections → folders → files over a `list` endpoint, with create /
rename / move / duplicate / delete / upload through nine more endpoint slots
(see `spec/gummy-file-collection-spec.md`). `name` is its binding name; the
selected node is page data `<name>Selected` = `{ id, collectionId, parentId,
name, type, kind, path }` (bind with `source: "state"`, key = that slice).
`loading: "none"` leaves the body empty during the first list fetch instead of
the skeleton rows; `skeletonDelay` (ms, 0–10000) keeps the skeleton at least
that long once it has appeared.

- `endpoints.list` — a CRUD ref `{ endpointId, params, extra }` + `apiPaths`
  (dot path to the collections array, `''` = the response itself). The
  response is a nested array of `{ id, name, directories: [{ id, name,
  type: "folder" | "file", kind?, icon?, children? }] }`; a string body is
  parsed.
- Mutation slots `createCollection`, `renameCollection`, `deleteCollection`,
  `createItem`, `renameItem`, `deleteItem`, `moveItem`, `duplicateItem` —
  each `{ endpointId, params }`; a `:param` source `{ type: "row", key }`
  reads a **node field** (`id | collectionId | parentId | name | kind`), the
  other sources the route / page data / a literal. Bodies are fixed by the
  engine (`{ name }`, `{ collectionId, parentId, name, type, kind }`,
  `{ collectionId, parentId }`), so give those endpoints a body model. An
  unwired slot (`endpointId: null`) hides its menu entry or gesture; unwire
  `moveItem` to disable drag-and-drop.
- `endpoints.uploadItem` — the upload slot (spec §11): while wired, files
  dropped from the desktop onto a folder (or a file: its parent) / a
  collection header or body are uploaded there, and every New menu ends with
  an "Upload files…" entry opening the file picker. One **multipart** request
  per file — `file`, `collectionId`, `parentId` (omitted at the root),
  `name`, `kind` (the engine's preset: image / pdf / document / spreadsheet /
  presentation / text / archive / audio / video / other; the backend maps or
  ignores it) — three at a time, one re-fetch when the batch settles, the
  last uploaded file selected, ghost rows meanwhile. The endpoint must
  declare a body model (any shape, e.g. `fileUploadBody`), or the engine can't
  place the body. Besides `{ endpointId, params }`: `acceptPresets` (the
  upload presets) + `accept` (extra tokens, comma list), `maxSizeMB`,
  `maxFiles` (per drop; blank = the server decides — skipped files are named
  in one snackbar, the rest still land), `label` / `icon` for the menu entry.
  Unwired or `readOnly` ⇒ no drop handling, no entry. OS folders are skipped,
  not walked.
- The two delete slots carry `confirmEnabled` / `confirmTitle` /
  `confirmDescription` (`{{name}}` and `{{count}}` work) and the snackbar
  fields like a data table's delete.
- `newItems` — the New menu: `[{ id, label, icon, type, kind }]`.
- `kindIcons` — `{ "<kind>": "<IconData key>" }`; a node's own `icon` wins.
- `selection.stateKey` (`''` = `<name>Selected`); `selectNavigate` — a
  navigate target played when a **file** is clicked, params may use
  `{ type: "row", key: "id" }`.
- `title`, `collapsible` (48px icon rail), `readOnly`, `height` (CSS, `''` =
  fill the cell), `showMenu: false` hides the … button on rows and
  collection headers (Remove, the header +, rename by double-click / F2 and
  drag stay).

```json
{ "name": "docs", "title": "Documents",
  "endpoints": {
    "list": { "endpointId": "fileCollections", "params": {}, "extra": {}, "apiPaths": "data" },
    "createItem": { "endpointId": "createFileItem", "params": {}, "extra": {} },
    "renameItem": { "endpointId": "renameFileItem", "params": { "id": { "type": "row", "key": "id" } }, "extra": {} },
    "deleteItem": { "endpointId": "deleteFileItem", "params": { "id": { "type": "row", "key": "id" } }, "extra": {},
                    "confirmEnabled": true, "confirmTitle": "Delete", "confirmDescription": "Delete \"{{name}}\"?" },
    "moveItem": { "endpointId": "moveFileItem", "params": { "id": { "type": "row", "key": "id" } }, "extra": {} },
    "uploadItem": { "endpointId": "uploadFileItem", "params": {}, "extra": {}, "acceptPresets": ["image", "pdf"], "accept": "", "maxSizeMB": 10, "maxFiles": 5, "label": "", "icon": "" } },
  "kindIcons": { "markdown": "fileText", "sheet": "table" },
  "selectNavigate": { "pageId": "docDetail", "params": { "id": { "type": "row", "key": "id" } }, "replace": false } }
```
