import { Maximize2, MoreHorizontal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button, cn, Input, Popover, Select } from '../common'
import { ColumnFormatFields } from '../Layout/ColumnFormatFields'
import { defaultColumnFormat } from '../Layout/types'
import {
  conditionIssues,
  createFormulaDef,
  createRuleDef,
  inlineFormula,
  isSavedFormula,
  LOGIC_PRESETS,
  logicRefIds,
  printCondition,
  type StudioCondition,
  type StudioFormula,
} from '../Workspace/logic'
import { useActiveProject, useWorkspaceStore } from '../Workspace/workspaceStore'
import { ConditionLine, typeContext } from './ConditionLine'
import { ExprField, type LogicEnv } from './editors'
import { LogicDialog, type LogicTarget } from './LogicDialog'
import { blankCompare, conditionSentence, detachFormula, formatSummary, matchSaved, safeDetachCondition, sameLogic, singleCompare } from './model'
import { OperandPill, Sentence } from './pills'
import { useLogicLibrary, type LogicScopeInfo } from './scope'

/** A ready-made condition offered in the mode dropdown (spec §14.3). */
export type ConditionPreset = { key: string; label: string; value: StudioCondition }

/** The Show when presets for where the item sits: a table modal's adding / editing, each page load's status. */
export function showWhenPresets(scope: LogicScopeInfo): ConditionPreset[] {
  const out: ConditionPreset[] = []
  if (scope.table) {
    out.push({ key: 'adding', label: `While adding (${scope.table}’s Add)`, value: LOGIC_PRESETS.adding() })
    out.push({ key: 'editing', label: `While editing a ${scope.table} row`, value: LOGIC_PRESETS.editing() })
  }
  for (const l of scope.loads) {
    out.push({ key: `loaded:${l.id}`, label: `When ${l.key} has loaded`, value: LOGIC_PRESETS.loadStatus(l.id, 'success') })
    out.push({ key: `loading:${l.id}`, label: `While ${l.key} is loading`, value: LOGIC_PRESETS.loadStatus(l.id, 'loading') })
    out.push({ key: `failed:${l.id}`, label: `When ${l.key} failed`, value: LOGIC_PRESETS.loadStatus(l.id, 'error') })
  }
  return out
}

/** A small menu under a ⋯ button. */
function SlotMenu({ items, label }: { items: { label: string; onClick: () => void }[]; label: string }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  if (!items.length) return null
  return (
    <div ref={wrap} className="relative">
      <button type="button" aria-label={`${label} options`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="grid size-6 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink">
        <MoreHorizontal aria-hidden className="size-3.5" />
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-50 mt-1 min-w-44 rounded-lg border border-line bg-surface py-1 shadow-xl">
          {items.map((it) => (
            <li key={it.label}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  it.onClick()
                }}
                className="w-full px-2.5 py-1 text-left text-ui-sm text-ink-2 hover:bg-panel-2 hover:text-ink"
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * A condition or formula slot in the inspector (spec §14.3): one mode
 * dropdown (none / presets / saved items / write one), the value as a
 * sentence or the formula bar, a single comparison and a formula edited in
 * place, ⋯ for Save as / Make a copy, ⤢ for the full editor.
 */
export function LogicChip({
  label,
  scope,
  hint,
  emptyLabel,
  ...slot
}: {
  label: string
  scope: LogicScopeInfo
  hint?: string
  emptyLabel: string
} & (
  | { kind: 'condition'; value: StudioCondition | null | undefined; onChange: (v: StudioCondition | null) => void; presets?: ConditionPreset[] }
  | { kind: 'formula'; value: StudioFormula | null | undefined; onChange: (v: StudioFormula | null) => void }
)) {
  const [open, setOpen] = useState(false)
  const [saveAs, setSaveAs] = useState<string | null>(null)
  const [formatAnchor, setFormatAnchor] = useState<DOMRect | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const project = useActiveProject()
  const updateLogic = useWorkspaceStore((s) => s.updateProjectLogic)
  const { formulas, rules, names } = useLogicLibrary(scope.loads)
  const env: LogicEnv = useMemo(() => ({ scope, formulas, rules, names }), [scope, formulas, rules, names])
  const ctx = useMemo(() => typeContext(env), [env])
  const value = slot.value ?? null
  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => setNote(null), 5000)
    return () => window.clearTimeout(t)
  }, [note])

  // ---- the mode dropdown
  const presets = slot.kind === 'condition' ? (slot.presets ?? []) : []
  const savedChoices =
    slot.kind === 'condition'
      ? rules.filter((r) => r.name.trim() && r.resultType === 'boolean').map((r) => ({ value: `saved:${r.id}`, label: `Rule: ${r.name}` }))
      : [
          ...formulas.filter((f) => f.name.trim()).map((f) => ({ value: `saved:${f.id}`, label: `Formula: ${f.name}` })),
          ...rules.filter((r) => r.name.trim()).map((r) => ({ value: `saved:${r.id}`, label: `Rule: ${r.name} (${r.resultType})` })),
        ]
  let mode = 'none'
  if (slot.kind === 'condition' && slot.value) {
    const v = slot.value
    mode = 'rule' in v ? `saved:${v.rule}` : (presets.find((p) => sameLogic(p.value, v))?.key ?? 'custom')
  } else if (slot.kind === 'formula' && slot.value) mode = isSavedFormula(slot.value) ? `saved:${slot.value.formulaId}` : 'custom'
  const modeOptions = [
    { value: 'none', label: emptyLabel },
    ...presets.map((p) => ({ value: p.key, label: p.label })),
    ...savedChoices,
    { value: 'custom', label: slot.kind === 'condition' ? 'Condition…' : 'Write a formula…' },
  ]
  const setMode = (key: string) => {
    if (slot.kind === 'condition') {
      if (key === 'none') return slot.onChange(null)
      if (key === 'custom') return mode === 'custom' ? undefined : slot.onChange(blankCompare())
      if (key.startsWith('saved:')) return slot.onChange({ rule: key.slice(6) })
      const p = presets.find((x) => x.key === key)
      if (p) slot.onChange(p.value)
    } else {
      if (key === 'none') return slot.onChange(null)
      if (key === 'custom') return mode === 'custom' ? undefined : slot.onChange(inlineFormula({ lit: '' }))
      if (key.startsWith('saved:')) slot.onChange({ formulaId: key.slice(6) })
    }
  }

  // ---- problems and the match hint
  const issues: string[] = []
  let match: ReturnType<typeof matchSaved> = null
  let savedId: string | null = null
  if (slot.kind === 'condition' && slot.value) {
    issues.push(...conditionIssues(slot.value, rules, formulas, label).map((i) => i.message))
    if ('rule' in slot.value) savedId = slot.value.rule
    else if (mode === 'custom') match = matchSaved({ kind: 'condition', cond: slot.value }, formulas, rules)
  } else if (slot.kind === 'formula' && slot.value) {
    const f = slot.value
    if (isSavedFormula(f)) {
      savedId = f.formulaId
      if (!formulas.some((x) => x.id === f.formulaId) && !rules.some((x) => x.id === f.formulaId)) issues.push('uses a deleted formula')
    } else {
      const refs = logicRefIds(f.expr)
      if ([...refs.formulas].some((id) => !formulas.some((x) => x.id === id)) || [...refs.rules].some((id) => !rules.some((x) => x.id === id))) issues.push('uses a deleted formula or rule')
      match = matchSaved({ kind: 'formula', expr: f.expr }, formulas, rules)
    }
  }
  const saved = savedId ? (formulas.find((x) => x.id === savedId) ?? rules.find((x) => x.id === savedId)) : undefined

  // ---- Save as / Make a copy
  const canSaveAs = mode === 'custom' && !!project
  const nameTaken = (n: string) => (slot.kind === 'formula' ? formulas : rules).some((x) => x.name.trim() === n.trim())
  const commitSaveAs = () => {
    if (!project || !saveAs?.trim() || nameTaken(saveAs)) return
    const name = saveAs.trim()
    if (slot.kind === 'formula' && slot.value && !isSavedFormula(slot.value)) {
      const v = slot.value
      const def = { ...createFormulaDef(name, v.expr), format: v.format, onEmpty: v.onEmpty, onDivideByZero: v.onDivideByZero }
      updateLogic(project.id, { formulas: [...formulas, def] })
      slot.onChange({ formulaId: def.id })
    } else if (slot.kind === 'condition' && slot.value && !('rule' in slot.value)) {
      const def = { ...createRuleDef(name, 'boolean'), rule: { branches: [{ when: slot.value, then: { lit: true } }], else: { lit: false } } }
      updateLogic(project.id, { rules: [...rules, def] })
      slot.onChange({ rule: def.id })
    }
    setSaveAs(null)
    setNote(`Saved as ${name} — edit it on the Logic tab.`)
  }
  const makeCopy = () => {
    if (slot.kind === 'formula' && slot.value) {
      const copy = detachFormula(slot.value, formulas, rules)
      if (copy) slot.onChange(copy)
    } else if (slot.kind === 'condition' && slot.value) {
      const copy = safeDetachCondition(slot.value, rules)
      if (copy) slot.onChange(copy)
      else setNote('This rule gives computed values — it can’t be turned into plain conditions.')
    }
  }
  const menu = [
    ...(canSaveAs ? [{ label: `Save as ${slot.kind === 'formula' ? 'formula' : 'rule'}…`, onClick: () => setSaveAs('') }] : []),
    ...(saved ? [{ label: 'Make a copy here', onClick: makeCopy }] : []),
    ...(value ? [{ label: 'Clear', onClick: () => slot.onChange(null) }] : []),
  ]

  // ---- the body
  const target: LogicTarget =
    slot.kind === 'condition'
      ? { kind: 'condition', value: slot.value ?? null, onSave: slot.onChange }
      : { kind: 'formula', value: slot.value ?? null, onSave: slot.onChange }
  let body: ReactNode = null
  if (saved && project) {
    body = (
      <Link to={`/p/${project.id}/logic?item=${saved.id}`} className="inline-flex max-w-full" title="Open it on the Logic tab">
        <OperandPill text={saved.name} tone={'expr' in saved ? 'saved' : 'rule'} className="hover:underline" />
      </Link>
    )
  } else if (slot.kind === 'condition' && slot.value && mode === 'custom') {
    const single = singleCompare(slot.value)
    const condValue = slot.value
    body = single ? (
      <div className="space-y-1.5">
        <ConditionLine layout="stack" value={single} env={env} onChange={(c) => slot.onChange(c)} />
        <button
          type="button"
          className="text-ui-xs font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline"
          onClick={() => {
            slot.onChange({ all: [single, blankCompare()] })
            setOpen(true)
          }}
        >
          + and / or…
        </button>
      </div>
    ) : (
      <button type="button" onClick={() => setOpen(true)} title={printCondition(condValue, names)} className="w-full rounded-md border border-line bg-sunken px-2 py-1.5 text-left hover:border-line-strong">
        <Sentence sentence={conditionSentence(condValue, names, ctx)} />
      </button>
    )
  } else if (slot.kind === 'condition' && slot.value) {
    const v = slot.value
    body = (
      <div className="rounded-md bg-sunken px-2 py-1" title={printCondition(v, names)}>
        <Sentence sentence={conditionSentence(v, names, ctx)} />
      </div>
    )
  } else if (slot.kind === 'formula' && slot.value && !isSavedFormula(slot.value)) {
    const f = slot.value
    const onChange = slot.onChange
    body = (
      <div className="space-y-1">
        <ExprField label={`${label} formula`} value={f.expr} env={env} onChange={(expr) => onChange({ ...f, expr })} placeholder="Type a field, a number or a function" />
        <button type="button" onClick={(e) => setFormatAnchor(e.currentTarget.getBoundingClientRect())} className="text-ui-xs text-ink-3 hover:text-ink">
          Show as: <span className="font-medium text-ink-2">{formatSummary(f.format)}</span> ▾
        </button>
        {formatAnchor && (
          <Popover anchor={formatAnchor} title="Show as" onClose={() => setFormatAnchor(null)}>
            <div className="p-3">
              <ColumnFormatFields column={{ format: f.format ?? defaultColumnFormat() }} onChange={(format) => onChange({ ...f, format })} />
            </div>
          </Popover>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <span className="text-ui-sm font-medium text-ink-2">{label}</span>
        <div className="ml-auto flex items-center gap-0.5">
          {(mode === 'custom' || !value) && (
            <button
              type="button"
              aria-label={`Open the ${label} editor`}
              title="Open the full editor"
              onClick={() => {
                if (!value) setMode('custom')
                setOpen(true)
              }}
              className="grid size-6 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink"
            >
              <Maximize2 aria-hidden className="size-3" />
            </button>
          )}
          <SlotMenu label={label} items={menu} />
        </div>
      </div>
      <Select aria-label={`${label} mode`} options={modeOptions} value={mode} onChange={setMode} />
      {body}
      {saveAs !== null && (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Input
              aria-label="New name"
              autoFocus
              value={saveAs}
              placeholder="Name"
              onChange={(e) => setSaveAs(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSaveAs()
                if (e.key === 'Escape') setSaveAs(null)
              }}
              className="min-w-0 flex-1"
            />
            <Button size="sm" variant="primary" disabled={!saveAs.trim() || nameTaken(saveAs)} onClick={commitSaveAs}>
              Save
            </Button>
            <Button size="sm" onClick={() => setSaveAs(null)}>
              Cancel
            </Button>
          </div>
          {saveAs.trim() && nameTaken(saveAs) && <p className="text-ui-xs text-danger">That name is taken.</p>}
        </div>
      )}
      {match && (
        <p className="text-ui-xs text-ink-2">
          Same as saved {match.kind} <strong className="text-ink">{match.name}</strong> —{' '}
          <button
            type="button"
            className="font-medium underline underline-offset-2"
            onClick={() => (slot.kind === 'formula' ? slot.onChange({ formulaId: match!.id }) : slot.onChange({ rule: match!.id }))}
          >
            use it
          </button>
        </p>
      )}
      {note && (
        <p className={cn('text-ui-xs', note.startsWith('Saved') ? 'text-ok' : 'text-warn')} role="status">
          {note}
        </p>
      )}
      {issues.map((m) => (
        <p key={m} className="text-ui-xs text-danger">
          ⚠ {m}
        </p>
      ))}
      {hint && <p className="text-ui-xs leading-relaxed text-ink-3">{hint}</p>}
      {open && <LogicDialog target={target} scope={scope} title={label} onClose={() => setOpen(false)} />}
    </div>
  )
}
