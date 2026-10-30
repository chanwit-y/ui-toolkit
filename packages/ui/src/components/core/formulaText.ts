import type { Expr, ExprFunction } from "../@types";

/**
 * Formula text ⇄ `Expr` for the runtime `formula` element (the end user
 * writes a formula in the running app). The grammar is the studio's Code
 * mode with engine names: `[field]` or a bare `field`, `$slice.path` (page
 * data), `row.x`, `url.x` / `query.x`, `((Saved formula))`, `IF((Rule))`,
 * numbers (`15%` = 0.15), `'text'`, `TRUE` / `FALSE` / `EMPTY`, the functions
 * below, `+ − × ÷ &` (also `* /`) and parentheses. No conditions here — a
 * rule is referenced, never written.
 */
export const FORMULA_FUNCTIONS: { fn: ExprFunction; args: string; hint: string }[] = [
  { fn: "ROUND", args: "x, decimals", hint: "Round half away from zero" },
  { fn: "MIN", args: "a, b, …", hint: "Smallest (blanks skipped)" },
  { fn: "MAX", args: "a, b, …", hint: "Largest (blanks skipped)" },
  { fn: "ABS", args: "x", hint: "Without the sign" },
  { fn: "LEN", args: "text", hint: "Length of a text or a list" },
  { fn: "TODAY", args: "", hint: "Today’s date" },
  { fn: "DAYS", args: "from, to", hint: "Whole days from → to" },
  { fn: "COUNT", args: "list", hint: "Items in a list" },
  { fn: "SUM", args: "list, 'field'", hint: "Sum of a field over a list" },
];

const FUNCTION_NAMES = new Set<string>(FORMULA_FUNCTIONS.map((f) => f.fn));

type Op = "+" | "-" | "*" | "/" | "&";
type Tok =
  | { k: "num"; v: number; at: number }
  | { k: "str"; v: string; at: number }
  | { k: "field"; v: string; at: number }
  | { k: "state"; v: string; at: number }
  | { k: "formula"; v: string; at: number }
  | { k: "rule"; v: string; at: number }
  | { k: "word"; v: string; at: number }
  | { k: "op"; v: Op; at: number }
  | { k: "(" | ")" | ","; at: number };

export class FormulaParseError extends Error {
  at: number;
  constructor(message: string, at: number) {
    super(message);
    this.at = at;
  }
}

const OP_ALIAS: Record<string, Op> = { "+": "+", "-": "-", "−": "-", "*": "*", "×": "*", "/": "/", "÷": "/", "&": "&" };
const PREC: Record<Op, number> = { "&": 1, "+": 2, "-": 2, "*": 3, "/": 3 };
const SHOW_OP: Record<Op, string> = { "*": "×", "/": "÷", "+": "+", "-": "−", "&": "&" };

function lex(text: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const at = i;
    const rest = text.slice(i);
    const rule = /^(?:IF|if)\(\(([^()]*)\)\)/.exec(rest);
    if (rule) {
      out.push({ k: "rule", v: rule[1].trim(), at });
      i += rule[0].length;
      continue;
    }
    const saved = /^\(\(([^()[\]'"$]*[A-Za-z][^()[\]'"$]*)\)\)/.exec(rest);
    if (saved) {
      out.push({ k: "formula", v: saved[1].trim(), at });
      i += saved[0].length;
      continue;
    }
    if (c === "[") {
      const end = text.indexOf("]", i + 1);
      if (end < 0) throw new FormulaParseError("Missing ] after [", at);
      out.push({ k: "field", v: text.slice(i + 1, end).trim(), at });
      i = end + 1;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      let s = "";
      while (j < text.length && text[j] !== c) {
        if (text[j] === "\\" && j + 1 < text.length) j++;
        s += text[j++];
      }
      if (j >= text.length) throw new FormulaParseError(`Missing closing ${c}`, at);
      out.push({ k: "str", v: s, at });
      i = j + 1;
      continue;
    }
    if (c === "$") {
      const m = /^\$([A-Za-z_][\w.]*)/.exec(rest);
      if (!m) throw new FormulaParseError("Expected a page-data name after $", at);
      out.push({ k: "state", v: m[1], at });
      i += m[0].length;
      continue;
    }
    const num = /^(\d+(?:\.\d+)?|\.\d+)(%?)/.exec(rest);
    if (num) {
      out.push({ k: "num", v: num[2] ? Number(num[1]) / 100 : Number(num[1]), at });
      i += num[0].length;
      continue;
    }
    const word = /^[A-Za-z_][\w.]*/.exec(rest);
    if (word) {
      out.push({ k: "word", v: word[0], at });
      i += word[0].length;
      continue;
    }
    if (OP_ALIAS[c]) {
      out.push({ k: "op", v: OP_ALIAS[c], at });
      i++;
      continue;
    }
    if (c === "(" || c === ")" || c === ",") {
      out.push({ k: c, at });
      i++;
      continue;
    }
    throw new FormulaParseError(`Unexpected “${c}”`, at);
  }
  return out;
}

/** `a.b.c` → `{ key: "a", path: "b.c" }`. */
function splitPath(v: string): { key: string; path?: string } {
  const dot = v.indexOf(".");
  return dot < 0 ? { key: v } : { key: v.slice(0, dot), path: v.slice(dot + 1) };
}

class Parser {
  private i = 0;
  constructor(
    private toks: Tok[],
    private end: number,
    /** Read every arithmetic operator at one level, left to right (`leftToRight`). */
    private flat = false,
  ) {}

  private peek(): Tok | undefined {
    return this.toks[this.i];
  }
  private next(): Tok {
    const t = this.toks[this.i++];
    if (!t) throw new FormulaParseError("Unexpected end of formula", this.end);
    return t;
  }
  private isOp(t: Tok | undefined, ...ops: Op[]): t is Extract<Tok, { k: "op" }> {
    return !!t && t.k === "op" && ops.includes(t.v);
  }

  expr(): Expr {
    return this.join();
  }
  private join(): Expr {
    let left = this.add();
    while (this.isOp(this.peek(), "&")) {
      this.next();
      left = { op: "&", args: [left, this.add()] };
    }
    return left;
  }
  private add(): Expr {
    let left = this.mul();
    const ops: Op[] = this.flat ? ["+", "-", "*", "/"] : ["+", "-"];
    for (let t = this.peek(); this.isOp(t, ...ops); t = this.peek()) {
      this.next();
      left = { op: t.v, args: [left, this.mul()] };
    }
    return left;
  }
  private mul(): Expr {
    if (this.flat) return this.unary();
    let left = this.unary();
    for (let t = this.peek(); this.isOp(t, "*", "/"); t = this.peek()) {
      this.next();
      left = { op: t.v, args: [left, this.unary()] };
    }
    return left;
  }
  private unary(): Expr {
    const t = this.peek();
    if (this.isOp(t, "-")) {
      this.next();
      const x = this.unary();
      return "lit" in x && typeof x.lit === "number" ? { lit: -x.lit } : { op: "-", args: [{ lit: 0 }, x] };
    }
    if (this.isOp(t, "+")) {
      this.next();
      return this.unary();
    }
    return this.primary();
  }
  private primary(): Expr {
    const t = this.next();
    switch (t.k) {
      case "num":
        return { lit: t.v };
      case "str":
        return { lit: t.v };
      case "field":
        if (!t.v) throw new FormulaParseError("Empty [ ]", t.at);
        return { ref: "field", ...splitPath(t.v) };
      case "state":
        return { ref: "state", ...splitPath(t.v) };
      case "formula":
        return { formula: t.v };
      case "rule":
        return { rule: t.v };
      case "(": {
        const inner = this.expr();
        const close = this.next();
        if (close.k !== ")") throw new FormulaParseError("Expected )", close.at);
        return inner;
      }
      case "word":
        return this.word(t);
      default:
        throw new FormulaParseError(`Unexpected “${t.k === "op" ? SHOW_OP[t.v] : t.k}”`, t.at);
    }
  }
  private word(t: Extract<Tok, { k: "word" }>): Expr {
    const upper = t.v.toUpperCase();
    if (upper === "TRUE") return { lit: true };
    if (upper === "FALSE") return { lit: false };
    if (upper === "EMPTY" || upper === "NULL") return { lit: null };
    if (FUNCTION_NAMES.has(upper)) {
      const open = this.peek();
      if (!open || open.k !== "(") throw new FormulaParseError(`${upper} needs ( )`, t.at);
      this.next();
      const args: Expr[] = [];
      if (this.peek()?.k !== ")") {
        args.push(this.expr());
        while (this.peek()?.k === ",") {
          this.next();
          args.push(this.expr());
        }
      }
      const close = this.next();
      if (close.k !== ")") throw new FormulaParseError("Expected )", close.at);
      return { fn: upper as ExprFunction, args };
    }
    const { key, path } = splitPath(t.v);
    if (key === "row") return path ? { ref: "row", ...splitPath(path) } : { ref: "row", key: "none" };
    if (key === "url" || key === "query") {
      if (!path) throw new FormulaParseError(`Expected ${key}.<name>`, t.at);
      return { ref: "url", ...splitPath(path), source: key === "query" ? "query" : "param" };
    }
    // A bare word is a form field (the brackets are optional for the end user).
    return { ref: "field", key, ...(path ? { path } : {}) };
  }
  done(): void {
    const t = this.peek();
    if (t) throw new FormulaParseError(`Unexpected “${t.k === "op" ? SHOW_OP[t.v] : t.k === "word" ? t.v : t.k}”`, t.at);
  }
}

export type FormulaParse = { expr: Expr; error?: undefined } | { expr?: undefined; error: string; at: number };

/**
 * Parse formula text; blank text is an error too (the caller decides what
 * blank means). `leftToRight` ignores precedence (what the editor's "× and ÷
 * are calculated first" note offers instead).
 */
export function parseFormulaText(text: string, { leftToRight = false }: { leftToRight?: boolean } = {}): FormulaParse {
  try {
    const toks = lex(text);
    if (toks.length === 0) return { error: "Type a formula", at: 0 };
    const p = new Parser(toks, text.length, leftToRight);
    const expr = p.expr();
    p.done();
    return { expr };
  } catch (e) {
    if (e instanceof FormulaParseError) return { error: e.message, at: e.at };
    throw e;
  }
}

/** Whether bracket-free text mixes `+ −` with `× ÷` at one level. */
export function mixesPrecedence(text: string): boolean {
  let toks: Tok[];
  try {
    toks = lex(text);
  } catch {
    return false;
  }
  let depth = 0;
  const seen: Record<number, { add: boolean; mul: boolean }> = {};
  for (const t of toks) {
    if (t.k === "(") depth++;
    else if (t.k === ")") depth--;
    else if (t.k === "op" && t.v !== "&") {
      const s = (seen[depth] ??= { add: false, mul: false });
      if (t.v === "+" || t.v === "-") s.add = true;
      else s.mul = true;
      if (s.add && s.mul) return true;
    }
  }
  return false;
}

function printLit(v: number | string | boolean | null): string {
  if (v === null) return "EMPTY";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  return `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/** An `Expr` as formula text (`[qty] × [price]`, `ROUND(((Total)), 2)`); `parseFormulaText` reads it back. */
export function printFormulaText(e: Expr, parentPrec = 0): string {
  if ("lit" in e) return printLit(e.lit);
  if ("ref" in e) {
    const path = e.path ? `.${e.path}` : "";
    switch (e.ref) {
      case "field":
        return `[${e.key}${path}]`;
      case "state":
        return `$${e.key}${path}`;
      case "row":
        return e.key === "none" ? `row${path}` : `row.${e.key}${path}`;
      case "url":
        return `${e.source === "query" ? "query" : "url"}.${e.key}`;
    }
  }
  if ("formula" in e) return `((${e.formula}))`;
  if ("rule" in e) return `IF((${e.rule}))`;
  if ("op" in e) {
    const p = PREC[e.op];
    // Left-associative: the right side of an equal-precedence op needs brackets.
    const text = `${printFormulaText(e.args[0], p)} ${SHOW_OP[e.op]} ${printFormulaText(e.args[1], p + 0.5)}`;
    return p < parentPrec ? `(${text})` : text;
  }
  return `${e.fn}(${e.args.map((a) => printFormulaText(a)).join(", ")})`;
}
