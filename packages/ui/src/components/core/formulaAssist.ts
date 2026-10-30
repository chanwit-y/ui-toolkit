import type { CellFormat } from "../../util/format";
import type { FormulaBlankPolicy } from "../@types";
import { FORMULA_FUNCTIONS } from "./formulaText";

/**
 * What the `formula` element's editor needs beyond the grammar: the bar's
 * colours, autocomplete and function hint, the Insert list, the "Start from"
 * starters and the flat Show as draft. The studio's editor (`Logic/model.ts`)
 * does the same over its id-based names; this one reads the engine's names and
 * what is really on the page. Pure: the tests drive it without React.
 */

// ---- operand types ----------------------------------------------------------

export type OperandType = "text" | "number" | "date" | "boolean" | "list" | "any";

/** A field's `dataType` as the type the editor shows and samples. */
export function fieldOperandType(dataType: string | undefined): OperandType {
  if (!dataType) return "any";
  if (/^(number|integer|float|int|currency)/i.test(dataType)) return "number";
  if (/^date/i.test(dataType)) return "date";
  if (/^bool/i.test(dataType)) return "boolean";
  if (/^array/i.test(dataType)) return "list";
  return "text";
}

/** A loaded value's type. */
export function valueOperandType(v: unknown): OperandType {
  if (Array.isArray(v)) return "list";
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (v instanceof Date || (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v))) return "date";
  if (typeof v === "string") return "text";
  return "any";
}

// ---- the bar's colours ------------------------------------------------------

export type FormulaTone = "field" | "data" | "saved" | "rule" | "fn" | "value" | "op" | "punct" | "error";
export type FormulaSpan = { from: number; to: number; tone: FormulaTone };

const FUNCTION_NAMES = new Set<string>(FORMULA_FUNCTIONS.map((f) => f.fn));
const VALUE_WORDS = new Set(["TRUE", "FALSE", "EMPTY", "NULL"]);
const OPERATORS = "+-−*×/÷&";

/**
 * Formula text → coloured spans over every non-blank character, never
 * throwing: whatever doesn't lex is one `error` span to the end. `errorAt` (a
 * parse problem's position) marks the token there too, or the last token when
 * something is missing at the end.
 */
export function formulaSpans(text: string, errorAt?: number): FormulaSpan[] {
  const out: FormulaSpan[] = [];
  let failedAt: number | undefined;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const rest = text.slice(i);
    const push = (length: number, tone: FormulaTone) => {
      out.push({ from: i, to: i + length, tone });
      i += length;
    };
    let m: RegExpExecArray | null;
    if ((m = /^(?:IF|if)\(\([^()]*\)\)/.exec(rest))) push(m[0].length, "rule");
    else if ((m = /^\(\([^()[\]'"$]*[A-Za-z][^()[\]'"$]*\)\)/.exec(rest))) push(m[0].length, "saved");
    else if (c === "[") {
      const end = text.indexOf("]", i + 1);
      if (end < 0) {
        failedAt = i;
        break;
      }
      push(end + 1 - i, "field");
    } else if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== c) j += text[j] === "\\" ? 2 : 1;
      if (j >= text.length) {
        failedAt = i;
        break;
      }
      push(j + 1 - i, "value");
    } else if ((m = /^\$[A-Za-z_][\w.]*/.exec(rest))) push(m[0].length, "data");
    else if ((m = /^(?:\d+(?:\.\d+)?|\.\d+)%?/.exec(rest))) push(m[0].length, "value");
    else if ((m = /^[A-Za-z_][\w.]*/.exec(rest))) {
      const upper = m[0].toUpperCase();
      const tone: FormulaTone = FUNCTION_NAMES.has(upper) ? "fn" : VALUE_WORDS.has(upper) ? "value" : /^(row|url|query)(\.|$)/.test(m[0]) ? "data" : "field";
      push(m[0].length, tone);
    } else if (OPERATORS.includes(c)) push(1, "op");
    else if (c === "(" || c === ")" || c === ",") push(1, "punct");
    else {
      failedAt = i;
      break;
    }
  }
  if (errorAt !== undefined) {
    const hit = out.find((s) => s.from <= errorAt && errorAt < s.to);
    if (hit) hit.tone = "error";
    else if (errorAt >= text.trimEnd().length && text.trim() && out.length) out[out.length - 1].tone = "error";
  }
  if (failedAt !== undefined) out.push({ from: failedAt, to: text.length, tone: "error" });
  return out;
}

// ---- autocomplete -----------------------------------------------------------

export type SuggestKind = "field" | "data" | "saved" | "rule" | "fn";
export type FormulaSuggestion = { label: string; sub?: string; insert: string; replace: number; kind: SuggestKind };

/** What the page offers a formula: the editor's Insert list and suggestions come from one catalog. */
export type FormulaCatalog = {
  fields: { name: string; kind: string }[];
  /** Page-data slices, each with the paths its loaded value offers. */
  data: { key: string; paths: { code: string; label: string; type: OperandType }[] }[];
  rowFields: { name: string; type: OperandType }[];
  urlParams: string[];
  queryParams: string[];
  formulas: string[];
  rules: { name: string; resultType: string }[];
};

/** Whether the caret sits inside a string (no suggestions there). */
function insideString(before: string): boolean {
  let quote: string | null = null;
  let bracket = false;
  for (const ch of before) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (bracket) {
      if (ch === "]") bracket = false;
    } else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === "[") bracket = true;
  }
  return quote !== null;
}

/**
 * Suggestions for the text before the caret. `[`, `((`, `IF((`, `$`, `row.`
 * and `url.` narrow to their kind; a plain word offers every kind at once and
 * inserts the right syntax.
 */
export function suggestFormula(before: string, cat: FormulaCatalog): FormulaSuggestion[] {
  if (insideString(before)) return [];
  const has = (s: string, q: string) => s.toLowerCase().includes(q.toLowerCase());
  const starts = (s: string, q: string) => s.toLowerCase().startsWith(q.toLowerCase());
  let m: RegExpExecArray | null;
  if ((m = /IF\(\(([^()]*)$/.exec(before))) {
    const q = m[1];
    return cat.rules.filter((r) => has(r.name, q)).map((r) => ({ label: r.name, sub: `rule · ${r.resultType}`, insert: `${r.name}))`, replace: q.length, kind: "rule" }));
  }
  if ((m = /\(\(([^()]*)$/.exec(before))) {
    const q = m[1];
    return cat.formulas.filter((f) => has(f, q)).map((f) => ({ label: f, sub: "formula", insert: `${f}))`, replace: q.length, kind: "saved" }));
  }
  if ((m = /\[([^\]]*)$/.exec(before))) {
    const q = m[1];
    return cat.fields.filter((f) => has(f.name, q)).map((f) => ({ label: f.name, sub: f.kind, insert: `${f.name}]`, replace: q.length, kind: "field" }));
  }
  if ((m = /\$([A-Za-z0-9_]*)$/.exec(before))) {
    const q = m[1];
    return cat.data.filter((d) => has(d.key, q)).map((d) => ({ label: `$${d.key}`, sub: "page data", insert: d.key, replace: q.length, kind: "data" }));
  }
  if ((m = /\brow\.([A-Za-z0-9_]*)$/.exec(before))) {
    const q = m[1];
    return cat.rowFields.filter((f) => has(f.name, q)).map((f) => ({ label: `row.${f.name}`, sub: f.type, insert: f.name, replace: q.length, kind: "data" }));
  }
  if ((m = /\b(url|query)\.([A-Za-z0-9_]*)$/.exec(before))) {
    const q = m[2];
    const list = m[1] === "url" ? cat.urlParams : cat.queryParams;
    return list.filter((p) => has(p, q)).map((p) => ({ label: p, sub: "URL", insert: p, replace: q.length, kind: "data" }));
  }
  // A plain word (not part of a name, a number or a dotted path).
  if (!(m = /(?:^|[^A-Za-z0-9_.$[\]'"])([A-Za-z][A-Za-z0-9_]*)$/.exec(before))) return [];
  const q = m[1];
  const out: FormulaSuggestion[] = [];
  for (const f of cat.fields) if (has(f.name, q)) out.push({ label: f.name, sub: `field · ${f.kind}`, insert: `[${f.name}]`, replace: q.length, kind: "field" });
  for (const f of cat.formulas) if (has(f, q)) out.push({ label: f, sub: "saved formula", insert: `((${f}))`, replace: q.length, kind: "saved" });
  for (const r of cat.rules) if (has(r.name, q)) out.push({ label: r.name, sub: `saved rule · ${r.resultType}`, insert: `IF((${r.name}))`, replace: q.length, kind: "rule" });
  for (const fn of FORMULA_FUNCTIONS) if (starts(fn.fn, q)) out.push({ label: `${fn.fn}(${fn.args})`, sub: fn.hint, insert: `${fn.fn}(${fn.args ? "" : ")"}`, replace: q.length, kind: "fn" });
  for (const d of cat.data) if (has(d.key, q)) out.push({ label: `$${d.key}`, sub: "page data", insert: `$${d.key}`, replace: q.length, kind: "data" });
  for (const f of cat.rowFields) if (has(f.name, q)) out.push({ label: `row.${f.name}`, sub: `row · ${f.type}`, insert: `row.${f.name}`, replace: q.length, kind: "data" });
  for (const p of cat.urlParams) if (has(p, q)) out.push({ label: `url.${p}`, sub: "URL", insert: `url.${p}`, replace: q.length, kind: "data" });
  for (const p of cat.queryParams) if (has(p, q)) out.push({ label: `query.${p}`, sub: "URL", insert: `query.${p}`, replace: q.length, kind: "data" });
  // Starts-with matches first, then the rest, each in catalog order.
  const bare = (s: FormulaSuggestion) => s.label.replace(/^[$[(]+|^row\.|^url\.|^query\./, "");
  return [...out.filter((s) => starts(bare(s), q)), ...out.filter((s) => !starts(bare(s), q))];
}

// ---- the function hint ------------------------------------------------------

/** The function call the caret is inside and which argument it is on; `null` outside any call. */
export function formulaCallAt(text: string, caret: number): { fn: string; arg: number; args: string[]; hint: string } | null {
  const before = text.slice(0, caret);
  // Which characters sit inside strings / brackets, then scan back over the rest.
  const literal: boolean[] = [];
  let quote: string | null = null;
  let bracket = false;
  for (const ch of before) {
    if (quote) {
      literal.push(true);
      if (ch === quote) quote = null;
    } else if (bracket) {
      literal.push(true);
      if (ch === "]") bracket = false;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      literal.push(true);
    } else if (ch === "[") {
      bracket = true;
      literal.push(true);
    } else literal.push(false);
  }
  let depth = 0;
  let arg = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    if (literal[i]) continue;
    const ch = before[i];
    if (ch === ")") depth++;
    else if (ch === "," && depth === 0) arg++;
    else if (ch === "(") {
      if (depth > 0) depth--;
      else {
        const m = /([A-Za-z]+)$/.exec(before.slice(0, i));
        const def = m ? FORMULA_FUNCTIONS.find((f) => f.fn === m[1].toUpperCase()) : undefined;
        if (def) return { fn: def.fn, arg, args: def.args ? def.args.split(",").map((s) => s.trim()) : [], hint: def.hint };
        // A plain bracket: keep looking outward.
        arg = 0;
      }
    }
  }
  return null;
}

// ---- page data --------------------------------------------------------------

const NAME = /^[A-Za-z_]\w*$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);

/**
 * What a loaded slice offers, read off the value itself (the running app has
 * no model): the list and its length, a record's fields two levels down, or
 * the value. Names the grammar can't write are skipped.
 */
export function dataPaths(key: string, value: unknown): FormulaCatalog["data"][number]["paths"] {
  if (Array.isArray(value))
    return [
      { code: `$${key}`, label: key, type: "list" },
      { code: `$${key}.length`, label: `${key}.length`, type: "number" },
    ];
  if (!isRecord(value)) return [{ code: `$${key}`, label: key, type: valueOperandType(value) }];
  const out: FormulaCatalog["data"][number]["paths"] = [];
  const walk = (o: Record<string, unknown>, prefix: string, depth: number) => {
    for (const [name, v] of Object.entries(o)) {
      if (!NAME.test(name) || v === null || v === undefined) continue;
      const path = `${prefix}.${name}`;
      out.push({ code: `$${path}`, label: path, type: valueOperandType(v) });
      if (isRecord(v) && depth < 2) walk(v, path, depth + 1);
    }
  };
  walk(value, key, 1);
  return out;
}

/** The first number field of a list's rows, for the "Sum of a table column" starter. */
export function firstNumberField(rows: unknown): string | undefined {
  const row = Array.isArray(rows) ? rows.find(isRecord) : undefined;
  if (!row) return undefined;
  return Object.keys(row).find((k) => NAME.test(k) && typeof row[k] === "number");
}

// ---- starters ---------------------------------------------------------------

export type FormulaStarter = { key: string; label: string; code: string; format: CellFormat };

/** The "Start from" starters, filled with the page's own operands (placeholders otherwise). */
export function formulaStarters(fields: { name: string; kind: string }[], list?: { key: string; field?: string }): FormulaStarter[] {
  const of = (type: OperandType) => fields.filter((f) => fieldOperandType(f.kind) === type).map((f) => `[${f.name}]`);
  const numbers = of("number");
  const dates = of("date");
  const texts = of("text");
  const n = (i: number, fallback: string) => numbers[i] ?? fallback;
  return [
    { key: "multiply", label: "A × B", code: `${n(0, "[Qty]")} × ${n(1, "[Unit price]")}`, format: { type: "number" } },
    { key: "sum", label: "Sum of a table column", code: `SUM($${list?.key ?? "items"}, '${list?.field ?? "amount"}')`, format: { type: "number" } },
    { key: "percent", label: "A % of B", code: `${n(0, "[Part]")} ÷ ${n(1, "[Total]")}`, format: { type: "percent" } },
    { key: "days", label: "Days between two dates", code: `DAYS(${dates[0] ?? "[Start date]"}, ${dates[1] ?? "TODAY()"})`, format: { type: "number", decimals: 0 } },
    { key: "join", label: "Join text", code: `${texts[0] ?? "[First name]"} & ' ' & ${texts[1] ?? "[Last name]"}`, format: { type: "text" } },
    { key: "round", label: "Round to 2 places", code: `ROUND(${n(0, "[Amount]")}, 2)`, format: { type: "number", decimals: 2 } },
  ];
}

// ---- Show as ----------------------------------------------------------------

/** A format as the flat knobs Show as edits; `kind: ""` is the raw value. */
export type FormatDraft = {
  kind: "" | CellFormat["type"];
  decimals: string;
  grouping: boolean;
  currency: string;
  of: "1" | "100";
  pattern: string;
  timeZone: string;
  trueLabel: string;
  falseLabel: string;
};

export function formatToDraft(f: CellFormat | undefined): FormatDraft {
  return {
    kind: f?.type ?? "",
    decimals: f && "decimals" in f && f.decimals !== undefined ? String(f.decimals) : "",
    grouping: f?.type === "number" ? f.grouping !== false : true,
    currency: f?.type === "currency" ? f.currency : "",
    of: f?.type === "percent" && f.of === 100 ? "100" : "1",
    pattern: f?.type === "date" || f?.type === "datetime" ? (f.pattern ?? "") : "",
    timeZone: f?.type === "date" || f?.type === "datetime" ? (f.timeZone ?? "") : "",
    trueLabel: f?.type === "boolean" ? (f.trueLabel ?? "") : "",
    falseLabel: f?.type === "boolean" ? (f.falseLabel ?? "") : "",
  };
}

/** The draft as a format, keeping only what differs from the format's defaults. */
export function draftToFormat(d: FormatDraft): CellFormat | undefined {
  const parsed = d.decimals.trim() === "" ? undefined : Math.max(0, Math.min(20, Math.floor(Number(d.decimals)) || 0));
  const decimals = parsed === undefined ? {} : { decimals: parsed };
  const moment = { ...(d.pattern.trim() ? { pattern: d.pattern.trim() } : {}), ...(d.timeZone.trim() ? { timeZone: d.timeZone.trim() } : {}) };
  switch (d.kind) {
    case "number":
      return { type: "number", ...decimals, ...(d.grouping ? {} : { grouping: false }) };
    case "currency":
      return { type: "currency", currency: d.currency.trim().toUpperCase() || "USD", ...decimals };
    case "percent":
      return { type: "percent", ...decimals, ...(d.of === "100" ? { of: 100 } : {}) };
    case "date":
    case "datetime":
      return { type: d.kind, ...moment };
    case "boolean":
      return { type: "boolean", ...(d.trueLabel.trim() ? { trueLabel: d.trueLabel.trim() } : {}), ...(d.falseLabel.trim() ? { falseLabel: d.falseLabel.trim() } : {}) };
    case "text":
      return { type: "text" };
    default:
      return undefined;
  }
}

// ---- Try it -----------------------------------------------------------------

export const POLICY_LABELS: Record<FormulaBlankPolicy, string> = { empty: "leave the result empty", zero: "treat it as 0", error: "show an error" };
export const DIVIDE_LABELS: Record<FormulaBlankPolicy, string> = { empty: "leave the result empty", zero: "show 0", error: "show an error" };

/** A live value as the text of its sample box; `null` when there's nothing to edit (a list, an object). */
export function sampleFromValue(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  if (typeof v === "string") return /^\d{4}-\d{2}-\d{2}T/.test(v) ? v.slice(0, 10) : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

/** What a sample box starts with while the form has no value yet. */
export function sampleDefault(type: OperandType, name: string, today = new Date()): string {
  switch (type) {
    case "number":
      return "1";
    case "date":
      return sampleFromValue(today) ?? "";
    case "boolean":
      return "true";
    default:
      return name;
  }
}
