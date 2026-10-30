import type { Cond, CondOperator, Expr, LogicResultType, Rule } from '@gummy-ui/ui'
import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, cn, Select } from '../common'
import {
  joinLexemes,
  lexemes,
  LOGIC_FUNCTIONS,
  parseCondition,
  parseExpr,
  printCondition,
  printExpr,
  type FormulaLibDef,
  type Lexeme,
  type LogicNames,
  type RuleLibDef,
  type StudioCondition,
} from '../Workspace/logic'
import { CodeInput, InsertContext } from './CodeInput'
import type { LogicScopeInfo } from './scope'

/** What every editor piece needs: the operand scope, the saved items and the names. */
export type LogicEnv = { scope: LogicScopeInfo; formulas: FormulaLibDef[]; rules: RuleLibDef[]; names: LogicNames }

// ---- one expression ----------------------------------------------------------

/**
 * A one-line formula bound to an `Expr`: the text is kept locally while it
 * doesn't parse (the last valid formula stays stored), and follows the value
 * when it changes from outside.
 */
export function ExprField({ value, onChange, env, label, placeholder }: { value: Expr; onChange: (e: Expr) => void; env: LogicEnv; label: string; placeholder?: string }) {
  const printed = useMemo(() => printExpr(value, env.names), [value, env.names])
  const [text, setText] = useState(printed)
  const [error, setError] = useState<string | null>(null)
  const last = useRef(printed)
  useEffect(() => {
    if (printed !== last.current) {
      last.current = printed
      setText(printed)
      setError(null)
    }
  }, [printed])
  return (
    <CodeInput
      aria-label={label}
      value={text}
      placeholder={placeholder}
      error={error}
      scope={env.scope}
      formulas={env.formulas}
      rules={env.rules}
      onChange={(t) => {
        setText(t)
        const r = parseExpr(t, env.names)
        if (r.value === undefined) return setError(t.trim() ? r.error : null)
        setError(null)
        last.current = printExpr(r.value, env.names)
        onChange(r.value)
      }}
    />
  )
}

// ---- the palette ---------------------------------------------------------------

function PaletteSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="sec-label">{title}</div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

function Chip({ code, label, title, onInsert, tone = 'default' }: { code: string; label?: string; title?: string; onInsert: (code: string) => void; tone?: 'default' | 'field' | 'saved' | 'rule' | 'op' }) {
  return (
    <button
      type="button"
      title={title ?? code}
      aria-label={`Insert ${label ?? code}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onInsert(code)}
      className={cn(
        'max-w-full truncate rounded border px-1.5 py-0.5 font-mono text-ui-xs',
        tone === 'op' && 'border-line-strong bg-panel-2 text-ink',
        tone === 'field' && 'border-line bg-sunken text-ink',
        tone === 'saved' && 'border-line bg-sunken text-ink-2 italic',
        tone === 'rule' && 'border-warn/50 bg-sunken text-ink-2',
        tone === 'default' && 'border-line bg-panel text-ink-2',
      )}
    >
      {label ?? code}
    </button>
  )
}

/** Everything insertable, by source (the mockup's left library); a click inserts at the focused input's caret. */
export function Palette({ env, condition }: { env: LogicEnv; condition?: boolean }) {
  const ctx = useContext(InsertContext)
  const insert = (code: string) => ctx?.insert(code)
  const { scope, formulas, rules } = env
  return (
    <div className="space-y-3">
      <PaletteSection title="Operators">
        {['+', '−', '×', '÷', '&', '(', ')'].map((op) => (
          <Chip key={op} code={op} tone="op" onInsert={insert} title={op === '&' ? 'Join as text' : undefined} />
        ))}
      </PaletteSection>
      {condition && (
        <PaletteSection title="Compare">
          {['=', '≠', '>', '≥', '<', '≤', 'IS EMPTY', 'IS NOT EMPTY', 'CONTAINS', 'IN ()', 'BETWEEN', 'AND', 'OR'].map((op) => (
            <Chip key={op} code={op === 'IN ()' ? 'IN (' : op} label={op} tone="op" onInsert={insert} />
          ))}
        </PaletteSection>
      )}
      <PaletteSection title="Functions">
        {LOGIC_FUNCTIONS.map((f) => (
          <Chip key={f.fn} code={`${f.fn}(`} label={f.fn} title={`${f.fn}(${f.args}) — ${f.hint}`} onInsert={insert} />
        ))}
      </PaletteSection>
      {scope.fields.length > 0 && (
        <PaletteSection title="Form fields">
          {scope.fields.map((f) => (
            <Chip key={f.name} code={`[${f.name}]`} tone="field" title={`${f.name} · ${f.kind}`} onInsert={insert} />
          ))}
        </PaletteSection>
      )}
      {scope.loads.length > 0 && (
        <PaletteSection title="Page data">
          {scope.loads.map((l) => (
            <Chip key={l.id} code={`$${l.key}`} tone="field" title={`$${l.key}.<path> · $${l.key}.$status`} onInsert={insert} />
          ))}
        </PaletteSection>
      )}
      {scope.row && (
        <PaletteSection title={scope.row.label}>
          {(scope.row.fields ?? []).map((f) => (
            <Chip key={f.name} code={`row.${f.name}`} tone="field" title={f.kind} onInsert={insert} />
          ))}
          {scope.row.extras.map((x) => (
            <Chip key={x.code} code={x.code} title={x.label} onInsert={insert} />
          ))}
          {scope.row.hint && <p className="w-full text-ui-xs text-ink-3">{scope.row.hint}</p>}
        </PaletteSection>
      )}
      {scope.table && (
        <PaletteSection title={`Table ${scope.table}`}>
          <Chip code="row.$table._id" title={`${scope.table}._id — empty while adding, set while editing`} onInsert={insert} />
        </PaletteSection>
      )}
      {scope.urlParams.length > 0 && (
        <PaletteSection title="URL">
          {scope.urlParams.map((p) => (
            <Chip key={p} code={`url.${p}`} tone="field" onInsert={insert} />
          ))}
        </PaletteSection>
      )}
      {formulas.some((f) => f.name.trim()) && (
        <PaletteSection title="Saved formulas">
          {formulas.filter((f) => f.name.trim()).map((f) => (
            <Chip key={f.id} code={`((${f.name.trim()}))`} tone="saved" title={f.description || f.name} onInsert={insert} />
          ))}
        </PaletteSection>
      )}
      {rules.some((r) => r.name.trim()) && (
        <PaletteSection title="Saved rules">
          {rules.filter((r) => r.name.trim()).map((r) => (
            <Chip key={r.id} code={`IF((${r.name.trim()}))`} tone="rule" title={`${r.description || r.name} · gives ${r.resultType}`} onInsert={insert} />
          ))}
        </PaletteSection>
      )}
      <PaletteSection title="Values">
        {['TRUE', 'FALSE', 'EMPTY', "''", 'TODAY()'].map((v) => (
          <Chip key={v} code={v} onInsert={insert} />
        ))}
        {scope.fields
          .filter((f) => f.options?.length)
          .flatMap((f) => f.options!.map((o) => <Chip key={`${f.name}-${o.value}`} code={`'${o.value}'`} title={`${f.name}: ${o.label}`} onInsert={insert} />))}
      </PaletteSection>
    </div>
  )
}

// ---- Visual mode: the formula as tokens ------------------------------------------

const TOKEN_TONE: Record<Lexeme['kind'], string> = {
  field: 'border-line-strong bg-sunken text-ink',
  state: 'border-line-strong bg-sunken text-ink',
  operand: 'border-line-strong bg-sunken text-ink',
  saved: 'border-line bg-panel-2 italic text-ink',
  rule: 'border-warn/60 bg-panel-2 text-ink',
  value: 'border-line bg-panel text-ink',
  op: 'border-transparent bg-transparent text-ink-2 font-semibold',
  cmp: 'border-transparent bg-transparent text-ink-2 font-semibold',
  paren: 'border-transparent bg-transparent text-ink-3',
  comma: 'border-transparent bg-transparent text-ink-3',
  fn: 'border-line bg-panel-2 text-ink font-semibold',
  keyword: 'border-transparent bg-transparent text-ink-2 font-semibold',
}

/**
 * The formula as a row of tokens (Visual mode): click one to select it, the
 * palette inserts after it (or at the end), Delete / Backspace removes it,
 * ← → move. The text stays the source of truth.
 */
export function TokenRow({ text, onText, label }: { text: string; onText: (t: string) => void; label: string }) {
  const tokens = lexemes(text)
  const [sel, setSel] = useState<number | null>(null)
  const ctx = useContext(InsertContext)
  const rowRef = useRef<HTMLDivElement>(null)
  // The palette's target reads the latest text / selection through a ref, so
  // it is registered once (a fresh object per render would re-render the
  // dialog, which re-renders this row, …).
  const latest = useRef({ text, sel, onText })
  latest.current = { text, sel, onText }
  const target = useMemo(
    () => ({
      insert: (code: string) => {
        const { text: t, sel: s, onText: set } = latest.current
        const list = lexemes(t) ?? []
        const add = lexemes(code) ?? [{ text: code, kind: 'operand' as const }]
        const at = s === null ? list.length : s + 1
        set(joinLexemes([...list.slice(0, at), ...add, ...list.slice(at)]))
        setSel(at + add.length - 1)
      },
    }),
    [],
  )
  const register = () => ctx?.setTarget(target)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(register, [])
  if (!tokens) return null
  const remove = () => {
    if (sel === null) return
    onText(joinLexemes(tokens.filter((_, i) => i !== sel)))
    setSel(sel > 0 ? sel - 1 : tokens.length > 1 ? 0 : null)
  }
  return (
    <div
      ref={rowRef}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onFocus={register}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault()
          remove()
        } else if (e.key === 'ArrowLeft') setSel((s) => (s === null ? tokens.length - 1 : Math.max(0, s - 1)))
        else if (e.key === 'ArrowRight') setSel((s) => (s === null ? 0 : Math.min(tokens.length - 1, s + 1)))
        else if (e.key === 'Escape') setSel(null)
      }}
      onClick={(e) => {
        if (e.target === rowRef.current) setSel(null)
      }}
      className="flex min-h-14 flex-wrap content-start items-center gap-1 rounded-md border border-dashed border-line-strong bg-sunken/40 p-2 outline-none focus:ring-2 focus:ring-focus"
    >
      {tokens.length === 0 && <span className="text-ui-sm text-ink-3">Click the palette to add operators and operands</span>}
      {tokens.map((t, i) => (
        <button
          key={`${i}-${t.text}`}
          type="button"
          role="option"
          aria-selected={sel === i}
          onClick={(e) => {
            e.stopPropagation()
            setSel(sel === i ? null : i)
            rowRef.current?.focus()
          }}
          className={cn('rounded border px-1.5 py-0.5 font-mono text-ui-sm', TOKEN_TONE[t.kind], sel === i && 'ring-2 ring-focus')}
        >
          {t.text}
        </button>
      ))}
      {sel !== null && (
        <span className="ml-auto text-ui-xs text-ink-3">
          inserts after the selected token · <kbd>⌫</kbd> removes it
        </span>
      )}
    </div>
  )
}

// ---- conditions ----------------------------------------------------------------

const CMP_OPTIONS: { value: CondOperator; label: string }[] = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'empty', label: 'is empty' },
  { value: 'notEmpty', label: 'is not empty' },
  { value: 'contains', label: 'contains' },
  { value: 'in', label: 'is one of' },
  { value: 'between', label: 'between' },
]

const DEPTH_TONE = ['border-l-ink-2', 'border-l-ok', 'border-l-warn', 'border-l-danger']

function blankCompare(): Cond {
  return { cmp: 'eq', left: { lit: '' }, right: { lit: '' } }
}

/** `IN (…)`'s list as one comma-separated field. */
function ListField({ value, onChange, env }: { value: Expr[]; onChange: (v: Expr[]) => void; env: LogicEnv }) {
  const printed = value.map((v) => printExpr(v, env.names)).join(', ')
  const [text, setText] = useState(printed)
  const [error, setError] = useState<string | null>(null)
  return (
    <CodeInput
      aria-label="Values"
      value={text}
      placeholder="'TH', 'ID'"
      error={error}
      scope={env.scope}
      formulas={env.formulas}
      rules={env.rules}
      onChange={(t) => {
        setText(t)
        const r = parseCondition(`row IN (${t})`, env.names)
        if (r.value === undefined || !('cmp' in r.value) || !Array.isArray(r.value.right)) return setError(t.trim() ? 'Write values separated by commas' : null)
        setError(null)
        onChange(r.value.right)
      }}
    />
  )
}

function CompareRow({ value, onChange, onRemove, env }: { value: Extract<Cond, { cmp: string }>; onChange: (c: Cond) => void; onRemove?: () => void; env: LogicEnv }) {
  const rights = Array.isArray(value.right) ? value.right : value.right ? [value.right] : []
  const setOp = (op: CondOperator) => {
    if (op === 'empty' || op === 'notEmpty') return onChange({ cmp: op, left: value.left })
    if (op === 'in') return onChange({ cmp: op, left: value.left, right: rights.length ? rights : [{ lit: '' }] })
    if (op === 'between') return onChange({ cmp: op, left: value.left, right: [rights[0] ?? { lit: 0 }, rights[1] ?? { lit: 0 }] })
    onChange({ cmp: op, left: value.left, right: rights[0] ?? { lit: '' } })
  }
  return (
    <div className="flex flex-wrap items-start gap-1.5">
      <div className="min-w-40 flex-1">
        <ExprField label="Left side" value={value.left} onChange={(left) => onChange({ ...value, left })} env={env} placeholder="[Field]" />
      </div>
      <div className="w-32">
        <Select aria-label="Comparison" options={CMP_OPTIONS} value={value.cmp} onChange={(op) => setOp(op as CondOperator)} />
      </div>
      {value.cmp === 'in' && (
        <div className="min-w-40 flex-1">
          <ListField value={rights} onChange={(right) => onChange({ ...value, right })} env={env} />
        </div>
      )}
      {value.cmp === 'between' && (
        <>
          <div className="min-w-24 flex-1">
            <ExprField label="From" value={rights[0] ?? { lit: 0 }} onChange={(lo) => onChange({ ...value, right: [lo, rights[1] ?? { lit: 0 }] })} env={env} />
          </div>
          <span className="pt-1 text-ui-sm text-ink-3">and</span>
          <div className="min-w-24 flex-1">
            <ExprField label="To" value={rights[1] ?? { lit: 0 }} onChange={(hi) => onChange({ ...value, right: [rights[0] ?? { lit: 0 }, hi] })} env={env} />
          </div>
        </>
      )}
      {value.cmp !== 'in' && value.cmp !== 'between' && value.cmp !== 'empty' && value.cmp !== 'notEmpty' && (
        <div className="min-w-40 flex-1">
          <ExprField label="Right side" value={rights[0] ?? { lit: '' }} onChange={(right) => onChange({ ...value, right })} env={env} placeholder="value" />
        </div>
      )}
      {onRemove && (
        <Button size="sm" aria-label="Remove condition" onClick={onRemove}>
          ×
        </Button>
      )}
    </div>
  )
}

/** An AND / OR group: rows and nested groups, the logic toggle, add condition / group. */
function GroupEditor({ value, onChange, onRemove, env, depth = 0 }: { value: Extract<Cond, { all: Cond[] }> | Extract<Cond, { any: Cond[] }>; onChange: (c: Cond) => void; onRemove?: () => void; env: LogicEnv; depth?: number }) {
  const isAll = 'all' in value
  const items = isAll ? value.all : value.any
  const set = (next: Cond[]) => onChange(isAll ? { all: next } : { any: next })
  const setAt = (i: number, c: Cond) => set(items.map((x, j) => (j === i ? c : x)))
  const removeAt = (i: number) => set(items.filter((_, j) => j !== i))
  return (
    <div className={cn('space-y-2 rounded-md border border-line border-l-4 bg-panel p-2', DEPTH_TONE[depth % DEPTH_TONE.length])}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(isAll ? { any: items } : { all: items })}
          className={cn('rounded px-2 py-0.5 text-ui-xs font-semibold', isAll ? 'bg-ink text-surface' : 'border border-ink text-ink')}
          aria-label={`Match ${isAll ? 'all' : 'any'} — click to switch`}
        >
          {isAll ? 'AND' : 'OR'}
        </button>
        <span className="text-ui-xs text-ink-3">{isAll ? 'every line must hold' : 'one line is enough'}</span>
        {onRemove && (
          <Button size="sm" className="ml-auto" onClick={onRemove}>
            Delete group
          </Button>
        )}
      </div>
      {items.length === 0 && <p className="text-ui-xs text-ink-3">{isAll ? 'No lines: always true.' : 'No lines: always false.'}</p>}
      {items.map((c, i) =>
        'cmp' in c ? (
          <CompareRow key={i} value={c} env={env} onChange={(n) => setAt(i, n)} onRemove={() => removeAt(i)} />
        ) : (
          <GroupEditor key={i} value={c} env={env} depth={depth + 1} onChange={(n) => setAt(i, n)} onRemove={() => removeAt(i)} />
        ),
      )}
      <div className="flex gap-1.5">
        <Button size="sm" onClick={() => set([...items, blankCompare()])}>
          + Condition
        </Button>
        <Button size="sm" onClick={() => set([...items, isAll ? { any: [blankCompare(), blankCompare()] } : { all: [blankCompare(), blankCompare()] }])}>
          + {isAll ? 'OR' : 'AND'} group
        </Button>
      </div>
    </div>
  )
}

/** A condition, visually (groups) or as code; a saved boolean rule alone is a one-liner. */
export function ConditionEditor({ value, onChange, env, mode }: { value: StudioCondition; onChange: (c: StudioCondition) => void; env: LogicEnv; mode: 'visual' | 'code' }) {
  const printed = useMemo(() => printCondition(value, env.names), [value, env.names])
  const [text, setText] = useState(printed)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (mode === 'visual') {
      setText(printed)
      setError(null)
    }
  }, [mode, printed])
  if (mode === 'code')
    return (
      <CodeInput
        multiline
        aria-label="Condition code"
        value={text}
        error={error}
        scope={env.scope}
        formulas={env.formulas}
        rules={env.rules}
        placeholder="[Type] = 'Business' AND [Qty] > 0"
        onChange={(t) => {
          setText(t)
          const r = parseCondition(t, env.names)
          if (r.value === undefined) return setError(`${r.error} (at ${r.at + 1})`)
          setError(null)
          onChange(r.value)
        }}
      />
    )
  if ('rule' in value)
    return (
      <div className="rounded-md border border-line bg-panel p-2 text-ui-sm text-ink-2">
        Uses the saved rule <span className="font-mono text-ink">{printed}</span>.{' '}
        <button type="button" className="underline" onClick={() => onChange({ all: [{ cmp: 'eq', left: { rule: value.rule }, right: { lit: true } }] })}>
          Turn into lines
        </button>
      </div>
    )
  const group = 'cmp' in value ? { all: [value] } : value
  return <GroupEditor value={group} onChange={onChange} env={env} />
}

// ---- rules -----------------------------------------------------------------------

type RulePath = number[]

function ruleAt(rule: Rule, path: RulePath): Rule {
  return path.reduce<Rule>((r, i) => r.branches[i].then as Rule, rule)
}

function updateRule(rule: Rule, path: RulePath, f: (r: Rule) => Rule): Rule {
  if (!path.length) return f(rule)
  const [i, ...rest] = path
  return { ...rule, branches: rule.branches.map((b, j) => (j === i ? { ...b, then: updateRule(b.then as Rule, rest, f) } : b)) }
}

const isNested = (then: Expr | Rule): then is Rule => typeof then === 'object' && then !== null && 'branches' in then

function blankFor(type: LogicResultType): Expr {
  return type === 'boolean' ? { lit: true } : type === 'number' ? { lit: 0 } : { lit: '' }
}

/** The structure outline (left): IF / ELSE IF / ELSE per level; the selected row is the branch being edited. */
function Outline({ rule, names, path, sel, onSel, depth = 0 }: { rule: Rule; names: LogicNames; path: RulePath; sel: string; onSel: (key: string) => void; depth?: number }) {
  return (
    <ul className="space-y-0.5">
      {rule.branches.map((b, i) => {
        const key = [...path, i].join('.')
        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => onSel(key)}
              aria-current={sel === key}
              style={{ paddingLeft: `${depth * 14 + 6}px` }}
              className={cn('flex w-full items-baseline gap-1.5 rounded py-1 pr-1 text-left text-ui-xs', sel === key ? 'bg-accent text-accent-ink' : 'text-ink-2 hover:bg-panel-2')}
            >
              <span className="shrink-0 font-semibold">{i ? 'ELSE IF' : 'IF'}</span>
              <span className="truncate font-mono">{printCondition(b.when, names)}</span>
              {!isNested(b.then) && <span className="ml-auto shrink-0 font-mono">→ {printExpr(b.then, names)}</span>}
            </button>
            {isNested(b.then) && <Outline rule={b.then} names={names} path={[...path, i]} sel={sel} onSel={onSel} depth={depth + 1} />}
          </li>
        )
      })}
      <li>
        <button
          type="button"
          onClick={() => onSel(`${path.join('.')}${path.length ? '.' : ''}else`)}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          className={cn('flex w-full items-baseline gap-1.5 rounded py-1 pr-1 text-left text-ui-xs', sel === `${path.join('.')}${path.length ? '.' : ''}else` ? 'bg-accent text-accent-ink' : 'text-ink-2 hover:bg-panel-2')}
        >
          <span className="shrink-0 font-semibold">ELSE</span>
          <span className="truncate font-mono">→ {printExpr(rule.else, names)}</span>
        </button>
      </li>
    </ul>
  )
}

/**
 * IF / ELSE IF / ELSE (the mockup's outline + selected-branch layout): the
 * outline on the left, the selected branch's conditions and THEN on the
 * right; THEN is a value or a nested IF; ELSE is required.
 */
export function RuleEditor({ value, onChange, resultType, env, highlight }: { value: Rule; onChange: (r: Rule) => void; resultType: LogicResultType; env: LogicEnv; highlight?: number }) {
  const [sel, setSel] = useState('0')
  const parts = sel.split('.')
  const isElse = parts[parts.length - 1] === 'else'
  const path = (isElse ? parts.slice(0, -1) : parts.slice(0, -1)).filter(Boolean).map(Number)
  const index = isElse ? -1 : Number(parts[parts.length - 1])
  const level = ruleAt(value, path)
  const branch = isElse ? null : level.branches[index]
  const setLevel = (f: (r: Rule) => Rule) => onChange(updateRule(value, path, f))
  if (!isElse && !branch) {
    // The selection fell off (a branch was removed): back to the first.
    queueMicrotask(() => setSel('0'))
    return null
  }
  const levelLabel = `Level ${path.length + 1}`
  return (
    <div className="grid grid-cols-[minmax(0,15rem)_minmax(0,1fr)] gap-3">
      <div className="space-y-2 rounded-md border border-line bg-panel p-2">
        <div className="sec-label">Structure</div>
        <Outline rule={value} names={env.names} path={[]} sel={sel} onSel={setSel} />
        {highlight !== undefined && <p className="text-ui-xs text-ink-3">Sample: {highlight >= 0 ? `branch ${highlight + 1} matches` : 'ELSE is used'}.</p>}
        <p className="text-ui-xs leading-relaxed text-ink-3">Branches are checked top to bottom. The first one whose conditions hold gives the result; if none does, ELSE.</p>
      </div>
      <div className="space-y-3">
        {branch ? (
          <>
            <div className="flex items-center gap-2">
              <span className="rounded bg-ink px-2 py-0.5 text-ui-xs font-semibold text-surface">{index ? 'ELSE IF' : 'IF'}</span>
              <span className="text-ui-xs text-ink-3">
                {levelLabel} · branch {index + 1} of {level.branches.length}
              </span>
              <Button
                size="sm"
                className="ml-auto"
                disabled={level.branches.length <= 1}
                title={level.branches.length <= 1 ? (path.length ? 'A nested IF keeps one branch — use “Replace with a value” on its parent’s THEN to remove it.' : 'An IF needs at least one branch — change its conditions instead.') : undefined}
                onClick={() => {
                  setLevel((r) => ({ ...r, branches: r.branches.filter((_, j) => j !== index) }))
                  setSel([...path, 0].join('.'))
                }}
              >
                Delete branch
              </Button>
            </div>
            <ConditionEditor
              mode="visual"
              env={env}
              value={branch.when}
              onChange={(c) => setLevel((r) => ({ ...r, branches: r.branches.map((b, j) => (j === index ? { ...b, when: 'rule' in c ? { all: [{ cmp: 'eq', left: { rule: c.rule }, right: { lit: true } }] } : c } : b)) }))}
            />
            <div className="space-y-1.5">
              <div className="sec-label">Then</div>
              {isNested(branch.then) ? (
                <div className="flex items-center gap-2 rounded-md border border-line bg-panel p-2 text-ui-sm text-ink-2">
                  A nested IF with {branch.then.branches.length} branch{branch.then.branches.length > 1 ? 'es' : ''} + ELSE.
                  <Button size="sm" onClick={() => setSel([...path, index, 0].join('.'))}>
                    Edit →
                  </Button>
                  <Button size="sm" onClick={() => setLevel((r) => ({ ...r, branches: r.branches.map((b, j) => (j === index ? { ...b, then: blankFor(resultType) } : b)) }))}>
                    Replace with a value
                  </Button>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <ExprField label="Then" value={branch.then} env={env} onChange={(then) => setLevel((r) => ({ ...r, branches: r.branches.map((b, j) => (j === index ? { ...b, then } : b)) }))} />
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      setLevel((r) => ({
                        ...r,
                        branches: r.branches.map((b, j) => (j === index ? { ...b, then: { branches: [{ when: { all: [blankCompare()] }, then: blankFor(resultType) }], else: b.then as Expr } } : b)),
                      }))
                    }
                  >
                    + Nest IF under THEN
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-panel-2 px-2 py-0.5 text-ui-xs font-semibold text-ink">ELSE</span>
              <span className="text-ui-xs text-ink-3">{levelLabel} · the result when no branch above matches (it can’t be deleted)</span>
            </div>
            <ExprField label="Else" value={level.else} env={env} onChange={(e) => setLevel((r) => ({ ...r, else: e }))} />
          </div>
        )}
        <Button
          size="sm"
          onClick={() => {
            setLevel((r) => ({ ...r, branches: [...r.branches, { when: { all: [blankCompare()] }, then: blankFor(resultType) }] }))
            setSel([...path, level.branches.length].join('.'))
          }}
        >
          + ELSE IF at this level
        </Button>
      </div>
    </div>
  )
}
