import { describe, expect, test } from "bun:test";
import { columnFormat, formatCell } from "./format";

// ICU puts narrow / non-breaking spaces in some outputs; compare on plain spaces.
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

describe("formatCell", () => {
  test("blank values render empty whatever the format", () => {
    expect(formatCell(null, { type: "number" })).toBe("");
    expect(formatCell(undefined, { type: "currency", currency: "THB" })).toBe("");
    expect(formatCell("", { type: "date" })).toBe("");
    expect(formatCell(null, undefined)).toBe("");
  });

  test("no format is the value as text", () => {
    expect(formatCell(1250, undefined)).toBe("1250");
    expect(formatCell("abc", { type: "text" })).toBe("abc");
  });

  test("number: grouped digits, fixed decimals, grouping off", () => {
    expect(formatCell(1250, { type: "number" }, "en-US")).toBe("1,250");
    expect(formatCell("1250.5", { type: "number", decimals: 2 }, "en-US")).toBe("1,250.50");
    expect(formatCell(1250, { type: "number", grouping: false }, "en-US")).toBe("1250");
    expect(formatCell(1250, { type: "number" }, "de-DE")).toBe("1.250");
  });

  test("currency: ISO code, the currency's decimals by default", () => {
    expect(plain(formatCell(1250, { type: "currency", currency: "THB" }, "en-US"))).toBe("THB 1,250.00");
    expect(formatCell(1250, { type: "currency", currency: "USD" }, "en-US")).toBe("$1,250.00");
    expect(formatCell(1250, { type: "currency", currency: "USD", decimals: 0 }, "en-US")).toBe("$1,250");
  });

  test("percent: a ratio by default, `of: 100` for whole numbers", () => {
    expect(formatCell(0.25, { type: "percent" }, "en-US")).toBe("25%");
    expect(formatCell(25, { type: "percent", of: 100 }, "en-US")).toBe("25%");
    expect(formatCell(0.2567, { type: "percent", decimals: 1 }, "en-US")).toBe("25.7%");
  });

  test("a non-number under a numeric format is the raw text, never NaN", () => {
    expect(formatCell("n/a", { type: "number" }, "en-US")).toBe("n/a");
    expect(formatCell({ a: 1 }, { type: "currency", currency: "THB" }, "en-US")).toBe("[object Object]");
  });

  test("date / datetime: a dayjs pattern, else the locale's medium style in the given zone", () => {
    const iso = "2025-01-15T10:30:00Z";
    expect(formatCell(iso, { type: "date", pattern: "DD/MM/YYYY" })).toBe(
      // dayjs renders in the process zone; the pattern path is zone-agnostic by day here.
      new Date(iso).getDate().toString().padStart(2, "0") + "/01/2025",
    );
    expect(formatCell(iso, { type: "date", timeZone: "Asia/Bangkok" }, "en-US")).toBe("Jan 15, 2025");
    expect(plain(formatCell(iso, { type: "datetime", timeZone: "Asia/Bangkok" }, "en-US"))).toMatch(/^Jan 15, 2025(,| at) 5:30 PM$/);
    expect(plain(formatCell(iso, { type: "datetime", timeZone: "UTC" }, "en-GB"))).toMatch(/^15 Jan 2025(,| at) 10:30$/);
    expect(formatCell("not a date", { type: "date" }, "en-US")).toBe("not a date");
  });

  test("boolean: labels, with the usual truthy / falsy spellings", () => {
    expect(formatCell(true, { type: "boolean" })).toBe("Yes");
    expect(formatCell(0, { type: "boolean" })).toBe("No");
    expect(formatCell("Y", { type: "boolean", trueLabel: "Active", falseLabel: "Inactive" })).toBe("Active");
    expect(formatCell("maybe", { type: "boolean" })).toBe("maybe");
  });

  test("an unknown locale or currency falls back instead of throwing", () => {
    expect(() => formatCell(1, { type: "number" }, "xx-INVALID-@@")).not.toThrow();
    expect(() => formatCell(1, { type: "currency", currency: "NOPE" }, "en-US")).not.toThrow();
  });
});

describe("columnFormat", () => {
  test("`format` wins, `useDateFormat` is the date alias, neither is undefined", () => {
    expect(columnFormat({ format: { type: "number" }, useDateFormat: "DD" })).toEqual({ type: "number" });
    expect(columnFormat({ useDateFormat: "DD/MM/YYYY" })).toEqual({ type: "date", pattern: "DD/MM/YYYY" });
    expect(columnFormat({})).toBeUndefined();
  });
});
