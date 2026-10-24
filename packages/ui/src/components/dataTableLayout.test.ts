import { describe, expect, test } from "bun:test";
import { createTable, getCoreRowModel, type ColumnDef } from "@tanstack/react-table";
import { displayedLeafColumns } from "./dataTableLayout";

type Row = { a: string; b: string; c: string; d: string };

function table(pinning: { left?: string[]; right?: string[] }) {
  const columns: ColumnDef<Row>[] = ["a", "b", "c", "d"].map((id) => ({ id, accessorKey: id, header: id === "b" ? "" : id }));
  return createTable<Row>({
    data: [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnPinning: pinning, columnVisibility: {}, columnOrder: [], columnSizing: {} },
    onStateChange: () => {},
    renderFallbackValue: null,
  });
}

describe("displayedLeafColumns", () => {
  test("follows the drawn order: left-pinned, centre, right-pinned", () => {
    expect(displayedLeafColumns(table({ left: ["c"], right: ["a"] })).map((c) => c.id)).toEqual(["c", "b", "d", "a"]);
  });

  test("matches the header and row cell order (what the colgroup widths must follow)", () => {
    const t = table({ left: ["c"] });
    const headerIds = t.getHeaderGroups()[0].headers.map((h) => h.column.id);
    expect(displayedLeafColumns(t).map((c) => c.id)).toEqual(headerIds);
    // The definition order differs, which is what shifted the widths before.
    expect(t.getVisibleLeafColumns().map((c) => c.id)).toEqual(["a", "b", "c", "d"]);
  });
});
