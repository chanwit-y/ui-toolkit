import type { ReactNode } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { IconButton, Input, Select, SegmentedControl } from '../common'
import { useGridStore } from './gridStore'
import type { CheckboxConfig, CheckboxOption } from './types'

const VARIANT_OPTIONS = ['classic', 'surface', 'soft'].map((v) => ({ value: v, label: v }))
const SIZE_OPTIONS = ['1', '2', '3'].map((v) => ({ value: v, label: v }))
const MODE_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'group', label: 'Group' },
]
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
        className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500/30"
      />
    </label>
  )
}

/**
 * The group-options editor: one row per option with editable `value`/`label` and a
 * per-option `disabled` toggle, plus add/remove. Unlike the select's raw-JSON
 * editor the checkbox option shape is fixed (`{ value, label, disabled }`), so a
 * structured row editor is friendlier and can't go invalid. Every mutation commits
 * a fresh array through `onChange` (driving the live preview + exported JSON).
 */
function GroupOptionsEditor({
  options,
  onChange,
}: {
  options: CheckboxOption[]
  onChange: (options: CheckboxOption[]) => void
}) {
  const patch = (index: number, p: Partial<CheckboxOption>) =>
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
          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-zinc-300 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-violet-400 hover:text-violet-600"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add option
        </button>
      </div>
    </Field>
  )
}

type CheckboxConfigPanelProps = {
  itemId: string
  config: CheckboxConfig
}

/**
 * Editor for a checkbox's config. Every control writes through `updateItemConfig`,
 * which drives both the live canvas preview and the exported JSON. `mode` forks the
 * single boolean toggle (with a `defaultChecked` control) from the multi-option
 * group (options editor + orientation). Both halves are kept in config so toggling
 * modes is lossless. The engine `dataType` is derived on export (single→`boolean`,
 * group→`any`) and so isn't surfaced here.
 */
export function CheckboxConfigPanel({ itemId, config }: CheckboxConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof CheckboxConfig>(key: K, value: CheckboxConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<CheckboxConfig>)

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Checkbox
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

      <Field label="Mode">
        <SegmentedControl
          options={MODE_OPTIONS}
          value={config.mode}
          onChange={(v) => set('mode', v as CheckboxConfig['mode'])}
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-1"
          aria-label="Checkbox mode"
        />
      </Field>

      {config.mode === 'single' ? (
        <Toggle
          label="Default checked"
          checked={config.defaultChecked}
          onChange={(v) => set('defaultChecked', v)}
        />
      ) : (
        <div className="space-y-3">
          <GroupOptionsEditor
            options={config.options}
            onChange={(options) => set('options', options)}
          />
          <Field label="Orientation">
            <SegmentedControl
              options={ORIENTATION_OPTIONS}
              value={config.orientation}
              onChange={(v) => set('orientation', v as CheckboxConfig['orientation'])}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-1"
              aria-label="Group orientation"
            />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Variant">
          <Select
            options={VARIANT_OPTIONS}
            value={config.variant}
            onChange={(v) => set('variant', v as CheckboxConfig['variant'])}
          />
        </Field>
        <Field label="Size">
          <Select
            options={SIZE_OPTIONS}
            value={config.size}
            onChange={(v) => set('size', v as CheckboxConfig['size'])}
          />
        </Field>
      </div>
    </div>
  )
}
