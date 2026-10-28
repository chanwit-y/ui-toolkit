# DataTable: AG Grid features — design (grilled 2026-10-27)

Bring the AG Grid feature set to Gummy's `datatable`, **config-driven on the
existing TanStack table** (not AG Grid as the engine: Community would add a
second table runtime fighting Radix / glass theming, and the demo's headline
features — pivot, charts, range selection, tool panels, master/detail, Excel —
are Enterprise, licensed per developer). Catalogue source: ag-grid.com docs
index + the Performance / Finance / HR / Inventory demo sources.

## Scope (this round, in delivery order)

1. Cell formats · 2. Column state (chooser, reorder, hide, persistence) ·
3. Row selection · 4. Conditional styling · 5. Row grouping + aggregation ·
6. CSV export · 7. Scroll mode + virtualised rows.

Deferred: tree data, master/detail, inline cell editing + undo/redo, row
dragging, sparklines, integrated charts, pivot, range selection, Excel / PDF,
floating filters, advanced filter builder, server-side grouping.

## Decisions

### 1. Cell formats — `ColumnDef.format`

```ts
format?:
  | { type: "number";   decimals?: number; grouping?: boolean }
  | { type: "currency"; currency: string; decimals?: number }
  | { type: "percent";  decimals?: number; of?: 1 | 100 }
  | { type: "date";     pattern?: string; timeZone?: string }   // dayjs tokens, else Intl medium
  | { type: "datetime"; pattern?: string; timeZone?: string }
  | { type: "boolean";  trueLabel?: string; falseLabel?: string }
  | { type: "text" }
```

- One pure `formatCell(value, format, locale)` in `util/format.ts` (tested),
  used by both tables, `{{value}}` in HTML templates, the CSV export, group /
  total rows. Null / non-numeric → empty, never `NaN`.
- Locale: `GummyProject.locale` + `GummyApp locale` prop → a `LocaleProvider`
  inside the theme provider; default the browser's. `timeZone` stays on the
  format (the Book shop wants Asia/Bangkok whatever the viewer's zone).
- Numeric types default `align: "end"`. `useDateFormat` stays as an alias of
  `{ type: "date", pattern }`.
- Sort / filter on the raw value; the search box matches raw **and** formatted.
- Column-level now; model-level formats later if it proves repetitive.
- Studio: a Format select + sub-fields replacing the free-text Date format.

### 2. Column state

- Config: `ColumnDef.hide` (starts hidden, still in the chooser),
  `ColumnDef.lockVisible` (row header, ACTION), plus the existing `pin` / `size`.
- A **Columns** button beside Filter (`canChooseColumns` default true,
  `columnsButton { label, icon, variant }`): popover with a checkbox per
  column, dnd-kit sortable handles, **Reset** to config. Header drag reorders.
- One state object `{ order, visibility, sizing, pinning, grouping }` behind
  resize, pin, chooser and the group picker. `columnState?: { persist:
  "session" | "local" | "none"; key? }`, default `local` under
  `gummy.table.<project>.<page>.<name>`; reconciled against the config (dropped
  columns forgotten, new ones at their config position).
- Studio: Hide / Lock visible in the column "More", chooser toggle +
  persistence select in the table Props.

### 3. Row selection — a global-state slice

```ts
selection?: {
  mode: "single" | "multi";
  idKey?: string;                      // "_id", then "id"
  stateKey?: string;                   // `${name}Selected`
  headerCheckbox?: "page" | "all" | "none";   // multi, default page
  keepAcrossPages?: boolean;           // default true, by idKey
}
```

- Checkbox column first, pinned with ACTION; the checkbox toggles, the row
  click keeps `rowNavigate`.
- Slice `{ ids, rows }` (precedent: the profile elements write slices from a
  component). Bulk actions are ordinary buttons: `body: { type: "state", key,
  path: "ids" }`, enabled by a `dataWhen` on `ids.length`; `ReloadDataTable`
  clears the selection. No new DataValue type.
- Studio: Selection section; the slice listed under Page data as a read-only
  pseudo-load (like the sign-in profile) so bindings / conditions pick it.

### 4. Conditional styling — tones, not CSS

```ts
type StyleRule = {
  when: CondExpression;   // { key: "value" } | { key: "row", path } | { key: "index" }
  tone?: AccentColor; fill?: boolean;     // text --tone-11, fill adds --tone-3
  weight?: "bold"; italic?: boolean; strike?: boolean;
  class?: string;         // additive, consumer CSS
};
ColumnDef.cellStyles?: StyleRule[];        // first matching tone wins, classes accumulate
DataTableElement.rowStyles?: StyleRule[];  // sees { row, index }
```

- Radix scales so rules hold in light / dark / flat / glass; no raw `style`
  (`html` columns cover the fully custom cell). Pinned / row-header / merged
  cells take the text tone only (their surface stays).
- Studio: rule lists reusing the compare editor (`DataCondition`) + swatch.

### 5. Grouping + aggregation — client-side, single group column

```ts
grouping?: { by: string[]; expanded?: number | "all"; userCanGroup?: boolean;
             showCount?: boolean; totalRow?: "none" | "top" | "bottom" };
ColumnDef.aggregate?: "sum" | "avg" | "min" | "max" | "count";
```

- TanStack grouped + expanded row models (before pagination, so groups page
  as rows). Group row: chevron + label (+ count) in the first visible column,
  aggregates in their columns via `formatCell`, row-header tint; total row the
  same over every filtered leaf.
- `userCanGroup`: a "Group by" list in the Columns popover, part of the
  persisted column state. No drag-to-group panel.
- Ignored with a warning under `api.pagination` / `api.sort` (the `items` +
  pagination rule). While grouped: merges skipped, search keeps groups with
  surviving leaves, sort within groups.

### 6. CSV export

```ts
canExport?: boolean; exportButton?: { label, icon, variant };
exportOptions?: { fileName?; columns?: "visible" | "all";
                  values?: "formatted" | "raw"; rows?: "all" | "page" };
```

- The view as seen: after search / filter / sort, leaf rows only, visible
  columns in order, header labels first; ACTION / selection never; HTML
  columns export the rendered text. UTF-8 BOM + CRLF, RFC quoting;
  `toCsv` in `util/csv.ts` (tested). Server mode: the loaded page (tooltip
  says so); a full export is a later `exportOptions.api`.
- Button action `ExportTable` (by table name, like `ReloadDataTable`).
- Excel out: needs a workbook library; CSV opens in Excel.

### 7. Scroll mode + virtualisation

- `paging?: "pages" | "scroll"` (default pages). Scroll: no pager, all rows,
  footer count; client-side only (server "load more" is a later round).
- `@tanstack/react-virtual` once the rendered set passes ~60 rows in **either**
  mode: spacer `<tr>`s keep the sticky header / `border-separate` / pinned
  cells, measured row heights (line clamp). Below the threshold nothing changes.
  Columns not virtualised. Page sizes gain 100 / 200 / 500.
- `mergeRows` / `mergeColumns` switch the virtualiser off for that table.

### 8. Editable table

Takes `format` (display mode), `cellStyles`, column state, virtualisation.
Not selection, `rowStyles`, grouping, export.

### 9. Delivery

One PR per feature in the order above, each with: engine + builder + types +
`bun:test`, studio panel + export + workspace migration, MCP schemas
regenerated + guide (drift test), an example-app page (`/formats`,
`/column-state`, `/row-selection`, `/cell-styles`, `/grouping`, `/export`,
`/scroll`), a studio seeded page via `appendDemoPages`, a CLAUDE.md bullet.
Then one PR updating the Book shop (Orders: `price` + `format` over
`priceText`, selection + a "Mark shipped" bulk button; Customers grouped by
city) and the Glass showcase Tables page.

## As built — PR 1, cell formats (2026-10-27)

- `CellFormat` lives in `packages/ui/src/util/format.ts` beside the pure
  `formatCell`; the column key is `format` on both tables and `useDateFormat`
  stays as the date alias, so no config changes.
- The locale is `GummyProject.locale` / `GummyApp locale` through a
  `LocaleProvider` (`core/locale.tsx`) **inside** the theme provider; the
  studio authors it as `ShellSettings.locale` (Menu tab → Layout) because the
  shell already has an MCP tool and a schema root.
- The datatable formats inline in `renderCellWithHighlight` rather than
  through a cell component, so the search highlight lands on the formatted
  text; the search box matches raw **and** formatted text through a custom
  `globalFilterFn` that reads the column meta off a table ref.
- Column ids are accessors, so a demo cannot show one field under four
  formats in one table; the mock API grew `created_at` / `joined_at` and the
  figure fields instead.
- The studio config is flat (`ColumnFormatConfig`, every knob a field) and
  **replaces** `useDateFormat` (workspace v56, `migrateV55`); the branch is
  stacked on `feature/glass-dark-backdrop` (v55) because both bump the
  workspace version and regenerate `demo/gummy`.
- Intl output differs by ICU version (`"Jan 15, 2025, 5:30 PM"` vs `"… at
  5:30 PM"`, narrow spaces in currency) — tests compare on plain spaces and
  accept either separator.

## As built — PRs 2–7 (2026-10-27)

Built together on `feature/datatable-cell-formats` (one engine commit, one
studio + demo commit) rather than six PRs, because the user asked for a demo
and a preview video of all of them at once.

- **Columns menu** is a library `Popover` with dnd-kit rows (drag, or Space /
  arrows / Space). Header drag-to-reorder was **not** built — the menu covers
  it. The storage key is `gummy.table.<page key>.<name>` (no project key: the
  storage is per origin, which is per app). Only a layout that differs from
  the config is stored; `persist: "none"` follows config changes live.
- **Selection** clears its slice on unmount; `ReloadDataTable` on the table
  clears the picks. Group rows can't be selected.
- **Style rules** paint through `data-accent-color` on the cell (Radix
  re-scopes `--accent-*`), so a tone is two CSS rules, not a class per colour.
  A condition ref without a `path` now reads the value itself (it was always
  `undefined`), which `{ key: "value" }` needed.
- **Grouping** draws its own group rows. TanStack's `getLeafRows()` includes
  the nested group rows, so every summary filters to records — found when a
  status group said 25 orders and its count said 19.
- **Export** registers `export:<name>` in `fnCtxs`; the `ExportTable` action
  reads it. Excel stays out.
- **Virtualisation** uses `scrollMargin` = the header height and spacer rows;
  it is off whenever a visible column merges cells.
- **Editable table**: `format` and `cellStyles` only. The Columns menu and
  virtualisation were not added there (its page sizes stop at 50, so the
  virtualiser would never engage).
- **Studio**: every new key is optional (absent = the engine default), so
  only a seed migration was needed (v57). A table's selection is listed as
  page data through a pseudo-load whose id is the slice key.
- **Not done** from §9's last step: the Book shop itself still uses its
  `priceText` columns; the new **Data grid showcase** project shows the
  features over the same API instead.
