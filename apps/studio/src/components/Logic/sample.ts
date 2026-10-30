import {
  evaluateCondition,
  evaluateFormula,
  evaluateRule,
  formatResult,
  type CellFormat,
  type Cond,
  type Expr,
  type FormulaBlankPolicy,
  type LogicLibrary,
  type LogicScope,
  type Rule,
} from '@gummy-ui/ui'
import { logicLibraryToEngine, logicToEngine, type FormulaLibDef, type LogicNames, type RuleLibDef, type StudioCondition } from '../Workspace/logic'

/**
 * The editor's **Sample result** (spec §8.2): the operands a node reads
 * (through saved items), one editable sample value each, and the result the
 * engine's own evaluator gives for them.
 */

export type SampleRef = { id: string; label: string; ref: 'field' | 'state' | 'row' | 'url'; key: string; path?: string; source?: 'param' | 'query' }

/** Every reference a (studio) node reads, through the saved items it uses — labelled as Code mode writes them. */
export function sampleRefs(node: unknown, formulas: FormulaLibDef[], rules: RuleLibDef[], names: LogicNames): SampleRef[] {
  const out = new Map<string, SampleRef>()
  const seen = new Set<string>()
  const walk = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(walk)
    if (!n || typeof n !== 'object') return
    const o = n as Record<string, unknown>
    if (typeof o.ref === 'string') {
      const key = String(o.key)
      const path = typeof o.path === 'string' ? o.path : undefined
      const loadKey = o.ref === 'state' ? (names.loads.find((l) => l.id === key)?.key ?? key) : key
      const p = path ? `.${path}` : ''
      const label =
        o.ref === 'field' ? `[${key}${p}]` : o.ref === 'state' ? `$${loadKey}${p}` : o.ref === 'row' ? (key === 'none' ? `row${p}` : `row.${key}${p}`) : `${o.source === 'query' ? 'query' : 'url'}.${key}`
      out.set(label, { id: label, label, ref: o.ref as SampleRef['ref'], key: o.ref === 'state' ? loadKey : key, path, source: o.source as SampleRef['source'] })
      return
    }
    if (typeof o.formula === 'string' && Object.keys(o).length === 1) {
      if (!seen.has(o.formula)) {
        seen.add(o.formula)
        walk(formulas.find((f) => f.id === o.formula)?.expr)
      }
      return
    }
    if (typeof o.rule === 'string' && Object.keys(o).length === 1) {
      if (!seen.has(o.rule)) {
        seen.add(o.rule)
        walk(rules.find((r) => r.id === o.rule)?.rule)
      }
      return
    }
    Object.values(o).forEach(walk)
  }
  walk(node)
  return [...out.values()]
}

/** Typed sample text → a value: blank is empty, numbers / booleans parse, the rest stays text. */
export function sampleValue(text: string): unknown {
  const t = text.trim()
  if (t === '') return undefined
  if (t === 'true') return true
  if (t === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  return text
}

function setPath(target: Record<string, unknown>, path: string[], value: unknown) {
  let cur = target
  path.forEach((seg, i) => {
    if (i === path.length - 1) cur[seg] = value
    else {
      if (!cur[seg] || typeof cur[seg] !== 'object') cur[seg] = {}
      cur = cur[seg] as Record<string, unknown>
    }
  })
}

function getPath(source: unknown, path: string | undefined): unknown {
  if (!path) return source
  return path.split('.').reduce<unknown>((cur, seg) => (cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[seg] : undefined), source)
}

/** The engine scope the samples stand for. */
export function sampleScope(refs: SampleRef[], samples: Record<string, string>, library: LogicLibrary, fieldTypes: Record<string, string> = {}): LogicScope {
  const fields: Record<string, unknown> = {}
  const states: Record<string, unknown> = {}
  const row: Record<string, unknown> = {}
  const params: Record<string, string | undefined> = {}
  const query = new URLSearchParams()
  let index: number | undefined
  let cell: unknown
  for (const r of refs) {
    const v = sampleValue(samples[r.id] ?? '')
    if (v === undefined) continue
    const path = r.path ? r.path.split('.') : []
    if (r.ref === 'field') setPath(fields, [r.key, ...path], v)
    else if (r.ref === 'state') setPath(states, [r.key, ...path], v)
    else if (r.ref === 'row') {
      if (r.key === '$index') index = Number(v)
      else if (r.key === '$value') cell = v
      else if (r.key === 'none') setPath(row, path.length ? path : ['$self'], v)
      else setPath(row, [r.key, ...path], v)
    } else if (r.source === 'query') query.set(r.key, String(v))
    else params[r.key] = String(v)
  }
  return {
    field: (n) => fields[n],
    fieldType: (n) => fieldTypes[n],
    state: (k, p) => getPath(states[k], p),
    row,
    index,
    value: cell,
    params,
    searchParams: query,
    library,
  }
}

export type SampleResult = { text: string; raw: unknown; error?: string; branch?: number }

/** A formula, condition or rule evaluated over the samples, as the engine would. */
export function evaluateSample(
  kind: 'formula' | 'condition' | 'rule',
  node: Expr | StudioCondition | Rule,
  out: { format?: CellFormat; onEmpty?: FormulaBlankPolicy; onDivideByZero?: FormulaBlankPolicy },
  refs: SampleRef[],
  samples: Record<string, string>,
  formulas: FormulaLibDef[],
  rules: RuleLibDef[],
  names: LogicNames,
  fieldTypes?: Record<string, string>,
): SampleResult {
  const library = logicLibraryToEngine(formulas, rules, names.loads)
  const scope = sampleScope(refs, samples, library, fieldTypes)
  const engine = logicToEngine(node, names)
  if (kind === 'condition') {
    const holds = evaluateCondition(engine as Cond | { rule: string }, scope)
    return { text: holds ? 'TRUE' : 'FALSE', raw: holds }
  }
  if (kind === 'rule') {
    const rule = engine as Rule
    const r = evaluateRule(rule, scope)
    const branch = rule.branches.findIndex((b) => evaluateCondition(b.when, scope))
    return { text: r.error ? '—' : formatResult(r.value, out.format) || '(empty)', raw: r.value, error: r.error, branch }
  }
  const r = evaluateFormula({ expr: engine as Expr, format: out.format, onEmpty: out.onEmpty, onDivideByZero: out.onDivideByZero }, scope)
  return { text: r.error ? '—' : formatResult(r.value, out.format) || '(empty)', raw: r.value, error: r.error }
}

// ---- Try it (spec §14.6) ------------------------------------------------------------

/** A sample ref as the expression it stands for (a page-data ref by load **key** → its id). */
export function sampleRefExpr(r: SampleRef, loads: { id: string; key: string }[]): Expr {
  if (r.ref === 'state') return { ref: 'state', key: loads.find((l) => l.key === r.key)?.id ?? r.key, ...(r.path ? { path: r.path } : {}) }
  if (r.ref === 'url') return { ref: 'url', key: r.key, ...(r.source ? { source: r.source } : {}) }
  return { ref: r.ref, key: r.key, ...(r.path ? { path: r.path } : {}) } as Expr
}

/** The samples typed so far this studio session, by ref label (in memory only). */
const SESSION = new Map<string, string>()
const listeners = new Set<() => void>()
let version = 0
const emit = () => {
  version++
  listeners.forEach((l) => l())
}

export const sampleSession = {
  get: (id: string) => SESSION.get(id),
  set: (id: string, text: string) => {
    SESSION.set(id, text)
    emit()
  },
  reset: (ids: string[]) => {
    ids.forEach((id) => SESSION.delete(id))
    emit()
  },
  subscribe: (l: () => void) => {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
  version: () => version,
}

/** A condition / branch evaluator over one set of samples (the per-line dots, the matching rule card). */
export type SampleEval = { holds: (c: StudioCondition) => boolean | null }

export function makeSampleEval(
  refs: SampleRef[],
  samples: Record<string, string>,
  formulas: FormulaLibDef[],
  rules: RuleLibDef[],
  names: LogicNames,
  fieldTypes?: Record<string, string>,
): SampleEval {
  const library = logicLibraryToEngine(formulas, rules, names.loads)
  const scope = sampleScope(refs, samples, library, fieldTypes)
  return {
    holds: (c) => {
      try {
        return evaluateCondition(logicToEngine(c, names) as Cond | { rule: string }, scope)
      } catch {
        return null
      }
    },
  }
}
