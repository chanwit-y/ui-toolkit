import type { Cond, Expr, LogicResultType, Rule } from '@gummy-ui/ui'
import { ChevronDown, ChevronRight, SquareFunction } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn, Input, SegmentedControl, SortableCardList } from '../common'
import { ConditionEditor } from './ConditionGroup'
import { ExprField, type LogicEnv } from './editors'
import { MenuButton } from './MenuButton'
import { blankCompare, inputFromLiteral, literalFromInput } from './model'
import { useSampleEval } from './TryIt'

type Branch = Rule['branches'][number]

const isNested = (then: Expr | Rule): then is Rule => typeof then === 'object' && then !== null && 'branches' in then

export function blankFor(type: LogicResultType): Expr {
  return type === 'boolean' ? { lit: true } : type === 'number' ? { lit: 0 } : { lit: '' }
}

/** A branch's result, typed by the rule's result type (spec §14.4); ƒx makes it a formula. */
function ThenValue({ value, onChange, type, env, label }: { value: Expr; onChange: (e: Expr) => void; type: LogicResultType; env: LogicEnv; label: string }) {
  const literal = inputFromLiteral(value)
  const [fx, setFx] = useState(literal === null)
  const fxButton = (
    <button
      type="button"
      aria-pressed={fx}
      aria-label={fx ? `${label}: use a plain value` : `${label}: use a formula`}
      title={fx ? 'Back to a plain value' : 'Use a formula'}
      onClick={() => {
        if (fx) onChange(blankFor(type))
        setFx(!fx)
      }}
      className={cn('grid size-7 shrink-0 place-items-center rounded-md border', fx ? 'border-line-strong bg-panel-2 text-ink' : 'border-line text-ink-3 hover:text-ink')}
    >
      <SquareFunction aria-hidden className="size-3.5" />
    </button>
  )
  let input
  if (fx) input = <ExprField label={label} value={value} env={env} onChange={onChange} placeholder="a formula, e.g. [qty] × 2" />
  else if (type === 'boolean') {
    const on = 'lit' in value && value.lit === true
    input = (
      <SegmentedControl
        aria-label={label}
        options={[
          { value: 'true', label: 'True' },
          { value: 'false', label: 'False' },
        ]}
        value={on ? 'true' : 'false'}
        onChange={(v) => onChange({ lit: v === 'true' })}
      />
    )
  } else
    input = (
      <Input
        aria-label={label}
        type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
        value={literal ?? ''}
        placeholder={type === 'number' ? '0' : 'value'}
        onChange={(e) => onChange(literalFromInput(type === 'number' ? 'number' : 'text', e.target.value))}
        className="w-full"
      />
    )
  return (
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">{input}</div>
      {fxButton}
    </div>
  )
}

let nextId = 0

/** One level of IF / ELSE IF / Otherwise cards (spec §14.4). */
export function RuleCards({
  value,
  onChange,
  resultType,
  env,
  depth = 1,
  active = true,
}: {
  value: Rule
  onChange: (r: Rule) => void
  resultType: LogicResultType
  env: LogicEnv
  depth?: number
  /** Whether the samples reach this level (its parent card matched). */
  active?: boolean
}) {
  const ev = useSampleEval()
  const ids = useRef<string[]>([])
  while (ids.current.length < value.branches.length) ids.current.push(`branch-${nextId++}`)
  if (ids.current.length > value.branches.length) ids.current = ids.current.slice(0, value.branches.length)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const matched = ev && active ? value.branches.findIndex((b) => ev.holds(b.when)) : null
  const setBranches = (branches: Branch[]) => onChange({ ...value, branches })
  const setAt = (i: number, patch: Partial<Branch>) => setBranches(value.branches.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  const list = value.branches.map((b, i) => ({ id: ids.current[i], b, i }))

  const tag = (on: boolean) => (on ? <span className="logic-drop-in rounded-full bg-accent px-1.5 py-px text-[10px] font-semibold text-accent-ink">← matches</span> : null)

  return (
    <div className="space-y-2">
      {depth === 1 && <p className="text-ui-xs text-ink-3">Checked top to bottom — the first match wins.</p>}
      <SortableCardList
        items={list}
        gripLabel={(_, i) => `Move branch ${i + 1}`}
        onReorder={(next) => {
          ids.current = next.map((x) => x.id)
          setBranches(next.map((x) => x.b))
        }}
        cardClassName="pb-2"
      >
        {({ b, i, id }, _, { grip }) => {
          const isMatch = matched === i
          const dim = matched !== null && matched !== i
          return (
            <div data-match={isMatch || undefined} className={cn('logic-card rounded-lg border border-l-4 bg-panel p-2.5', isMatch ? 'border-accent' : 'border-line border-l-line', dim && 'opacity-60')}>
              <div className="mb-1.5 flex items-center gap-1.5">
                {grip}
                <span className="rounded bg-ink px-1.5 py-px text-[10px] font-bold tracking-wide text-surface">{i ? 'ELSE IF' : 'IF'}</span>
                {tag(isMatch)}
                <MenuButton
                  className="ml-auto"
                  label={`Branch ${i + 1} options`}
                  items={[
                    {
                      label: 'Duplicate',
                      onClick: () => {
                        ids.current = [...ids.current.slice(0, i + 1), `branch-${nextId++}`, ...ids.current.slice(i + 1)]
                        setBranches([...value.branches.slice(0, i + 1), b, ...value.branches.slice(i + 1)])
                      },
                    },
                    ...(!isNested(b.then) && depth < 2
                      ? [{ label: 'Add a nested IF under then', onClick: () => setAt(i, { then: { branches: [{ when: blankCompare(), then: blankFor(resultType) }], else: b.then as Expr } }) }]
                      : []),
                    ...(isNested(b.then) ? [{ label: 'Replace the nested IF with a value', onClick: () => setAt(i, { then: blankFor(resultType) }) }] : []),
                    ...(value.branches.length > 1
                      ? [
                          {
                            label: 'Delete branch',
                            danger: true,
                            onClick: () => {
                              ids.current = ids.current.filter((_, j) => j !== i)
                              setBranches(value.branches.filter((_, j) => j !== i))
                            },
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
              <ConditionEditor
                mode="visual"
                lead="When"
                env={env}
                value={b.when}
                onChange={(c) => setAt(i, { when: ('rule' in c ? { all: [{ cmp: 'eq', left: { rule: c.rule }, right: { lit: true } }] } : c) as Cond })}
              />
              <div className="mt-2 border-t border-line pt-2">
                {isNested(b.then) ? (
                  <div>
                    <button type="button" className="mb-1.5 flex items-center gap-1 text-ui-sm font-medium text-ink-2" onClick={() => setCollapsed((c) => ({ ...c, [id]: !c[id] }))}>
                      {collapsed[id] ? <ChevronRight aria-hidden className="size-3.5" /> : <ChevronDown aria-hidden className="size-3.5" />}
                      then — a nested IF ({b.then.branches.length} branch{b.then.branches.length > 1 ? 'es' : ''})
                    </button>
                    {!collapsed[id] && (
                      <div className="border-l-2 border-line pl-3">
                        <RuleCards value={b.then} onChange={(r) => setAt(i, { then: r })} resultType={resultType} env={env} depth={depth + 1} active={isMatch} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="pt-1.5 text-ui-sm font-medium text-ink-2">then</span>
                    <div className="min-w-0 flex-1">
                      <ThenValue label={`Branch ${i + 1} result`} value={b.then} type={resultType} env={env} onChange={(then) => setAt(i, { then })} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        }}
      </SortableCardList>
      <button
        type="button"
        className="text-ui-sm font-medium text-ink-2 hover:text-ink"
        onClick={() => setBranches([...value.branches, { when: blankCompare(), then: blankFor(resultType) }])}
      >
        + ELSE IF
      </button>
      <div data-match={matched === -1 || undefined} className={cn('logic-card rounded-lg border border-l-4 bg-panel p-2.5', matched === -1 ? 'border-accent' : 'border-line border-l-line', matched !== null && matched !== -1 && 'opacity-60')}>
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="rounded bg-panel-2 px-1.5 py-px text-[10px] font-bold tracking-wide text-ink">OTHERWISE</span>
          {tag(matched === -1)}
          <span className="ml-auto text-ui-xs text-ink-3">when no branch above matches</span>
        </div>
        <ThenValue label={depth > 1 ? 'Nested otherwise result' : 'Otherwise result'} value={value.else} type={resultType} env={env} onChange={(e) => onChange({ ...value, else: e })} />
      </div>
    </div>
  )
}
