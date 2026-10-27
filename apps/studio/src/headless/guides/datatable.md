# datatable

A table over an endpoint (`endpointId` + `apiPaths`, the dot path to the row
array) or over page data (`rowsBinding: { source: "state", key: "<load>", path }`,
in-memory only). `name` is its binding name — buttons reload it by that name
and the edit modal's form sees the selected row under it.

**Columns** — `columns: DataTableColumnConfig[]`, each with a unique `id`, an
`accessor` (row field) and a `header`; then `enableSorting`, `align`,
`format` (how the cell shows its value: `{ type: "" | number | currency |
percent | date | datetime | boolean | text, decimals, grouping, currency (an
ISO code), percentOf: "1" | "100", pattern (dayjs tokens) / timeZone (dates),
trueLabel / falseLabel }` — rendered with `Intl` in the project's locale
(`update_shell` `locale`); numeric formats align to the end unless `align`
says otherwise, sorting keeps the raw value, the search box matches the
formatted text too), `pin` (`"" | left | right`), `html` (a
`{{field}}` template, escaped and sanitised), `lines` (clamp), `size` /
`minSize` / `maxSize`, `rowHeader`, `mergeRows`, `mergeColumns`, `group`.
`update_item` replaces the whole `columns` array — send every column.

**Edit / add / delete**:
- `canEdit` opens child canvas **0** (the edit modal) with the row as
  context; `canAdd` + `addButton` opens the same modal with an empty context.
  Put the form there: a `hidden` `_id` field, the inputs (`name` = row field),
  and two buttons told apart by `showWhen`: `"adding"` (POST create) and
  `"editing"` (PATCH update), each ending with `CloseModal` and reloading the
  table.
- `canDelete` + `deleteEndpointId` + `deleteParams` (`{ ":param": "<row field>" }`,
  e.g. `{ "id": "_id" }`) + the confirm / snackbar fields.
- `rowNavigate: { pageId, params: { id: { type: "row", key: "_id" } }, replace: false }`
  makes a row click open a detail page.

**Server features**: `pagination` (`enabled`, `placement: auto | query | body`,
`offsetKey`, `limitKey`, `searchKey`, `totalPath`, sizes), `sort` (`enabled`,
`sortKey`, `orderKey`, values, default), and filters — `filtersEnabled` makes
child canvas **1** the table's own filter form (Apply / Clear), and
`requestMapping` rows send its fields: `{ id: "rm-name", slot: "query", key: "name", source: { type: "filter", key: "name", fallback: "" } }`
(a row's `source` may also be any `NavParamSource`, e.g. a URL `:param`).
`canSearchAllColumns` toggles the search box (server paging also needs
`pagination.searchKey`).
`actionSize` (`"" | "1" | "2" | "3"` — 24 / 32 / 40px, `""` = default 32px)
sizes the row's Edit / Delete buttons and their glyphs; the ACTION column
widens to fit.
