import type { DataTableAggregate } from "./@types"

/**
 * Group-row and total-row summaries (`ColumnDef.aggregate`). Pure, shared by
 * the TanStack `aggregationFn`s and the total row. Blanks are skipped; `sum` /
 * `avg` / `min` / `max` read numbers (numeric strings count), `count` counts
 * the non-blank values. No numbers ⇒ `undefined` (an empty cell, never `NaN`).
 */
export function aggregateValues(values: unknown[], fn: DataTableAggregate): number | undefined {
	const present = values.filter((v) => v !== null && v !== undefined && v !== "")
	if (fn === "count") return present.length
	const numbers = present
		.map((v) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN))
		.filter((n) => Number.isFinite(n))
	if (numbers.length === 0) return undefined
	switch (fn) {
		case "sum":
			return numbers.reduce((a, b) => a + b, 0)
		case "avg":
			return numbers.reduce((a, b) => a + b, 0) / numbers.length
		case "min":
			return Math.min(...numbers)
		case "max":
			return Math.max(...numbers)
	}
}

/** The depth-limited expanded state TanStack wants: every group row at depth < `depth` open. */
export function expandedToDepth<R extends { id: string; depth: number; getIsGrouped: () => boolean; subRows: R[] }>(rows: R[], depth: number): Record<string, boolean> {
	const out: Record<string, boolean> = {}
	const walk = (list: R[]) => {
		for (const row of list) {
			if (!row.getIsGrouped()) continue
			if (row.depth < depth) out[row.id] = true
			walk(row.subRows)
		}
	}
	walk(rows)
	return out
}
