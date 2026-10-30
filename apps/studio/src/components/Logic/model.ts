import type { Cond, CondOperator, Expr, Rule } from '@gummy-ui/ui'
import type { ColumnFormatConfig } from '../Layout/types'
import { defaultColumnFormat } from '../Layout/types'
import {
  LOGIC_FUNCTIONS,
  lexSpans,
  printExpr,
  type FormulaLibDef,
  type LogicNames,
  type RuleLibDef,
  type StudioCondition,
  type StudioFormula,
} from '../Workspace/logic'

/**
 * The pure half of Logic UI v2 (spec §14): what an operand's type is, which
 * operators and value inputs fit it, the formula bar's colouring, plain-word
 * suggestions, the function hint, the templates, the "same as saved" match
 * and the two-level check. React-free, so `bun:test` covers it.
 */

// ---- operand types -------------------------------------------------------------

export type OperandType = 'text' | 'number' | 'date' | 'boolean' | 'options' | 'list' | 'any'
export type OperandOption = { value: string; label: string }

/** What the editor knows about the operands in scope (a `LogicScopeInfo` reduced to types). */
export type TypeContext = {
  fields: { name: string; kind: string; options?: OperandOption[] }[]
  loads: { id: string; key: string; fields?: { name: string; kind: string }[] | null }[]
  rowFields: { name: string; kind: string }[] | null
  formulas: FormulaLibDef[]
  rules: RuleLibDef[]
}

/** The page-load `$status` values (`core/stateStore.ts`). */
export const LOAD_STATUS_OPTIONS: OperandOption[] = [
  { value: 'success', label: 'loaded' },
  { value: 'loading', label: 'loading' },
  { value: 'error', label: 'failed' },
  { value: 'held', label: 'waiting' },
  { value: 'idle', label: 'not started' },
]

/** A field / model kind as an operand type. */
export function kindType(kind: string | undefined): OperandType {
  switch (kind) {
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'date':
    case 'datetime':
    case 'datetime-local':
    case 'month':
      return 'date'
    case 'array':
    case 'list':
      return 'list'
    case 'string':
    case 'text':
    case 'email':
    case 'search':
    case 'tel':
    case 'url':
    case 'password':
      return 'text'
    default:
      return 'any'
  }
}

/** The type of what an expression gives, as far as the editor can tell. */
export function operandType(e: Expr | null | undefined, ctx: TypeContext): OperandType {
  if (!e) return 'any'
  if ('lit' in e) return e.lit === null ? 'any' : typeof e.lit === 'number' ? 'number' : typeof e.lit === 'boolean' ? 'boolean' : 'text'
  if ('ref' in e) {
    if (e.ref === 'field') {
      const f = ctx.fields.find((x) => x.name === e.key)
      if (!f) return 'any'
      if (e.path) return 'any'
      return f.options?.length ? 'options' : kindType(f.kind)
    }
    if (e.ref === 'state') {
      if (e.path === '$status') return 'options'
      if (e.path?.startsWith('$error')) return 'text'
      const load = ctx.loads.find((l) => l.id === e.key)
      const f = e.path ? load?.fields?.find((x) => x.name === e.path) : undefined
      return f ? kindType(f.kind) : 'any'
    }
    if (e.ref === 'row') {
      if (e.key === '$index') return 'number'
      const name = e.path ? `${e.key}.${e.path}` : e.key
      const f = ctx.rowFields?.find((x) => x.name === name)
      return f ? kindType(f.kind) : 'any'
    }
    return 'text'
  }
  if ('rule' in e) {
    const r = ctx.rules.find((x) => x.id === e.rule)
    return r ? (r.resultType === 'boolean' ? 'boolean' : r.resultType) : 'any'
  }
  if ('formula' in e) {
    const f = ctx.formulas.find((x) => x.id === e.formula)
    if (!f) return 'any'
    return f.format.type === 'date' || f.format.type === 'datetime' ? 'date' : f.format.type === 'text' ? 'text' : 'number'
  }
  if ('op' in e) return e.op === '&' ? 'text' : 'number'
  switch (e.fn) {
    case 'TODAY':
      return 'date'
    default:
      return 'number'
  }
}

/** The options an operand offers as values (a radio / static select, a load's `$status`). */
export function operandOptions(e: Expr | null | undefined, ctx: TypeContext): OperandOption[] {
  if (!e || !('ref' in e)) return []
  if (e.ref === 'field' && !e.path) return ctx.fields.find((x) => x.name === e.key)?.options ?? []
  if (e.ref === 'state' && e.path === '$status') return LOAD_STATUS_OPTIONS
  return []
}

export const TYPE_ICON: Record<OperandType, string> = { text: 'Aa', number: '#', date: 'date', boolean: 'yes/no', options: 'list', list: 'list', any: '·' }

// ---- operators by type ---------------------------------------------------------

/**
 * One choice in the operator picker. `boolean` operands get *is on / is off*
 * (`eq true` / `eq false`, `fixed` right side); the rest map onto one
 * `CondOperator`.
 */
export type OperatorChoice = { key: string; label: string; cmp: CondOperator; fixed?: Expr }

const IS: OperatorChoice = { key: 'eq', label: 'is', cmp: 'eq' }
const IS_NOT: OperatorChoice = { key: 'neq', label: 'is not', cmp: 'neq' }
const EMPTY: OperatorChoice = { key: 'empty', label: 'is empty', cmp: 'empty' }
const NOT_EMPTY: OperatorChoice = { key: 'notEmpty', label: 'is not empty', cmp: 'notEmpty' }
const ONE_OF: OperatorChoice = { key: 'in', label: 'is one of', cmp: 'in' }

const OPERATORS: Record<OperandType, OperatorChoice[]> = {
  text: [IS, IS_NOT, { key: 'contains', label: 'contains', cmp: 'contains' }, ONE_OF, EMPTY, NOT_EMPTY],
  options: [IS, IS_NOT, ONE_OF, EMPTY, NOT_EMPTY],
  number: [
    IS,
    IS_NOT,
    { key: 'gt', label: 'is more than', cmp: 'gt' },
    { key: 'gte', label: 'is at least', cmp: 'gte' },
    { key: 'lt', label: 'is less than', cmp: 'lt' },
    { key: 'lte', label: 'is at most', cmp: 'lte' },
    { key: 'between', label: 'is between', cmp: 'between' },
    EMPTY,
    NOT_EMPTY,
  ],
  date: [
    { key: 'eq', label: 'is on', cmp: 'eq' },
    { key: 'gt', label: 'is after', cmp: 'gt' },
    { key: 'gte', label: 'is on or after', cmp: 'gte' },
    { key: 'lt', label: 'is before', cmp: 'lt' },
    { key: 'lte', label: 'is on or before', cmp: 'lte' },
    { key: 'between', label: 'is between', cmp: 'between' },
    EMPTY,
    NOT_EMPTY,
  ],
  boolean: [
    { key: 'on', label: 'is on', cmp: 'eq', fixed: { lit: true } },
    { key: 'off', label: 'is off', cmp: 'eq', fixed: { lit: false } },
    EMPTY,
  ],
  list: [{ key: 'contains', label: 'contains', cmp: 'contains' }, EMPTY, NOT_EMPTY],
  any: [
    IS,
    IS_NOT,
    { key: 'gt', label: '>', cmp: 'gt' },
    { key: 'gte', label: '≥', cmp: 'gte' },
    { key: 'lt', label: '<', cmp: 'lt' },
    { key: 'lte', label: '≤', cmp: 'lte' },
    { key: 'contains', label: 'contains', cmp: 'contains' },
    ONE_OF,
    { key: 'between', label: 'is between', cmp: 'between' },
    EMPTY,
    NOT_EMPTY,
  ],
}

export function operatorsFor(type: OperandType): OperatorChoice[] {
  return OPERATORS[type]
}

/** The choice a comparison is showing (a boolean `eq true` is *is on*); falls back to the `any` list's. */
export function operatorChoice(c: Extract<Cond, { cmp: string }>, type: OperandType): OperatorChoice {
  const list = OPERATORS[type]
  if (type === 'boolean' && c.cmp === 'eq' && !Array.isArray(c.right) && c.right && 'lit' in c.right && typeof c.right.lit === 'boolean')
    return list[c.right.lit ? 0 : 1]
  return list.find((o) => o.cmp === c.cmp && !o.fixed) ?? OPERATORS.any.find((o) => o.cmp === c.cmp) ?? IS
}

/** The value input a comparison needs on its right. */
export type ValueInputKind = 'none' | 'text' | 'number' | 'date' | 'option' | 'optionList' | 'textList' | 'numberRange' | 'dateRange'

export function valueInputKind(type: OperandType, choice: OperatorChoice, hasOptions: boolean): ValueInputKind {
  if (choice.fixed || choice.cmp === 'empty' || choice.cmp === 'notEmpty') return 'none'
  if (choice.cmp === 'in') return hasOptions ? 'optionList' : 'textList'
  if (choice.cmp === 'between') return type === 'date' ? 'dateRange' : 'numberRange'
  if (hasOptions && (choice.cmp === 'eq' || choice.cmp === 'neq')) return 'option'
  if (type === 'number') return 'number'
  if (type === 'date') return 'date'
  return 'text'
}

/** A comparison re-shaped for a new operator choice, keeping the left side and what of the right still fits. */
export function withOperator(c: Extract<Cond, { cmp: string }>, choice: OperatorChoice, type: OperandType): Cond {
  const rights = Array.isArray(c.right) ? c.right : c.right ? [c.right] : []
  const blank: Expr = type === 'number' ? { lit: 0 } : { lit: '' }
  if (choice.fixed) return { cmp: choice.cmp, left: c.left, right: choice.fixed }
  if (choice.cmp === 'empty' || choice.cmp === 'notEmpty') return { cmp: choice.cmp, left: c.left }
  const kept = rights.filter((r) => !('lit' in r && typeof r.lit === 'boolean'))
  if (choice.cmp === 'in') return { cmp: 'in', left: c.left, right: kept.length ? kept : [] }
  if (choice.cmp === 'between') return { cmp: 'between', left: c.left, right: [kept[0] ?? blank, kept[1] ?? blank] }
  return { cmp: choice.cmp, left: c.left, right: kept[0] ?? blank }
}

/** A typed value box's text → the literal it stands for (blank = empty text). */
export function literalFromInput(kind: ValueInputKind, text: string): Expr {
  if (kind === 'number' || kind === 'numberRange') {
    const t = text.trim()
    if (t === '') return { lit: '' }
    const n = Number(t)
    return { lit: Number.isNaN(n) ? text : n }
  }
  return { lit: text }
}

/** A literal as a typed value box's text; `null` when the value isn't a literal (it is a formula, shown with ƒx). */
export function inputFromLiteral(e: Expr | undefined): string | null {
  if (!e) return ''
  if (!('lit' in e)) return null
  return e.lit === null ? '' : String(e.lit)
}

// ---- sentences -----------------------------------------------------------------

/** A piece of a plain-language summary. `tone` picks the pill colour (spec §14.9). */
export type SentencePart =
  | { kind: 'operand'; text: string; tone: SpanTone; type?: OperandType }
  | { kind: 'word'; text: string }
  | { kind: 'value'; text: string }
  | { kind: 'code'; text: string }

function operandPart(e: Expr, names: LogicNames, ctx: TypeContext): SentencePart {
  if ('ref' in e) {
    const type = operandType(e, ctx)
    if (e.ref === 'field') return { kind: 'operand', text: e.path ? `${e.key}.${e.path}` : e.key, tone: 'field', type }
    if (e.ref === 'state') {
      const key = names.loads.find((l) => l.id === e.key)?.key ?? e.key
      if (e.path === '$status') return { kind: 'operand', text: `${key} status`, tone: 'data', type }
      return { kind: 'operand', text: e.path ? `${key}.${e.path}` : key, tone: 'data', type }
    }
    if (e.ref === 'row') {
      if (e.key === '$table') return { kind: 'operand', text: `the edited row${e.path ? `’s ${e.path}` : ''}`, tone: 'data', type }
      if (e.key === '$value') return { kind: 'operand', text: 'this cell', tone: 'data', type }
      if (e.key === '$index') return { kind: 'operand', text: 'row position', tone: 'data', type }
      return { kind: 'operand', text: e.key === 'none' ? (e.path ? `item.${e.path}` : 'the item') : `row.${e.key}${e.path ? `.${e.path}` : ''}`, tone: 'data', type }
    }
    return { kind: 'operand', text: `${e.source === 'query' ? 'query' : 'url'}.${e.key}`, tone: 'data', type }
  }
  if ('formula' in e) return { kind: 'operand', text: names.formulas.find((f) => f.id === e.formula)?.name || '(deleted formula)', tone: 'saved', type: operandType(e, ctx) }
  if ('rule' in e) return { kind: 'operand', text: names.rules.find((r) => r.id === e.rule)?.name || '(deleted rule)', tone: 'rule', type: operandType(e, ctx) }
  return { kind: 'code', text: printExpr(e, names) }
}

function valuePart(e: Expr, names: LogicNames, options: OperandOption[], ctx: TypeContext): SentencePart {
  if ('lit' in e) {
    if (e.lit === null || e.lit === '') return { kind: 'value', text: 'empty' }
    const opt = options.find((o) => o.value === String(e.lit))
    return { kind: 'value', text: opt ? opt.label : String(e.lit) }
  }
  return operandPart(e, names, ctx)
}

/** A comparison in words: `Type` **is** `Business`. */
export function compareSentence(c: Extract<Cond, { cmp: string }>, names: LogicNames, ctx: TypeContext): SentencePart[] {
  const type = operandType(c.left, ctx)
  const choice = operatorChoice(c, type)
  const options = operandOptions(c.left, ctx)
  const rights = Array.isArray(c.right) ? c.right : c.right ? [c.right] : []
  const out: SentencePart[] = [operandPart(c.left, names, ctx), { kind: 'word', text: choice.label }]
  if (choice.fixed || c.cmp === 'empty' || c.cmp === 'notEmpty') return out
  if (c.cmp === 'in') {
    rights.forEach((r, i) => {
      if (i) out.push({ kind: 'word', text: i === rights.length - 1 ? 'or' : ',' })
      out.push(valuePart(r, names, options, ctx))
    })
    if (!rights.length) out.push({ kind: 'value', text: '…' })
    return out
  }
  if (c.cmp === 'between') {
    out.push(rights[0] ? valuePart(rights[0], names, options, ctx) : { kind: 'value', text: '?' }, { kind: 'word', text: 'and' })
    out.push(rights[1] ? valuePart(rights[1], names, options, ctx) : { kind: 'value', text: '?' })
    return out
  }
  out.push(rights[0] ? valuePart(rights[0], names, options, ctx) : { kind: 'value', text: '?' })
  return out
}

/**
 * A condition as sentence lines: one line per comparison, a group as *All of:*
 * / *Any of:* with its lines (one level deep; deeper groups print as code).
 */
export function conditionSentence(c: StudioCondition, names: LogicNames, ctx: TypeContext): { head?: string; lines: SentencePart[][] } {
  if ('rule' in c) return { lines: [[{ kind: 'operand', text: names.rules.find((r) => r.id === c.rule)?.name || '(deleted rule)', tone: 'rule', type: 'boolean' }]] }
  if ('cmp' in c) return { lines: [compareSentence(c, names, ctx)] }
  const items = 'all' in c ? c.all : c.any
  if (items.length === 1 && 'cmp' in items[0]) return { lines: [compareSentence(items[0], names, ctx)] }
  if (!items.length) return { lines: [[{ kind: 'word', text: 'all' in c ? 'Always' : 'Never' }]] }
  return {
    head: 'all' in c ? 'All of' : 'Any of',
    lines: items.map((x) => {
      if ('cmp' in x) return compareSentence(x, names, ctx)
      const inner = 'all' in x ? x.all : x.any
      return [{ kind: 'word', text: 'all' in x ? 'all of' : 'any of' } as SentencePart, ...inner.flatMap((y, i) => [...(i ? [{ kind: 'word', text: '·' } as SentencePart] : []), ...('cmp' in y ? compareSentence(y, names, ctx) : [{ kind: 'code', text: '(…)' } as SentencePart])])]
    }),
  }
}

/** The single comparison a condition is, if it is one (bare, or alone in a group) — what the inspector edits inline. */
export function singleCompare(c: StudioCondition | null | undefined): Extract<Cond, { cmp: string }> | null {
  if (!c || 'rule' in c) return null
  if ('cmp' in c) return c
  const items = 'all' in c ? c.all : c.any
  return items.length === 1 && 'cmp' in items[0] ? items[0] : null
}

// ---- the formula bar's colouring ----------------------------------------------------

export type SpanTone = 'field' | 'data' | 'saved' | 'rule' | 'fn' | 'value' | 'op' | 'punct' | 'plain' | 'error'
export type HighlightSpan = { from: number; to: number; tone: SpanTone }

const DATA_WORD = /^(row|url|query)(\.|$)/
const VALUE_WORD = new Set(['TRUE', 'FALSE', 'EMPTY', 'NULL'])

/**
 * Code text → coloured spans covering every non-blank character, never
 * throwing: whatever doesn't lex is one `error` span to the end. `errorAt`
 * (a parse problem's position) marks the token there as an error too.
 */
export function highlightSpans(text: string, errorAt?: number): HighlightSpan[] {
  const { spans, failedAt } = lexSpans(text)
  const out: HighlightSpan[] = spans.map((s) => {
    let tone: SpanTone
    switch (s.kind) {
      case 'field':
        tone = 'field'
        break
      case 'state':
        tone = 'data'
        break
      case 'saved':
        tone = 'saved'
        break
      case 'rule':
        tone = 'rule'
        break
      case 'value':
        tone = 'value'
        break
      case 'fn':
        tone = 'fn'
        break
      case 'op':
      case 'cmp':
        tone = 'op'
        break
      case 'keyword':
        tone = VALUE_WORD.has(text.slice(s.from, s.to).toUpperCase()) ? 'value' : 'op'
        break
      case 'paren':
      case 'comma':
        tone = 'punct'
        break
      default:
        tone = DATA_WORD.test(text.slice(s.from, s.to)) ? 'data' : 'plain'
    }
    return { from: s.from, to: s.to, tone }
  })
  if (errorAt !== undefined) {
    const hit = out.find((s) => s.from <= errorAt && errorAt < s.to)
    if (hit) hit.tone = 'error'
    else if (errorAt >= text.trimEnd().length && text.trim()) {
      // The problem is "something missing at the end": mark the last token.
      const last = out[out.length - 1]
      if (last) last.tone = 'error'
    }
  }
  if (failedAt !== undefined) out.push({ from: failedAt, to: text.length, tone: 'error' })
  return out
}

// ---- plain-word suggestions -------------------------------------------------------

export type SuggestKind = 'field' | 'data' | 'saved' | 'rule' | 'fn' | 'keyword'
export type Suggestion = { label: string; sub?: string; insert: string; replace: number; kind: SuggestKind }

/** Everything the bar can suggest, built once per scope. */
export type SuggestCatalog = {
  fields: { name: string; kind: string }[]
  loads: { key: string }[]
  rowFields: { name: string; kind: string }[]
  urlParams: string[]
  formulas: { name: string }[]
  rules: { name: string; resultType: string }[]
  /** Offer AND / OR / IS EMPTY … (conditions). */
  condition?: boolean
}

const COND_KEYWORDS = ['AND', 'OR', 'IS EMPTY', 'IS NOT EMPTY', 'CONTAINS', 'IN (', 'BETWEEN']

/** Whether the caret sits inside a string or a `[…]` (no suggestions there). */
function insideLiteral(before: string): boolean {
  let quote: string | null = null
  let bracket = false
  for (const ch of before) {
    if (quote) {
      if (ch === quote) quote = null
    } else if (bracket) {
      if (ch === ']') bracket = false
    } else if (ch === "'" || ch === '"') quote = ch
    else if (ch === '[') bracket = true
  }
  return quote !== null
}

/**
 * Suggestions for the text before the caret. The explicit triggers (`[`,
 * `((`, `IF((`, `$`, `row.`) still work; a **plain word** offers every kind at
 * once — fields, page data, saved items, functions, row / URL values — and
 * inserts the right syntax.
 */
export function suggestFor(before: string, cat: SuggestCatalog): Suggestion[] {
  if (insideLiteral(before)) return []
  const has = (s: string, q: string) => s.toLowerCase().includes(q.toLowerCase())
  const starts = (s: string, q: string) => s.toLowerCase().startsWith(q.toLowerCase())
  let m: RegExpExecArray | null
  if ((m = /IF\(\(([^()]*)$/.exec(before))) {
    const q = m[1]
    return cat.rules.filter((r) => r.name && has(r.name, q)).map((r) => ({ label: r.name, sub: `rule · ${r.resultType}`, insert: `${r.name}))`, replace: q.length, kind: 'rule' }))
  }
  if ((m = /\(\(([^()]*)$/.exec(before))) {
    const q = m[1]
    return cat.formulas.filter((f) => f.name && has(f.name, q)).map((f) => ({ label: f.name, sub: 'formula', insert: `${f.name}))`, replace: q.length, kind: 'saved' }))
  }
  if ((m = /\[([^\]]*)$/.exec(before))) {
    const q = m[1]
    return cat.fields.filter((f) => has(f.name, q)).map((f) => ({ label: f.name, sub: f.kind, insert: `${f.name}]`, replace: q.length, kind: 'field' }))
  }
  if ((m = /\$([A-Za-z0-9_]*)$/.exec(before))) {
    const q = m[1]
    return cat.loads.filter((l) => has(l.key, q)).map((l) => ({ label: `$${l.key}`, sub: 'page data', insert: l.key, replace: q.length, kind: 'data' }))
  }
  if ((m = /\brow\.([A-Za-z0-9_]*)$/.exec(before)))
    return cat.rowFields.filter((f) => has(f.name, m![1])).map((f) => ({ label: `row.${f.name}`, sub: f.kind, insert: f.name, replace: m![1].length, kind: 'data' }))
  if ((m = /\b(?:url|query)\.([A-Za-z0-9_]*)$/.exec(before)))
    return cat.urlParams.filter((p) => has(p, m![1])).map((p) => ({ label: p, sub: 'URL param', insert: p, replace: m![1].length, kind: 'data' }))
  // A plain word (not part of a name, a number or a dotted path).
  if (!(m = /(?:^|[^A-Za-z0-9_.$[\]'"])([A-Za-z][A-Za-z0-9_]*)$/.exec(before))) return []
  const q = m[1]
  const out: Suggestion[] = []
  for (const f of cat.fields) if (has(f.name, q)) out.push({ label: f.name, sub: `field · ${f.kind}`, insert: `[${f.name}]`, replace: q.length, kind: 'field' })
  for (const f of cat.formulas) if (f.name && has(f.name, q)) out.push({ label: f.name, sub: 'saved formula', insert: `((${f.name}))`, replace: q.length, kind: 'saved' })
  for (const r of cat.rules) if (r.name && has(r.name, q)) out.push({ label: r.name, sub: `saved rule · ${r.resultType}`, insert: `IF((${r.name}))`, replace: q.length, kind: 'rule' })
  for (const fn of LOGIC_FUNCTIONS) if (starts(fn.fn, q)) out.push({ label: `${fn.fn}(${fn.args})`, sub: fn.hint, insert: `${fn.fn}(${fn.args ? '' : ')'}`, replace: q.length, kind: 'fn' })
  for (const l of cat.loads) if (has(l.key, q)) out.push({ label: `$${l.key}`, sub: 'page data', insert: `$${l.key}`, replace: q.length, kind: 'data' })
  for (const f of cat.rowFields) if (has(f.name, q)) out.push({ label: `row.${f.name}`, sub: `row · ${f.kind}`, insert: `row.${f.name}`, replace: q.length, kind: 'data' })
  for (const p of cat.urlParams) if (has(p, q)) out.push({ label: `url.${p}`, sub: 'URL param', insert: `url.${p}`, replace: q.length, kind: 'data' })
  if (cat.condition) for (const k of COND_KEYWORDS) if (q.length >= 2 && starts(k, q)) out.push({ label: k.replace(' (', ' (…)'), insert: `${k}${k.endsWith('(') ? '' : ' '}`, replace: q.length, kind: 'keyword' })
  // Starts-with matches first, then the rest, each in catalog order.
  return [...out.filter((s) => starts(s.label.replace(/^[$[(]+|^row\.|^url\./, ''), q)), ...out.filter((s) => !starts(s.label.replace(/^[$[(]+|^row\.|^url\./, ''), q))]
}

// ---- the function hint -----------------------------------------------------------

/** The function call the caret is inside and which argument it is on; `null` outside any call. */
export function callAt(text: string, caret: number): { fn: string; arg: number; args: string[]; hint: string } | null {
  const before = text.slice(0, caret)
  let depth = 0
  let arg = 0
  let quote: string | null = null
  // Walk forward to know which characters are inside strings / brackets, then scan back.
  const inLit: boolean[] = []
  let bracket = false
  for (const ch of before) {
    if (quote) {
      inLit.push(true)
      if (ch === quote) quote = null
      continue
    }
    if (bracket) {
      inLit.push(true)
      if (ch === ']') bracket = false
      continue
    }
    if (ch === "'" || ch === '"') {
      quote = ch
      inLit.push(true)
    } else if (ch === '[') {
      bracket = true
      inLit.push(true)
    } else inLit.push(false)
  }
  for (let i = before.length - 1; i >= 0; i--) {
    if (inLit[i]) continue
    const ch = before[i]
    if (ch === ')') depth++
    else if (ch === ',' && depth === 0) arg++
    else if (ch === '(') {
      if (depth === 0) {
        const m = /([A-Za-z]+)$/.exec(before.slice(0, i))
        const def = m ? LOGIC_FUNCTIONS.find((f) => f.fn === m[1].toUpperCase()) : undefined
        if (def) return { fn: def.fn, arg, args: def.args ? def.args.split(',').map((s) => s.trim()) : [], hint: def.hint }
        // A plain bracket: keep looking outward.
        arg = 0
      } else depth--
    }
  }
  return null
}

// ---- templates ------------------------------------------------------------------

export type FormulaTemplate = { key: string; label: string; code: string; format?: Partial<ColumnFormatConfig> }

/** The "Start from" starters, filled with the first fitting operands in scope (placeholders otherwise). */
export function formulaTemplates(ctx: Pick<TypeContext, 'fields' | 'loads'>): FormulaTemplate[] {
  const numbers = ctx.fields.filter((f) => kindType(f.kind) === 'number').map((f) => `[${f.name}]`)
  const dates = ctx.fields.filter((f) => kindType(f.kind) === 'date').map((f) => `[${f.name}]`)
  const texts = ctx.fields.filter((f) => ['text', 'options', 'any'].includes(f.options?.length ? 'options' : kindType(f.kind))).map((f) => `[${f.name}]`)
  const n = (i: number, fallback: string) => numbers[i] ?? fallback
  const list = ctx.loads.find((l) => l.fields === undefined || l.fields?.length)
  return [
    { key: 'multiply', label: 'A × B', code: `${n(0, '[Qty]')} × ${n(1, '[Unit price]')}`, format: { type: 'number' } },
    { key: 'sum', label: 'Sum of a table column', code: `SUM($${list?.key ?? 'items'}, 'amount')`, format: { type: 'number' } },
    { key: 'percent', label: 'A % of B', code: `${n(0, '[Part]')} ÷ ${n(1, '[Total]')}`, format: { type: 'percent', percentOf: '1' } },
    { key: 'days', label: 'Days between two dates', code: `DAYS(${dates[0] ?? '[Start date]'}, ${dates[1] ?? 'TODAY()'})`, format: { type: 'number', decimals: 0 } },
    { key: 'join', label: 'Join text', code: `${texts[0] ?? '[First name]'} & ' ' & ${texts[1] ?? '[Last name]'}`, format: { type: 'text' } },
    { key: 'round', label: 'Round to 2 places', code: `ROUND(${n(0, '[Amount]')}, 2)`, format: { type: 'number', decimals: 2 } },
  ]
}

/** A template's format over the default one. */
export function templateFormat(t: FormulaTemplate): ColumnFormatConfig {
  return { ...defaultColumnFormat(), ...t.format } as ColumnFormatConfig
}

// ---- inline ↔ saved ---------------------------------------------------------------

/** A node with its noise removed: keys sorted, one-line groups unwrapped. */
function normalise(n: unknown): unknown {
  if (Array.isArray(n)) return n.map(normalise)
  if (!n || typeof n !== 'object') return n
  const o = n as Record<string, unknown>
  for (const k of ['all', 'any'] as const) {
    if (Array.isArray(o[k]) && Object.keys(o).length === 1 && (o[k] as unknown[]).length === 1) return normalise((o[k] as unknown[])[0])
  }
  return Object.fromEntries(
    Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => [k, normalise(o[k])]),
  )
}

export function sameLogic(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalise(a)) === JSON.stringify(normalise(b))
}

/** A saved true / false rule that is just one condition: `IF c THEN true ELSE false` → `c`. */
export function ruleAsCondition(rule: Rule): Cond | null {
  if (rule.branches.length !== 1) return null
  const b = rule.branches[0]
  const t = b.then
  if (!('lit' in t) || t.lit !== true || !('lit' in rule.else) || rule.else.lit !== false) return null
  return b.when
}

/** The saved item an inline slot value is the same as, if any. */
export function matchSaved(
  value: { kind: 'formula'; expr: Expr } | { kind: 'condition'; cond: StudioCondition },
  formulas: FormulaLibDef[],
  rules: RuleLibDef[],
): { id: string; name: string; kind: 'formula' | 'rule' } | null {
  if (value.kind === 'formula') {
    const f = formulas.find((x) => x.name.trim() && sameLogic(x.expr, value.expr))
    return f ? { id: f.id, name: f.name, kind: 'formula' } : null
  }
  if ('rule' in value.cond) return null
  const cond = value.cond
  const r = rules.find((x) => x.name.trim() && x.resultType === 'boolean' && (() => {
    const c = ruleAsCondition(x.rule)
    return c !== null && sameLogic(c, cond)
  })())
  return r ? { id: r.id, name: r.name, kind: 'rule' } : null
}

/** "Make a copy here": a saved reference → an inline copy of its body. */
export function detachFormula(f: StudioFormula, formulas: FormulaLibDef[], rules: RuleLibDef[]): StudioFormula | null {
  if (!('formulaId' in f)) return f
  const saved = formulas.find((x) => x.id === f.formulaId)
  if (saved) return { expr: saved.expr, format: saved.format, onEmpty: saved.onEmpty, onDivideByZero: saved.onDivideByZero }
  const rule = rules.find((x) => x.id === f.formulaId)
  if (rule) return { expr: { rule: rule.id }, format: rule.format, onEmpty: 'empty', onDivideByZero: 'empty' }
  return null
}

/**
 * "Make a copy here" for a condition: a saved true / false rule → its IF
 * branches as conditions (`any` of each branch giving true; a plain one-branch
 * rule → that branch's condition). `null` when the rule can't be read as one
 * condition (a branch gives a computed value).
 */
export function detachCondition(c: StudioCondition, rules: RuleLibDef[]): Cond | null {
  if (!('rule' in c)) return c
  const rule = rules.find((x) => x.id === c.rule)
  if (!rule) return null
  const plain = ruleAsCondition(rule.rule)
  if (plain) return plain
  // IF a → v1, ELSE IF b → v2 … ELSE e: true when the first matching branch gives true.
  const parts: Cond[] = []
  const misses: Cond[] = []
  for (const b of rule.rule.branches) {
    if (!('lit' in b.then) || typeof b.then.lit !== 'boolean') return null
    if (b.then.lit) parts.push(misses.length ? { all: [...misses.map(negate), b.when] } : b.when)
    misses.push(b.when)
  }
  const e = rule.rule.else
  if (!('lit' in e) || typeof e.lit !== 'boolean') return null
  if (e.lit) parts.push({ all: misses.map(negate) })
  return parts.length === 1 ? parts[0] : { any: parts }
}

const NEGATE: Partial<Record<CondOperator, CondOperator>> = { eq: 'neq', neq: 'eq', gt: 'lte', lte: 'gt', lt: 'gte', gte: 'lt', empty: 'notEmpty', notEmpty: 'empty' }

/** A condition's negation, where the AST can say it (De Morgan over groups; contains / in / between can't). */
function negate(c: Cond): Cond {
  if ('all' in c) return { any: c.all.map(negate) }
  if ('any' in c) return { all: c.any.map(negate) }
  const op = NEGATE[c.cmp]
  if (op) return { ...c, cmp: op } as Cond
  // No NOT in the AST: compare the condition's result with false through a one-branch rule isn't possible inline.
  throw new Error('cannot negate')
}

/** `detachCondition`, never throwing (an un-negatable branch → `null`). */
export function safeDetachCondition(c: StudioCondition, rules: RuleLibDef[]): Cond | null {
  try {
    return detachCondition(c, rules)
  } catch {
    return null
  }
}

// ---- how deep Visual mode goes ---------------------------------------------------------

/**
 * Whether a condition fits Visual mode (spec §14.4): a top group of lines and
 * sub-groups, each sub-group holding lines only. Deeper → Code mode.
 */
export function fitsVisual(c: StudioCondition): boolean {
  if ('rule' in c || 'cmp' in c) return true
  const items = 'all' in c ? c.all : c.any
  return items.every((x) => 'cmp' in x || ('all' in x ? x.all : x.any).every((y) => 'cmp' in y))
}

/** Whether a rule fits the stacked editor: nested IFs at most two levels deep, every condition `fitsVisual`. */
export function ruleFitsVisual(rule: Rule, depth = 1): boolean {
  if (depth > 2) return false
  return rule.branches.every((b) => fitsVisual(b.when) && (!('branches' in b.then) || ruleFitsVisual(b.then, depth + 1)))
}

// ---- Try it defaults ----------------------------------------------------------------

/** A sample input's starting text (spec §14.6): first option, 1, today, on, the field's name. */
export function sampleDefault(type: OperandType, options: OperandOption[], name: string, today = new Date()): string {
  if (options.length) return options[0].value
  switch (type) {
    case 'number':
      return '1'
    case 'date':
      return today.toISOString().slice(0, 10)
    case 'boolean':
      return 'true'
    case 'list':
      return ''
    default:
      return name
  }
}

// ---- format summary ---------------------------------------------------------------

/** One line for a "Show as" format: `Currency THB · 2 dp`, `Percent`, `Raw`. */
export function formatSummary(f: ColumnFormatConfig | undefined): string {
  if (!f || !f.type) return 'Raw value'
  const dp = f.decimals === '' ? '' : ` · ${f.decimals} dp`
  switch (f.type) {
    case 'number':
      return `Number${dp}`
    case 'currency':
      return `Currency${f.currency ? ` ${f.currency}` : ''}${dp}`
    case 'percent':
      return `Percent${dp}`
    case 'date':
    case 'datetime':
      return `${f.type === 'date' ? 'Date' : 'Date + time'}${f.pattern ? ` · ${f.pattern}` : ''}`
    case 'boolean':
      return 'Yes / No'
    case 'text':
      return 'Text'
    default:
      return String(f.type)
  }
}

/** A blank comparison (what "Condition…" starts from). */
export function blankCompare(): Cond {
  return { cmp: 'eq', left: { lit: '' }, right: { lit: '' } }
}

/** Whether an operand is still unpicked (a blank comparison's left). */
export function isBlankOperand(e: Expr): boolean {
  return 'lit' in e && e.lit === ''
}
