import type { Bin, Container, DataTableColumnDef } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Data table demo page (`/data-table`): column pinning, HTML columns and the line clamp (below). The first table is placed in
 * a half-width cell on purpose so it overflows sideways on every screen:
 *
 * - `pin: "left"` on Code and `pin: "right"` on Updated By keep those columns
 *   in view while the middle scrolls; the ACTION column is pinned left by the
 *   table itself whenever edit / delete is on.
 * - Every other header carries a pin toggle that pins / unpins that column on
 *   the left for the session (the config is only the starting point).
 *
 * The table's header sticks to the top of the same scroller, so a tall page
 * keeps its column titles too.
 */
const columns: DataTableColumnDef[] = [
  { accessor: "code", header: "Code", align: "start", enableSorting: true, enableColumnFilter: false, pin: "left" },
  { accessor: "name", header: "Name", align: "start", enableSorting: true, enableColumnFilter: false },
  { accessor: "_id", header: "Id", align: "center", enableSorting: false, enableColumnFilter: false },
  {
    accessor: "updated_at",
    header: "Update Date",
    align: "start",
    useDateFormat: "DD/MM/YYYY HH:mm",
    enableSorting: true,
    enableColumnFilter: false,
  },
  { accessor: "updated_by_name", header: "Updated By", align: "start", enableSorting: false, enableColumnFilter: true, pin: "right" },
];

const pinnedTableApi = {
  name: "countries",
  paths: ["data"],
  body: {
    collectionId: { type: "value", key: "collectionId", value: "691e9963992636eb1560eadb" },
    offset: { type: "value", key: "offset", value: 0 },
    limit: { type: "value", key: "limit", value: 100 },
  },
};

const pinnedTable: Bin = {
  sm: "12", md: "8", lg: "7", xl: "6",
  type: "datatable",
  justifySelf: "stretch",
  alignSelf: "start",
  element: {
    name: "dtPinned",
    title: "Countries — pinned columns",
    columns,
    canEdit: true,
    canDelete: true,
    api: pinnedTableApi,
  } as Bin["element"],
};

/**
 * HTML columns (`html` on a column): the cell is drawn from a template whose
 * `{{path}}` placeholders read the row (values are escaped, the result is
 * sanitised). `{{value}}` is the column's own value after `useDateFormat`.
 * The `dt-*` classes ship with the library and follow the theme; a same-origin
 * `<a href>` navigates in-app, `target="_blank"` opens a new tab.
 */
const htmlColumns: DataTableColumnDef[] = [
  {
    accessor: "name",
    header: "Country",
    align: "start",
    enableSorting: true,
    enableColumnFilter: false,
    html: '<div class="dt-strong"><a href="/country/{{_id}}">{{name}}</a></div><div class="dt-muted">id {{_id}}</div>',
  },
  {
    accessor: "code",
    header: "Code",
    align: "center",
    enableSorting: true,
    enableColumnFilter: false,
    html: '<span class="dt-badge">{{code}}</span>',
  },
  {
    accessor: "updated_at",
    header: "Updated",
    align: "start",
    useDateFormat: "DD/MM/YYYY HH:mm",
    enableSorting: true,
    enableColumnFilter: false,
    html: '{{value}} <span class="dt-muted">by {{updated_by_name}}</span>',
  },
  {
    // Column ids are the accessors, so a second cell over the same row uses
    // another field as its accessor — the template reads what it wants.
    accessor: "_id",
    header: "Look up",
    align: "start",
    enableSorting: false,
    enableColumnFilter: false,
    html: '<a href="https://en.wikipedia.org/wiki/{{name}}" target="_blank">Wikipedia ↗</a>',
  },
];

const htmlTable: Bin = {
  sm: "12", md: "12", lg: "12", xl: "12",
  type: "datatable",
  justifySelf: "stretch",
  alignSelf: "start",
  element: {
    name: "dtHtml",
    title: "Countries — HTML columns",
    columns: htmlColumns,
    api: pinnedTableApi,
  } as Bin["element"],
};

/**
 * Line clamp: a plain cell shows `cellLines` lines (default 2) and, when cut,
 * its whole text in a tooltip on hover. Regions carry a paragraph in `about`:
 * the first table keeps the default and clamps Description to one line via
 * `ColumnDef.lines`; the second turns the clamp off (`cellLines: 0`) so the
 * rows grow with the text instead.
 */
const regionColumns = (aboutLines?: number): DataTableColumnDef[] => [
  { accessor: "name", header: "Region", align: "start", enableSorting: true, enableColumnFilter: false, size: 160 },
  { accessor: "description", header: "Description", align: "start", enableSorting: false, enableColumnFilter: false, lines: 1, size: 220 },
  { accessor: "about", header: "About", align: "start", enableSorting: false, enableColumnFilter: false, size: 480, ...(aboutLines !== undefined ? { lines: aboutLines } : {}) },
];

const regionTable = (name: string, title: string, element: Record<string, unknown>): Bin => ({
  sm: "12", md: "12", lg: "6", xl: "6",
  type: "datatable",
  justifySelf: "stretch",
  alignSelf: "start",
  element: { name, title, canSearch: false, api: { name: "regions", paths: ["data"] }, ...element } as Bin["element"],
});

const clampedTable = regionTable("dtClamped", "Regions — 2 lines (default)", { columns: regionColumns() });
const unclampedTable = regionTable("dtUnclamped", "Regions — no clamp", { columns: regionColumns(), cellLines: 0 });

export const containerDataTableDemo: Container[] = [
  {
    id: "1",
    name: "DataTableDemo",
    isArray: false,
    bins: [
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: { text: "Data table", variant: "h3" },
      },
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: 'Column pinning: Code is pin: "left", Updated By is pin: "right", and the action column is pinned by the table. Scroll the table sideways; use the pin icon in any header to pin or unpin it for this session.',
        },
      },
      pinnedTable,
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "HTML columns: each cell below is an html template on the column — {{field}} placeholders read the row (escaped, then sanitised). The country name links to its detail page in-app, the code is a dt-badge, Updated combines {{value}} (the formatted date) with another field, and Look up opens a new tab.",
        },
      },
      htmlTable,
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "Line clamp: a plain cell shows at most cellLines lines — 2 by default — and a cut cell shows its whole text in a tooltip on hover. Left: the default, with Description cut to one line by lines: 1 on the column. Right: cellLines: 0 turns the clamp off, so the rows grow with the About paragraph. HTML columns and the action column never clamp.",
        },
      },
      clampedTable,
      unclampedTable,
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "6",
  },
];
