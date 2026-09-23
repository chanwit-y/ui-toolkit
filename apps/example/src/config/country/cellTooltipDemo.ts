import type { Bin, Container, DataTableColumnDef } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Cell tooltip demo page (`/cell-tooltip`). A plain data table cell shows at
 * most `cellLines` lines (default 2); when the text is **cut**, hovering the
 * cell shows the whole text in a tooltip. The tooltip is tied to the clamp:
 *
 * - it appears only on a cell whose text was actually cut — a short value
 *   never gets one, however the table is configured;
 * - it shows the text as rendered (a formatted date reads as in the cell);
 * - `ColumnDef.lines` changes where the cut happens per column, `cellLines`
 *   for the whole table, and `0` (no clamp) means no tooltip either;
 * - HTML columns render whole, so they never show one.
 *
 * Regions carry a paragraph in `about`, which is what gets cut.
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

const regionColumns = (extra: Partial<Record<"description" | "about", Partial<DataTableColumnDef>>> = {}): DataTableColumnDef[] => [
  column("name", "Region", { enableSorting: true, size: 170 }),
  column("description", "Description", { size: 240, ...extra.description }),
  column("about", "About", { size: 460, ...extra.about }),
];

const table = (name: string, title: string, element: Record<string, unknown>): Bin => ({
  sm: "12", md: "12", lg: "12", xl: "12",
  type: "datatable",
  justifySelf: "stretch",
  alignSelf: "start",
  element: { name, title, canSearch: false, api: { name: "regions", paths: ["data"] }, ...element } as Bin["element"],
});

export const containerCellTooltipDemo: Container[] = [
  {
    id: "1",
    name: "CellTooltipDemo",
    isArray: false,
    bins: [
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: { text: "Cell tooltip", variant: "h3" },
      },
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "Point at a cell whose text is cut to see the whole text. The tooltip follows the line clamp (cellLines, default 2; lines per column): it only appears on a cell that was actually cut, so short values never get one, and a table without a clamp (cellLines: 0) has none.",
        },
      },
      ...section(
        "Default: two lines, then a tooltip",
        "No clamp settings at all. Region fits, so hovering it does nothing; Description and About run past two lines and show their whole text on hover.",
      ),
      table("dtTooltipDefault", "Regions — default clamp", { columns: regionColumns() }),
      ...section(
        "One line per cell",
        "cellLines: 1 on the table — every column is cut to a single line, so Description gets a tooltip too. Antarctica's short About still fits and stays tooltip-free.",
      ),
      table("dtTooltipOneLine", "Regions — cellLines: 1", { columns: regionColumns(), cellLines: 1 }),
      ...section(
        "Per column",
        "lines: 1 on Description and lines: 4 on About, with the table left at its default: the cut — and so the tooltip — happens at a different line in each column.",
      ),
      table("dtTooltipPerColumn", "Regions — lines per column", {
        columns: regionColumns({ description: { lines: 1 }, about: { lines: 4 } }),
      }),
      ...section(
        "Where there is no tooltip",
        "cellLines: 0 turns the clamp off, so the rows grow with the text and nothing is cut — no tooltip. The last column is an HTML template; HTML cells always render whole and never show one.",
      ),
      table("dtTooltipNone", "Regions — no clamp, HTML column", {
        cellLines: 0,
        columns: [
          column("name", "Region", { size: 170 }),
          column("about", "About", { size: 460 }),
          column("description", "Summary (HTML)", {
            html: '<span class="dt-badge">{{name}}</span> <span class="dt-muted">{{value}}</span>',
          }),
        ],
      }),
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "6",
  },
];
