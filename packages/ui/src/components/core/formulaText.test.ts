import { describe, expect, test } from "bun:test";
import type { Expr } from "../@types";
import { parseFormulaText, printFormulaText } from "./formulaText";

const parse = (text: string): Expr => {
  const r = parseFormulaText(text);
  if (r.error) throw new Error(`${text}: ${r.error} at ${r.at}`);
  return r.expr;
};

describe("parseFormulaText", () => {
  test("fields, bracketed or bare, with a path", () => {
    expect(parse("[qty]")).toEqual({ ref: "field", key: "qty" });
    expect(parse("qty")).toEqual({ ref: "field", key: "qty" });
    expect(parse("[address.city]")).toEqual({ ref: "field", key: "address", path: "city" });
  });

  test("precedence: & below + − below × ÷, left-associative, brackets", () => {
    expect(parse("1 + 2 × 3")).toEqual({ op: "+", args: [{ lit: 1 }, { op: "*", args: [{ lit: 2 }, { lit: 3 }] }] });
    expect(parse("(1 + 2) * 3")).toEqual({ op: "*", args: [{ op: "+", args: [{ lit: 1 }, { lit: 2 }] }, { lit: 3 }] });
    expect(parse("10 - 2 - 3")).toEqual({ op: "-", args: [{ op: "-", args: [{ lit: 10 }, { lit: 2 }] }, { lit: 3 }] });
    expect(parse("'a' & 1 + 2")).toEqual({ op: "&", args: [{ lit: "a" }, { op: "+", args: [{ lit: 1 }, { lit: 2 }] }] });
  });

  test("literals: percent, strings with escapes, keywords, unary minus", () => {
    expect(parse("15%")).toEqual({ lit: 0.15 });
    expect(parse("'it\\'s'")).toEqual({ lit: "it's" });
    expect(parse("TRUE")).toEqual({ lit: true });
    expect(parse("empty")).toEqual({ lit: null });
    expect(parse("-3")).toEqual({ lit: -3 });
    expect(parse("-[x]")).toEqual({ op: "-", args: [{ lit: 0 }, { ref: "field", key: "x" }] });
  });

  test("functions, case-insensitive, nested", () => {
    expect(parse("round(qty / 3, 2)")).toEqual({ fn: "ROUND", args: [{ op: "/", args: [{ ref: "field", key: "qty" }, { lit: 3 }] }, { lit: 2 }] });
    expect(parse("DAYS(start, TODAY())")).toEqual({ fn: "DAYS", args: [{ ref: "field", key: "start" }, { fn: "TODAY", args: [] }] });
  });

  test("page data, row, url, saved items", () => {
    expect(parse("$order.total")).toEqual({ ref: "state", key: "order", path: "total" });
    expect(parse("row")).toEqual({ ref: "row", key: "none" });
    expect(parse("row.price.amount")).toEqual({ ref: "row", key: "price", path: "amount" });
    expect(parse("url.id")).toEqual({ ref: "url", key: "id", source: "param" });
    expect(parse("query.tab")).toEqual({ ref: "url", key: "tab", source: "query" });
    expect(parse("((Subtotal)) × (1 - IF((Discount rate)))")).toEqual({
      op: "*",
      args: [{ formula: "Subtotal" }, { op: "-", args: [{ lit: 1 }, { rule: "Discount rate" }] }],
    });
  });

  test("errors carry a position", () => {
    expect(parseFormulaText("")).toMatchObject({ error: "Type a formula", at: 0 });
    expect(parseFormulaText("1 +")).toMatchObject({ at: 3 });
    expect(parseFormulaText("ROUND 2")).toMatchObject({ error: "ROUND needs ( )", at: 0 });
    expect(parseFormulaText("[qty")).toMatchObject({ error: "Missing ] after [", at: 0 });
    expect(parseFormulaText("1 2")).toMatchObject({ at: 2 });
    expect(parseFormulaText("a # b")).toMatchObject({ at: 2 });
  });
});

describe("printFormulaText", () => {
  test("round-trips", () => {
    for (const text of ["[qty] × [price]", "ROUND([a] ÷ [b], 2)", "'Hello, ' & [name] & '!'", "(1 + 2) × 3", "10 − (2 − 3)", "$order.total + row.x", "((Subtotal)) × (1 − IF((Discount rate)))", "DAYS([start], TODAY())"]) {
      expect(printFormulaText(parse(text))).toBe(text);
    }
  });
  test("keeps needed brackets only", () => {
    expect(printFormulaText(parse("1 + (2 × 3)"))).toBe("1 + 2 × 3");
    expect(printFormulaText(parse("(1 + 2) × 3"))).toBe("(1 + 2) × 3");
  });
});
