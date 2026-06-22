import type { ReactNode } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { IconButton, Input, Select, SegmentedControl } from '../common'
import { useGridStore } from './gridStore'
import type { RadioConfig, RadioOption } from './types'

const VARIANT_OPTIONS = ['classic', 'surface', 'soft'].map((v) => ({ value: v, label: v }))
const SIZE_OPTIONS = ['1', '2', '3'].map((v) => ({ value: v, label: v }))
const ORIENTATION_OPTIONS = [
  { value: 'vertical', label: 'Vertical' },
  { value: 'horizontal', label: 'Horizontal' },
]

/** One labelled row in the config form. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  )
}

/** Inline checkbox row for boolean config. */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500/30"
      />
    </label>
  )
}

/**
 * The radio options editor: one row per option with editable `value`/`label` and a
 * per-option `disabled` toggle, plus add/remove. The radio option shape is fixed
 * (`{ value, label, disabled }`, like the checkbox), so a structured row editor is
 * friendlier than raw JSON and can't go invalid. Every mutation commits a fresh
 * array through `onChange` (driving the live preview + exported JSON).
 */
function OptionsEditor({
  options,
  onChange,
}: {
  options: RadioOption[]
  onChange: (options: RadioOption[]) => void
}) {
  const patch = (index: number, p: Partial<RadioOption>) =>
    onChange(options.map((o, i) => (i === index ? { ...o, ...p } : o)))
  const remove = (index: number) => onChange(options.filter((_, i) => i !== index))
  const add = () =>
    onChange([
      ...options,
      { value: `option_${options.length + 1}`, label: `Option ${options.length + 1}`, disabled: false },
    ])

  return (
    <Field label="Options">
      <div className="space-y-2">
        {options.map((option, index) => (
          <div
            key={index}
            className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-2"
          >
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={option.value}
                onChange={(e) => patch(index, { value: e.target.value })}
                placeholder="value"
                className="font-mono"
              />
              <Input
                value={option.label}
                onChange={(e) => patch(index, { label: e.target.value })}
                placeholder="label"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Toggle
                label="Disabled"
                checked={option.disabled}
                onChange={(v) => patch(index, { disabled: v })}
              />
              <IconButton
                label={`Remove option ${index + 1}`}
                onClick={() => remove(index)}
                className="h-6! w-6! text-zinc-400 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </IconButton>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-zinc-300 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-teal-400 hover:text-teal-600"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add option
        </button>
      </div>
    </Field>
  )
}

type RadioConfigPanelProps = {
  itemId: string
  config: RadioConfig
}

/**
 * Editor for a radio's config. Every control writes through `updateItemConfig`,
 * which drives both the live canvas preview and the exported JSON. Unlike the
 * checkbox there's no single/group fork — a radio is always a single-select group
 * of `options`. `defaultValue` preselects one of those options (empty = none). The
 * engine `dataType` is fixed to `string` on export and so isn't surfaced here.
 */
export function RadioConfigPanel({ itemId, config }: RadioConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof RadioConfig>(key: K, value: RadioConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<RadioConfig>)

  // Preselect picker: an explicit "none" plus one entry per current option.
  const defaultValueOptions = [
    { value: '', label: '— none —' },
    ...config.options.map((o) => ({ value: o.value, label: o.label || o.value })),
  ]

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Radio
      </h3>

      <Field label="Name (binding key)">
        <Input
          value={config.name}
          onChange={(e) => set('name', e.target.value)}
          className="font-mono"
        />
      </Field>

      <Field label="Label">
        <Input value={config.label} onChange={(e) => set('label', e.target.value)} />
      </Field>

      <Field label="Helper text">
        <Input
          value={config.helperText}
          onChange={(e) => set('helperText', e.target.value)}
        />
      </Field>

      <Toggle
        label="Required"
        checked={config.isRequired}
        onChange={(v) => set('isRequired', v)}
      />

      <Field label="Error message">
        <Input
          value={config.errorMessage}
          onChange={(e) => set('errorMessage', e.target.value)}
        />
      </Field>

      <OptionsEditor
        options={config.options}
        onChange={(options) => set('options', options)}
      />

      <Field label="Default selected">
        <Select
          options={defaultValueOptions}
          value={config.defaultValue}
          onChange={(v) => set('defaultValue', v)}
        />
      </Field>

      <Field label="Orientation">
        <SegmentedControl
          options={ORIENTATION_OPTIONS}
          value={config.orientation}
          onChange={(v) => set('orientation', v as RadioConfig['orientation'])}
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-1"
          aria-label="Radio orientation"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Variant">
          <Select
            options={VARIANT_OPTIONS}
            value={config.variant}
            onChange={(v) => set('variant', v as RadioConfig['variant'])}
          />
        </Field>
        <Field label="Size">
          <Select
            options={SIZE_OPTIONS}
            value={config.size}
            onChange={(v) => set('size', v as RadioConfig['size'])}
          />
        </Field>
      </div>
    </div>
  )
}
