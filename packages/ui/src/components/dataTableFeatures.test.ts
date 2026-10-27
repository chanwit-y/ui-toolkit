import { describe, expect, test } from "bun:test"
import { aggregateValues } from "./dataTableGrouping"
import { cellLook, resolveStyles } from "./dataTableStyles"
import { reconcileColumnLayout, type ColumnLayout } from "./dataTableColumnState"
import { csvCell, csvFileName, toCsv } from "../util/csv"
import type { DataTableStyleRule } from "./@types"

describe("style rules", () => {
	const low: DataTableStyleRule = { when: { left: { key: "value" }, operator: "lt", right: { val: 5 } }, tone: "red", fill: true, weight: "bold" }
	const out: DataTableStyleRule = { when: { left: { key: "row", path: "stock" }, operator: "eq", right: { val: 0 } }, tone: "gray", strike: true }
	test("the first matching rule gives the tone, every matching rule its classes", () => {
		const look = resolveStyles([low, out], { value: 0, row: { stock: 0 }, index: 0 })
		expect(look.tone).toBe("red")
		expect(look.fill).toBe(true)
		expect(look.classes).toEqual(["datatable-tone-bold", "datatable-tone-strike"])
	})
	test("no match, no look; a broken rule is false, not a throw", () => {
		expect(resolveStyles([low], { value: 9, row: {}, index: 0 })).toEqual({ tone: undefined, fill: false, classes: [] })
		expect(resolveStyles([{ when: null as never, tone: "red" }], { value: 1 }).tone).toBeUndefined()
	})
	test("a cell tone wins over the row's, and a pinned cell takes the text tone only", () => {
		const row = resolveStyles([{ when: { left: { val: 1 }, operator: "eq", right: { val: 1 } }, tone: "amber", fill: true }], {})
		const cell = resolveStyles([low], { value: 1 })
		expect(cellLook(cell, row, true)).toEqual({ className: "datatable-tone-bold datatable-tone datatable-tone-fill", tone: "red" })
		expect(cellLook({ fill: false, classes: [] }, row, false)).toEqual({ className: "datatable-tone", tone: "amber" })
	})
})

describe("aggregates", () => {
	test("sum / avg / min / max read numbers, skip blanks; count counts the present", () => {
		const values = [10, "5", "", null, undefined, "x", 3]
		expect(aggregateValues(values, "sum")).toBe(18)
		expect(aggregateValues(values, "avg")).toBe(6)
		expect(aggregateValues(values, "min")).toBe(3)
		expect(aggregateValues(values, "max")).toBe(10)
		expect(aggregateValues(values, "count")).toBe(4)
	})
	test("no numbers is undefined, never NaN", () => {
		expect(aggregateValues(["a", null], "sum")).toBeUndefined()
		expect(aggregateValues([], "avg")).toBeUndefined()
	})
})

describe("CSV", () => {
	test("quotes only what needs it, doubles quotes, CRLF and a BOM", () => {
		expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"')
		expect(csvCell("plain")).toBe("plain")
		expect(csvCell(null)).toBe("")
		expect(toCsv(["A", "B"], [["1", "x\ny"]])).toBe('﻿A,B\r\n1,"x\ny"\r\n')
	})
	test("file name: {{date}} and the .csv suffix", () => {
		const day = new Date(2026, 9, 27)
		expect(csvFileName("orders-{{date}}", "t", day)).toBe("orders-2026-10-27.csv")
		expect(csvFileName(undefined, "books", day)).toBe("books.csv")
		expect(csvFileName("x.CSV", "t", day)).toBe("x.CSV")
	})
})

describe("column layout", () => {
	const ids = ["a", "b", "c", "d"]
	const defaults: ColumnLayout = { order: ids, visibility: { d: false }, sizing: {}, pinning: { left: ["a"], right: [] }, grouping: [] }
	test("nothing stored is the config", () => {
		expect(reconcileColumnLayout(undefined, defaults, ids)).toEqual({ ...defaults, order: ids })
	})
	test("a stored layout wins, dropped columns are forgotten, new ones land at their config place", () => {
		const stored = { v: 1, order: ["c", "zz", "a"], visibility: { c: false, zz: true }, sizing: { a: 120, zz: 50, c: -3 }, pinning: { left: ["zz"], right: ["c"] }, grouping: ["c", "nope"] }
		const out = reconcileColumnLayout(stored, defaults, ids)
		expect(out.order).toEqual(["c", "d", "a", "b"])
		expect(out.visibility).toEqual({ d: false, c: false })
		expect(out.sizing).toEqual({ a: 120 })
		expect(out.pinning).toEqual({ left: [], right: ["c"] })
		expect(out.grouping).toEqual(["c"])
	})
	test("locked columns are always visible", () => {
		expect(reconcileColumnLayout({ v: 1, visibility: { a: false } }, defaults, ids, ["a"]).visibility.a).toBe(true)
	})
})
