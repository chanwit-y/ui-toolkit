import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Input, Select, SegmentedControl } from '../common'
import { useActiveItems, useGridStore } from './gridStore'
import type { SwitchConfig } from './types'

const VARIANT_OPTIONS = ['surface', 'classic', 'soft'].map((v) => ({ value: v, label: v }))
const SIZE_OPTIONS = ['1', '2', '3'].map((v) => ({ value: v, label: v }))
const LABEL_POSITION_OPTIONS = [
  { value: 'end', label: 'After' },
  { value: 'start', label: 'Before' },
]
const WHEN_OPTIONS = [
  { value: 'on', label: 'is on' },
  { value: 'off', label: 'is off' },
]

/** One labelled row in the config form. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
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
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-line-strong text-ink focus:ring-focus/30"
      />
    </label>
  )
}

/**
 * "Enabled when": pick another switch on the active canvas and the value of it
 * that enables this one. Stored by item id (rename-safe); export resolves the
 * gate's binding name and marks the gate `canObserve`. Only switches gate —
 * the engine's checkbox doesn't publish its value.
 */
function EnabledWhenField({
  itemId,
  value,
  onChange,
}: {
  itemId: string
  value: SwitchConfig['enabledWhen']
  onChange: (value: SwitchConfig['enabledWhen']) => void
}) {
  const items = useActiveItems()
  const gates = items.filter((t) => t.id !== itemId && t.type === 'switch')
  const options = [
    { value: '', label: '(always enabled)' },
    ...gates.map((t) => {
      const name = (t.config as SwitchConfig | undefined)?.name.trim() ?? ''
      return { value: t.id, label: name ? `${name} (${t.label})` : `(unnamed) — ${t.label}` }
    }),
  ]
  const gateId = value?.itemId ?? ''
  if (gateId && !options.some((o) => o.value === gateId)) {
    options.push({ value: gateId, label: '(missing item)' })
  }
  const gate = gates.find((t) => t.id === gateId)
  const warning = !gateId
    ? null
    : !gate
      ? 'The gating switch was deleted — the export emits "MISSING_OBSERVE_TARGET".'
      : !(gate.config as SwitchConfig | undefined)?.name.trim()
        ? 'The gating switch has no binding name — the export emits "MISSING_OBSERVE_TARGET".'
        : (gate.config as SwitchConfig).enabledWhen?.itemId === itemId
          ? 'The two switches gate each other — neither can ever be turned on.'
          : null

  return (
    <div className="space-y-1">
      <Field label="Enabled when">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Select
            options={options}
            value={gateId}
            onChange={(v) => onChange(v ? { itemId: v, when: value?.when ?? 'on' } : null)}
            aria-label="Gating switch"
          />
          <Select
            options={WHEN_OPTIONS}
            value={value?.when ?? 'on'}
            onChange={(v) => value && onChange({ ...value, when: v as 'on' | 'off' })}
            disabled={!value}
            aria-label="Gate value"
          />
        </div>
      </Field>
      {warning && (
        <p className="flex items-start gap-1 text-ui-sm text-warn">
          <AlertTriangle size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
          {warning}
        </p>
      )}
    </div>
  )
}

type SwitchConfigPanelProps = {
  itemId: string
  config: SwitchConfig
}

/**
 * Editor for a switch's config. Every control writes through `updateItemConfig`,
 * which drives both the live canvas preview and the exported JSON. The engine
 * `dataType` is always `boolean` and so isn't surfaced; Required means the
 * switch must be on.
 */
export function SwitchConfigPanel({ itemId, config }: SwitchConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof SwitchConfig>(key: K, value: SwitchConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<SwitchConfig>)

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">Switch</h3>

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

      <Field label="Label position">
        <SegmentedControl
          options={LABEL_POSITION_OPTIONS}
          value={config.labelPosition}
          onChange={(v) => set('labelPosition', v as SwitchConfig['labelPosition'])}
          aria-label="Label position"
        />
      </Field>

      <Field label="Helper text">
        <Input
          value={config.helperText}
          onChange={(e) => set('helperText', e.target.value)}
        />
      </Field>

      <Toggle label="Default on" checked={config.defaultChecked} onChange={(v) => set('defaultChecked', v)} />

      <Toggle
        label="Required (must be on)"
        checked={config.isRequired}
        onChange={(v) => set('isRequired', v)}
      />

      <Field label="Error message">
        <Input
          value={config.errorMessage}
          onChange={(e) => set('errorMessage', e.target.value)}
          placeholder="Shown when required and off"
        />
      </Field>

      <Toggle label="Disabled" checked={config.disabled} onChange={(v) => set('disabled', v)} />

      <EnabledWhenField
        itemId={itemId}
        value={config.enabledWhen}
        onChange={(v) => set('enabledWhen', v)}
      />

      <div className="grid grid-cols-2 gap-2">
        <Field label="Variant">
          <Select
            options={VARIANT_OPTIONS}
            value={config.variant}
            onChange={(v) => set('variant', v as SwitchConfig['variant'])}
          />
        </Field>
        <Field label="Size">
          <Select
            options={SIZE_OPTIONS}
            value={config.size}
            onChange={(v) => set('size', v as SwitchConfig['size'])}
          />
        </Field>
      </div>
    </div>
  )
}
