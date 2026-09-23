import type { Column, ColumnDef, Header, HeaderGroup, Row, Table } from "@tanstack/react-table"
import { useLayoutEffect, useRef, type CSSProperties } from "react"
import { pinStyle } from "./dataTableResize"

/**
 * Header / cell layout shared by `DataTable2` and `DataTableEditable`:
 * group headers (a band over adjacent columns), a row-header column and
 * merged cells (`rowSpan` / `colSpan` over equal values). Everything is read
 * off the TanStack column `meta`, which the builders fill from the config.
 */

/** What the config puts on a column's TanStack `meta`. */
export type ColumnLayoutMeta = {
	html?: boolean
	lines?: number
	/** The row's label: `<th scope="row">`, header colours, pinned left. */
	rowHeader?: boolean
	/** Consecutive rows with the same value share one cell (`rowSpan`). */
	mergeRows?: boolean
	/** Adjacent columns (both flagged) with the same value share one cell (`colSpan`). */
	mergeColumns?: boolean
}

export const columnMeta = (column: Column<any, unknown>): ColumnLayoutMeta =>
	(column.columnDef.meta as ColumnLayoutMeta | undefined) ?? {}

/**
 * Wrap runs of columns that carry the same `group` label into TanStack group
 * columns, in order; a column without a label stays at the top level. One
 * level only — a group is a band over adjacent leaf columns.
 */
export function groupColumns<T>(
	defs: readonly { group?: string }[],
	leaves: ColumnDef<T, any>[],
): ColumnDef<T, any>[] {
	const out: ColumnDef<T, any>[] = []
	let run: { label: string; columns: ColumnDef<T, any>[] } | null = null
	const flush = () => {
		if (!run) return
		out.push({ id: `__group__${out.length}__${run.label}`, header: run.label, columns: run.columns })
		run = null
	}
	defs.forEach((def, i) => {
		const label = def.group?.trim() ?? ""
		if (!label) {
			flush()
			out.push(leaves[i])
			return
		}
		if (run && run.label === label) run.columns.push(leaves[i])
		else {
			flush()
			run = { label, columns: [leaves[i]] }
		}
	})
	flush()
	return out
}

/** One `<th>` of the header: a leaf or a group cell, with its spans. */
export type HeaderCell<T> = {
	header: Header<T, unknown>
	kind: "leaf" | "group"
	colSpan: number
	rowSpan: number
}

/**
 * The header cells to draw, row by row. TanStack gives one row per depth and
 * fills the top row with placeholders for columns outside any group; those
 * leaves are drawn once, in the top row, spanning every header row
 * (`rowSpan`), so a table with groups shows no empty boxes.
 */
export function headerRows<T>(headerGroups: HeaderGroup<T>[]): { id: string; cells: HeaderCell<T>[] }[] {
	const depth = headerGroups.length
	const drawn = new Set<string>()
	return headerGroups.map((group, rowIndex) => ({
		id: group.id,
		cells: group.headers.flatMap<HeaderCell<T>>((header) => {
			let h = header
			// A placeholder stands in for a leaf that lives in a lower row.
			while (h.isPlaceholder && h.subHeaders[0]) h = h.subHeaders[0]
			if (drawn.has(h.column.id)) return []
			drawn.add(h.column.id)
			const isGroup = h.subHeaders.length > 0 && !h.isPlaceholder
			return [{
				header: h,
				kind: isGroup ? "group" : "leaf",
				colSpan: h.colSpan,
				rowSpan: isGroup ? 1 : depth - rowIndex,
			}]
		}),
	}))
}

/**
 * Sticky `top` for the cells of header row `rowIndex`. Every header cell is
 * `position: sticky`, and with a group band there are two header rows: the
 * lower one has to stick *below* the upper one, not at the scroller's top
 * where it would slide over the band. The offsets are the measured heights of
 * the rows above (`useHeaderRowTops` writes them onto the `<thead>` as
 * `--dt-header-top-<n>`), so they follow wrapped labels and font changes.
 */
export function headerTopStyle(rowIndex: number): CSSProperties {
	return rowIndex === 0 ? {} : { top: `var(--dt-header-top-${rowIndex}, 0px)` }
}

/**
 * Measures the header rows of the `<thead>` the returned ref is put on and
 * keeps `--dt-header-top-<n>` (the offset of row `n` from the top) on it, via
 * a `ResizeObserver` on each row. Written straight onto the element, so a
 * header re-measure never re-renders the table; the observers are re-attached
 * only when the number of header rows changes (a group split by pinning).
 */
export function useHeaderRowTops(rowCount: number) {
	const theadRef = useRef<HTMLTableSectionElement>(null)
	useLayoutEffect(() => {
		const thead = theadRef.current
		if (!thead) return
		const rows = Array.from(thead.rows)
		const measure = () => {
			let top = 0
			rows.forEach((row, i) => {
				thead.style.setProperty(`--dt-header-top-${i}`, `${top}px`)
				top += row.getBoundingClientRect().height
			})
		}
		measure()
		if (typeof ResizeObserver === "undefined") return
		const observer = new ResizeObserver(measure)
		rows.forEach((row) => observer.observe(row))
		return () => observer.disconnect()
	}, [rowCount])
	return theadRef
}

/**
 * Sticky offset for a header cell. A group column has no offset of its own
 * (pinning is per leaf), so it borrows its first leaf's.
 */
export function headerPinStyle(column: Column<any, unknown>): CSSProperties {
	const leaf = column.columns.length ? column.getLeafColumns()[0] : column
	return leaf ? pinStyle(leaf) : {}
}

export type CellSpan = { rowSpan: number; colSpan: number }

/** `"<rowId>:<columnId>"` → spans; a covered cell maps to `null` (not drawn). */
export type SpanMap = Map<string, CellSpan | null>

export const spanKey = (rowId: string, columnId: string) => `${rowId}:${columnId}`

/** Blank values never merge. */
const mergeable = (value: unknown) => value !== null && value !== undefined && value !== ""

/**
 * Merged cells for the rows on screen. Rows first: a `mergeRows` column
 * joins consecutive rows holding the same raw value into one `rowSpan` cell.
 * Then columns: within a row, adjacent `mergeColumns` columns holding the
 * same value join into one `colSpan` cell — but only cells the row pass left
 * alone (a cell can't span both ways). Returns an empty map when no column
 * merges, so the tables can skip the lookups.
 */
export function computeSpans<T>(rows: Row<T>[], columns: Column<T, unknown>[]): SpanMap {
	const spans: SpanMap = new Map()
	const rowCols = columns.filter((c) => columnMeta(c).mergeRows)
	const colCols = new Set(columns.filter((c) => columnMeta(c).mergeColumns).map((c) => c.id))
	if (!rowCols.length && !colCols.size) return spans

	for (const column of rowCols) {
		let i = 0
		while (i < rows.length) {
			const value = rows[i].getValue(column.id)
			let j = i + 1
			if (mergeable(value)) while (j < rows.length && rows[j].getValue(column.id) === value) j++
			if (j - i > 1) {
				spans.set(spanKey(rows[i].id, column.id), { rowSpan: j - i, colSpan: 1 })
				for (let k = i + 1; k < j; k++) spans.set(spanKey(rows[k].id, column.id), null)
			}
			i = j
		}
	}

	if (colCols.size) {
		for (const row of rows) {
			let i = 0
			while (i < columns.length) {
				const column = columns[i]
				const key = spanKey(row.id, column.id)
				const value = row.getValue(column.id)
				let j = i + 1
				if (colCols.has(column.id) && !spans.has(key) && mergeable(value)) {
					while (
						j < columns.length &&
						colCols.has(columns[j].id) &&
						!spans.has(spanKey(row.id, columns[j].id)) &&
						row.getValue(columns[j].id) === value
					) j++
				}
				if (j - i > 1) {
					spans.set(key, { rowSpan: 1, colSpan: j - i })
					for (let k = i + 1; k < j; k++) spans.set(spanKey(row.id, columns[k].id), null)
				}
				i = j
			}
		}
	}
	return spans
}

/** The `<col>` widths that keep `table-layout: fixed` honest under spanning cells. */
export function leafColumns<T>(table: Table<T>): Column<T, unknown>[] {
	return table.getVisibleLeafColumns()
}
