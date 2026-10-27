/**
 * CSV for the data table's Export (see `DataTableElement.canExport`): RFC 4180
 * quoting (a value holding a comma, quote, CR or LF is quoted, quotes doubled),
 * CRLF line ends and a UTF-8 BOM, so Excel opens Thai text and the columns
 * right. Pure; `downloadCsv` is the browser side.
 */
export function csvCell(value: unknown): string {
	if (value === null || value === undefined) return ""
	const text = typeof value === "string" ? value : String(value)
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: string[], rows: unknown[][]): string {
	const lines = [header, ...rows].map((cells) => cells.map(csvCell).join(","))
	return "﻿" + lines.join("\r\n") + "\r\n"
}

/** `{{date}}` → today (YYYY-MM-DD), and a `.csv` suffix when missing. */
export function csvFileName(template: string | undefined, fallback: string, today = new Date()): string {
	const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
	const name = (template?.trim() || fallback).replace(/\{\{\s*date\s*\}\}/g, date)
	return /\.csv$/i.test(name) ? name : `${name}.csv`
}

/** Save `csv` as a file (browser only; a no-op without a DOM). */
export function downloadCsv(csv: string, fileName: string): void {
	if (typeof document === "undefined") return
	const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
	const a = document.createElement("a")
	a.href = url
	a.download = fileName
	a.style.display = "none"
	document.body.appendChild(a)
	a.click()
	a.remove()
	setTimeout(() => URL.revokeObjectURL(url), 1000)
}
