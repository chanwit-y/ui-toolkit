# formlist

A repeating form over CRUD endpoints: one row form per record (its **row
template** is child canvas 0 — fields only), each row with Save (while
dirty) and Remove, plus an Add button for draft rows.

- `read` (a CRUD ref `{ endpointId, params, extra }`) + `readPaths` — the rows;
  `create` / `update` / `delete` refs — `params` map URL `:params` to sources,
  a `{ type: "row", key }` reading the row's own field; `idKey` tells a saved
  row from a draft.
- `canCreate` / `canUpdate` / `canDelete` — no create ⇒ no Add, no delete ⇒ no
  Remove, no update ⇒ saved rows are read-only.
- Chrome: `addLabel`, `addIcon`, `addPosition` (`top | bottom`), `addAlign`,
  `addDisplay` (`both | icon | label`), `saveLabel`, `removeLabel`,
  `removeIcon`, `removePosition` (`start | end | below`), `removeDisplay`,
  `emptyText`, and the delete confirm (`deleteConfirmEnabled`, title,
  description).
- Every mutation refetches; `name` registers the list for `ReloadDataTable`.
