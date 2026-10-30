import { get } from "lodash";
import type {
  AnyCondition,
  Cond,
  CondExpression,
  DataValue,
  Expr,
  FormulaBlankPolicy,
  FormulaDef,
  LogicLibrary,
  Rule,
} from "../@types";
import { formatCell, type CellFormat } from "../../util/format";

/**
 * The logic evaluator (see `spec/gummy-logic-spec.md`): formulas (`Expr`),
 * conditions (`Cond`) and rules, pure — no React, no store (it is part of the
 * headless entry); state reads come in through `scope.state`. The hooks in `logic.tsx`
 * collect what a node reads, subscribe to it and call in here.
 */

/** Where references read from. Everything is optional: a missing source reads blank. */
export type LogicScope = {
  /** The nearest form's field value (`{ ref: "field" }`). */
  field?: (name: string) => unknown;
  /** A field's `dataType`, so a date field compares as a date. */
  fieldType?: (name: string) => string | undefined;
  /** A global-state slice (`{ ref: "state" }`; the React layer passes `readSlice`). Absent = blank. */
  state?: (key: string, path?: string) => unknown;
  /** The nearest item (`{ ref: "row" }`): a repeater item, a table row, a container's context data. */
  row?: unknown;
  /** The item's position (`{ ref: "row", key: "$index" }`). */
  index?: number;
  /** A data-table cell's own value (`{ ref: "row", key: "$value" }`). */
  value?: unknown;
  params?: Record<string, string | undefined>;
  searchParams?: URLSearchParams;
  library?: LogicLibrary;
  /** "Now" for `TODAY()`; default the current date. */
  today?: Date;
};

/** An evaluation that cannot give a result (an `"error"` policy, an unknown name, a cycle). */
export class LogicError extends Error {}

type Policies = { onEmpty: FormulaBlankPolicy; onDivideByZero: FormulaBlankPolicy };
type Ctx = { scope: LogicScope; policies: Policies; stack: string[] };

const DEFAULT_POLICIES: Policies = { onEmpty: "empty", onDivideByZero: "empty" };

// ---- values ---------------------------------------------------------------

/** `null`, `undefined` or `""`. */
export function isBlank(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

const NUMERIC = /^\s*-?\d+(\.\d+)?\s*$/;

/** A number, a plain numeric string → number; anything else → `null` (blank). */
export function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && NUMERIC.test(v)) return Number(v);
  return null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/** A `Date` or an ISO date string → a valid `Date`; anything else → `null`. */
export function toDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "string" && ISO_DATE.test(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toText(v: unknown): string {
  if (isBlank(v)) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function toBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

/** Half away from zero, without binary-float drift (`ROUND(1.005, 2)` = 1.01). */
function round(x: number, n: number): number {
  const sign = x < 0 ? -1 : 1;
  const r = Number(`${Math.round(Number(`${Math.abs(x)}e${n}`))}e-${n}`);
  return sign * r;
}

// ---- formulas -------------------------------------------------------------

function blankInput(ctx: Ctx): number | null {
  switch (ctx.policies.onEmpty) {
    case "zero":
      return 0;
    case "error":
      throw new LogicError("A value the formula needs is empty");
    default:
      return null;
  }
}

/** An arithmetic operand: a number, or the blank policy's stand-in. */
function operand(v: unknown, ctx: Ctx): number | null {
  const n = toNumber(v);
  return n === null ? blankInput(ctx) : n;
}

function readRef(e: Extract<Expr, { ref: string }>, scope: LogicScope): unknown {
  switch (e.ref) {
    case "field": {
      const v = scope.field?.(e.key);
      return e.path ? get(v, e.path) : v;
    }
    case "state":
      return scope.state?.(e.key, e.path);
    case "row": {
      if (e.key === "$index") return scope.index;
      if (e.key === "$value") return e.path ? get(scope.value, e.path) : scope.value;
      if (scope.row === undefined || scope.row === null) return undefined;
      const v = e.key === "none" ? scope.row : get(scope.row, e.key);
      return e.path ? get(v, e.path) : v;
    }
    case "url":
      return e.source === "query" ? scope.searchParams?.get(e.key) ?? undefined : scope.params?.[e.key];
  }
}

function evalExpr(e: Expr, ctx: Ctx): unknown {
  if ("lit" in e) return e.lit;
  if ("ref" in e) return readRef(e, ctx.scope);
  if ("formula" in e) return evalSavedFormula(e.formula, ctx);
  if ("rule" in e) return evalSavedRule(e.rule, ctx);
  if ("op" in e) {
    const [a, b] = e.args.map((x) => evalExpr(x, ctx));
    if (e.op === "&") return toText(a) + toText(b);
    const x = operand(a, ctx);
    const y = operand(b, ctx);
    if (x === null || y === null) return null;
    switch (e.op) {
      case "+":
        return x + y;
      case "-":
        return x - y;
      case "*":
        return x * y;
      case "/":
        if (y === 0) {
          if (ctx.policies.onDivideByZero === "zero") return 0;
          if (ctx.policies.onDivideByZero === "error") throw new LogicError("Division by zero");
          return null;
        }
        return x / y;
    }
  }
  return evalFn(e as Extract<Expr, { fn: string }>, ctx);
}

function evalFn(e: Extract<Expr, { fn: string }>, ctx: Ctx): unknown {
  const arg = (i: number) => (e.args[i] ? evalExpr(e.args[i], ctx) : undefined);
  switch (e.fn) {
    case "ROUND": {
      const x = operand(arg(0), ctx);
      if (x === null) return null;
      return round(x, toNumber(arg(1)) ?? 0);
    }
    case "ABS": {
      const x = operand(arg(0), ctx);
      return x === null ? null : Math.abs(x);
    }
    case "MIN":
    case "MAX": {
      const nums = e.args.map((a) => toNumber(evalExpr(a, ctx))).filter((n): n is number => n !== null);
      if (!nums.length) return null;
      return e.fn === "MIN" ? Math.min(...nums) : Math.max(...nums);
    }
    case "LEN": {
      const v = arg(0);
      if (isBlank(v)) return 0;
      return Array.isArray(v) ? v.length : toText(v).length;
    }
    case "TODAY":
      return startOfDay(ctx.scope.today ?? new Date());
    case "DAYS": {
      const a = toDate(arg(0));
      const b = toDate(arg(1));
      if (!a || !b) return null;
      return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
    }
    case "COUNT": {
      const v = arg(0);
      if (Array.isArray(v)) return v.length;
      return isBlank(v) ? 0 : 1;
    }
    case "SUM": {
      const v = arg(0);
      const field = e.args[1] ? toText(arg(1)) : "";
      if (!Array.isArray(v)) return isBlank(v) ? 0 : toNumber(v) ?? 0;
      return v.reduce((sum: number, item) => sum + (toNumber(field ? get(item, field) : item) ?? 0), 0);
    }
  }
}

function guard<T>(kind: string, name: string, ctx: Ctx, run: () => T): T {
  const id = `${kind}:${name}`;
  if (ctx.stack.includes(id)) throw new LogicError(`"${name}" refers to itself`);
  ctx.stack.push(id);
  try {
    return run();
  } finally {
    ctx.stack.pop();
  }
}

function evalSavedFormula(name: string, ctx: Ctx): unknown {
  const def = ctx.scope.library?.formulas?.[name];
  if (!def) throw new LogicError(`No formula "${name}"`);
  return guard("formula", name, ctx, () =>
    evalExpr(def.expr, { ...ctx, policies: policiesOf(def) }),
  );
}

function evalSavedRule(name: string, ctx: Ctx): unknown {
  const def = ctx.scope.library?.rules?.[name];
  if (!def) throw new LogicError(`No rule "${name}"`);
  return guard("rule", name, ctx, () => evalRule(def.rule, ctx));
}

function policiesOf(def: { onEmpty?: FormulaBlankPolicy; onDivideByZero?: FormulaBlankPolicy }): Policies {
  return {
    onEmpty: def.onEmpty ?? DEFAULT_POLICIES.onEmpty,
    onDivideByZero: def.onDivideByZero ?? DEFAULT_POLICIES.onDivideByZero,
  };
}

// ---- conditions -----------------------------------------------------------

/** Whether an operand is date-typed, so a comparison against it is by date. */
function isDateTyped(e: Expr, ctx: Ctx): boolean {
  if ("fn" in e) return e.fn === "TODAY";
  if ("ref" in e && e.ref === "field") return /^date/i.test(ctx.scope.fieldType?.(e.key) ?? "");
  if ("formula" in e) {
    const t = ctx.scope.library?.formulas?.[e.formula]?.format?.type;
    return t === "date" || t === "datetime";
  }
  if ("rule" in e) return ctx.scope.library?.rules?.[e.rule]?.resultType === "date";
  return false;
}

function equal(a: unknown, b: unknown, asDate: boolean): boolean {
  if (isBlank(a) || isBlank(b)) return isBlank(a) && isBlank(b);
  if (asDate || a instanceof Date || b instanceof Date) {
    const x = toDate(a);
    const y = toDate(b);
    if (x && y) return x.getTime() === y.getTime();
  }
  if (typeof a === "number" || typeof b === "number") {
    const x = toNumber(a);
    const y = toNumber(b);
    if (x !== null && y !== null) return x === y;
  }
  if (typeof a === "boolean" || typeof b === "boolean") {
    const x = toBool(a);
    const y = toBool(b);
    if (x !== null && y !== null) return x === y;
  }
  return a === b;
}

/** -1 / 0 / 1, or `null` when the two can't be ordered (a blank side). */
function order(a: unknown, b: unknown, asDate: boolean): number | null {
  if (isBlank(a) || isBlank(b)) return null;
  if (asDate || a instanceof Date || b instanceof Date) {
    const x = toDate(a);
    const y = toDate(b);
    if (x && y) return Math.sign(x.getTime() - y.getTime());
  }
  const x = toNumber(a);
  const y = toNumber(b);
  if (x !== null && y !== null) return Math.sign(x - y);
  const s = toText(a);
  const t = toText(b);
  return s < t ? -1 : s > t ? 1 : 0;
}

function isEmptyValue(v: unknown): boolean {
  return isBlank(v) || (Array.isArray(v) && v.length === 0);
}

function evalCond(c: Cond, ctx: Ctx): boolean {
  if ("all" in c) return c.all.every((x) => evalCond(x, ctx));
  if ("any" in c) return c.any.some((x) => evalCond(x, ctx));
  const left = evalExpr(c.left, ctx);
  if (c.cmp === "empty") return isEmptyValue(left);
  if (c.cmp === "notEmpty") return !isEmptyValue(left);
  const rights = Array.isArray(c.right) ? c.right : c.right ? [c.right] : [];
  const asDate = isDateTyped(c.left, ctx) || rights.some((r) => isDateTyped(r, ctx));
  const values = rights.map((r) => evalExpr(r, ctx));
  const right = values[0];
  switch (c.cmp) {
    case "eq":
      return equal(left, right, asDate);
    case "neq":
      return !equal(left, right, asDate);
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const o = order(left, right, asDate);
      if (o === null) return false;
      return c.cmp === "gt" ? o > 0 : c.cmp === "gte" ? o >= 0 : c.cmp === "lt" ? o < 0 : o <= 0;
    }
    case "between": {
      const lo = order(left, values[0], asDate);
      const hi = order(left, values[1], asDate);
      return lo !== null && hi !== null && lo >= 0 && hi <= 0;
    }
    case "in":
      return values.some((v) => equal(left, v, asDate));
    case "contains":
      if (Array.isArray(left)) return left.some((item) => equal(item, right, asDate));
      if (isBlank(left) || isBlank(right)) return false;
      return toText(left).toLowerCase().includes(toText(right).toLowerCase());
  }
  return false;
}

function isRule(x: Expr | Rule): x is Rule {
  return typeof x === "object" && x !== null && "branches" in x;
}

function evalRule(rule: Rule, ctx: Ctx): unknown {
  for (const b of rule.branches) {
    if (evalCond(b.when, ctx)) return isRule(b.then) ? evalRule(b.then, ctx) : evalExpr(b.then, ctx);
  }
  return evalExpr(rule.else, ctx);
}

// ---- public API -----------------------------------------------------------

/** Whether a condition is the old `CondExpression` (evaluated by `ConditionExpression`). */
export function isLegacyCondition(c: AnyCondition | undefined): c is CondExpression {
  return !!c && typeof c === "object" && "operator" in c;
}

/**
 * The observe-form `enabledWhen` a component evaluates itself, or `undefined`:
 * a `Cond` / `{ rule }` is the grid cell's (see `BinCell`).
 */
export function legacyCondition(c: AnyCondition | undefined): CondExpression | undefined {
  return isLegacyCondition(c) ? c : undefined;
}

export type FormulaResult = { value: unknown; error?: string };

/** A formula's raw result; an error (policy, unknown name, cycle) comes back as `error`, never thrown. */
export function evaluateFormula(def: FormulaDef, scope: LogicScope): FormulaResult {
  try {
    const value = evalExpr(def.expr, { scope, policies: policiesOf(def), stack: [] });
    if (typeof value === "number" && !Number.isFinite(value)) return { value: null };
    return { value };
  } catch (e) {
    return { value: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/** A rule's result (the matching branch's `then`, else `else`). */
export function evaluateRule(rule: Rule, scope: LogicScope): FormulaResult {
  try {
    return { value: evalRule(rule, { scope, policies: DEFAULT_POLICIES, stack: [] }) };
  } catch (e) {
    return { value: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Whether a `Cond` or a saved boolean rule holds. An error is **false**: a
 * broken condition hides rather than shows. The old `CondExpression` is not
 * handled here (see `isLegacyCondition`).
 */
export function evaluateCondition(c: Cond | { rule: string }, scope: LogicScope): boolean {
  const ctx: Ctx = { scope, policies: DEFAULT_POLICIES, stack: [] };
  try {
    if ("rule" in c) {
      const def = scope.library?.rules?.[c.rule];
      if (!def) throw new LogicError(`No rule "${c.rule}"`);
      return toBool(evalSavedRule(c.rule, ctx)) === true;
    }
    return evalCond(c, ctx);
  } catch {
    return false;
  }
}

/** A `type:"formula"` DataValue as the formula it names (or carries inline); `undefined` when there is none. */
export function formulaOf(dv: DataValue | undefined, library: LogicLibrary | undefined): FormulaDef | undefined {
  if (!dv || dv.type !== "formula") return undefined;
  if (dv.expr) return { expr: dv.expr, format: dv.format, onEmpty: dv.onEmpty, onDivideByZero: dv.onDivideByZero };
  if (dv.formula) {
    const saved = library?.formulas?.[dv.formula];
    if (saved) return { ...saved, format: dv.format ?? saved.format };
    // A rule named as a value: its result, typed by the rule.
    const rule = library?.rules?.[dv.formula];
    if (rule) return { expr: { rule: dv.formula }, format: dv.format ?? rule.format };
    return { expr: { formula: dv.formula }, format: dv.format };
  }
  return undefined;
}

/** A result as display text through the formula's `format`; blank → `""`. */
export function formatResult(value: unknown, format: CellFormat | undefined, locale?: string): string {
  if (isBlank(value)) return "";
  if (format) return formatCell(value, format, locale);
  if (value instanceof Date) return formatCell(value, { type: "date" }, locale);
  return toText(value);
}

// ---- dependencies ---------------------------------------------------------

/** What a node reads, so a hook can subscribe to exactly that. */
export type LogicDeps = { fields: string[]; states: string[]; url: boolean; row: boolean };

/** The fields, slices, URL and row a formula / condition / rule reads, through saved items. */
export function logicDeps(node: Expr | Cond | Rule | AnyCondition | undefined, library?: LogicLibrary): LogicDeps {
  const fields = new Set<string>();
  const states = new Set<string>();
  let url = false;
  let row = false;
  const seen = new Set<string>();
  const walk = (n: unknown): void => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    const o = n as Record<string, unknown>;
    if ("ref" in o) {
      if (o.ref === "field") fields.add(String(o.key));
      else if (o.ref === "state") states.add(String(o.key));
      else if (o.ref === "url") url = true;
      else if (o.ref === "row") row = true;
      return;
    }
    if (typeof o.formula === "string" && !("expr" in o)) {
      const id = `f:${o.formula}`;
      if (!seen.has(id)) {
        seen.add(id);
        walk(library?.formulas?.[o.formula]?.expr);
      }
      return;
    }
    if (typeof o.rule === "string") {
      const id = `r:${o.rule}`;
      if (!seen.has(id)) {
        seen.add(id);
        walk(library?.rules?.[o.rule]?.rule);
      }
      return;
    }
    if ("operator" in o && o.source === "state" && typeof o.key === "string") states.add(o.key);
    Object.values(o).forEach(walk);
  };
  walk(node);
  return { fields: [...fields], states: [...states], url, row };
}

/** Saved formulas / rules that reach themselves, by name (`formula:x`, `rule:y`). */
export function libraryCycles(library: LogicLibrary | undefined): string[] {
  const out: string[] = [];
  const refsOf = (n: unknown, acc: string[] = []): string[] => {
    if (!n || typeof n !== "object") return acc;
    if (Array.isArray(n)) {
      n.forEach((x) => refsOf(x, acc));
      return acc;
    }
    const o = n as Record<string, unknown>;
    if (typeof o.formula === "string") acc.push(`formula:${o.formula}`);
    else if (typeof o.rule === "string") acc.push(`rule:${o.rule}`);
    else Object.values(o).forEach((x) => refsOf(x, acc));
    return acc;
  };
  const nodeOf = (id: string) => {
    const [kind, name] = [id.slice(0, id.indexOf(":")), id.slice(id.indexOf(":") + 1)];
    return kind === "formula" ? library?.formulas?.[name]?.expr : library?.rules?.[name]?.rule;
  };
  const ids = [
    ...Object.keys(library?.formulas ?? {}).map((n) => `formula:${n}`),
    ...Object.keys(library?.rules ?? {}).map((n) => `rule:${n}`),
  ];
  for (const start of ids) {
    const stack = [...refsOf(nodeOf(start))];
    const seen = new Set<string>();
    while (stack.length) {
      const id = stack.pop()!;
      if (id === start) {
        out.push(start);
        break;
      }
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...refsOf(nodeOf(id)));
    }
  }
  return out;
}
