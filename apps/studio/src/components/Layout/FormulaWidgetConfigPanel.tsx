import type { ReactNode } from 'react'
import { Input, SegmentedControl, Select } from '../common'
import { LogicChip } from '../Logic/LogicChip'
import { useCanvasLogicScope } from '../Logic/scope'
import { useGridStore } from './gridStore'
import type { FormulaWidgetConfig, TypographyConfig } from './types'

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="block text-ui-xs text-ink-3">{hint}</span>}
    </label>
  )
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (checked: boolean) => void; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center justify-between gap-2">
        <span className="text-ui-sm font-medium text-ink-2">{label}</span>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-line-strong text-ink focus:ring-focus/30" />
      </span>
      {hint && <span className="block text-ui-xs text-ink-3">{hint}</span>}
    </label>
  )
}

const VARIANTS: TypographyConfig['variant'][] = ['display1', 'display2', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'caption', 'overline', 'button']
const VARIANT_OPTIONS = VARIANTS.map((v) => ({ value: v, label: v }))
const WEIGHT_OPTIONS = [{ value: '', label: '— variant default —' }, ...['light', 'regular', 'medium', 'bold'].map((v) => ({ value: v, label: v }))]
const COLOR_OPTIONS = [
  { value: '', label: '— default —' },
  ...['gray', 'gold', 'bronze', 'brown', 'yellow', 'amber', 'orange', 'tomato', 'red', 'ruby', 'crimson', 'pink', 'plum', 'purple', 'violet', 'iris', 'indigo', 'blue', 'cyan', 'teal', 'jade', 'green', 'grass', 'lime', 'mint', 'sky'].map((v) => ({ value: v, label: v })),
]
const ALIGN_OPTIONS = [
  { value: '', label: '—' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]
const PERSIST_OPTIONS = [
  { value: 'local', label: 'Browser' },
  { value: 'session', label: 'Tab' },
  { value: 'none', label: 'None' },
]

/**
 * Editor for a `formula` element: the end user's formula widget. The
 * starting formula is a Formula chip (inline with its Show as, or a saved
 * one); the rest is the result typography's look and how the user's own
 * formula is kept.
 */
export function FormulaWidgetConfigPanel({ itemId, config }: { itemId: string; config: FormulaWidgetConfig }) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof FormulaWidgetConfig>(key: K, value: FormulaWidgetConfig[K]) => updateItemConfig(itemId, { [key]: value } as Partial<FormulaWidgetConfig>)
  const scope = useCanvasLogicScope()

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">Formula (end user)</h3>
      <p className="text-ui-xs text-ink-3">In the running app this shows a result; a click opens a modal where the user writes the formula over this page’s fields.</p>
      <Field label="Name" hint="The storage key, with the page.">
        <Input value={config.name} onChange={(e) => set('name', e.target.value)} className="font-mono" />
      </Field>
      <Field label="Caption">
        <Input value={config.label} onChange={(e) => set('label', e.target.value)} placeholder="Shown above the result" />
      </Field>
      <LogicChip
        kind="formula"
        label="Starting formula"
        emptyLabel="None — the user writes one"
        hint="What the user sees first, and what Reset returns to."
        scope={scope}
        value={config.formula}
        onChange={(formula) => set('formula', formula)}
      />
      <Field label="Placeholder" hint="Shown while there is no formula.">
        <Input value={config.placeholder} onChange={(e) => set('placeholder', e.target.value)} placeholder="Click to set a formula" />
      </Field>
      <Field label="Variant">
        <Select options={VARIANT_OPTIONS} value={config.variant} onChange={(v) => set('variant', v as FormulaWidgetConfig['variant'])} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Weight">
          <Select options={WEIGHT_OPTIONS} value={config.weight} onChange={(v) => set('weight', v as FormulaWidgetConfig['weight'])} />
        </Field>
        <Field label="Color">
          <Select options={COLOR_OPTIONS} value={config.color} onChange={(v) => set('color', v as FormulaWidgetConfig['color'])} />
        </Field>
      </div>
      <Field label="Align">
        <Select options={ALIGN_OPTIONS} value={config.align} onChange={(v) => set('align', v as FormulaWidgetConfig['align'])} />
      </Field>
      <Field label="Keep the user’s formula" hint="Browser: survives reload (localStorage). Tab: until the tab closes. None: until the page is left.">
        <SegmentedControl aria-label="Keep the user’s formula" options={PERSIST_OPTIONS} value={config.persist} onChange={(v) => set('persist', v as FormulaWidgetConfig['persist'])} />
      </Field>
      <Toggle label="User may change the format" checked={config.allowFormat} onChange={(v) => set('allowFormat', v)} hint="The Show as controls in the modal." />
      <Field label="Edit label" hint="The pencil’s label and the modal title.">
        <Input value={config.editLabel} onChange={(e) => set('editLabel', e.target.value)} placeholder="Edit formula" />
      </Field>
    </div>
  )
}
