# filecollection

A tree of collections → folders → files over a `list` endpoint, with create /
rename / move / duplicate / delete through eight more endpoint slots (see
`spec/gummy-file-collection-spec.md`). `name` is its binding name; the
selected node is page data `<name>Selected` = `{ id, collectionId, parentId,
name, type, kind, path }` (bind with `source: "state"`, key = that slice).

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
- The two delete slots carry `confirmEnabled` / `confirmTitle` /
  `confirmDescription` (`{{name}}` and `{{count}}` work) and the snackbar
  fields like a data table's delete.
- `newItems` — the New menu: `[{ id, label, icon, type, kind }]`.
- `kindIcons` — `{ "<kind>": "<IconData key>" }`; a node's own `icon` wins.
- `selection.stateKey` (`''` = `<name>Selected`); `selectNavigate` — a
  navigate target played when a **file** is clicked, params may use
  `{ type: "row", key: "id" }`.
- `title`, `collapsible` (48px icon rail), `readOnly`, `height` (CSS, `''` =
  fill the cell).

```json
{ "name": "docs", "title": "Documents",
  "endpoints": {
    "list": { "endpointId": "fileCollections", "params": {}, "extra": {}, "apiPaths": "data" },
    "createItem": { "endpointId": "createFileItem", "params": {}, "extra": {} },
    "renameItem": { "endpointId": "renameFileItem", "params": { "id": { "type": "row", "key": "id" } }, "extra": {} },
    "deleteItem": { "endpointId": "deleteFileItem", "params": { "id": { "type": "row", "key": "id" } }, "extra": {},
                    "confirmEnabled": true, "confirmTitle": "Delete", "confirmDescription": "Delete \"{{name}}\"?" },
    "moveItem": { "endpointId": "moveFileItem", "params": { "id": { "type": "row", "key": "id" } }, "extra": {} } },
  "kindIcons": { "markdown": "fileText", "sheet": "table" },
  "selectNavigate": { "pageId": "docDetail", "params": { "id": { "type": "row", "key": "id" } }, "replace": false } }
```
