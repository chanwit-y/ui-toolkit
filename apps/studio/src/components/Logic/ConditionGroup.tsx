import type { Cond } from '@gummy-ui/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn, Select, SortableCardList } from '../common'
import { parseCondition, printCondition, type StudioCondition } from '../Workspace/logic'
import { CodeInput } from './CodeInput'
import { ConditionLine } from './ConditionLine'
import type { LogicEnv } from './editors'
import { MenuButton } from './MenuButton'
import { blankCompare, fitsVisual, isBlankOperand } from './model'
import { OperandPill } from './pills'
import { useSampleEval } from './TryIt'

type Group = Extract<Cond, { all: Cond[] }> | Extract<Cond, { any: Cond[] }>

let nextId = 0
/** Row ids that follow the rows through moves, inserts and removals (AST nodes carry none). */
function useRowIds(count: number) {
  const ids = useRef<string[]>([])
  while (ids.current.length < count) ids.current.push(`row-${nextId++}`)
  if (ids.current.length > count) ids.current = ids.current.slice(0, count)
  return {
    ids: ids.current,
    remove: (i: number) => {
      ids.current = ids.current.filter((_, j) => j !== i)
    },
    insert: (i: number) => {
      ids.current = [...ids.current.slice(0, i), `row-${nextId++}`, ...ids.current.slice(i)]
    },
    reorder: (next: string[]) => {
      ids.current = next
    },
  }
}

const itemsOf = (g: Group) => ('all' in g ? g.all : g.any)
const withItems = (g: Group, items: Cond[]): Group => ('all' in g ? { all: items } : { any: items })

/** The ✓ / ✗ for a line or a group header against the Try-it samples. */
export function SampleDot({ cond }: { cond: Cond }) {
  const ev = useSampleEval()
  if (!ev) return null
  if ('cmp' in cond && isBlankOperand(cond.left)) return <span className="size-4 shrink-0" />
  const holds = ev.holds(cond)
  if (holds === null) return <span className="size-4 shrink-0" />
  return (
    <span
      role="img"
      aria-label={holds ? 'holds for the samples' : 'fails for the samples'}
      title={holds ? 'True for the Try-it samples' : 'False for the Try-it samples'}
      key={String(holds)}
      className={cn('logic-dot logic-pop grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold', holds ? 'bg-logic-value-tint text-logic-value' : 'bg-panel-2 text-ink-3')}
    >
      {holds ? '✓' : '✗'}
    </span>
  )
}

function AllAny({ value, onChange, label }: { value: Group; onChange: (g: Group) => void; label: string }) {
  return (
    <Select
      aria-label={label}
      className="!h-6 !w-auto !py-0 !pl-1.5 !pr-6 font-semibold"
      options={[
        { value: 'all', label: 'all' },
        { value: 'any', label: 'any' },
      ]}
      value={'all' in value ? 'all' : 'any'}
      onChange={(v) => onChange(v === 'all' ? { all: itemsOf(value) } : { any: itemsOf(value) })}
    />
  )
}

/** The lines of one group: gutter word, grip, the line, its dot, its menu; sub-groups (top level only) as inset panels. */
function GroupLines({ value, onChange, env, nested }: { value: Group; onChange: (g: Group) => void; env: LogicEnv; nested: boolean }) {
  const items = itemsOf(value)
  const rows = useRowIds(items.length)
  const word = 'all' in value ? 'and' : 'or'
  const set = (next: Cond[]) => onChange(withItems(value, next))
  const setAt = (i: number, c: Cond) => set(items.map((x, j) => (j === i ? c : x)))
  const removeAt = (i: number) => {
    rows.remove(i)
    set(items.filter((_, j) => j !== i))
  }
  const duplicate = (i: number) => {
    rows.insert(i + 1)
    set([...items.slice(0, i + 1), items[i], ...items.slice(i + 1)])
  }
  const list = items.map((c, i) => ({ id: rows.ids[i], c, i }))
  return (
    <SortableCardList
      items={list}
      gripLabel={(_, i) => `Move line ${i + 1}`}
      onReorder={(next) => {
        rows.reorder(next.map((x) => x.id))
        set(next.map((x) => x.c))
      }}
      cardClassName="py-0.5"
    >
      {({ c, i }, _, { grip }) => (
        <div className="flex items-start gap-1">
          <span className="w-8 shrink-0 pt-1.5 text-right text-ui-xs font-semibold uppercase text-ink-3">{i ? word : ''}</span>
          <div className="pt-0.5">{grip}</div>
          {'cmp' in c ? (
            <>
              <div className="min-w-0 flex-1">
                <ConditionLine value={c} env={env} onChange={(n) => setAt(i, n)} />
              </div>
              <div className="flex items-center gap-0.5 pt-1">
                <SampleDot cond={c} />
                <MenuButton
                  label={`Line ${i + 1} options`}
                  items={[
                    { label: 'Duplicate', onClick: () => duplicate(i) },
                    ...(!nested ? [{ label: 'Wrap in group', onClick: () => setAt(i, 'all' in value ? { any: [c, blankCompare()] } : { all: [c, blankCompare()] }) }] : []),
                    { label: 'Delete', onClick: () => removeAt(i), danger: true },
                  ]}
                />
              </div>
            </>
          ) : 'all' in c || 'any' in c ? (
            <div className="min-w-0 flex-1 rounded-lg border border-line bg-panel-2/60 p-2">
              <div className="mb-1 flex items-center gap-1.5 text-ui-sm text-ink-2">
                <AllAny label={`Sub-group ${i + 1} match`} value={c} onChange={(g) => setAt(i, g)} />
                <span>of these</span>
                <span className="ml-auto flex items-center gap-0.5">
                  <SampleDot cond={c} />
                  <MenuButton
                    label={`Group ${i + 1} options`}
                    items={[
                      { label: 'Duplicate', onClick: () => duplicate(i) },
                      { label: 'Ungroup', onClick: () => set([...items.slice(0, i), ...itemsOf(c), ...items.slice(i + 1)]) },
                      { label: 'Delete group', onClick: () => removeAt(i), danger: true },
                    ]}
                  />
                </span>
              </div>
              <GroupLines value={c} onChange={(g) => setAt(i, g)} env={env} nested />
              <button type="button" className="ml-9 mt-1 text-ui-xs font-medium text-ink-2 hover:text-ink" onClick={() => setAt(i, withItems(c, [...itemsOf(c), blankCompare()]))}>
                + Condition
              </button>
            </div>
          ) : null}
        </div>
      )}
    </SortableCardList>
  )
}

/**
 * Conditions, visually (spec §14.4): *{lead} [all ▾] of these are true*, one
 * picker line per comparison, sub-groups one level deep.
 */
export function ConditionGroup({ value, onChange, env, lead }: { value: Cond; onChange: (c: Cond) => void; env: LogicEnv; lead: string }) {
  const group: Group = 'all' in value || 'any' in value ? value : { all: [value] }
  const items = itemsOf(group)
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 text-ui text-ink-2">
        <span>{lead}</span>
        <AllAny label="Match" value={group} onChange={onChange} />
        <span>of these are true</span>
        {items.length > 1 && <SampleDot cond={group} />}
      </div>
      {items.length === 0 ? (
        <p className="pl-9 text-ui-xs text-ink-3">{'all' in group ? 'No lines — always true.' : 'No lines — never true.'}</p>
      ) : (
        <GroupLines value={group} onChange={onChange} env={env} nested={false} />
      )}
      <div className="flex gap-3 pl-9">
        <button type="button" className="text-ui-sm font-medium text-ink-2 hover:text-ink" onClick={() => onChange(withItems(group, [...items, blankCompare()]))}>
          + Condition
        </button>
        <button
          type="button"
          className="text-ui-sm font-medium text-ink-2 hover:text-ink"
          onClick={() => onChange(withItems(group, [...items, 'all' in group ? { any: [blankCompare(), blankCompare()] } : { all: [blankCompare(), blankCompare()] }]))}
        >
          + Group
        </button>
      </div>
    </div>
  )
}

/** A condition's Code-mode text box, parsing as you type (the last valid condition stays stored). */
export function ConditionCode({ value, onChange, env }: { value: StudioCondition; onChange: (c: StudioCondition) => void; env: LogicEnv }) {
  const printed = useMemo(() => printCondition(value, env.names), [value, env.names])
  const [text, setText] = useState(printed)
  const [error, setError] = useState<{ message: string; at: number } | null>(null)
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
      multiline
      condition
      aria-label="Condition code"
      value={text}
      error={error?.message}
      errorAt={error?.at}
      scope={env.scope}
      formulas={env.formulas}
      rules={env.rules}
      placeholder="[type] = 'Business' AND [qty] > 0"
      onChange={(t) => {
        setText(t)
        const r = parseCondition(t, env.names)
        if (r.value === undefined) return setError(t.trim() ? { message: r.error, at: r.at } : null)
        setError(null)
        last.current = printCondition(r.value, env.names)
        onChange(r.value)
      }}
    />
  )
}

/**
 * A condition in the dialog: Visual (the group editor) or Code. A saved rule
 * alone shows as its pill; conditions deeper than two levels stay in Code.
 */
export function ConditionEditor({ value, onChange, env, mode, lead = 'Show when' }: { value: StudioCondition; onChange: (c: StudioCondition) => void; env: LogicEnv; mode: 'visual' | 'code'; lead?: string }) {
  if (mode === 'code') return <ConditionCode value={value} onChange={onChange} env={env} />
  if ('rule' in value)
    return (
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-panel p-2 text-ui-sm text-ink-2">
        Uses the saved rule <OperandPill text={env.names.rules.find((r) => r.id === value.rule)?.name ?? '(deleted rule)'} tone="rule" />
        <button type="button" className="ml-auto font-medium underline underline-offset-2" onClick={() => onChange({ all: [{ cmp: 'eq', left: { rule: value.rule }, right: { lit: true } }] })}>
          Turn into lines
        </button>
      </div>
    )
  if (!fitsVisual(value))
    return (
      <div className="space-y-1.5">
        <p className="text-ui-xs text-warn">This condition nests deeper than two levels — it is edited as code.</p>
        <ConditionCode value={value} onChange={onChange} env={env} />
      </div>
    )
  return <ConditionGroup value={value} onChange={onChange} env={env} lead={lead} />
}
