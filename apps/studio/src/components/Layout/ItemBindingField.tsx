import { useCallback } from 'react'
import { FieldPicker, Input, SegmentedControl } from '../common'
import { stateBindingToken } from '../Workspace/pageLoads'
import { WiringHint } from './ButtonConfigPanel'
import { LoadFieldPicker, usePageLoads } from './pageData'
import type { RepeaterScope } from './repeaterScope'
import type { ItemBinding } from './types'
import { LogicChip } from '../Logic/LogicChip'
import { useCanvasLogicScope, useLogicLibrary } from '../Logic/scope'
import { inlineFormula, isSavedFormula } from '../Workspace/logic'

/** `key: 'none'` is the engine's "the item itself" (an item of a primitive array). */
const ITEM_ITSELF = { name: 'none', kind: 'the item itself' }

type Mode = 'static' | 'item' | 'state' | 'formula'

type ItemBindingFieldProps = {
  /** What is being bound, for the control's accessible names ("Text", "Image URL"). */
  label: string
  binding: ItemBinding
  onChange: (next: ItemBinding) => void
  /** The enclosing repeater's item fields; `null` outside any repeater. */
  scope: RepeaterScope
  /** Only offer item fields of these kinds. */
  kinds?: readonly string[]
  /** Offer page data (default true); off for props the page's loads can't feed. */
  allowState?: boolean
  /** Offer a formula (a computed value, see `spec/gummy-logic-spec.md`); text-like props only. */
  allowFormula?: boolean
  /** Open the formula editor as soon as its chip mounts (the Formula tile was just dropped). */
  autoOpenFormula?: boolean
  onAutoOpened?: () => void
}

/**
 * The `Static | Item field | Page data` switch of a bindable display prop
 * (see the grilled repeater and page-data designs). "Item field" is offered
 * only inside a repeater's item template, "Page data" only when the page has
 * loads — a binding authored elsewhere (template insert, a cell dragged out,
 * a deleted load) stays editable behind a warning rather than vanishing.
 * Item-field mode picks the field from the enclosing repeater's item model
 * (free text when it can't be resolved) plus an optional path; page-data
 * mode picks a load and a field of its model (or `$status`).
 */
export function ItemBindingField({ label, binding, onChange, scope, kinds, allowState = true, allowFormula = false, autoOpenFormula, onAutoOpened }: ItemBindingFieldProps) {
  const loads = usePageLoads()
  const logicScope = useCanvasLogicScope()
  const mode: Mode = binding === null ? 'static' : binding.source === 'state' ? 'state' : binding.source === 'formula' ? 'formula' : 'item'
  const offerItem = scope !== null || mode === 'item'
  const offerState = (allowState && loads.length > 0) || mode === 'state'
  const offerFormula = allowFormula || mode === 'formula'
  if (!offerItem && !offerState && !offerFormula) return null
  const options = [
    { value: 'static', label: 'Static' },
    ...(offerItem ? [{ value: 'item', label: 'Item field' }] : []),
    ...(offerState ? [{ value: 'state', label: 'Page data' }] : []),
    ...(offerFormula ? [{ value: 'formula', label: 'Formula' }] : []),
  ]
  const fields = scope?.itemFields.fields
  return (
    <div className="space-y-1.5 rounded-md border border-line bg-panel p-2">
      <SegmentedControl
        aria-label={`${label} source`}
        options={options}
        value={mode}
        onChange={(next) =>
          onChange(
            next === 'item'
              ? { key: '', path: '' }
              : next === 'state'
                ? { key: loads[0]?.id ?? '', path: '', source: 'state' }
                : next === 'formula'
                  ? { key: '', path: '', source: 'formula', formula: inlineFormula({ lit: '' }) }
                  : null,
          )
        }
      />
      {binding && mode === 'item' && (
        <>
          <FieldPicker
            fields={fields ? [...fields, ITEM_ITSELF] : null}
            value={binding.key}
            onChange={(key) => onChange({ ...binding, key })}
            kinds={kinds ? [...kinds, ITEM_ITSELF.kind] : undefined}
            fallbackHint={scope?.itemFields.reason}
            aria-label={`${label} item field`}
          />
          <Input
            value={binding.path}
            onChange={(e) => onChange({ ...binding, path: e.target.value })}
            placeholder="path inside the field (optional)"
            className="font-mono"
            aria-label={`${label} path`}
          />
          {scope === null && (
            <WiringHint>
              Not inside a repeater’s item template — this binding resolves to nothing here.
            </WiringHint>
          )}
        </>
      )}
      {binding && mode === 'formula' && (
        <LogicChip
          kind="formula"
          label={`${label} formula`}
          emptyLabel="No formula"
          scope={logicScope}
          value={binding.formula}
          onChange={(formula) => onChange(formula ? { key: '', path: '', source: 'formula', formula } : null)}
          hint="Shown through the formula’s output format."
          autoOpen={autoOpenFormula}
          onAutoOpened={onAutoOpened}
        />
      )}
      {binding && mode === 'state' && (
        <>
          <LoadFieldPicker
            label={label}
            loadId={binding.key}
            path={binding.path}
            onChange={({ loadId, path }) => onChange({ key: loadId, path, source: 'state' })}
            allowStatus
          />
          {!loads.some((l) => l.id === binding.key) && (
            <WiringHint>This page has no such load — add it in the Page data tab or pick another.</WiringHint>
          )}
        </>
      )}
    </div>
  )
}

/** The canvas token of an item binding: `{name}`, `{flag.png}`, `{item}`. */
export function bindingToken(binding: NonNullable<ItemBinding>): string {
  const base = binding.key === 'none' ? 'item' : binding.key || '?'
  return `{${binding.path ? `${base}.${binding.path}` : base}}`
}

/** `bindingToken` that also names page-data bindings by their load's key: `{country.name}`. */
export function useBindingToken(): (binding: NonNullable<ItemBinding>) => string {
  const loads = usePageLoads()
  const { formulas, rules } = useLogicLibrary()
  return useCallback(
    (binding) => {
      if (binding.source === 'formula') {
        const f = binding.formula
        const saved = f && isSavedFormula(f) ? (formulas.find((x) => x.id === f.formulaId) ?? rules.find((x) => x.id === f.formulaId)) : undefined
        return `{ƒ ${saved ? saved.name : 'formula'}}`
      }
      return binding.source === 'state' ? stateBindingToken(binding, loads) : bindingToken(binding)
    },
    [loads, formulas, rules],
  )
}
