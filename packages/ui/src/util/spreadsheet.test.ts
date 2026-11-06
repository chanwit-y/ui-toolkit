import { describe, expect, test } from "bun:test"
import * as XLSX from "xlsx"
import { columnLabel, isCsvFile, parseSpreadsheet, sheetSpans, SpreadsheetTooLargeError } from "./spreadsheet"

const workbookBytes = (sheets: Record<string, unknown[][]>, merges: XLSX.Range[] = []): ArrayBuffer => {
	const wb = XLSX.utils.book_new()
	Object.entries(sheets).forEach(([name, rows], i) => {
		const ws = XLSX.utils.aoa_to_sheet(rows)
		if (i === 0 && merges.length) ws["!merges"] = merges
		XLSX.utils.book_append_sheet(wb, ws, name)
	})
	const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
	return out
}

describe("columnLabel", () => {
	test("letters like a spreadsheet", () => {
		expect([0, 1, 25, 26, 27, 51, 52, 701, 702].map(columnLabel)).toEqual(["A", "B", "Z", "AA", "AB", "AZ", "BA", "ZZ", "AAA"])
	})
})

describe("isCsvFile", () => {
	test("by type or extension", () => {
		expect(isCsvFile({ name: "a.csv", type: "" })).toBe(true)
		expect(isCsvFile({ name: "a", type: "text/csv" })).toBe(true)
		expect(isCsvFile({ name: "a.xlsx", type: "" })).toBe(false)
	})
})

describe("parseSpreadsheet", () => {
	test("every sheet, as formatted text", async () => {
		const bytes = workbookBytes({
			Sales: [["Month", "Units"], ["Jan", 12], ["Feb", 7.5], ["Mar", true]],
			Notes: [["only one cell"]],
		})
		const sheets = await parseSpreadsheet(bytes)
		expect(sheets.map((s) => s.name)).toEqual(["Sales", "Notes"])
		expect(sheets[0].rows).toEqual([["Month", "Units"], ["Jan", "12"], ["Feb", "7.5"], ["Mar", "TRUE"]])
		expect(sheets[0].totalRows).toBe(4)
		expect(sheets[0].totalColumns).toBe(2)
		expect(sheets[1].rows).toEqual([["only one cell"]])
	})

	test("cuts rows and columns, keeping the full size", async () => {
		const rows = Array.from({ length: 30 }, (_, r) => Array.from({ length: 12 }, (_, c) => `${r}:${c}`))
		const [sheet] = await parseSpreadsheet(workbookBytes({ Big: rows }), { maxRows: 10, maxColumns: 4 })
		expect(sheet.rows.length).toBe(10)
		expect(sheet.rows[0]).toEqual(["0:0", "0:1", "0:2", "0:3"])
		expect(sheet.totalRows).toBe(30)
		expect(sheet.totalColumns).toBe(12)
	})

	test("merges relative to the grid, a cut-off top-left dropped", async () => {
		const rows = [["Title", "", ""], ["a", "b", "c"], ["d", "e", "f"]]
		const merges = [
			{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
			{ s: { r: 1, c: 2 }, e: { r: 2, c: 2 } },
		]
		const [sheet] = await parseSpreadsheet(workbookBytes({ M: rows }, merges))
		expect(sheet.merges).toEqual([
			{ row: 0, column: 0, rowSpan: 1, colSpan: 3 },
			{ row: 1, column: 2, rowSpan: 2, colSpan: 1 },
		])
		const [cut] = await parseSpreadsheet(workbookBytes({ M: rows }, merges), { maxColumns: 2 })
		expect(cut.merges).toEqual([{ row: 0, column: 0, rowSpan: 1, colSpan: 2 }])
	})

	test("an empty sheet is an empty grid", async () => {
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), "Empty")
		const [sheet] = await parseSpreadsheet(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer)
		expect(sheet.rows).toEqual([])
	})

	test("CSV text keeps its UTF-8", async () => {
		const [sheet] = await parseSpreadsheet("name,city\nสมชาย,กรุงเทพ\n")
		expect(sheet.rows).toEqual([["name", "city"], ["สมชาย", "กรุงเทพ"]])
	})

	test("refuses a file over the byte limit", async () => {
		await expect(parseSpreadsheet(new ArrayBuffer(100), { maxBytes: 10 })).rejects.toBeInstanceOf(SpreadsheetTooLargeError)
	})
})

describe("sheetSpans", () => {
	test("top-left spans, covered cells null", () => {
		const spans = sheetSpans([{ row: 0, column: 0, rowSpan: 2, colSpan: 2 }])
		expect(spans.get("0:0")).toEqual({ rowSpan: 2, colSpan: 2 })
		expect(spans.get("0:1")).toBeNull()
		expect(spans.get("1:1")).toBeNull()
		expect(spans.has("2:0")).toBe(false)
	})
})
