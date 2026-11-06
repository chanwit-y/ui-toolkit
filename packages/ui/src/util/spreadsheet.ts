/**
 * Spreadsheet preview: a workbook (.xlsx / .xls / .ods / .csv) read into plain
 * text grids the file preview draws as a table. SheetJS is imported lazily, so
 * an app that never previews a spreadsheet never downloads the parser.
 *
 * Read-only and bounded: at most `maxRows` × `maxColumns` cells per sheet are
 * kept (the rest is reported as truncated), files over `maxBytes` aren't parsed
 * at all, and every value is the cell's formatted text — rendered as React text,
 * never as markup.
 */

export type SheetMerge = { row: number; column: number; rowSpan: number; colSpan: number }

export type SheetPreview = {
	name: string
	/** The first row / column of the grid in the sheet (0-based), for the A / 1 labels. */
	startRow: number
	startColumn: number
	/** `rows[r][c]` is the formatted text of the cell at `startRow + r`, `startColumn + c`. */
	rows: string[][]
	/** Merged ranges clipped to the grid, relative to it. */
	merges: SheetMerge[]
	/** The sheet's full size, which the grid may be cut from. */
	totalRows: number
	totalColumns: number
}

export type SpreadsheetLimits = { maxRows?: number; maxColumns?: number; maxBytes?: number }

export const SHEET_PREVIEW_LIMITS: Required<SpreadsheetLimits> = {
	maxRows: 500,
	maxColumns: 50,
	maxBytes: 15 * 1024 * 1024,
}

export class SpreadsheetTooLargeError extends Error {
	constructor(readonly bytes: number) {
		super("This spreadsheet is too large to preview")
	}
}

/** The column's letters: 0 → A, 25 → Z, 26 → AA. */
export const columnLabel = (index: number): string => {
	let label = ""
	let n = index + 1
	while (n > 0) {
		const rest = (n - 1) % 26
		label = String.fromCharCode(65 + rest) + label
		n = Math.floor((n - 1) / 26)
	}
	return label
}

/** CSV is text: decoded as UTF-8 here, since SheetJS would read raw bytes as Latin-1. */
export const isCsvFile = (file: { name: string; type: string }): boolean =>
	file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")

type CellLike = { w?: string; v?: unknown }
type Range = { s: { r: number; c: number }; e: { r: number; c: number } }

const cellText = (cell: CellLike | undefined): string => {
	if (!cell) return ""
	if (cell.w !== undefined) return cell.w
	if (cell.v === undefined || cell.v === null) return ""
	if (cell.v instanceof Date) return cell.v.toISOString().slice(0, 10)
	return String(cell.v)
}

/** Parses a workbook's bytes (or a CSV's text) into bounded text grids, one per sheet. */
export const parseSpreadsheet = async (
	content: ArrayBuffer | string,
	limits: SpreadsheetLimits = {}
): Promise<SheetPreview[]> => {
	const { maxRows, maxColumns, maxBytes } = { ...SHEET_PREVIEW_LIMITS, ...limits }
	const size = typeof content === "string" ? content.length : content.byteLength
	if (size > maxBytes) throw new SpreadsheetTooLargeError(size)

	const XLSX = await import("xlsx")
	const workbook =
		typeof content === "string"
			? XLSX.read(content, { type: "string", sheetRows: maxRows, raw: false })
			: XLSX.read(new Uint8Array(content), { type: "array", sheetRows: maxRows })

	return workbook.SheetNames.map((name): SheetPreview => {
		const sheet = workbook.Sheets[name] as Record<string, unknown> | undefined
		const ref = sheet?.["!ref"] as string | undefined
		if (!sheet || !ref) return { name, startRow: 0, startColumn: 0, rows: [], merges: [], totalRows: 0, totalColumns: 0 }

		const range = XLSX.utils.decode_range(ref) as Range
		// With `sheetRows`, `!ref` is the cut range and `!fullref` the sheet's own.
		const full = XLSX.utils.decode_range((sheet["!fullref"] as string | undefined) ?? ref) as Range
		const startRow = range.s.r
		const startColumn = range.s.c
		const endRow = Math.min(range.e.r, startRow + maxRows - 1)
		const endColumn = Math.min(range.e.c, startColumn + maxColumns - 1)

		const rows: string[][] = []
		for (let r = startRow; r <= endRow; r++) {
			const row: string[] = []
			for (let c = startColumn; c <= endColumn; c++) {
				row.push(cellText(sheet[XLSX.utils.encode_cell({ r, c })] as CellLike | undefined))
			}
			rows.push(row)
		}

		const merges = ((sheet["!merges"] as Range[] | undefined) ?? []).flatMap((m): SheetMerge[] => {
			const top = Math.max(m.s.r, startRow)
			const left = Math.max(m.s.c, startColumn)
			const bottom = Math.min(m.e.r, endRow)
			const right = Math.min(m.e.c, endColumn)
			if (top > bottom || left > right) return []
			// A merge whose top-left was cut off is shown unmerged: its value lives in the hidden cell.
			if (top !== m.s.r || left !== m.s.c) return []
			const rowSpan = bottom - top + 1
			const colSpan = right - left + 1
			if (rowSpan === 1 && colSpan === 1) return []
			return [{ row: top - startRow, column: left - startColumn, rowSpan, colSpan }]
		})

		return {
			name,
			startRow,
			startColumn,
			rows,
			merges,
			totalRows: full.e.r - full.s.r + 1,
			totalColumns: full.e.c - full.s.c + 1,
		}
	})
}

export type SheetCellSpan = { rowSpan?: number; colSpan?: number }

/**
 * Where each cell of the grid goes: a span for a merge's top-left cell, `null`
 * for a cell a merge covers (not drawn), nothing for an ordinary cell.
 */
export const sheetSpans = (merges: SheetMerge[]): Map<string, SheetCellSpan | null> => {
	const spans = new Map<string, SheetCellSpan | null>()
	for (const m of merges) {
		for (let r = m.row; r < m.row + m.rowSpan; r++) {
			for (let c = m.column; c < m.column + m.colSpan; c++) spans.set(`${r}:${c}`, null)
		}
		spans.set(`${m.row}:${m.column}`, { rowSpan: m.rowSpan, colSpan: m.colSpan })
	}
	return spans
}
