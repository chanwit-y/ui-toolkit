# Page data: loads, bindings, loading modes

A **load** fetches an endpoint once for a page (`upsert_load` with `page`) or
for the whole app (no `page`: a global load, fetched once, kept across
pages, unable to read URL params). Its data becomes a **state slice** named
by the load's `key`.

- **Request**: `params` fills the endpoint URL's `:params`, `extra` the query
  / body — each a `NavParamSource`: `{ type: "url", key: "id", source: "param" }`
  (the page route's `:id`), `{ type: "value", value }`, or
  `{ type: "state", key: "<other load>", path }`.
- **Chaining** is implicit: a load reading another load's slice waits
  ("held") until that value exists, and refetches when it changes. A load
  missing a URL `:param` is held forever — `upsert_load` warns.
- `paths` drills the response (`data`); `errorMessage` shows a snackbar.
- **Loading mode** (`loading`): `skeleton` — every component bound to the
  slice draws a placeholder in its own shape until the data lands; `cycle` —
  the page spinner; `none` — silent.

**Reading a slice** (write the load's key, the MCP stores its id):

- display bindings — `{ source: "state", key: "book", path: "title" }` on a
  typography / text / avatar / card / html;
- a table's `rowsBinding`, a select's `optionsBinding`, a repeater's
  `source: "state"` + `stateBinding`;
- a form field's prefill — `initialValue`;
- a request source — `{ type: "state", key: "book", path: "_id" }`;
- **Show when** — `dataWhen: { loadId: "book", test: "loaded" | "loading" |
  "failed" | "compare", path, op, value }`.
- `path: "$status"` reads the load's status (`idle | held | loading |
  success | error`) — for a status line.

The sign-in's profile (see `concepts/sign-in`) is a read-only slice too
(`me` by default). A button's `ReloadDataTable` with `reloadTableItemId`
= a load key refetches it.
