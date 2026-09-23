import type { Bin, Container, DataTableColumnDef } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Column resize demo page (`/column-resize`). Both data tables let the user
 * drag a header's right edge to resize that column — on by default, nothing to
 * configure. The handle is invisible at rest (a line appears on hover),
 * double-click resets the column, and it is keyboard-focusable: ← → resize by
 * 10px (50px with Shift), Enter resets. Widths last for the session, like the
 * pin toggle.
 *
 * - **Default** — no config at all. The columns share the container as they
 *   always did; the first drag freezes the widths on screen and from then on
 *   every column is its exact pixel size, a filler cell taking the slack.
 * - **Configured** — `size` / `minSize` / `maxSize` (px) per column and
 *   `enableResizing: false` to lock one. Declaring a `size` anywhere starts the
 *   table in exact-pixel mode. Pinned columns keep their sticky offsets while a
 *   column before them is resized.
 * - **Editable table** — the same handles on `datatableeditable`.
 * - **Off** — `canResizeColumns: false` removes the handles from a table.
 */
const section = (text: string, caption: string): Bin[] => [
  {
    sm: "12", md: "12", lg: "12", xl: "12",
    type: "typography",
    element: { text, variant: "subtitle1", weight: "medium" },
  },
  {
    sm: "12", md: "12", lg: "12", xl: "12",
    type: "typography",
    element: { text: caption, variant: "body2", color: "gray" },
  },
];

const countriesApi = {
  name: "countries",
  paths: ["data"],
  body: {
    collectionId: { type: "value", key: "collectionId", value: "691e9963992636eb1560eadb" },
    offset: { type: "value", key: "offset", value: 0 },
    limit: { type: "value", key: "limit", value: 100 },
  },
};

const column = (
  accessor: string,
  header: string,
  extra: Partial<DataTableColumnDef> = {},
): DataTableColumnDef => ({
  accessor,
  header,
  align: "start",
  enableSorting: true,
  enableColumnFilter: false,
  ...extra,
});

const plainColumns: DataTableColumnDef[] = [
  column("code", "Code"),
  column("name", "Name"),
  column("updated_at", "Update Date", { useDateFormat: "DD/MM/YYYY HH:mm" }),
  column("updated_by_name", "Updated By", { enableSorting: false, enableColumnFilter: true }),
];

const configuredColumns: DataTableColumnDef[] = [
  // Pinned left and narrow; can't go below 60 or above 160.
  column("code", "Code", { pin: "left", size: 90, minSize: 60, maxSize: 160 }),
  column("name", "Name (min 120)", { size: 260, minSize: 120 }),
  // Locked: no handle on this header.
  column("_id", "Id (locked)", { size: 100, align: "center", enableSorting: false, enableResizing: false }),
  column("updated_at", "Update Date", { size: 220, useDateFormat: "DD/MM/YYYY HH:mm" }),
  column("updated_by_name", "Updated By", { pin: "right", size: 160, enableSorting: false }),
];

const table = (span: Pick<Bin, "sm" | "md" | "lg" | "xl">, element: Record<string, unknown>): Bin => ({
  ...span,
  type: "datatable",
  justifySelf: "stretch",
  alignSelf: "start",
  element: element as Bin["element"],
});

const FULL = { sm: "12", md: "12", lg: "12", xl: "12" } as const;

const editableTable: Bin = {
  ...FULL,
  type: "datatableeditable",
  justifySelf: "stretch",
  alignSelf: "start",
  element: {
    name: "dtResizeEditable",
    title: "Countries — editable, resizable",
    idKey: "_id",
    columns: [
      { accessorKey: "code", header: "Code", enableSorting: true, align: "start", size: 120, minSize: 80, isRequired: true },
      { accessorKey: "name", header: "Name", enableSorting: true, align: "start", size: 280, isRequired: true },
      { accessorKey: "updated_by_name", header: "Updated By", enableSorting: true, align: "start", size: 200, editable: false },
    ],
    apiCrud: {
      read: {
        name: "countries",
        paths: ["data"],
        query: { collectionId: "691e9963992636eb1560eadb", offset: 0, limit: 100 },
      },
      update: {
        name: "updateCountry",
        params: { id: "_id" },
        snackbarSuccess: { type: "success", message: "Country updated successfully" },
        snackbarError: "$exception",
      },
    },
  } as unknown as Bin["element"],
};

export const containerColumnResizeDemo: Container[] = [
  {
    id: "1",
    name: "ColumnResizeDemo",
    isArray: false,
    bins: [
      {
        ...FULL,
        type: "typography",
        element: { text: "Column resize", variant: "h3" },
      },
      {
        ...FULL,
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "Drag the right edge of a column header to resize it; double-click the edge to reset. The grip is keyboard-focusable too: Tab to it, ← → resize by 10px (Shift for 50px), Enter resets. Widths last for the session.",
        },
      },
      ...section(
        "Default",
        "No config. Until the first drag the columns share the container as always; the drag freezes the widths on screen, then each column is its exact pixel size and a filler cell takes the spare width.",
      ),
      table(FULL, { name: "dtResizeDefault", title: "Countries — default", columns: plainColumns, api: countriesApi, canSearch: false }),
      ...section(
        "Configured widths, limits, a locked column and pins",
        'size / minSize / maxSize per column (px); enableResizing: false locks Id. Code is pinned left (60–160px) and Updated By right — resize Code or Name and the sticky offsets follow. The cell is narrower than the columns, so the table scrolls sideways.',
      ),
      table(
        { sm: "12", md: "10", lg: "8", xl: "7" },
        { name: "dtResizeConfigured", title: "Countries — configured", columns: configuredColumns, canEdit: true, api: countriesApi, canSearch: false },
      ),
      ...section(
        "Editable table",
        "datatableeditable gets the same handles and the same size / minSize / maxSize / enableResizing column keys.",
      ),
      editableTable,
      ...section(
        "Resizing off",
        "canResizeColumns: false on the table removes every handle.",
      ),
      table(FULL, {
        name: "dtResizeOff",
        title: "Countries — fixed columns",
        columns: plainColumns,
        api: countriesApi,
        canSearch: false,
        canResizeColumns: false,
      }),
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "6",
  },
];
