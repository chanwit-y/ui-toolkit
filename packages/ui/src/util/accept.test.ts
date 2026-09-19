import { describe, expect, test } from "bun:test"
import { acceptLabel, matchesAccept, resolveAccept } from "./accept"
import { fileKind, isUrlContent } from "./file"

describe("resolveAccept", () => {
	test("empty accepts everything", () => {
		expect(resolveAccept(undefined)).toEqual([])
		expect(matchesAccept({ name: "a.exe", type: "" }, [])).toBe(true)
	})

	test("expands presets in both the string and the array form", () => {
		expect(resolveAccept("pdf, .dwg")).toEqual(["application/pdf", ".pdf", ".dwg"])
		expect(resolveAccept(["pdf", ".dwg"])).toEqual(["application/pdf", ".pdf", ".dwg"])
	})

	test("a bare non-preset word is an extension", () => {
		expect(resolveAccept("docx")).toEqual([".docx"])
	})

	test("drops duplicates across presets", () => {
		const tokens = resolveAccept(["spreadsheet", "text"])
		expect(tokens.filter((t) => t === ".csv")).toHaveLength(1)
	})
})

describe("matchesAccept", () => {
	const tokens = resolveAccept(["image", "pdf", ".dwg"])

	test("matches by mime wildcard, exact mime and extension", () => {
		expect(matchesAccept({ name: "a.png", type: "image/png" }, tokens)).toBe(true)
		expect(matchesAccept({ name: "a", type: "application/pdf" }, tokens)).toBe(true)
		expect(matchesAccept({ name: "PLAN.DWG", type: "" }, tokens)).toBe(true)
	})

	test("falls back to the extension when the browser gives no mime", () => {
		expect(matchesAccept({ name: "photo.heic", type: "" }, tokens)).toBe(true)
	})

	test("rejects everything else", () => {
		expect(matchesAccept({ name: "a.exe", type: "application/x-msdownload" }, tokens)).toBe(false)
		expect(matchesAccept({ name: "a.pdf.exe", type: "" }, tokens)).toBe(false)
	})
})

test("acceptLabel names presets and keeps raw tokens", () => {
	expect(acceptLabel(["image", "pdf", ".dwg"])).toBe("Images, PDF, .dwg")
	expect(acceptLabel(".pdf,.docx")).toBe(".pdf, .docx")
})

test("fileKind: a csv is a spreadsheet, unknown is other", () => {
	expect(fileKind({ name: "a.csv", type: "text/csv" })).toBe("spreadsheet")
	expect(fileKind({ name: "a.md", type: "" })).toBe("text")
	expect(fileKind({ name: "a.bin", type: "" })).toBe("other")
})

test("isUrlContent: slash-led base64 (JPEG) is content, a path is a URL", () => {
	expect(isUrlContent("/uploads/flag-123.png")).toBe(true)
	expect(isUrlContent("https://x.test/a.png")).toBe(true)
	expect(isUrlContent("/9j/" + "A".repeat(96))).toBe(false)
	expect(isUrlContent("iVBORw0KGgo")).toBe(false)
})
