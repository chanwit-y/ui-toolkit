import { describe, expect, test } from "bun:test";
import type { Cond, Expr, LogicLibrary } from "../@types";
import {
  evaluateCondition,
  evaluateFormula,
  evaluateRule,
  formatResult,
  formulaOf,
  isLegacyCondition,
  libraryCycles,
  logicDeps,
  type LogicScope,
} from "./formula";

const lit = (v: number | string | boolean | null): Expr => ({ lit: v });
const field = (key: string, path?: string): Expr => ({ ref: "field", key, path });
const op = (o: "+" | "-" | "*" | "/" | "&", a: Expr, b: Expr): Expr => ({ op: o, args: [a, b] });
const cmp = (c: Extract<Cond, { cmp: string }>["cmp"], left: Expr, right?: Expr | Expr[]): Cond => ({ cmp: c, left, right });

function scopeOf(values: Record<string, unknown>, extra: Partial<LogicScope> = {}): LogicScope {
  return { field: (n) => values[n], ...extra };
}
const calc = (expr: Expr, values: Record<string, unknown> = {}, policies = {}, extra: Partial<LogicScope> = {}) =>
  evaluateFormula({ expr, ...policies }, scopeOf(values, extra));
const holds = (c: Cond, values: Record<string, unknown> = {}, extra: Partial<LogicScope> = {}) =>
  evaluateCondition(c, scopeOf(values, extra));

describe("arithmetic", () => {
  test("numeric strings coerce, formatted text does not", () => {
    expect(calc(op("*", field("qty"), field("price")), { qty: "3", price: 12.5 }).value).toBe(37.5);
    expect(calc(op("+", field("a"), lit(1)), { a: "1,250" }).value).toBeNull();
  });

  test("precedence comes from the tree; % literals are fractions", () => {
    // 100 + 15% of 200 = 130
    expect(calc(op("+", lit(100), op("*", lit(0.15), lit(200)))).value).toBe(130);
  });

  test("blank input follows onEmpty", () => {
    const e = op("+", field("a"), field("b"));
    expect(calc(e, { a: 2 }).value).toBeNull();
    expect(calc(e, { a: 2 }, { onEmpty: "zero" }).value).toBe(2);
    const err = calc(e, { a: 2 }, { onEmpty: "error" });
    expect(err.value).toBeNull();
    expect(err.error).toBeTruthy();
  });

  test("a non-numeric operand counts as blank, never NaN", () => {
    expect(calc(op("-", field("a"), lit(1)), { a: "abc" }).value).toBeNull();
    expect(calc(op("-", field("a"), lit(1)), { a: true }, { onEmpty: "zero" }).value).toBe(-1);
  });

  test("divide by zero follows onDivideByZero", () => {
    const e = op("/", lit(10), field("d"));
    expect(calc(e, { d: 0 }).value).toBeNull();
    expect(calc(e, { d: 0 }, { onDivideByZero: "zero" }).value).toBe(0);
    expect(calc(e, { d: 0 }, { onDivideByZero: "error" }).error).toBe("Division by zero");
  });

  test("& joins text, blank is empty", () => {
    expect(calc(op("&", op("&", field("first"), lit(" ")), field("last")), { first: "Ada", last: null }).value).toBe("Ada ");
  });
});

describe("functions", () => {
  test("ROUND half away from zero", () => {
    expect(calc({ fn: "ROUND", args: [lit(1.005), lit(2)] }).value).toBe(1.01);
    expect(calc({ fn: "ROUND", args: [lit(-2.5)] }).value).toBe(-3);
  });

  test("MIN / MAX skip blanks; LEN of blank is 0", () => {
    expect(calc({ fn: "MIN", args: [lit(4), field("x"), lit(2)] }).value).toBe(2);
    expect(calc({ fn: "MAX", args: [field("x")] }).value).toBeNull();
    expect(calc({ fn: "LEN", args: [field("x")] }).value).toBe(0);
    expect(calc({ fn: "LEN", args: [lit("hello")] }).value).toBe(5);
    expect(calc({ fn: "ABS", args: [lit(-3)] }).value).toBe(3);
  });

  test("TODAY and DAYS", () => {
    const today = new Date(2026, 9, 30, 15, 0);
    expect((calc({ fn: "TODAY", args: [] }, {}, {}, { today }).value as Date).getHours()).toBe(0);
    expect(calc({ fn: "DAYS", args: [lit("2026-10-01"), { fn: "TODAY", args: [] }] }, {}, {}, { today }).value).toBe(29);
    expect(calc({ fn: "DAYS", args: [lit("nope"), lit("2026-10-01")] }).value).toBeNull();
  });

  test("COUNT and SUM over a list", () => {
    const lines = [{ amount: 10 }, { amount: "5" }, { amount: null }];
    expect(calc({ fn: "COUNT", args: [field("lines")] }, { lines }).value).toBe(3);
    expect(calc({ fn: "COUNT", args: [field("none")] }).value).toBe(0);
    expect(calc({ fn: "SUM", args: [field("lines"), lit("amount")] }, { lines }).value).toBe(15);
  });
});

describe("conditions", () => {
  test("blank makes ordering comparisons false", () => {
    expect(holds(cmp("gt", field("a"), lit(5)), {})).toBe(false);
    expect(holds(cmp("lt", field("a"), lit(5)), {})).toBe(false);
    expect(holds(cmp("between", field("a"), [lit(1), lit(9)]), {})).toBe(false);
  });

  test("eq with blank: blank equals only blank", () => {
    expect(holds(cmp("eq", field("a"), lit("")), { a: null })).toBe(true);
    expect(holds(cmp("eq", field("a"), lit(0)), { a: undefined })).toBe(false);
    expect(holds(cmp("neq", field("a"), lit(0)), { a: undefined })).toBe(true);
  });

  test("number vs numeric string, boolean vs text", () => {
    expect(holds(cmp("eq", field("a"), lit(12)), { a: "12" })).toBe(true);
    expect(holds(cmp("gte", field("a"), lit(10)), { a: "12" })).toBe(true);
    expect(holds(cmp("eq", field("ok"), lit(true)), { ok: "true" })).toBe(true);
  });

  test("dates compare as dates when one side is date-typed", () => {
    const fieldType = (n: string) => (n === "due" ? "date" : "string");
    expect(holds(cmp("lt", field("due"), { fn: "TODAY", args: [] }), { due: "2026-01-01" }, { today: new Date(2026, 5, 1) })).toBe(true);
    expect(holds(cmp("eq", field("due"), lit("2026-01-01")), { due: new Date("2026-01-01") }, { fieldType })).toBe(true);
  });

  test("text eq is case-sensitive, contains is not", () => {
    expect(holds(cmp("eq", field("c"), lit("TH")), { c: "th" })).toBe(false);
    expect(holds(cmp("contains", field("c"), lit("ail")), { c: "Thailand" })).toBe(true);
    expect(holds(cmp("contains", field("tags"), lit("b")), { tags: ["a", "b"] })).toBe(true);
  });

  test("in, between (inclusive), empty / notEmpty", () => {
    expect(holds(cmp("in", field("r"), [lit("TH"), lit("ID")]), { r: "ID" })).toBe(true);
    expect(holds(cmp("between", field("n"), [lit(1), lit(10)]), { n: 10 })).toBe(true);
    expect(holds(cmp("empty", field("list")), { list: [] })).toBe(true);
    expect(holds(cmp("notEmpty", field("s")), { s: "x" })).toBe(true);
  });

  test("all / any groups nest; empty groups are true / false", () => {
    const c: Cond = { all: [cmp("eq", field("t"), lit("Business")), { any: [cmp("gt", field("n"), lit(5)), cmp("empty", field("x"))] }] };
    expect(holds(c, { t: "Business", n: 1 })).toBe(true);
    expect(holds(c, { t: "Business", n: 1, x: "y" })).toBe(false);
    expect(holds({ all: [] })).toBe(true);
    expect(holds({ any: [] })).toBe(false);
  });

  test("row refs: the item, $index, $value", () => {
    const scope: LogicScope = { row: { price: 5, tags: { hot: true } }, index: 2, value: "x" };
    expect(evaluateCondition(cmp("eq", { ref: "row", key: "price" }, lit(5)), scope)).toBe(true);
    expect(evaluateCondition(cmp("eq", { ref: "row", key: "tags", path: "hot" }, lit(true)), scope)).toBe(true);
    expect(evaluateCondition(cmp("eq", { ref: "row", key: "$index" }, lit(2)), scope)).toBe(true);
    expect(evaluateCondition(cmp("eq", { ref: "row", key: "$value" }, lit("x")), scope)).toBe(true);
  });

  test("url refs read params and query", () => {
    const scope: LogicScope = { params: { code: "TH" }, searchParams: new URLSearchParams("tab=2") };
    expect(evaluateCondition(cmp("eq", { ref: "url", key: "code" }, lit("TH")), scope)).toBe(true);
    expect(evaluateCondition(cmp("eq", { ref: "url", key: "tab", source: "query" }, lit(2)), scope)).toBe(true);
  });
});

const library: LogicLibrary = {
  formulas: {
    subtotal: { expr: op("*", field("qty"), field("price")) },
    margin: { expr: op("/", op("-", field("rev"), field("cost")), field("rev")), format: { type: "percent", decimals: 1 } },
    loopA: { expr: { formula: "loopB" } },
    loopB: { expr: op("+", { formula: "loopA" }, lit(1)) },
  },
  rules: {
    discount: {
      resultType: "number",
      rule: {
        branches: [
          { when: cmp("gte", { formula: "subtotal" }, lit(10000)), then: lit(0.1) },
          { when: cmp("gte", { formula: "subtotal" }, lit(5000)), then: lit(0.05) },
        ],
        else: lit(0),
      },
    },
    isBusiness: { resultType: "boolean", rule: { branches: [{ when: cmp("eq", field("type"), lit("Business")), then: lit(true) }], else: lit(false) } },
    nested: {
      resultType: "text",
      rule: {
        branches: [{ when: cmp("eq", field("r"), lit("TH")), then: { branches: [{ when: cmp("gt", field("n"), lit(5)), then: lit("big") }], else: lit("small") } }],
        else: lit("other"),
      },
    },
  },
};

describe("library", () => {
  test("saved formulas and rules compose", () => {
    const scope = scopeOf({ qty: 100, price: 60 }, { library });
    expect(evaluateFormula({ expr: { rule: "discount" } }, scope).value).toBe(0.05);
    expect(evaluateFormula({ expr: op("*", { formula: "subtotal" }, op("-", lit(1), { rule: "discount" })) }, scope).value).toBe(5700);
  });

  test("first matching branch wins; nested rules; else", () => {
    expect(evaluateRule(library.rules!.nested.rule, scopeOf({ r: "TH", n: 9 })).value).toBe("big");
    expect(evaluateRule(library.rules!.nested.rule, scopeOf({ r: "TH", n: 1 })).value).toBe("small");
    expect(evaluateRule(library.rules!.nested.rule, scopeOf({ r: "ID" })).value).toBe("other");
  });

  test("a boolean rule as a condition; unknown names are false / errors", () => {
    expect(evaluateCondition({ rule: "isBusiness" }, scopeOf({ type: "Business" }, { library }))).toBe(true);
    expect(evaluateCondition({ rule: "missing" }, scopeOf({}, { library }))).toBe(false);
    expect(evaluateFormula({ expr: { formula: "missing" } }, scopeOf({}, { library })).error).toBe('No formula "missing"');
  });

  test("cycles are errors at runtime and listed up front", () => {
    expect(evaluateFormula({ expr: { formula: "loopA" } }, scopeOf({}, { library })).error).toContain("refers to itself");
    expect(libraryCycles(library).sort()).toEqual(["formula:loopA", "formula:loopB"]);
  });

  test("formulaOf: a saved name, a rule name, an inline expr", () => {
    expect(formulaOf({ type: "formula", key: "none", formula: "margin" }, library)?.format?.type).toBe("percent");
    expect(formulaOf({ type: "formula", key: "none", formula: "discount" }, library)?.expr).toEqual({ rule: "discount" });
    expect(formulaOf({ type: "formula", key: "none", expr: lit(1) }, library)?.expr).toEqual(lit(1));
    expect(formulaOf({ type: "state", key: "x" }, library)).toBeUndefined();
  });

  test("deps follow saved items", () => {
    const deps = logicDeps({ cmp: "gt", left: { rule: "discount" }, right: { ref: "state", key: "me", path: "limit" } }, library);
    expect(deps.fields.sort()).toEqual(["price", "qty"]);
    expect(deps.states).toEqual(["me"]);
  });
});

describe("display", () => {
  test("formatting applies at display only", () => {
    const scope = scopeOf({ rev: 100, cost: 66 }, { library });
    const def = formulaOf({ type: "formula", key: "none", formula: "margin" }, library)!;
    const r = evaluateFormula(def, scope);
    expect(r.value).toBe(0.34);
    expect(formatResult(r.value, def.format, "en-US")).toBe("34.0%");
    expect(formatResult(null, def.format, "en-US")).toBe("");
  });

  test("legacy conditions are recognised", () => {
    expect(isLegacyCondition({ left: { key: "a" }, right: { val: 1 }, operator: "eq" })).toBe(true);
    expect(isLegacyCondition({ all: [] })).toBe(false);
  });
});
