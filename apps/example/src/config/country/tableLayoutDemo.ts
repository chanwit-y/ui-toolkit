import type { Bin, Container, DataTableColumnDef } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Table layout demo page (`/table-layout`): the header / cell layout keys on
 * a column.
 *
 * - `rowHeader: true` — the row's label column: its cells are `<th scope="row">`
 *   in a soft accent tint, and the column is pinned left (after the action
 *   column). One per table.
 * - `group: "…"` — adjacent columns with the same label share one header cell
 *   spanning them, in a header row above the column headers; a column without
 *   a group spans both rows. One level.
 * - `mergeRows: true` — consecutive rows with the same value share one cell
 *   (`rowSpan`); sort by that column to keep the runs together.
 * - `mergeColumns: true` — adjacent columns that both set it and hold the same
 *   value in a row share one cell (`colSpan`).
 *
 * The rows come from `GET /collection/region-countries` — one country per row
 * with its region (so the region repeats) and its creator / last editor
 * (equal on most rows). The editable table takes `rowHeader` and `group`.
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

const column = (accessor: string, header: string, extra: Partial<DataTableColumnDef> = {}): DataTableColumnDef => ({
  accessor,
  header,
  align: "start",
  enableSorting: false,
  enableColumnFilter: false,
  ...extra,
});

const table = (name: string, title: string, element: Record<string, unknown>): Bin => ({
  sm: "12", md: "12", lg: "12", xl: "12",
  type: "datatable",
  justifySelf: "stretch",
  alignSelf: "start",
  element: {
    name,
    title,
    canSearch: false,
    api: { name: "regionCountries", paths: ["data"] },
    ...element,
  } as Bin["element"],
});

const people = { group: "People", mergeColumns: true, size: 150 };
const dates = { group: "Dates", useDateFormat: "DD/MM/YYYY", size: 140 };

export const containerTableLayoutDemo: Container[] = [
  {
    id: "1",
    name: "TableLayoutDemo",
    isArray: false,
    bins: [
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: { text: "Table layout", variant: "h3" },
      },
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "Row header, group headers and merged cells are keys on a column: rowHeader, group, mergeRows and mergeColumns. One country per row with its region; the region repeats down the rows and the creator usually equals the last editor, which is what the merges pick up.",
        },
      },
      ...section(
        "All of it together",
        "Region is the row header and merges down equal rows (mergeRows); Created by / Updated by sit under a People group header and merge sideways when equal (mergeColumns); the two dates sit under Dates. Country and Code have no group, so their headers span both header rows. Edit / delete keep the action column first.",
      ),
      table("dtLayoutAll", "Countries by region", {
        canEdit: true,
        canDelete: true,
        columns: [
          column("region", "Region", { rowHeader: true, mergeRows: true, size: 170 }),
          column("name", "Country", { enableSorting: true, size: 180 }),
          column("code", "Code", { size: 90 }),
          column("created_by_name", "Created by", people),
          column("updated_by_name", "Updated by", people),
          column("created_at", "Created", dates),
          column("updated_at", "Updated", { ...dates, enableSorting: true }),
        ],
      }),
      ...section(
        "Merging follows the rows on screen",
        "Updated by merges too here. mergeRows joins whatever consecutive rows share a value on the current page, so click the Updated by header: the editor runs form and the Region runs split. Sort by Country and the region column stops merging almost entirely.",
      ),
      table("dtLayoutSorted", "Countries — sorted by editor", {
        columns: [
          column("region", "Region", { rowHeader: true, mergeRows: true, size: 170 }),
          column("name", "Country", { enableSorting: true, size: 180 }),
          column("updated_by_name", "Updated by", { enableSorting: true, mergeRows: true, size: 150 }),
          column("updated_at", "Updated", { useDateFormat: "DD/MM/YYYY HH:mm", size: 170 }),
        ],
      }),
      ...section(
        "Editable table: row header and group headers",
        "datatableeditable takes rowHeader and group too (cells never merge there — rows turn into inputs). Region is the read-only row header; the two editor columns share a People band.",
      ),
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "datatableeditable",
        justifySelf: "stretch",
        alignSelf: "start",
        element: {
          name: "dtLayoutEditable",
          title: "Countries — editable",
          idKey: "_id",
          columns: [
            { accessorKey: "region", header: "Region", align: "start", size: 170, editable: false, rowHeader: true },
            { accessorKey: "name", header: "Country", enableSorting: true, align: "start", size: 200, isRequired: true },
            { accessorKey: "code", header: "Code", align: "start", size: 90, isRequired: true },
            { accessorKey: "created_by_name", header: "Created by", align: "start", size: 150, editable: false, group: "People" },
            { accessorKey: "updated_by_name", header: "Updated by", align: "start", size: 150, editable: false, group: "People" },
          ],
          apiCrud: {
            read: { name: "regionCountries", paths: ["data"] },
            update: {
              name: "updateCountry",
              params: { id: "_id" },
              snackbarSuccess: { type: "success", message: "Country updated successfully" },
              snackbarError: "$exception",
            },
          },
        } as unknown as Bin["element"],
      },
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "6",
  },
];
