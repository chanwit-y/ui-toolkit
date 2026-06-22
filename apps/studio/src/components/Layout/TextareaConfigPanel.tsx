import type { ReactNode } from 'react'
import { Input, Select } from '../common'
import { useGridStore } from './gridStore'
import type { TextareaConfig } from './types'

const RESIZE_OPTIONS = ['none', 'vertical', 'horizontal', 'both'].map((v) => ({
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

type TextareaConfigPanelProps = {
  itemId: string
  config: TextareaConfig
}

/**
 * Editor for a textarea's config. Every control writes through
 * `updateItemConfig`, which drives both the live canvas preview and the
 * exported JSON. `dataType` is fixed (`'text'`) and not surfaced — the base
 * textarea ignores it; it exists only to keep the exported element valid.
 */
export function TextareaConfigPanel({ itemId, config }: TextareaConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof TextareaConfig>(key: K, value: TextareaConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<TextareaConfig>)

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Textarea
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

      <div className="grid grid-cols-2 gap-2">
        <Field label="Rows">
          <Input
            type="number"
            value={config.rows}
            onChange={(e) => set('rows', Number(e.target.value) || 1)}
          />
        </Field>
        <Field label="Resize">
          <Select
            options={RESIZE_OPTIONS}
            value={config.resize}
            onChange={(v) => set('resize', v as TextareaConfig['resize'])}
          />
        </Field>
      </div>

      <Toggle
        label="Auto-resize"
        checked={config.autoResize}
        onChange={(v) => set('autoResize', v)}
      />

      <Field label="Max length">
        <Input
          type="number"
          value={config.maxLength}
          placeholder="none"
          onChange={(e) =>
            set('maxLength', e.target.value === '' ? '' : Number(e.target.value))
          }
        />
      </Field>

      <Toggle
        label="Show char count"
        checked={config.showCharCount}
        onChange={(v) => set('showCharCount', v)}
      />
    </div>
  )
}
