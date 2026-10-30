import type { Cond, Expr } from '@gummy-ui/ui'
import { ChevronDown, Search, SquareFunction, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn, Input, Select } from '../common'
import type { LogicEnv } from './editors'
import { ExprField } from './editors'
import {
  inputFromLiteral,
  isBlankOperand,
  literalFromInput,
  operandOptions,
  operandType,
  operatorChoice,
  operatorsFor,
  sameLogic,
  valueInputKind,
  withOperator,
  type OperandType,
  type SpanTone,
  type TypeContext,
} from './model'
import { OperandPill, TYPE_LABEL, TypeIcon } from './pills'

type Compare = Extract<Cond, { cmp: string }>

export function typeContext(env: LogicEnv): TypeContext {
  return { fields: env.scope.fields, loads: env.scope.loads, rowFields: env.scope.row?.fields ?? null, formulas: env.formulas, rules: env.rules }
}

// ---- the operand picker ----------------------------------------------------------

export type OperandChoice = { key: string; label: string; group: string; expr: Expr; tone: SpanTone; type: OperandType; sub?: string }

/** Everything a condition can compare, grouped by source (spec §14.1). */
export function operandChoices(env: LogicEnv): OperandChoice[] {
  const ctx = typeContext(env)
  const out: OperandChoice[] = []
  const add = (group: string, label: string, expr: Expr, tone: SpanTone, sub?: string) =>
    out.push({ key: `${group}:${label}`, label, group, expr, tone, type: operandType(expr, ctx), sub })
  for (const f of env.scope.fields) add('Form fields', f.name, { ref: 'field', key: f.name }, 'field')
  for (const l of env.scope.loads) {
    add('Page data', `${l.key} status`, { ref: 'state', key: l.id, path: '$status' }, 'data', 'loaded / loading / failed')
    if (l.fields === null || l.fields?.length === 0) add('Page data', l.key, { ref: 'state', key: l.id }, 'data')
    for (const f of l.fields ?? []) add('Page data', `${l.key}.${f.name}`, { ref: 'state', key: l.id, path: f.name }, 'data')
  }
  if (env.scope.row) {
    const g = env.scope.row.label
    for (const f of env.scope.row.fields ?? []) {
      const [key, ...rest] = f.name.split('.')
      add(g, f.name, { ref: 'row', key, ...(rest.length ? { path: rest.join('.') } : {}) }, 'data')
    }
    for (const x of env.scope.row.extras) {
      const expr: Expr = x.code === 'row' ? { ref: 'row', key: 'none' } : { ref: 'row', key: x.code.replace(/^row\./, '') }
      add(g, x.label, expr, 'data')
    }
  }
  if (env.scope.table) add(`Table ${env.scope.table}`, 'edited row id', { ref: 'row', key: '$table', path: '_id' }, 'data', 'empty while adding')
  for (const p of env.scope.urlParams) add('URL', p, { ref: 'url', key: p }, 'data')
  for (const f of env.formulas) if (f.name.trim()) add('Saved formulas', f.name, { formula: f.id }, 'saved', f.description || undefined)
  for (const r of env.rules) if (r.name.trim()) add('Saved rules', r.name, { rule: r.id }, 'rule', r.description || undefined)
  return out
}

function OperandPicker({ value, choices, onPick, onFormula, label }: { value: Expr | null; choices: OperandChoice[]; onPick: (e: Expr) => void; onFormula: () => void; label: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)
  const current = value ? choices.find((c) => sameLogic(c.expr, value)) : undefined
  const q = query.trim().toLowerCase()
  const list = q ? choices.filter((c) => `${c.label} ${c.group}`.toLowerCase().includes(q)) : choices
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  const pick = (c: OperandChoice) => {
    onPick(c.expr)
    setOpen(false)
    setQuery('')
  }
  let lastGroup = ''
  return (
    <div ref={wrap} className="relative min-w-0">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o)
          setActive(0)
        }}
        className="field flex w-full items-center gap-1.5 text-left"
      >
        {current ? <OperandPill text={current.label} tone={current.tone} type={current.type} /> : <span className="text-ink-3">{value ? 'Custom value' : 'Choose…'}</span>}
        <ChevronDown aria-hidden className="ml-auto size-3.5 shrink-0 text-ink-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-line bg-surface shadow-xl">
          <div className="flex items-center gap-1.5 border-b border-line px-2">
            <Search aria-hidden className="size-3.5 text-ink-3" />
            <input
              autoFocus
              aria-label={`Search ${label}`}
              value={query}
              placeholder="Search fields, data, saved…"
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActive((i) => Math.max(0, Math.min(list.length, i + (e.key === 'ArrowDown' ? 1 : -1))))
                } else if (e.key === 'Enter') {
                  e.preventDefault()
                  if (active < list.length) pick(list[active])
                  else {
                    setOpen(false)
                    onFormula()
                  }
                } else if (e.key === 'Escape') {
                  e.stopPropagation()
                  setOpen(false)
                }
              }}
              className="h-8 w-full bg-transparent text-ui text-ink outline-none placeholder:text-ink-3"
            />
          </div>
          <ul role="listbox" aria-label={label} className="max-h-64 overflow-auto py-1">
            {list.map((c, i) => {
              const head = c.group !== lastGroup ? c.group : null
              lastGroup = c.group
              return (
                <li key={c.key} role="option" aria-selected={i === active}>
                  {head && <div className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-3">{head}</div>}
                  <button
                    type="button"
                    onClick={() => pick(c)}
                    onMouseEnter={() => setActive(i)}
                    className={cn('flex w-full items-center gap-2 px-2 py-1 text-left', i === active && 'bg-panel-2')}
                  >
                    <OperandPill text={c.label} tone={c.tone} type={c.type} />
                    <span className="ml-auto shrink-0 truncate text-ui-xs text-ink-3">{c.sub ?? TYPE_LABEL[c.type]}</span>
                  </button>
                </li>
              )
            })}
            {list.length === 0 && <li className="px-2 py-1.5 text-ui-sm text-ink-3">Nothing matches.</li>}
            <li role="option" aria-selected={active === list.length} className="border-t border-line">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onFormula()
                }}
                onMouseEnter={() => setActive(list.length)}
                className={cn('flex w-full items-center gap-2 px-2 py-1.5 text-left text-ui-sm text-ink-2', active === list.length && 'bg-panel-2')}
              >
                <SquareFunction aria-hidden className="size-3.5" /> Write a formula…
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

/** Whether an operand is something the picker lists (else it is shown as a formula). */
function isPickable(e: Expr, choices: OperandChoice[]): boolean {
  return choices.some((c) => sameLogic(c.expr, e))
}

// ---- the value inputs ------------------------------------------------------------

function FxToggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={on ? 'Back to a plain value' : 'Use another field or a formula'}
      onClick={onClick}
      className={cn('grid size-7 shrink-0 place-items-center rounded-md border text-ui-xs', on ? 'border-line-strong bg-panel-2 text-ink' : 'border-line text-ink-3 hover:text-ink')}
    >
      <SquareFunction aria-hidden className="size-3.5" />
    </button>
  )
}

function OptionChips({ options, value, onChange }: { options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Values">
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn('rounded-full border px-2 py-0.5 text-ui-sm', on ? 'border-transparent bg-logic-value-tint text-logic-value' : 'border-line text-ink-2 hover:border-line-strong')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** A text box that commits a literal per keystroke (number / date / text). */
function LiteralBox({ kind, value, onChange, label }: { kind: 'text' | 'number' | 'date'; value: Expr | undefined; onChange: (e: Expr) => void; label: string }) {
  const text = inputFromLiteral(value) ?? ''
  return (
    <Input
      aria-label={label}
      type={kind === 'text' ? 'text' : kind}
      value={text}
      placeholder={kind === 'number' ? '0' : kind === 'date' ? '' : 'value'}
      onChange={(e) => onChange(literalFromInput(kind, e.target.value))}
      className="w-full"
    />
  )
}

// ---- the line --------------------------------------------------------------------

/**
 * One comparison built from pickers (spec §14.1): the operand, an operator
 * that fits its type, a value input of that type — ƒx turns either side into
 * a formula. `stack` lays the three out vertically (the inspector).
 */
export function ConditionLine({ value, onChange, env, layout = 'row', onRemove, trailing }: { value: Compare; onChange: (c: Cond) => void; env: LogicEnv; layout?: 'row' | 'stack'; onRemove?: () => void; trailing?: ReactNode }) {
  const ctx = useMemo(() => typeContext(env), [env])
  const choices = useMemo(() => operandChoices(env), [env])
  const type = operandType(value.left, ctx)
  const options = operandOptions(value.left, ctx)
  const choice = operatorChoice(value, type)
  const kind = valueInputKind(type, choice, options.length > 0)
  const rights = Array.isArray(value.right) ? value.right : value.right ? [value.right] : []
  const [leftFx, setLeftFx] = useState(() => !isPickable(value.left, choices) && !isBlankOperand(value.left))
  const rightIsLiteral = rights.every((r) => 'lit' in r)
  const [rightFx, setRightFx] = useState(!rightIsLiteral)

  const setLeft = (left: Expr) => {
    const t = operandType(left, ctx)
    const ops = operatorsFor(t)
    // Keep the operator when the new type offers it; else start from its first.
    const keep = ops.find((o) => o.cmp === value.cmp && !o.fixed) ?? ops[0]
    onChange(withOperator({ ...value, left }, keep, t))
  }
  const setRight = (right: Expr | Expr[]) => onChange({ ...value, right } as Cond)

  const valueInput = () => {
    if (kind === 'none') return null
    if (rightFx && (kind === 'text' || kind === 'number' || kind === 'date' || kind === 'option')) {
      return <ExprField label="Value formula" value={rights[0] ?? { lit: '' }} env={env} onChange={(r) => setRight(r)} placeholder="[Other field] or a formula" />
    }
    switch (kind) {
      case 'option':
        return (
          <Select
            aria-label="Value"
            options={[{ value: '', label: 'Choose…' }, ...options]}
            value={inputFromLiteral(rights[0]) ?? ''}
            onChange={(v) => setRight({ lit: v })}
          />
        )
      case 'optionList':
        return <OptionChips options={options} value={rights.map((r) => inputFromLiteral(r) ?? '')} onChange={(vs) => setRight(vs.map((v) => ({ lit: v })))} />
      case 'textList':
        return (
          <Input
            aria-label="Values"
            placeholder="a, b, c"
            defaultValue={rights.map((r) => inputFromLiteral(r) ?? '').join(', ')}
            onChange={(e) =>
              setRight(
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((s) => literalFromInput(type === 'number' ? 'number' : 'text', s)),
              )
            }
          />
        )
      case 'numberRange':
      case 'dateRange': {
        const k = kind === 'dateRange' ? 'date' : 'number'
        return (
          <div className="flex items-center gap-1.5">
            <LiteralBox kind={k} label="From" value={rights[0]} onChange={(lo) => setRight([lo, rights[1] ?? { lit: '' }])} />
            <span className="text-ui-sm text-ink-3">and</span>
            <LiteralBox kind={k} label="To" value={rights[1]} onChange={(hi) => setRight([rights[0] ?? { lit: '' }, hi])} />
          </div>
        )
      }
      default:
        return <LiteralBox kind={kind} label="Value" value={rights[0]} onChange={(r) => setRight(r)} />
    }
  }

  const fxAllowed = kind === 'text' || kind === 'number' || kind === 'date' || kind === 'option'
  const left = leftFx ? (
    <div className="flex min-w-0 items-start gap-1">
      <div className="min-w-0 flex-1">
        <ExprField label="Left formula" value={value.left} env={env} onChange={setLeft} placeholder="[Field] or a formula" />
      </div>
      <FxToggle on label="Pick a field instead" onClick={() => setLeftFx(false)} />
    </div>
  ) : (
    <OperandPicker label="Compare" value={isBlankOperand(value.left) ? null : value.left} choices={choices} onPick={setLeft} onFormula={() => setLeftFx(true)} />
  )
  const op = (
    <Select
      aria-label="Comparison"
      options={operatorsFor(type).map((o) => ({ value: o.key, label: o.label }))}
      value={choice.key}
      onChange={(k) => {
        const next = operatorsFor(type).find((o) => o.key === k)
        if (next) onChange(withOperator(value, next, type))
      }}
    />
  )
  const right = kind === 'none' ? null : (
    <div className="flex min-w-0 items-start gap-1">
      <div className="min-w-0 flex-1">{valueInput()}</div>
      {fxAllowed && <FxToggle on={rightFx} label={rightFx ? 'Use a plain value' : 'Use a formula as the value'} onClick={() => {
        if (rightFx) setRight(literalFromInput(kind === 'option' ? 'text' : kind, ''))
        setRightFx(!rightFx)
      }} />}
    </div>
  )
  const remove = onRemove && (
    <button type="button" aria-label="Remove condition" onClick={onRemove} className="grid size-7 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink">
      <X aria-hidden className="size-3.5" />
    </button>
  )

  if (layout === 'stack')
    return (
      <div className="space-y-1.5">
        {left}
        <div className="flex items-center gap-1.5">
          <TypeIcon type={type} className="text-ink-3" />
          <div className="min-w-0 flex-1">{op}</div>
          {remove}
        </div>
        {right}
        {trailing}
      </div>
    )
  // One row when there is room, the three parts stacked when the line is narrow (a container query).
  return (
    <div className="@container">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-1.5 @[26rem]:grid-cols-[minmax(0,1.2fr)_minmax(7.5rem,0.7fr)_minmax(0,1.2fr)_auto]">
        <div className="min-w-0 @[26rem]:contents">
          <div className="min-w-0">{left}</div>
          <div className="mt-1.5 min-w-0 @[26rem]:mt-0">{op}</div>
          {right ? <div className="mt-1.5 min-w-0 @[26rem]:mt-0">{right}</div> : <div className="hidden @[26rem]:block" />}
        </div>
        <div className="flex items-center gap-1">
          {trailing}
          {remove}
        </div>
      </div>
    </div>
  )
}
