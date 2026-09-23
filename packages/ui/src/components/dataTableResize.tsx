import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from "react"
import { flushSync } from "react-dom"
import type { Column, ColumnSizingState, Header, Table } from "@tanstack/react-table"

/**
 * Drag-to-resize columns, shared by `DataTable2` and `DataTableEditable`.
 *
 * The tables are `table-fixed` with `min-width: 100%`, so while the columns
 * total less than the container the browser stretches them proportionally — a
 * dragged edge wouldn't follow the mouse. Two modes solve that:
 *
 * - **stretch** (the start, unless a column declares a `size`): exactly the
 *   layout the tables always had.
 * - **exact**: every column is its pixel size and a width-less filler cell
 *   takes the slack. The first resize gesture `freeze`s the table into it by
 *   measuring the rendered header widths into `columnSizing`, so nothing jumps.
 *
 * Widths and sticky offsets reach the cells as CSS variables set on the
 * `<table>` (see `sizeVars`), so a drag only has to restyle one element and the
 * body can stay memoised while it lasts.
 */

/** Columns can't be dragged narrower than this unless they set their own `minSize`. */
export const DEFAULT_MIN_COLUMN_SIZE = 60

const KEY_STEP = 10
const KEY_STEP_LARGE = 50

const varName = (id: string, part: "size" | "left" | "right") =>
	`--dt-col-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}-${part}`

/** `width` of a header / body cell, read from the table's CSS variables. */
export const sizeStyle = (column: Column<any, unknown>): CSSProperties => ({
	width: `calc(var(${varName(column.id, "size")}) * 1px)`,
})

/**
 * Sticky offset for a pinned column: TanStack's running width of the columns
 * pinned before it on the same side. The cell must be `position: sticky`
 * (the `datatable-cell-pinned` class) inside the table's one scroller.
 */
export const pinStyle = (column: Column<any, unknown>): CSSProperties => {
	const pinned = column.getIsPinned()
	if (pinned === "left") return { left: `calc(var(${varName(column.id, "left")}) * 1px)` }
	if (pinned === "right") return { right: `calc(var(${varName(column.id, "right")}) * 1px)` }
	return {}
}

/** The CSS variables `sizeStyle` / `pinStyle` read — spread into the `<table>` style. */
export function sizeVars(table: Table<any>): CSSProperties {
	const vars: Record<string, number> = {}
	for (const column of table.getVisibleLeafColumns()) {
		vars[varName(column.id, "size")] = column.getSize()
		const pinned = column.getIsPinned()
		if (pinned === "left") vars[varName(column.id, "left")] = column.getStart("left")
		if (pinned === "right") vars[varName(column.id, "right")] = column.getAfter("right")
	}
	return vars as CSSProperties
}

/**
 * Put the filler before the first right-pinned item (or last), so right-pinned
 * columns stay on the container's edge. `null` filler ⇒ the items as they are.
 */
export function withFiller<I>(
	items: I[],
	columnOf: (item: I) => Column<any, unknown>,
	render: (item: I) => ReactNode,
	filler: ReactNode,
): ReactNode[] {
	const nodes = items.map(render)
	if (!filler) return nodes
	const at = items.findIndex((item) => columnOf(item).getIsPinned() === "right")
	nodes.splice(at === -1 ? nodes.length : at, 0, filler)
	return nodes
}

export type ColumnResize = {
	/** Spread into `useReactTable` options. */
	tableOptions: {
		enableColumnResizing: boolean
		columnResizeMode: "onChange"
		defaultColumn: { minSize: number }
		onColumnSizingChange: (updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)) => void
	}
	/** Goes into `useReactTable`'s `state`. */
	columnSizing: ColumnSizingState
	/** Exact-pixel mode: render the filler cells. */
	exact: boolean
	/** Ref for the `<table>` — header cells are measured through it. */
	tableRef: RefObject<HTMLTableElement>
	/** Switch to exact mode from the widths on screen (no-op once exact). */
	freeze: () => void
	/** Back to the column's starting width: its measured one, else its config `size`. */
	reset: (column: Column<any, unknown>) => void
}

/**
 * Resize state for one table. `startExact` — a column declares a `size`, so
 * the table honours pixel widths from the first paint instead of stretching.
 */
export function useColumnResize(enabled: boolean, startExact: boolean): ColumnResize {
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
	// Exact once a column declares a `size`, or once a gesture froze the layout.
	const [frozen, setFrozen] = useState(false)
	const exact = startExact || frozen
	const tableRef = useRef<HTMLTableElement>(null)
	// The widths measured at the freeze: what "reset" returns a column to.
	const baseline = useRef<ColumnSizingState>({})

	const freeze = useCallback(() => {
		if (exact || !tableRef.current) return
		const measured: ColumnSizingState = {}
		tableRef.current.querySelectorAll<HTMLElement>("thead th[data-column-id]").forEach((th) => {
			// Floor: a rounded-up total would overflow the scroller by a pixel.
			measured[th.dataset.columnId as string] = Math.floor(th.getBoundingClientRect().width)
		})
		baseline.current = measured
		// Synchronous: the resize gesture that follows reads its start size from
		// the table state, which must already hold the measured widths.
		flushSync(() => {
			setColumnSizing((old) => ({ ...measured, ...old }))
			setFrozen(true)
		})
	}, [exact])

	const reset = useCallback((column: Column<any, unknown>) => {
		const base = baseline.current[column.id]
		if (base === undefined) column.resetSize()
		else setColumnSizing((old) => ({ ...old, [column.id]: base }))
	}, [])

	return {
		tableOptions: {
			enableColumnResizing: enabled,
			columnResizeMode: "onChange",
			defaultColumn: { minSize: DEFAULT_MIN_COLUMN_SIZE },
			onColumnSizingChange: setColumnSizing,
		},
		columnSizing,
		exact,
		tableRef,
		freeze,
		reset,
	}
}

/**
 * The header's resize grip: a focusable separator on the cell's right edge.
 * Drag (mouse / touch) resizes live, double-click / Enter / Home resets,
 * ← → move by 10px (50px with Shift). Renders nothing for a locked column.
 */
export function ColumnResizeHandle({ header, table, resize }: {
	header: Header<any, unknown>
	table: Table<any>
	resize: ColumnResize
}) {
	const { column } = header
	if (!column.getCanResize()) return null

	const start = (event: React.MouseEvent | React.TouchEvent) => {
		resize.freeze()
		header.getResizeHandler()(event)
	}

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Enter" || event.key === "Home") {
			event.preventDefault()
			resize.freeze()
			resize.reset(column)
			return
		}
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
		event.preventDefault()
		resize.freeze()
		const step = (event.shiftKey ? KEY_STEP_LARGE : KEY_STEP) * (event.key === "ArrowLeft" ? -1 : 1)
		const min = column.columnDef.minSize ?? DEFAULT_MIN_COLUMN_SIZE
		const max = column.columnDef.maxSize ?? Number.MAX_SAFE_INTEGER
		const next = Math.min(Math.max(column.getSize() + step, min), max)
		table.setColumnSizing((old) => ({ ...old, [column.id]: next }))
	}

	const label = typeof column.columnDef.header === "string" ? column.columnDef.header : column.id
	return (
		<div
			role="separator"
			tabIndex={0}
			aria-orientation="vertical"
			aria-label={`Resize ${label} column`}
			aria-valuenow={Math.round(column.getSize())}
			aria-valuemin={column.columnDef.minSize ?? DEFAULT_MIN_COLUMN_SIZE}
			aria-valuemax={column.columnDef.maxSize === undefined || column.columnDef.maxSize >= Number.MAX_SAFE_INTEGER ? undefined : column.columnDef.maxSize}
			title="Drag to resize · double-click to reset"
			className={`datatable-resize-handle ${column.getIsResizing() ? "is-resizing" : ""}`}
			onMouseDown={start}
			onTouchStart={start}
			onDoubleClick={() => resize.reset(column)}
			onClick={(event) => event.stopPropagation()}
			onKeyDown={onKeyDown}
		/>
	)
}
