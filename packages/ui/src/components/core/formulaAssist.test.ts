import { describe, expect, test } from "bun:test";
import { dataPaths, draftToFormat, fieldOperandType, firstNumberField, formatToDraft, formulaCallAt, formulaSpans, formulaStarters, sampleDefault, sampleFromValue, suggestFormula, type FormulaCatalog } from "./formulaAssist";
import { mixesPrecedence, parseFormulaText, printFormulaText } from "./formulaText";

const catalog: FormulaCatalog = {
  fields: [
    { name: "quantity", kind: "number" },
    { name: "price", kind: "number" },
    { name: "startDate", kind: "date" },
  ],
  data: [{ key: "sales", paths: [{ code: "$sales", label: "sales", type: "list" }] }],
  rowFields: [{ name: "region", type: "text" }],
  urlParams: ["code"],
  queryParams: ["promo"],
  formulas: ["Subtotal"],
  rules: [{ name: "Discount rate", resultType: "number" }],
};

const tones = (text: string, errorAt?: number) => formulaSpans(text, errorAt).map((s) => `${text.slice(s.from, s.to)}:${s.tone}`);

describe("formulaSpans", () => {
  test("colours every kind of token", () => {
    expect(tones("ROUND([price] × qty, 2)")).toEqual(["ROUND:fn", "(:punct", "[price]:field", "×:op", "qty:field", ",:punct", "2:value", "):punct"]);
    expect(tones("$sales.0 + row.x + url.id + 15% & 'a'")).toEqual(["$sales.0:data", "+:op", "row.x:data", "+:op", "url.id:data", "+:op", "15%:value", "&:op", "'a':value"]);
    expect(tones("((Subtotal)) × IF((Discount rate))")).toEqual(["((Subtotal)):saved", "×:op", "IF((Discount rate)):rule"]);
    expect(tones("TRUE")).toEqual(["TRUE:value"]);
  });

  test("a text that doesn't lex is one error span, and never throws", () => {
    expect(tones("[price")).toEqual(["[price:error"]);
    expect(tones("'open")).toEqual(["'open:error"]);
    expect(tones("1 # 2")).toEqual(["1:value", "# 2:error"]);
  });

  test("marks the token at a parse error, or the last one when something is missing", () => {
    expect(tones("1 + ) 2", 4)).toEqual(["1:value", "+:op", "):error", "2:value"]);
    expect(tones("1 ×", 3)).toEqual(["1:value", "×:error"]);
  });
});

describe("suggestFormula", () => {
  test("a plain word offers every kind and inserts the right syntax", () => {
    expect(suggestFormula("pri", catalog).map((s) => s.insert)).toEqual(["[price]"]);
    expect(suggestFormula("rou", catalog)[0]).toMatchObject({ insert: "ROUND(", replace: 3, kind: "fn" });
    expect(suggestFormula("sub", catalog)[0]).toMatchObject({ insert: "((Subtotal))", kind: "saved" });
    expect(suggestFormula("disc", catalog)[0]).toMatchObject({ insert: "IF((Discount rate))", kind: "rule" });
    expect(suggestFormula("sal", catalog)[0]).toMatchObject({ insert: "$sales", kind: "data" });
    expect(suggestFormula("reg", catalog)[0]).toMatchObject({ insert: "row.region", kind: "data" });
    expect(suggestFormula("pro", catalog)[0]).toMatchObject({ insert: "query.promo", kind: "data" });
  });

  test("the explicit triggers narrow to their kind", () => {
    expect(suggestFormula("[pr", catalog)).toEqual([{ label: "price", sub: "number", insert: "price]", replace: 2, kind: "field" }]);
    expect(suggestFormula("((Su", catalog)[0].insert).toBe("Subtotal))");
    expect(suggestFormula("IF((Di", catalog)[0].insert).toBe("Discount rate))");
    expect(suggestFormula("$sa", catalog)[0].insert).toBe("sales");
    expect(suggestFormula("row.re", catalog)[0].insert).toBe("region");
    expect(suggestFormula("url.co", catalog)[0].insert).toBe("code");
  });

  test("offers nothing inside a string or a number", () => {
    expect(suggestFormula("'pri", catalog)).toEqual([]);
    expect(suggestFormula("12", catalog)).toEqual([]);
  });
});

describe("formulaCallAt", () => {
  test("names the function and the argument under the caret", () => {
    expect(formulaCallAt("ROUND(", 6)).toMatchObject({ fn: "ROUND", arg: 0, args: ["x", "decimals"] });
    expect(formulaCallAt("ROUND([price], ", 15)).toMatchObject({ fn: "ROUND", arg: 1 });
    expect(formulaCallAt("ROUND(MIN(1, 2), ", 17)).toMatchObject({ fn: "ROUND", arg: 1 });
    expect(formulaCallAt("ROUND(MIN(1, ", 13)).toMatchObject({ fn: "MIN", arg: 1 });
    expect(formulaCallAt("ROUND(([price] + ", 17)).toMatchObject({ fn: "ROUND", arg: 0 });
  });

  test("ignores commas in strings, and is null outside a call", () => {
    expect(formulaCallAt("SUM($sales, 'a,b", 16)).toMatchObject({ fn: "SUM", arg: 1 });
    expect(formulaCallAt("[price] × 2", 11)).toBeNull();
  });
});

describe("page data", () => {
  test("a list offers itself and its length", () => {
    expect(dataPaths("sales", [{ a: 1 }]).map((p) => [p.code, p.type])).toEqual([
      ["$sales", "list"],
      ["$sales.length", "number"],
    ]);
  });

  test("a record offers its fields two levels down, skipping what the grammar can't write", () => {
    const paths = dataPaths("me", { name: "Ada", age: 36, active: true, joined: "2026-01-02", company: { code: "X", site: { city: "BKK" } }, "bad-name": 1, none: null });
    expect(paths.map((p) => p.code)).toEqual(["$me.name", "$me.age", "$me.active", "$me.joined", "$me.company", "$me.company.code", "$me.company.site"]);
    expect(paths.find((p) => p.code === "$me.joined")?.type).toBe("date");
  });

  test("a scalar offers itself", () => {
    expect(dataPaths("count", 3)).toEqual([{ code: "$count", label: "count", type: "number" }]);
  });

  test("firstNumberField finds a column worth summing", () => {
    expect(firstNumberField([{ month: "Jan", revenue: 10 }])).toBe("revenue");
    expect(firstNumberField([{ month: "Jan" }])).toBeUndefined();
    expect(firstNumberField("no")).toBeUndefined();
  });
});

describe("starters", () => {
  test("use the page's own operands, and parse", () => {
    const starters = formulaStarters(catalog.fields, { key: "sales", field: "revenue" });
    const byKey = Object.fromEntries(starters.map((s) => [s.key, s.code]));
    expect(byKey.multiply).toBe("[quantity] × [price]");
    expect(byKey.sum).toBe("SUM($sales, 'revenue')");
    expect(byKey.days).toBe("DAYS([startDate], TODAY())");
    for (const s of starters) expect(parseFormulaText(s.code).error).toBeUndefined();
  });

  test("fall back to placeholders on an empty page, and still parse", () => {
    for (const s of formulaStarters([])) expect(parseFormulaText(s.code).error).toBeUndefined();
  });
});

describe("Show as drafts", () => {
  test.each([
    [{ type: "number", decimals: 2 }],
    [{ type: "number", grouping: false }],
    [{ type: "currency", currency: "THB", decimals: 2 }],
    [{ type: "percent", decimals: 1, of: 100 }],
    [{ type: "date", pattern: "DD MMM YYYY", timeZone: "Asia/Bangkok" }],
    [{ type: "datetime" }],
    [{ type: "boolean", trueLabel: "Open", falseLabel: "Closed" }],
    [{ type: "text" }],
  ] as const)("%j round-trips", (format) => {
    expect(draftToFormat(formatToDraft(format))).toEqual(format);
  });

  test("raw is no format, and knobs are normalised", () => {
    expect(draftToFormat(formatToDraft(undefined))).toBeUndefined();
    expect(draftToFormat({ ...formatToDraft(undefined), kind: "currency", currency: " thb ", decimals: "99" })).toEqual({ type: "currency", currency: "THB", decimals: 20 });
    expect(draftToFormat({ ...formatToDraft(undefined), kind: "currency" })).toEqual({ type: "currency", currency: "USD" });
  });
});

describe("Try it samples", () => {
  test("a live value becomes its box's text; a list or object has none", () => {
    expect(sampleFromValue(12)).toBe("12");
    expect(sampleFromValue(false)).toBe("false");
    expect(sampleFromValue("2026-10-01T00:00:00.000Z")).toBe("2026-10-01");
    expect(sampleFromValue(new Date(2026, 9, 1))).toBe("2026-10-01");
    expect(sampleFromValue("")).toBe("");
    expect(sampleFromValue([1])).toBeNull();
    expect(sampleFromValue({ a: 1 })).toBeNull();
  });

  test("a blank field starts from a sample of its type", () => {
    expect(sampleDefault("number", "qty")).toBe("1");
    expect(sampleDefault("date", "d", new Date(2026, 9, 30))).toBe("2026-10-30");
    expect(sampleDefault("boolean", "b")).toBe("true");
    expect(sampleDefault("text", "name")).toBe("name");
  });

  test("field data types map to sample types", () => {
    expect(["number", "string", "date", "datetime", "boolean", "array", undefined].map(fieldOperandType)).toEqual(["number", "text", "date", "date", "boolean", "list", "any"]);
  });
});

describe("precedence", () => {
  test("flags + / − mixed with × / ÷ at one level only", () => {
    expect(mixesPrecedence("1 + 2 × 3")).toBe(true);
    expect(mixesPrecedence("(1 + 2) × 3")).toBe(false);
    expect(mixesPrecedence("1 + 2 - 3")).toBe(false);
    expect(mixesPrecedence("'open")).toBe(false);
  });

  test("leftToRight reads every operator at one level", () => {
    const flat = parseFormulaText("1 + 2 × 3", { leftToRight: true }).expr!;
    expect(printFormulaText(flat)).toBe("(1 + 2) × 3");
    expect(printFormulaText(parseFormulaText("1 + 2 × 3").expr!)).toBe("1 + 2 × 3");
  });
});
