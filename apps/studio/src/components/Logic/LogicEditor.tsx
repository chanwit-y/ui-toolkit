import type { Expr, FormulaBlankPolicy, LogicResultType, Rule } from '@gummy-ui/ui'
import { ChevronRight, Search } from 'lucide-react'
import { useContext, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Button, cn, Input, SegmentedControl, Select } from '../common'
import { ColumnFormatFields } from '../Layout/ColumnFormatFields'
import { defaultColumnFormat, type ColumnFormatConfig, type ColumnFormatType } from '../Layout/types'
import { LOGIC_FUNCTIONS, leftToRight, mixesPrecedence, parseExpr, printExpr, type FormulaLibDef, type RuleLibDef, type StudioCondition } from '../Workspace/logic'
import { CodeInput, InsertContext, type InsertTarget } from './CodeInput'
import { ConditionEditor } from './ConditionGroup'
import { operandChoices } from './ConditionLine'
import type { LogicEnv } from './editors'
import { formulaTemplates, templateFormat } from './model'
import { OperandPill } from './pills'
import { RuleCards } from './RuleCards'
import { SampleEvalContext, TryIt, useTryIt, type TryItState } from './TryIt'

/** An inline formula (a slot's own, not a saved reference). */
export type InlineFormula = { expr: Expr; format: ColumnFormatConfig; onEmpty: FormulaBlankPolicy; onDivideByZero: FormulaBlankPolicy }

/** What the editor edits. */
export type EditorValue =
  | { kind: 'condition'; cond: StudioCondition }
  | { kind: 'formula'; formula: InlineFormula }
  | { kind: 'savedFormula'; def: FormulaLibDef }
  | { kind: 'savedRule'; def: RuleLibDef }

const RESULT_TYPES: { value: LogicResultType; label: string }[] = [
  { value: 'boolean', label: 'Yes / No' },
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
]

const SHOW_AS: { value: ColumnFormatType; label: string }[] = [
  { value: '', label: 'Raw' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'percent', label: 'Percent' },
  { value: 'date', label: 'Date' },
  { value: 'text', label: 'Text' },
]
const EXTRA_SHOW_AS: Partial<Record<ColumnFormatType, string>> = { datetime: 'Date + time', boolean: 'Yes / No' }

const POLICY_OPTIONS: { value: FormulaBlankPolicy; label: string }[] = [
  { value: 'empty', label: 'leave the result empty' },
  { value: 'zero', label: 'treat it as 0' },
  { value: 'error', label: 'show an error' },
]
const DIVIDE_OPTIONS: { value: FormulaBlankPolicy; label: string }[] = [
  { value: 'empty', label: 'leave the result empty' },
  { value: 'zero', label: 'show 0' },
  { value: 'error', label: 'show an error' },
]

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="sec-label">{title}</div>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      {children}
    </section>
  )
}

// ---- Insert ---------------------------------------------------------------------------

/** The searchable Insert list (spec §14.4): operands by source, then functions; a click inserts at the focused bar. */
function InsertList({ env }: { env: LogicEnv }) {
  const ctx = useContext(InsertContext)
  const [query, setQuery] = useState('')
  const choices = useMemo(() => operandChoices(env), [env])
  const q = query.trim().toLowerCase()
  const shown = q ? choices.filter((c) => `${c.label} ${c.group}`.toLowerCase().includes(q)) : choices
  const fns = LOGIC_FUNCTIONS.filter((f) => !q || `${f.fn} ${f.hint}`.toLowerCase().includes(q))
  let lastGroup = ''
  return (
    <aside aria-label="Insert" className="logic-fade-in flex min-h-0 flex-col gap-2">
      <div className="sec-label">Insert</div>
      <label className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2">
        <Search aria-hidden className="size-3.5 text-ink-3" />
        <input aria-label="Search insertable" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-7 w-full bg-transparent text-ui-sm text-ink outline-none placeholder:text-ink-3" />
      </label>
      <ul className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {shown.map((c) => {
          const head = c.group !== lastGroup ? c.group : null
          lastGroup = c.group
          return (
            <li key={c.key}>
              {head && <div className="px-1 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-3">{head}</div>}
              <button
                type="button"
                aria-label={`Insert ${c.label}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => ctx?.insert(printExpr(c.expr, env.names))}
                className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-panel-2"
              >
                <OperandPill text={c.label} tone={c.tone} type={c.type} />
              </button>
            </li>
          )
        })}
        {fns.length > 0 && <li className="px-1 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-3">Functions</li>}
        {fns.map((f) => (
          <li key={f.fn}>
            <button
              type="button"
              aria-label={`Insert ${f.fn}`}
              title={`${f.fn}(${f.args}) — ${f.hint}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => ctx?.insert(`${f.fn}(${f.args ? '' : ')'}`)}
              className="flex w-full items-baseline gap-2 rounded px-1 py-0.5 text-left hover:bg-panel-2"
            >
              <span className="font-mono text-ui-sm font-semibold text-ink">{f.fn}</span>
              <span className="truncate text-ui-xs text-ink-3">{f.hint}</span>
            </button>
          </li>
        ))}
        {shown.length === 0 && fns.length === 0 && <li className="px-1 py-1 text-ui-xs text-ink-3">Nothing matches.</li>}
      </ul>
    </aside>
  )
}

// ---- Show as ------------------------------------------------------------------------

function ShowAs({ format, onChange, preview, policies }: { format: ColumnFormatConfig; onChange: (f: ColumnFormatConfig) => void; preview?: string; policies?: { summary: string; content: ReactNode } }) {
  const [policiesOpen, setPoliciesOpen] = useState(false)
  const chips = EXTRA_SHOW_AS[format.type] ? [...SHOW_AS, { value: format.type, label: EXTRA_SHOW_AS[format.type]! }] : SHOW_AS
  return (
    <Section title="Show as">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl className="flex-wrap" aria-label="Show as" options={chips} value={format.type} onChange={(v) => onChange({ ...format, type: v as ColumnFormatType })} />
        {preview !== undefined && (
          <span className="ml-auto truncate rounded-md bg-panel-2 px-2 py-0.5 font-mono text-ui text-ink" title="The Try-it result in this format">
            {preview}
          </span>
        )}
      </div>
      {format.type && format.type !== 'text' && <ColumnFormatFields hideType column={{ format }} onChange={onChange} />}
      {policies && (
        <div>
          <button type="button" className="flex items-center gap-1 text-ui-xs text-ink-2 hover:text-ink" aria-expanded={policiesOpen} onClick={() => setPoliciesOpen((o) => !o)}>
            <ChevronRight aria-hidden className={cn('size-3 transition-transform', policiesOpen && 'rotate-90')} />
            {policiesOpen ? 'When inputs are missing' : policies.summary}
          </button>
          {policiesOpen && <div className="mt-1.5">{policies.content}</div>}
        </div>
      )}
    </Section>
  )
}

function Policies({ onEmpty, onDivide, setOnEmpty, setOnDivide }: { onEmpty: FormulaBlankPolicy; onDivide: FormulaBlankPolicy; setOnEmpty: (p: FormulaBlankPolicy) => void; setOnDivide: (p: FormulaBlankPolicy) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="space-y-1">
        <span className="text-ui-sm font-medium text-ink-2">If an input is empty</span>
        <Select aria-label="Empty input" options={POLICY_OPTIONS} value={onEmpty} onChange={(v) => setOnEmpty(v as FormulaBlankPolicy)} />
      </label>
      <label className="space-y-1">
        <span className="text-ui-sm font-medium text-ink-2">Divide by 0</span>
        <Select aria-label="Divide by 0" options={DIVIDE_OPTIONS} value={onDivide} onChange={(v) => setOnDivide(v as FormulaBlankPolicy)} />
      </label>
    </div>
  )
}

// ---- the formula body --------------------------------------------------------------------

/** A formula's text with its parse: the last valid `Expr` stays the value while the text doesn't parse. */
function useFormulaText(initial: Expr, env: LogicEnv, onExpr: (e: Expr) => void, onError?: (e: string | null) => void) {
  const [text, setTextState] = useState(() => {
    const t = printExpr(initial, env.names)
    return t === "''" ? '' : t
  })
  const parsed = useMemo(() => parseExpr(text, env.names), [text, env.names])
  const error = parsed.value === undefined && text.trim() ? { message: parsed.error, at: parsed.at } : null
  const setText = (t: string) => {
    setTextState(t)
    const r = parseExpr(t, env.names)
    if (r.value !== undefined) onExpr(r.value)
    else if (!t.trim()) onExpr({ lit: '' })
    onError?.(r.value === undefined && t.trim() ? r.error : null)
  }
  return { text, setText, error }
}

function FormulaBody({
  formula,
  onChange,
  env,
  tryIt,
  onError,
}: {
  formula: InlineFormula
  onChange: (f: InlineFormula) => void
  env: LogicEnv
  tryIt: TryItState
  onError?: (e: string | null) => void
}) {
  const latest = useRef(formula)
  latest.current = formula
  const ft = useFormulaText(formula.expr, env, (expr) => onChange({ ...latest.current, expr }), onError)
  const expr = formula.expr
  const format = formula.format ?? defaultColumnFormat()
  const flat = mixesPrecedence(ft.text) ? leftToRight(ft.text, env.names) : null
  const timesHundred = format.type === 'percent' && format.percentOf === '1' && 'op' in expr && expr.op === '*' && 'lit' in expr.args[1] && expr.args[1].lit === 100
  const empty = ft.text.trim() === '' || ft.text.trim() === '0'
  const templates = useMemo(() => formulaTemplates({ fields: env.scope.fields, loads: env.scope.loads }), [env.scope])
  const summary = `If an input is empty: ${POLICY_OPTIONS.find((o) => o.value === formula.onEmpty)?.label} · ÷ 0: ${DIVIDE_OPTIONS.find((o) => o.value === formula.onDivideByZero)?.label}`
  return (
    <div className="space-y-4">
      <Section title="Formula">
        <CodeInput
          aria-label="Formula code"
          value={ft.text}
          onChange={ft.setText}
          error={ft.error?.message}
          errorAt={ft.error?.at}
          scope={env.scope}
          formulas={env.formulas}
          rules={env.rules}
          operators
          placeholder="Type a field name, a number or a function — e.g. qty × price"
        />
        {empty && (
          <div className="logic-fade-in space-y-1">
            <div className="text-ui-xs text-ink-3">Start from</div>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    ft.setText(t.code)
                    const r = parseExpr(t.code, env.names)
                    onChange({ ...latest.current, ...(r.value !== undefined ? { expr: r.value } : {}), format: templateFormat(t) })
                  }}
                  className="rounded-full border border-line bg-panel px-2.5 py-0.5 text-ui-sm text-ink-2 hover:border-line-strong hover:text-ink"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {flat && (
          <div className="rounded-md border border-warn/50 bg-panel p-2 text-ui-sm text-ink-2">
            <strong className="text-ink">× and ÷ are calculated before + and −.</strong> It reads <span className="font-mono">{printExpr(expr, env.names)}</span>; left to right it would be{' '}
            <span className="font-mono">{printExpr(flat, env.names)}</span>.{' '}
            <Button size="sm" onClick={() => ft.setText(printExpr(flat, env.names))}>
              Use left to right
            </Button>
          </div>
        )}
        {timesHundred && 'op' in expr && (
          <div className="rounded-md border border-warn/50 bg-panel p-2 text-ui-sm text-ink-2">
            A percent already multiplies by 100, so <span className="font-mono">× 100</span> would show the result 100 times too big.{' '}
            <Button size="sm" onClick={() => ft.setText(printExpr(expr.args[0], env.names))}>
              Remove × 100
            </Button>
          </div>
        )}
      </Section>
      <ShowAs
        format={format}
        onChange={(f) => onChange({ ...formula, format: f })}
        preview={tryIt.result && !tryIt.result.error ? tryIt.result.text : undefined}
        policies={{
          summary,
          content: (
            <Policies
              onEmpty={formula.onEmpty}
              onDivide={formula.onDivideByZero}
              setOnEmpty={(p) => onChange({ ...formula, onEmpty: p })}
              setOnDivide={(p) => onChange({ ...formula, onDivideByZero: p })}
            />
          ),
        }}
      />
    </div>
  )
}

// ---- the editor ------------------------------------------------------------------------

/**
 * The logic editor (spec §14.4): Insert · the editor · Try it. Shared by the
 * dialog (a slot or a saved item) and the Logic tab (a saved item, inline).
 */
export function LogicEditor({
  value,
  onChange,
  env,
  insertOpen,
  mode = 'visual',
  lead,
  nameRef,
  nameIssue,
  onFormulaError,
}: {
  value: EditorValue
  onChange: (v: EditorValue) => void
  env: LogicEnv
  insertOpen: boolean
  /** A condition's Visual / Code mode. */
  mode?: 'visual' | 'code'
  /** The condition's lead words ("Show when", "Enabled when"). */
  lead?: string
  nameRef?: RefObject<HTMLInputElement | null>
  /** A saved item's name problem (blank, taken). */
  nameIssue?: string | null
  onFormulaError?: (e: string | null) => void
}) {
  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null)
  const insertCtx = useMemo(() => ({ setTarget: setInsertTarget, insert: (t: string) => insertTarget?.insert(t) }), [insertTarget])

  const tryKind = value.kind === 'condition' ? 'condition' : value.kind === 'savedRule' ? 'rule' : 'formula'
  const node: Expr | StudioCondition | Rule =
    value.kind === 'condition' ? value.cond : value.kind === 'formula' ? value.formula.expr : value.kind === 'savedFormula' ? value.def.expr : value.def.rule
  const out =
    value.kind === 'formula'
      ? { format: value.formula.format, onEmpty: value.formula.onEmpty, onDivideByZero: value.formula.onDivideByZero }
      : value.kind === 'savedFormula'
        ? { format: value.def.format, onEmpty: value.def.onEmpty, onDivideByZero: value.def.onDivideByZero }
        : value.kind === 'savedRule'
          ? { format: value.def.format }
          : {}
  const tryIt = useTryIt(tryKind, node, out, env)

  let body: ReactNode
  if (value.kind === 'condition')
    body = (
      <Section title="Conditions">
        <ConditionEditor value={value.cond} onChange={(cond) => onChange({ kind: 'condition', cond })} env={env} mode={mode} lead={lead} />
      </Section>
    )
  else if (value.kind === 'formula')
    body = <FormulaBody formula={value.formula} onChange={(formula) => onChange({ kind: 'formula', formula })} env={env} tryIt={tryIt} onError={onFormulaError} />
  else if (value.kind === 'savedFormula') {
    const def = value.def
    body = (
      <FormulaBody
        key={def.id}
        formula={{ expr: def.expr, format: def.format, onEmpty: def.onEmpty, onDivideByZero: def.onDivideByZero }}
        onChange={(f) => onChange({ kind: 'savedFormula', def: { ...def, ...f } })}
        env={env}
        tryIt={tryIt}
        onError={onFormulaError}
      />
    )
  } else {
    const def = value.def
    body = (
      <div className="space-y-4">
        <Section
          title="Rule"
          aside={<SegmentedControl className="flex-wrap" aria-label="Result type" options={RESULT_TYPES} value={def.resultType} onChange={(t) => onChange({ kind: 'savedRule', def: { ...def, resultType: t as LogicResultType } })} />}
        >
          <RuleCards value={def.rule} onChange={(rule) => onChange({ kind: 'savedRule', def: { ...def, rule } })} resultType={def.resultType} env={env} />
        </Section>
        {def.resultType !== 'boolean' && (
          <ShowAs format={def.format} onChange={(format) => onChange({ kind: 'savedRule', def: { ...def, format } })} preview={tryIt.result && !tryIt.result.error ? tryIt.result.text : undefined} />
        )}
      </div>
    )
  }

  const saved = value.kind === 'savedFormula' || value.kind === 'savedRule' ? value.def : null
  return (
    <InsertContext.Provider value={insertCtx}>
      <SampleEvalContext.Provider value={tryIt.evaluator}>
        <div className={cn('grid min-h-0 flex-1 gap-5', insertOpen ? 'grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)_minmax(0,15rem)]' : 'grid-cols-[minmax(0,1fr)_minmax(0,15rem)]')}>
          {insertOpen && <InsertList env={env} />}
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            {saved && (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
                <label className="space-y-1">
                  <span className="text-ui-sm font-medium text-ink-2">Name</span>
                  <Input
                    ref={nameRef}
                    aria-label="Name"
                    value={saved.name}
                    onChange={(e) => onChange(value.kind === 'savedFormula' ? { kind: 'savedFormula', def: { ...value.def, name: e.target.value } } : { kind: 'savedRule', def: { ...(value as { def: RuleLibDef }).def, name: e.target.value } })}
                    placeholder={value.kind === 'savedFormula' ? 'Subtotal' : 'Discount rate'}
                  />
                  {nameIssue && <span className="text-ui-xs text-danger">{nameIssue}</span>}
                </label>
                <label className="space-y-1">
                  <span className="text-ui-sm font-medium text-ink-2">Description</span>
                  <Input
                    aria-label="Description"
                    value={saved.description}
                    onChange={(e) =>
                      onChange(value.kind === 'savedFormula' ? { kind: 'savedFormula', def: { ...value.def, description: e.target.value } } : { kind: 'savedRule', def: { ...(value as { def: RuleLibDef }).def, description: e.target.value } })
                    }
                  />
                </label>
              </div>
            )}
            {body}
          </div>
          <TryIt state={tryIt} />
        </div>
      </SampleEvalContext.Provider>
    </InsertContext.Provider>
  )
}
