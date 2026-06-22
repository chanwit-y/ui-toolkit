import type { ReactNode } from 'react'
import { Input, Select } from '../common'
import { useGridStore } from './gridStore'
import type { TextFieldConfig } from './types'

const DATA_TYPE_OPTIONS = [
  'text',
  'number',
  'email',
  'password',
  'tel',
  'url',
  'search',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
  'hidden',
].map((v) => ({ value: v, label: v }))

const VARIANT_OPTIONS = ['classic', 'surface', 'soft'].map((v) => ({ value: v, label: v }))
const SIZE_OPTIONS = ['1', '2', '3'].map((v) => ({ value: v, label: v }))
const RADIUS_OPTIONS = ['none', 'small', 'medium', 'large', 'full'].map((v) => ({
  value: v,
  label: v,
}))

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

type FieldConfigPanelProps = {
  itemId: string
  config: TextFieldConfig
}

/**
 * Editor for a textfield's config. Every control writes through
 * `updateItemConfig`, which drives both the live canvas preview and the
 * exported JSON.
 */
export function FieldConfigPanel({ itemId, config }: FieldConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof TextFieldConfig>(key: K, value: TextFieldConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<TextFieldConfig>)

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Text field
      </h3>

      <Field label="Name (binding key)">
        <Input
          value={config.name}
          onChange={(e) => set('name', e.target.value)}
          className="font-mono"
        />
      </Field>

      <Field label="Data type">
        <Select
          options={DATA_TYPE_OPTIONS}
          value={config.dataType}
          onChange={(v) => set('dataType', v as TextFieldConfig['dataType'])}
        />
      </Field>

      <Field label="Label">
        <Input value={config.label} onChange={(e) => set('label', e.target.value)} />
      </Field>

      <Field label="Placeholder">
        <Input
          value={config.placeholder}
          onChange={(e) => set('placeholder', e.target.value)}
        />
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

      <div className="grid grid-cols-3 gap-2">
        <Field label="Variant">
          <Select
            options={VARIANT_OPTIONS}
            value={config.variant}
            onChange={(v) => set('variant', v as TextFieldConfig['variant'])}
          />
        </Field>
        <Field label="Size">
          <Select
            options={SIZE_OPTIONS}
            value={config.size}
            onChange={(v) => set('size', v as TextFieldConfig['size'])}
          />
        </Field>
        <Field label="Radius">
          <Select
            options={RADIUS_OPTIONS}
            value={config.radius}
            onChange={(v) => set('radius', v as TextFieldConfig['radius'])}
          />
        </Field>
      </div>

      <Toggle
        label="Full width"
        checked={config.isFullWidth}
        onChange={(v) => set('isFullWidth', v)}
      />
      <Toggle
        label="Fixed height"
        checked={config.isFixedHeight}
        onChange={(v) => set('isFixedHeight', v)}
      />

      <Field label="Width (px)">
        <Input
          type="number"
          value={config.width}
          placeholder="auto"
          onChange={(e) =>
            set('width', e.target.value === '' ? '' : Number(e.target.value))
          }
        />
      </Field>

      <Field label="Regex">
        <Input
          value={config.regex}
          onChange={(e) => set('regex', e.target.value)}
          className="font-mono"
          placeholder="^[A-Za-z]*$"
        />
      </Field>

      <Field label="Regex error message">
        <Input
          value={config.regexErrorMessage}
          onChange={(e) => set('regexErrorMessage', e.target.value)}
        />
      </Field>
    </div>
  )
}
