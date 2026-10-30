import { useState } from 'react'
import { Button, Select } from '../common'
import { conditionIssues, isSavedFormula, LOGIC_PRESETS, logicRefIds, printCondition, printExpr, type StudioCondition, type StudioFormula } from '../Workspace/logic'
import { LogicDialog, type LogicTarget } from './LogicDialog'
import { useLogicLibrary, type LogicScopeInfo } from './scope'

/** A ready-made condition offered above "Custom…" (spec §8.2). */
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

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * A condition or formula slot in the inspector: the printed code, its
 * problems, presets (conditions), Edit (the logic dialog) and Clear.
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
  const { formulas, rules, names } = useLogicLibrary(scope.loads)
  const value = slot.value ?? null

  let text: string | null = null
  const issues: string[] = []
  if (slot.kind === 'condition' && slot.value) {
    text = printCondition(slot.value, names)
    issues.push(...conditionIssues(slot.value, rules, formulas, label).map((i) => i.message))
  } else if (slot.kind === 'formula' && slot.value) {
    const f = slot.value
    if (isSavedFormula(f)) {
      const saved = formulas.find((x) => x.id === f.formulaId) ?? rules.find((x) => x.id === f.formulaId)
      text = saved ? ('expr' in saved ? `((${saved.name}))` : `IF((${saved.name}))`) : null
      if (!saved) issues.push('uses a deleted formula')
    } else {
      text = printExpr(f.expr, names)
      const refs = logicRefIds(f.expr)
      if ([...refs.formulas].some((id) => !formulas.some((x) => x.id === id)) || [...refs.rules].some((id) => !rules.some((x) => x.id === id))) issues.push('uses a deleted formula or rule')
    }
  }

  const presets = slot.kind === 'condition' ? (slot.presets ?? []) : []
  const presetKey = !slot.value ? 'none' : (presets.find((p) => same(p.value, slot.value))?.key ?? 'custom')
  const target: LogicTarget =
    slot.kind === 'condition'
      ? { kind: 'condition', value: slot.value ?? null, onSave: slot.onChange }
      : { kind: 'formula', value: slot.value ?? null, onSave: slot.onChange }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-ui-sm font-medium text-ink-2">{label}</span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" onClick={() => setOpen(true)}>
            {value ? 'Edit' : slot.kind === 'condition' ? 'Add condition' : 'Add formula'}
          </Button>
          {value && (
            <Button size="sm" onClick={() => (slot.kind === 'condition' ? slot.onChange(null) : slot.onChange(null))} aria-label={`Clear ${label}`}>
              Clear
            </Button>
          )}
        </div>
      </div>
      {slot.kind === 'condition' && presets.length > 0 && (
        <Select
          aria-label={`${label} preset`}
          options={[
            { value: 'none', label: emptyLabel },
            ...presets.map((p) => ({ value: p.key, label: p.label })),
            { value: 'custom', label: 'Custom…' },
          ]}
          value={presetKey}
          onChange={(key) => {
            if (key === 'none') return slot.onChange(null)
            if (key === 'custom') return setOpen(true)
            const p = presets.find((x) => x.key === key)
            if (p) slot.onChange(p.value)
          }}
        />
      )}
      <div
        className="min-h-7 cursor-pointer rounded-md border border-line bg-sunken px-2 py-1 font-mono text-ui-xs leading-relaxed text-ink"
        onClick={() => setOpen(true)}
        title="Edit"
      >
        {text ?? <span className="font-sans text-ink-3">{emptyLabel}</span>}
      </div>
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
