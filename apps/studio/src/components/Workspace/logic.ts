import type { Cond, CondOperator, DataValue, Expr, ExprFunction, FormulaBlankPolicy, FormulaDef, LogicResultType, Rule, RuleDef } from '@gummy-ui/ui'
import { columnFormatToEngine, defaultColumnFormat, type ColumnFormatConfig } from '../Layout/types'

/**
 * Logic in the studio (see `spec/gummy-logic-spec.md` §8): the project's
 * saved formulas and rules, the condition / formula values items carry, their
 * export to the engine's names, the Code mode's printer and parser, the
 * presets and the checks. React-free (the MCP uses it).
 *
 * Studio nodes are the engine AST with **ids** where a rename must not break
 * them: `{ formula: <FormulaLibDef.id> }`, `{ rule: <RuleLibDef.id> }`,
 * `{ ref: "state", key: <PageLoadDef.id> }`, and `{ ref: "row", key: "$table" }`
 * for the data table whose modal the item sits in. Field refs are by name
 * (a saved item is a template over whichever form uses it).
 */

/** A condition slot's value: a `Cond`, or a saved boolean rule by id. */
export type StudioCondition = Cond | { rule: string }

export type FormulaLibDef = {
  id: string
  name: string
  description: string
  expr: Expr
  format: ColumnFormatConfig
  onEmpty: FormulaBlankPolicy
  onDivideByZero: FormulaBlankPolicy
}

export type RuleLibDef = {
  id: string
  name: string
  description: string
  resultType: LogicResultType
  rule: Rule
  format: ColumnFormatConfig
}

/** A value slot's formula: a saved one by id, or inline with its own output settings. */
export type StudioFormula =
  | { formulaId: string }
  | { expr: Expr; format: ColumnFormatConfig; onEmpty: FormulaBlankPolicy; onDivideByZero: FormulaBlankPolicy }

/** The `$table` row key: the data table whose modal canvas holds the item (resolved at export). */
export const TABLE_ROW_KEY = '$table'
/** What a deleted saved item exports as (loud on purpose, like `MISSING_PAGE`). */
export const MISSING_FORMULA = 'MISSING_FORMULA'
export const MISSING_RULE = 'MISSING_RULE'

export function createFormulaDef(name = '', expr: Expr = { lit: 0 }): FormulaLibDef {
  return { id: `formula-${crypto.randomUUID()}`, name, description: '', expr, format: defaultColumnFormat(), onEmpty: 'empty', onDivideByZero: 'empty' }
}

export function createRuleDef(name = '', resultType: LogicResultType = 'boolean'): RuleLibDef {
  const blank: Expr = resultType === 'boolean' ? { lit: false } : resultType === 'number' ? { lit: 0 } : { lit: '' }
  return {
    id: `rule-${crypto.randomUUID()}`,
    name,
    description: '',
    resultType,
    rule: { branches: [{ when: { all: [] }, then: resultType === 'boolean' ? { lit: true } : blank }], else: blank },
    format: defaultColumnFormat(),
  }
}

/** A blank inline formula. */
export function inlineFormula(expr: Expr = { lit: 0 }): StudioFormula {
  return { expr, format: defaultColumnFormat(), onEmpty: 'empty', onDivideByZero: 'empty' }
}

export function isSavedFormula(f: StudioFormula): f is { formulaId: string } {
  return 'formulaId' in f
}

// ---- lookups ---------------------------------------------------------------

/** What export and the printer need: id ↔ name for saved items and loads. */
export type LogicNames = {
  formulas: Pick<FormulaLibDef, 'id' | 'name'>[]
  rules: Pick<RuleLibDef, 'id' | 'name'>[]
  loads: { id: string; key: string }[]
}

export function makeLogicNames(
  formulas: Pick<FormulaLibDef, 'id' | 'name'>[] = [],
  rules: Pick<RuleLibDef, 'id' | 'name'>[] = [],
  loads: { id: string; key: string }[] = [],
): LogicNames {
  return { formulas, rules, loads }
}

const nameOf = (list: { id: string; name: string }[], id: string) => list.find((x) => x.id === id)?.name.trim()

// ---- export ----------------------------------------------------------------

export type LogicExportScope = {
  /** The table whose modal holds the item (`$table` row refs). */
  tableName?: string
}

/**
 * A studio node → the engine's: saved ids → names (`MISSING_*` when gone),
 * load ids → slice keys, `$table` → the table name. Anything else is copied.
 */
export function logicToEngine<T>(node: T, names: LogicNames, scope: LogicExportScope = {}): T {
  const walk = (n: unknown): unknown => {
    if (Array.isArray(n)) return n.map(walk)
    if (!n || typeof n !== 'object') return n
    const o = n as Record<string, unknown>
    if (typeof o.formula === 'string' && Object.keys(o).length === 1) return { formula: nameOf(names.formulas, o.formula) || MISSING_FORMULA }
    if (typeof o.rule === 'string' && Object.keys(o).length === 1) return { rule: nameOf(names.rules, o.rule) || MISSING_RULE }
    if (o.ref === 'state' && typeof o.key === 'string') {
      const key = names.loads.find((l) => l.id === o.key)?.key ?? o.key
      return { ...o, key }
    }
    if (o.ref === 'row' && o.key === TABLE_ROW_KEY) return { ...o, key: scope.tableName ?? TABLE_ROW_KEY }
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v)]))
  }
  return walk(node) as T
}

/** A value slot's formula → the engine `DataValue` (`type: "formula"`). */
export function formulaToDataValue(f: StudioFormula, names: LogicNames, scope: LogicExportScope = {}): DataValue {
  if (isSavedFormula(f)) return { type: 'formula', key: 'none', formula: nameOf(names.formulas, f.formulaId) || nameOf(names.rules, f.formulaId) || MISSING_FORMULA }
  const format = columnFormatToEngine(f.format)
  return {
    type: 'formula',
    key: 'none',
    expr: logicToEngine(f.expr, names, scope),
    ...(format ? { format } : {}),
    ...(f.onEmpty !== 'empty' ? { onEmpty: f.onEmpty } : {}),
    ...(f.onDivideByZero !== 'empty' ? { onDivideByZero: f.onDivideByZero } : {}),
  }
}

/** Names usable in the export: non-blank, first one wins on a clash. */
function exportable<T extends { name: string }>(list: T[]): T[] {
  const seen = new Set<string>()
  return list.filter((x) => {
    const n = x.name.trim()
    if (!n || seen.has(n)) return false
    seen.add(n)
    return true
  })
}

/** The project's library → `project.formulas` / `project.rules` (absent when empty). */
export function logicLibraryToEngine(
  formulas: FormulaLibDef[] = [],
  rules: RuleLibDef[] = [],
  loads: { id: string; key: string }[] = [],
): { formulas?: Record<string, FormulaDef>; rules?: Record<string, RuleDef> } {
  const names = makeLogicNames(formulas, rules, loads)
  const f = exportable(formulas).map((d): [string, FormulaDef] => {
    const format = columnFormatToEngine(d.format)
    return [
      d.name.trim(),
      {
        expr: logicToEngine(d.expr, names),
        ...(format ? { format } : {}),
        ...(d.onEmpty !== 'empty' ? { onEmpty: d.onEmpty } : {}),
        ...(d.onDivideByZero !== 'empty' ? { onDivideByZero: d.onDivideByZero } : {}),
      },
    ]
  })
  const r = exportable(rules).map((d): [string, RuleDef] => {
    const format = columnFormatToEngine(d.format)
    return [d.name.trim(), { resultType: d.resultType, rule: logicToEngine(d.rule, names), ...(format ? { format } : {}) }]
  })
  return { ...(f.length ? { formulas: Object.fromEntries(f) } : {}), ...(r.length ? { rules: Object.fromEntries(r) } : {}) }
}

// ---- printing --------------------------------------------------------------

const FN_NAMES: ExprFunction[] = ['ROUND', 'MIN', 'MAX', 'ABS', 'LEN', 'TODAY', 'DAYS', 'COUNT', 'SUM']
export const LOGIC_FUNCTIONS: { fn: ExprFunction; args: string; hint: string }[] = [
  { fn: 'ROUND', args: 'x, decimals', hint: 'Round half away from zero' },
  { fn: 'MIN', args: 'a, b, …', hint: 'Smallest (blanks skipped)' },
  { fn: 'MAX', args: 'a, b, …', hint: 'Largest (blanks skipped)' },
  { fn: 'ABS', args: 'x', hint: 'Without the sign' },
  { fn: 'LEN', args: 'text', hint: 'Length of a text or a list' },
  { fn: 'TODAY', args: '', hint: 'Today’s date' },
  { fn: 'DAYS', args: 'from, to', hint: 'Whole days from → to' },
  { fn: 'COUNT', args: 'list', hint: 'Items in a list' },
  { fn: 'SUM', args: "list, 'field'", hint: 'Sum of a field over a list' },
]

const PREC: Record<string, number> = { '&': 1, '+': 2, '-': 2, '*': 3, '/': 3 }
const SHOW_OP: Record<string, string> = { '*': '×', '/': '÷', '+': '+', '-': '−', '&': '&' }

function printLit(v: number | string | boolean | null): string {
  if (v === null) return 'EMPTY'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return String(v)
  return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

/** A formula as Code-mode text (`[Qty] × [Unit price]`, `((Subtotal))`, `IF((Discount))`). */
export function printExpr(e: Expr, names: LogicNames, parentPrec = 0): string {
  if ('lit' in e) return printLit(e.lit)
  if ('ref' in e) {
    const path = e.path ? `.${e.path}` : ''
    switch (e.ref) {
      case 'field':
        return `[${e.key}${path}]`
      case 'state':
        return `$${names.loads.find((l) => l.id === e.key)?.key ?? e.key}${path}`
      case 'row':
        return e.key === 'none' ? `row${path}` : `row.${e.key}${path}`
      case 'url':
        return `${e.source === 'query' ? 'query' : 'url'}.${e.key}`
    }
  }
  if ('formula' in e) return `((${nameOf(names.formulas, e.formula) || '?'}))`
  if ('rule' in e) return `IF((${nameOf(names.rules, e.rule) || '?'}))`
  if ('op' in e) {
    const p = PREC[e.op]
    // Left-associative: the right side of an equal-precedence op needs brackets.
    const text = `${printExpr(e.args[0], names, p)} ${SHOW_OP[e.op]} ${printExpr(e.args[1], names, p + 0.5)}`
    return p < parentPrec ? `(${text})` : text
  }
  return `${e.fn}(${e.args.map((a) => printExpr(a, names)).join(', ')})`
}

const CMP_TEXT: Record<CondOperator, string> = {
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  empty: 'IS EMPTY',
  notEmpty: 'IS NOT EMPTY',
  contains: 'CONTAINS',
  in: 'IN',
  between: 'BETWEEN',
}

/** A condition as Code-mode text; nested groups are always bracketed. */
export function printCondition(c: StudioCondition, names: LogicNames, nested = false): string {
  if ('rule' in c) return `IF((${nameOf(names.rules, c.rule) || '?'}))`
  if ('all' in c || 'any' in c) {
    const items = 'all' in c ? c.all : c.any
    if (!items.length) return 'all' in c ? 'TRUE' : 'FALSE'
    const text = items.map((x) => printCondition(x, names, true)).join('all' in c ? ' AND ' : ' OR ')
    return nested && items.length > 1 ? `(${text})` : text
  }
  const left = printExpr(c.left, names)
  const rights = Array.isArray(c.right) ? c.right : c.right ? [c.right] : []
  switch (c.cmp) {
    case 'empty':
    case 'notEmpty':
      return `${left} ${CMP_TEXT[c.cmp]}`
    case 'in':
      return `${left} IN (${rights.map((r) => printExpr(r, names)).join(', ')})`
    case 'between':
      return `${left} BETWEEN ${rights[0] ? printExpr(rights[0], names) : '?'} AND ${rights[1] ? printExpr(rights[1], names) : '?'}`
    default:
      return `${left} ${CMP_TEXT[c.cmp]} ${rights[0] ? printExpr(rights[0], names) : '?'}`
  }
}

/** One line for a rule: `IF … · +2 more · ELSE …`. */
export function ruleSummary(rule: Rule, names: LogicNames): string {
  const first = rule.branches[0]
  const head = first ? printCondition(first.when, names) : '—'
  const more = rule.branches.length > 1 ? ` · +${rule.branches.length - 1} more` : ''
  const elseText = printExpr(rule.else, names)
  return `IF ${head.length > 48 ? `${head.slice(0, 47)}…` : head}${more} · ELSE ${elseText}`
}

// ---- parsing ---------------------------------------------------------------

type Tok =
  | { k: 'num'; v: number; at: number }
  | { k: 'str'; v: string; at: number }
  | { k: 'field'; v: string; at: number }
  | { k: 'state'; v: string; at: number }
  | { k: 'formula'; v: string; at: number }
  | { k: 'rule'; v: string; at: number }
  | { k: 'word'; v: string; at: number }
  | { k: 'op'; v: '+' | '-' | '*' | '/' | '&'; at: number }
  | { k: 'cmp'; v: CondOperator; at: number }
  | { k: '(' | ')' | ','; at: number }

export class LogicParseError extends Error {
  at: number
  constructor(message: string, at: number) {
    super(message)
    this.at = at
  }
}

const OP_ALIAS: Record<string, '+' | '-' | '*' | '/' | '&'> = { '+': '+', '-': '-', '−': '-', '*': '*', '×': '*', '/': '/', '÷': '/', '&': '&' }

function lex(text: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  const fail = (msg: string) => {
    throw new LogicParseError(msg, i)
  }
  while (i < text.length) {
    const c = text[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    const at = i
    // `IF((Name))` / `((Name))` — only with a bracket-free name, so `ROUND(((Total)), 2)`
    // reads as `ROUND(` + `((Total))` and `((1 + 2))` as plain brackets.
    const savedRule = /^(?:IF|if)\(\(([^()]*)\)\)/.exec(text.slice(i))
    if (savedRule) {
      out.push({ k: 'rule', v: savedRule[1].trim(), at })
      i += savedRule[0].length
      continue
    }
    const saved = /^\(\(([^()[\]'"$]*[A-Za-z][^()[\]'"$]*)\)\)/.exec(text.slice(i))
    if (saved) {
      out.push({ k: 'formula', v: saved[1].trim(), at })
      i += saved[0].length
      continue
    }
    if (c === '[') {
      const end = text.indexOf(']', i + 1)
      if (end < 0) fail('Missing ] after [')
      out.push({ k: 'field', v: text.slice(i + 1, end).trim(), at })
      i = end + 1
      continue
    }
    if (c === "'" || c === '"') {
      let j = i + 1
      let s = ''
      while (j < text.length && text[j] !== c) {
        if (text[j] === '\\' && j + 1 < text.length) j++
        s += text[j]
        j++
      }
      if (j >= text.length) fail('Missing closing quote')
      out.push({ k: 'str', v: s, at })
      i = j + 1
      continue
    }
    if (c === '$') {
      const m = /^\$[A-Za-z0-9_$.]+/.exec(text.slice(i))
      if (!m) fail('Expected a page-data key after $')
      out.push({ k: 'state', v: m![0].slice(1), at })
      i += m![0].length
      continue
    }
    const num = /^\d+(\.\d+)?%?/.exec(text.slice(i))
    if (num) {
      const raw = num[0]
      const pct = raw.endsWith('%')
      const n = Number(pct ? raw.slice(0, -1) : raw)
      out.push({ k: 'num', v: pct ? Number((n / 100).toPrecision(12)) : n, at })
      i += raw.length
      continue
    }
    const two = text.slice(i, i + 2)
    if (['>=', '<=', '!=', '<>'].includes(two)) {
      out.push({ k: 'cmp', v: two === '>=' ? 'gte' : two === '<=' ? 'lte' : 'neq', at })
      i += 2
      continue
    }
    const cmpMap: Record<string, CondOperator> = { '=': 'eq', '≠': 'neq', '>': 'gt', '≥': 'gte', '<': 'lt', '≤': 'lte' }
    if (cmpMap[c]) {
      out.push({ k: 'cmp', v: cmpMap[c], at })
      i++
      continue
    }
    if (OP_ALIAS[c]) {
      out.push({ k: 'op', v: OP_ALIAS[c], at })
      i++
      continue
    }
    if (c === '(' || c === ')' || c === ',') {
      out.push({ k: c, at })
      i++
      continue
    }
    const w = /^[A-Za-z_][A-Za-z0-9_$.]*/.exec(text.slice(i))
    if (w) {
      out.push({ k: 'word', v: w[0], at })
      i += w[0].length
      continue
    }
    fail(`Unexpected "${c}"`)
  }
  return out
}

class Parser {
  private i = 0
  private toks: Tok[]
  private names: LogicNames
  private end: number
  constructor(toks: Tok[], names: LogicNames, end: number) {
    this.toks = toks
    this.names = names
    this.end = end
  }

  private peek(): Tok | undefined {
    return this.toks[this.i]
  }
  private next(): Tok | undefined {
    return this.toks[this.i++]
  }
  private at(): number {
    return this.peek()?.at ?? this.end
  }
  private fail(msg: string): never {
    throw new LogicParseError(msg, this.at())
  }
  private isWord(w: string, t = this.peek()): boolean {
    return t?.k === 'word' && t.v.toUpperCase() === w
  }
  private expect(k: '(' | ')' | ',', what: string) {
    if (this.peek()?.k !== k) this.fail(`Expected ${what}`)
    this.i++
  }

  done() {
    if (this.peek()) this.fail('Unexpected text after the end')
  }

  expr(minPrec = 1): Expr {
    let left = this.unary()
    for (;;) {
      const t = this.peek()
      if (t?.k !== 'op' || PREC[t.v] < minPrec) return left
      this.i++
      const right = this.expr(PREC[t.v] + 1)
      left = { op: t.v, args: [left, right] }
    }
  }

  private unary(): Expr {
    const t = this.peek()
    if (t?.k === 'op' && t.v === '-') {
      this.i++
      const n = this.peek()
      if (n?.k === 'num') {
        this.i++
        return { lit: -n.v }
      }
      return { op: '-', args: [{ lit: 0 }, this.unary()] }
    }
    return this.primary()
  }

  private primary(): Expr {
    const t = this.next()
    if (!t) this.fail('Expected a value')
    switch (t.k) {
      case 'num':
        return { lit: t.v }
      case 'str':
        return { lit: t.v }
      case 'field': {
        if (!t.v) throw new LogicParseError('Empty field name', t.at)
        const [key, ...path] = t.v.split('.')
        return { ref: 'field', key, ...(path.length ? { path: path.join('.') } : {}) }
      }
      case 'state': {
        const [key, ...path] = t.v.split('.')
        const load = this.names.loads.find((l) => l.key === key || l.id === key)
        if (!load) throw new LogicParseError(`No page data "${key}"`, t.at)
        return { ref: 'state', key: load.id, ...(path.length ? { path: path.join('.') } : {}) }
      }
      case 'formula': {
        const f = this.names.formulas.find((x) => x.name.trim() === t.v)
        if (!f) throw new LogicParseError(`No saved formula ((${t.v}))`, t.at)
        return { formula: f.id }
      }
      case 'rule': {
        const r = this.names.rules.find((x) => x.name.trim() === t.v)
        if (!r) throw new LogicParseError(`No saved rule IF((${t.v}))`, t.at)
        return { rule: r.id }
      }
      case '(': {
        const e = this.expr()
        this.expect(')', ')')
        return e
      }
      case 'word': {
        const up = t.v.toUpperCase()
        if (up === 'TRUE' || up === 'FALSE') return { lit: up === 'TRUE' }
        if (up === 'EMPTY' || up === 'NULL') return { lit: null }
        if (FN_NAMES.includes(up as ExprFunction) && this.peek()?.k === '(') {
          this.i++
          const args: Expr[] = []
          if (this.peek()?.k !== ')') {
            args.push(this.expr())
            while (this.peek()?.k === ',') {
              this.i++
              args.push(this.expr())
            }
          }
          this.expect(')', ') after the arguments')
          return { fn: up as ExprFunction, args }
        }
        const [head, ...rest] = t.v.split('.')
        if (head === 'row') {
          if (!rest.length) return { ref: 'row', key: 'none' }
          return { ref: 'row', key: rest[0], ...(rest.length > 1 ? { path: rest.slice(1).join('.') } : {}) }
        }
        if ((head === 'url' || head === 'query') && rest.length === 1)
          return { ref: 'url', key: rest[0], ...(head === 'query' ? { source: 'query' as const } : {}) }
        throw new LogicParseError(`Unknown name "${t.v}" — fields are written [Name]`, t.at)
      }
      default:
        throw new LogicParseError('Expected a value', t.at)
    }
  }

  condition(): StudioCondition {
    const c = this.or()
    // A single saved rule is the slot's `{ rule }` itself.
    if ('cmp' in c && c.cmp === 'eq' && 'rule' in c.left && c.right && !Array.isArray(c.right) && 'lit' in c.right && c.right.lit === true && this.implicitRule)
      return { rule: c.left.rule }
    return c
  }
  private implicitRule = false

  private or(): Cond {
    const items = [this.and()]
    while (this.isWord('OR')) {
      this.i++
      items.push(this.and())
    }
    return items.length === 1 ? items[0] : { any: items }
  }

  private and(): Cond {
    const items = [this.atom()]
    while (this.isWord('AND')) {
      this.i++
      items.push(this.atom())
    }
    return items.length === 1 ? items[0] : { all: items.flatMap((x) => ('all' in x ? x.all : [x])) }
  }

  private atom(): Cond {
    // A bracketed group, unless the bracket opens an arithmetic left side.
    if (this.peek()?.k === '(') {
      const save = this.i
      this.i++
      try {
        const inner = this.or()
        if (this.peek()?.k === ')') {
          this.i++
          const after = this.peek()
          if (!after || after.k === ')' || this.isWord('AND') || this.isWord('OR')) return inner
        }
      } catch {
        // fall through: an arithmetic bracket
      }
      this.i = save
    }
    if (this.isWord('TRUE') || this.isWord('FALSE')) {
      const t = this.peek() as { v: string }
      const after = this.toks[this.i + 1]
      if (!after || after.k === ')' || (after.k === 'word' && ['AND', 'OR'].includes(after.v.toUpperCase()))) {
        this.i++
        return t.v.toUpperCase() === 'TRUE' ? { all: [] } : { any: [] }
      }
    }
    const left = this.expr()
    const t = this.peek()
    if (t?.k === 'cmp') {
      this.i++
      return { cmp: t.v, left, right: this.expr() }
    }
    if (this.isWord('IS')) {
      this.i++
      const not = this.isWord('NOT')
      if (not) this.i++
      if (!this.isWord('EMPTY')) this.fail('Expected EMPTY after IS')
      this.i++
      return { cmp: not ? 'notEmpty' : 'empty', left }
    }
    if (this.isWord('CONTAINS')) {
      this.i++
      return { cmp: 'contains', left, right: this.expr() }
    }
    if (this.isWord('IN')) {
      this.i++
      this.expect('(', '( after IN')
      const items = [this.expr()]
      while (this.peek()?.k === ',') {
        this.i++
        items.push(this.expr())
      }
      this.expect(')', ') after the list')
      return { cmp: 'in', left, right: items }
    }
    if (this.isWord('BETWEEN')) {
      this.i++
      const lo = this.expr()
      if (!this.isWord('AND')) this.fail('Expected AND in BETWEEN … AND …')
      this.i++
      return { cmp: 'between', left, right: [lo, this.expr()] }
    }
    // A saved boolean rule on its own.
    if ('rule' in left) {
      this.implicitRule = true
      return { cmp: 'eq', left, right: { lit: true } }
    }
    this.fail('Expected a comparison (=, >, IS EMPTY, IN, …)')
  }
}

export type ParseResult<T> = { value: T; error?: undefined } | { value?: undefined; error: string; at: number }

function run<T>(text: string, names: LogicNames, f: (p: Parser) => T): ParseResult<T> {
  try {
    const toks = lex(text)
    if (!toks.length) return { error: 'Empty', at: 0 }
    const p = new Parser(toks, names, text.length)
    const value = f(p)
    p.done()
    return { value }
  } catch (e) {
    if (e instanceof LogicParseError) return { error: e.message, at: e.at }
    throw e
  }
}

/** Code-mode text → a formula, or the first problem and where it is. */
export function parseExpr(text: string, names: LogicNames): ParseResult<Expr> {
  return run(text, names, (p) => p.expr())
}

/** Code-mode text → a condition (`AND` / `OR`, brackets, `IS EMPTY`, `IN`, `BETWEEN`, a saved rule alone). */
export function parseCondition(text: string, names: LogicNames): ParseResult<StudioCondition> {
  return run(text, names, (p) => p.condition())
}

// ---- presets ---------------------------------------------------------------

export const LOGIC_PRESETS = {
  adding: (): Cond => ({ cmp: 'empty', left: { ref: 'row', key: TABLE_ROW_KEY, path: '_id' } }),
  editing: (): Cond => ({ cmp: 'notEmpty', left: { ref: 'row', key: TABLE_ROW_KEY, path: '_id' } }),
  loadStatus: (loadId: string, status: 'success' | 'loading' | 'error'): Cond => ({
    cmp: 'eq',
    left: { ref: 'state', key: loadId, path: '$status' },
    right: { lit: status },
  }),
  field: (name: string): Cond => ({ cmp: 'eq', left: { ref: 'field', key: name }, right: { lit: '' } }),
  item: (path: string): Cond => ({ cmp: 'eq', left: { ref: 'row', key: path || 'none' }, right: { lit: true } }),
}

// ---- references and checks -------------------------------------------------

/** Every saved formula / rule id a node references. */
export function logicRefIds(node: unknown, out: { formulas: Set<string>; rules: Set<string> } = { formulas: new Set(), rules: new Set() }) {
  if (Array.isArray(node)) node.forEach((n) => logicRefIds(n, out))
  else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>
    if (typeof o.formulaId === 'string') out.formulas.add(o.formulaId)
    if (typeof o.formula === 'string' && Object.keys(o).length === 1) out.formulas.add(o.formula)
    else if (typeof o.rule === 'string' && Object.keys(o).length === 1) out.rules.add(o.rule)
    else Object.values(o).forEach((v) => logicRefIds(v, out))
  }
  return out
}

export type LogicIssue = { level: 'error' | 'warning'; where: string; message: string }

function literalType(e: Expr): LogicResultType | undefined {
  if (!('lit' in e)) return undefined
  if (e.lit === null) return undefined
  return typeof e.lit === 'number' ? 'number' : typeof e.lit === 'boolean' ? 'boolean' : 'text'
}

function ruleBranchIssues(rule: Rule, type: LogicResultType, where: string, out: LogicIssue[]) {
  if (!rule.branches.length) out.push({ level: 'error', where, message: 'needs at least one branch' })
  for (const b of rule.branches) {
    if ('branches' in b.then) ruleBranchIssues(b.then, type, where, out)
    else {
      const t = literalType(b.then)
      if (t && t !== type && !(type === 'date' && t === 'text'))
        out.push({ level: 'error', where, message: `a THEN gives ${t}, but the rule gives ${type}` })
    }
  }
  const t = literalType(rule.else)
  if (t && t !== type && !(type === 'date' && t === 'text')) out.push({ level: 'error', where, message: `ELSE gives ${t}, but the rule gives ${type}` })
}

/**
 * The library's own problems: blank / duplicate names, unknown references,
 * cycles, rule branches whose literal results don't match the result type.
 * (Slot checks — a non-boolean rule in a condition — are `slotIssues`.)
 */
export function libraryIssues(formulas: FormulaLibDef[] = [], rules: RuleLibDef[] = []): LogicIssue[] {
  const out: LogicIssue[] = []
  const fIds = new Set(formulas.map((f) => f.id))
  const rIds = new Set(rules.map((r) => r.id))
  const dup = (list: { name: string }[], kind: string) => {
    const seen = new Set<string>()
    for (const x of list) {
      const n = x.name.trim()
      if (!n) out.push({ level: 'error', where: kind, message: 'has a blank name' })
      else if (seen.has(n)) out.push({ level: 'error', where: `${kind} ${n}`, message: 'name is used twice' })
      seen.add(n)
    }
  }
  dup(formulas, 'formula')
  dup(rules, 'rule')
  const check = (where: string, node: unknown) => {
    const refs = logicRefIds(node)
    for (const id of refs.formulas) if (!fIds.has(id)) out.push({ level: 'error', where, message: 'uses a deleted formula' })
    for (const id of refs.rules) if (!rIds.has(id)) out.push({ level: 'error', where, message: 'uses a deleted rule' })
  }
  for (const f of formulas) check(`formula ${f.name || '(unnamed)'}`, f.expr)
  for (const r of rules) {
    check(`rule ${r.name || '(unnamed)'}`, r.rule)
    ruleBranchIssues(r.rule, r.resultType, `rule ${r.name || '(unnamed)'}`, out)
  }
  // Cycles over ids.
  const edges = new Map<string, string[]>()
  for (const f of formulas) {
    const r = logicRefIds(f.expr)
    edges.set(f.id, [...r.formulas, ...r.rules])
  }
  for (const x of rules) {
    const r = logicRefIds(x.rule)
    edges.set(x.id, [...r.formulas, ...r.rules])
  }
  const label = (id: string) => formulas.find((f) => f.id === id)?.name || rules.find((r) => r.id === id)?.name || id
  for (const start of edges.keys()) {
    const stack = [...(edges.get(start) ?? [])]
    const seen = new Set<string>()
    while (stack.length) {
      const id = stack.pop()!
      if (id === start) {
        out.push({ level: 'error', where: label(start), message: 'refers to itself (directly or through another item)' })
        break
      }
      if (seen.has(id)) continue
      seen.add(id)
      stack.push(...(edges.get(id) ?? []))
    }
  }
  return out
}

/** A condition slot's problems against the library: a deleted / non-boolean rule, deleted items inside. */
export function conditionIssues(c: StudioCondition | null | undefined, rules: RuleLibDef[], formulas: FormulaLibDef[], where: string): LogicIssue[] {
  if (!c) return []
  const out: LogicIssue[] = []
  if ('rule' in c) {
    const r = rules.find((x) => x.id === c.rule)
    if (!r) out.push({ level: 'error', where, message: 'uses a deleted rule' })
    else if (r.resultType !== 'boolean') out.push({ level: 'error', where, message: `rule ${r.name} gives ${r.resultType}, not true / false` })
    return out
  }
  const refs = logicRefIds(c)
  for (const id of refs.formulas) if (!formulas.some((f) => f.id === id)) out.push({ level: 'error', where, message: 'uses a deleted formula' })
  for (const id of refs.rules) if (!rules.some((r) => r.id === id)) out.push({ level: 'error', where, message: 'uses a deleted rule' })
  return out
}

// ---- v60: the old Show when → one condition ---------------------------------

/** The pre-v60 shapes (`Layout/types.ts` `ShowWhen` / `DataCondition`), read only by the migration. */
type OldShowWhen = 'always' | 'adding' | 'editing'
type OldDataCondition = {
  loadId: string
  test: 'loaded' | 'loading' | 'failed' | 'compare'
  path: string
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'set' | 'unset'
  value: string
}

/** Text authored in an old condition → the value it spells (number / boolean / null), else the text. */
function oldConditionValue(text: string): number | string | boolean | null {
  const t = text.trim()
  if (t === 'true') return true
  if (t === 'false') return false
  if (t === 'null') return null
  if (t !== '' && !Number.isNaN(Number(t))) return Number(t)
  return text
}

/** A page-data condition (`dataWhen`) as a `Cond`; `null` when it named nothing. */
export function dataConditionToCond(c: OldDataCondition): Cond | null {
  if (!c.loadId) return null
  let left: Expr
  if (c.loadId === '$item') {
    if (c.test !== 'compare') return null
    const [key, ...rest] = c.path.split('.').filter(Boolean)
    left = { ref: 'row', key: key ?? 'none', ...(rest.length ? { path: rest.join('.') } : {}) }
  } else {
    if (c.test !== 'compare') return LOGIC_PRESETS.loadStatus(c.loadId, ({ loaded: 'success', loading: 'loading', failed: 'error' } as const)[c.test])
    left = { ref: 'state', key: c.loadId, ...(c.path ? { path: c.path } : {}) }
  }
  if (c.op === 'set') return { cmp: 'notEmpty', left }
  if (c.op === 'unset') return { cmp: 'empty', left }
  return { cmp: c.op, left, right: { lit: oldConditionValue(c.value) } }
}

type ItemWithConditions = {
  showWhen?: OldShowWhen
  dataWhen?: OldDataCondition | null
  condition?: StudioCondition | null
  childCanvases?: { items: ItemWithConditions[] }[]
}

/**
 * v60: every item's `showWhen` (a table modal's adding / editing) and
 * `dataWhen` (page data / the repeater item) → one `condition`, AND-ed when
 * both were set; the old keys go. In place, through child canvases. Also run
 * over fresh seeds, whose builders still speak the old helpers.
 */
export function migrateItemConditions<T extends ItemWithConditions>(items: T[]): T[] {
  for (const item of items) {
    const parts: Cond[] = []
    if (item.showWhen === 'adding') parts.push(LOGIC_PRESETS.adding())
    if (item.showWhen === 'editing') parts.push(LOGIC_PRESETS.editing())
    const data = item.dataWhen ? dataConditionToCond(item.dataWhen) : null
    if (data) parts.push(data)
    if (parts.length && !item.condition) item.condition = parts.length === 1 ? parts[0] : { all: parts }
    delete item.showWhen
    delete item.dataWhen
    for (const canvas of item.childCanvases ?? []) migrateItemConditions(canvas.items)
  }
  return items
}

// ---- the Visual mode's tokens -------------------------------------------------

export type LexemeKind = 'operand' | 'field' | 'state' | 'saved' | 'rule' | 'value' | 'op' | 'cmp' | 'paren' | 'comma' | 'fn' | 'keyword'
export type Lexeme = { text: string; kind: LexemeKind }

const KEYWORDS = new Set(['AND', 'OR', 'IS', 'NOT', 'EMPTY', 'IN', 'BETWEEN', 'CONTAINS', 'TRUE', 'FALSE', 'NULL'])

/** Code text → its tokens as written (for the Visual mode's chips); `null` while it doesn't lex. */
export function lexemes(text: string): Lexeme[] | null {
  let toks: Tok[]
  try {
    toks = lex(text)
  } catch {
    return null
  }
  return toks.map((t, i) => {
    const end = toks[i + 1]?.at ?? text.length
    return { text: text.slice(t.at, end).trim(), kind: lexemeKind(toks, i) }
  })
}

/**
 * Code text → the character span and kind of every token, never throwing (the
 * formula bar's colouring): when the text stops lexing, the tokens before the
 * problem and `failedAt` where it starts.
 */
export function lexSpans(text: string): { spans: { from: number; to: number; kind: LexemeKind }[]; failedAt?: number } {
  let toks: Tok[]
  let failedAt: number | undefined
  try {
    toks = lex(text)
  } catch (e) {
    if (!(e instanceof LogicParseError)) throw e
    failedAt = e.at
    try {
      toks = lex(text.slice(0, e.at))
    } catch {
      toks = []
      failedAt = 0
    }
  }
  const stop = failedAt ?? text.length
  return {
    spans: toks.map((t, i) => {
      const next = toks[i + 1]?.at ?? stop
      return { from: t.at, to: t.at + text.slice(t.at, next).trimEnd().length, kind: lexemeKind(toks, i) }
    }),
    failedAt,
  }
}

function lexemeKind(toks: Tok[], i: number): LexemeKind {
  const t = toks[i]
  return (
      t.k === 'field'
        ? 'field'
        : t.k === 'state'
          ? 'state'
          : t.k === 'formula'
            ? 'saved'
            : t.k === 'rule'
              ? 'rule'
              : t.k === 'num' || t.k === 'str'
                ? 'value'
                : t.k === 'op'
                  ? 'op'
                  : t.k === 'cmp'
                    ? 'cmp'
                    : t.k === ','
                      ? 'comma'
                      : t.k === '(' || t.k === ')'
                        ? 'paren'
                        : t.k === 'word' && FN_NAMES.includes(t.v.toUpperCase() as ExprFunction) && toks[i + 1]?.k === '('
                          ? 'fn'
                          : t.k === 'word' && KEYWORDS.has(t.v.toUpperCase())
                            ? 'keyword'
                            : 'operand'
  )
}

/** Tokens → code text, spaced the way the printer spaces it. */
export function joinLexemes(list: Lexeme[]): string {
  let out = ''
  list.forEach((l, i) => {
    const prev = list[i - 1]
    const tight = !prev || l.text === ')' || l.kind === 'comma' || prev.text === '(' || (l.text === '(' && prev.kind === 'fn')
    out += (tight ? '' : ' ') + l.text
  })
  return out
}

/**
 * The same text read **left to right** (every operator one precedence), for
 * the "× and ÷ are calculated before + and −" check; `null` when the reading
 * doesn't change anything or the text doesn't parse.
 */
export function leftToRight(text: string, names: LogicNames): Expr | null {
  const saved = { ...PREC }
  try {
    for (const k of Object.keys(PREC)) if (k !== '&') PREC[k] = 2
    const flat = parseExpr(text, names)
    return flat.value ?? null
  } finally {
    Object.assign(PREC, saved)
  }
}

/** Whether brackets-free text mixes + / − with × / ÷ at one level (the precedence check's trigger). */
export function mixesPrecedence(text: string): boolean {
  const list = lexemes(text)
  if (!list) return false
  let depth = 0
  const seen: Record<number, { add: boolean; mul: boolean }> = {}
  for (const l of list) {
    if (l.text === '(') depth++
    else if (l.text === ')') depth--
    else if (l.kind === 'op') {
      const s = (seen[depth] ??= { add: false, mul: false })
      if ('+-−'.includes(l.text)) s.add = true
      if ('*/×÷'.includes(l.text)) s.mul = true
      if (s.add && s.mul) return true
    }
  }
  return false
}

// ---- field renames -------------------------------------------------------------

const isFieldRef = (o: Record<string, unknown>, name: string) => o.ref === 'field' && o.key === name

/** How many `[name]` field references a node (an item tree, a saved item, …) holds. */
export function countFieldRefs(node: unknown, name: string): number {
  if (Array.isArray(node)) return node.reduce((n: number, x) => n + countFieldRefs(x, name), 0)
  if (!node || typeof node !== 'object') return 0
  const o = node as Record<string, unknown>
  if (isFieldRef(o, name)) return 1
  return Object.values(o).reduce((n: number, v) => n + countFieldRefs(v, name), 0)
}

/**
 * The node with every `[from]` field reference reading `[to]` — conditions,
 * Enabled when, value formulas, bindings, saved items alike. Untouched
 * branches keep their identity; nothing else is renamed (the field's own
 * `name` is not a reference).
 */
export function renameFieldRefs<T>(node: T, from: string, to: string): T {
  if (Array.isArray(node)) {
    let changed = false
    const next = node.map((x) => {
      const y = renameFieldRefs(x, from, to)
      if (y !== x) changed = true
      return y
    })
    return (changed ? next : node) as T
  }
  if (!node || typeof node !== 'object') return node
  const o = node as Record<string, unknown>
  if (isFieldRef(o, from)) return { ...o, key: to } as T
  let changed = false
  const next: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(o)) {
    const w = renameFieldRefs(v, from, to)
    if (w !== v) changed = true
    next[k] = w
  }
  return (changed ? next : node) as T
}
