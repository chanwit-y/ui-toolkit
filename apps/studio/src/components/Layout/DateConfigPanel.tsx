import type { ReactNode } from 'react'
import { Input, Select, SegmentedControl } from '../common'
import { useGridStore } from './gridStore'
import type { DateConfig } from './types'

const VARIANT_OPTIONS = ['classic', 'surface', 'soft'].map((v) => ({ value: v, label: v }))
const SIZE_OPTIONS = ['1', '2', '3'].map((v) => ({ value: v, label: v }))
const RADIUS_OPTIONS = ['none', 'small', 'medium', 'large', 'full'].map((v) => ({
  value: v,
  label: v,
}))
const WEEK_START_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
]
/** The `displayFormat` enum the library's DateRangePicker accepts. */
const RANGE_FORMAT_OPTIONS = ['yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy'].map((v) => ({
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
        className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500/30"
      />
    </label>
  )
}

const HEADINGS: Record<DateConfig['kind'], string> = {
  date: 'Date Picker',
  datetime: 'Date Time',
  range: 'Date Range',
}

type DateConfigPanelProps = {
  itemId: string
  config: DateConfig
}

/**
 * Shared editor for the three date pickers, switching on `config.kind`. Every
 * control writes through `updateItemConfig`, driving both the live canvas preview
 * and the exported JSON. The min/max bounds use native date inputs (`type="date"`
 * for date/range, `type="datetime-local"` for datetime) so they emit ISO strings
 * directly with no validation. `weekStartsOn` shows for date+datetime, `minuteStep`
 * for datetime only, and `displayFormat` is a free-text dayjs-token input except for
 * range, where the library only accepts a fixed enum (so a Select). The engine
 * `dataType` is derived on export (date/datetime→`string`, range→`any`) so it isn't
 * surfaced here.
 */
export function DateConfigPanel({ itemId, config }: DateConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof DateConfig>(key: K, value: DateConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<DateConfig>)

  const isRange = config.kind === 'range'
  const isDateTime = config.kind === 'datetime'
  const boundType = isDateTime ? 'datetime-local' : 'date'

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        {HEADINGS[config.kind]}
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

      <Field label="Display format">
        {isRange ? (
          <Select
            options={RANGE_FORMAT_OPTIONS}
            value={config.displayFormat}
            onChange={(v) => set('displayFormat', v)}
          />
        ) : (
          <Input
            value={config.displayFormat}
            onChange={(e) => set('displayFormat', e.target.value)}
            className="font-mono"
            placeholder={isDateTime ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY'}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label={isDateTime ? 'Min datetime' : 'Min date'}>
          <Input
            type={boundType}
            value={config.min}
            onChange={(e) => set('min', e.target.value)}
          />
        </Field>
        <Field label={isDateTime ? 'Max datetime' : 'Max date'}>
          <Input
            type={boundType}
            value={config.max}
            onChange={(e) => set('max', e.target.value)}
          />
        </Field>
      </div>

      {!isRange && (
        <Field label="Week starts on">
          <SegmentedControl
            options={WEEK_START_OPTIONS}
            value={String(config.weekStartsOn)}
            onChange={(v) => set('weekStartsOn', Number(v) as DateConfig['weekStartsOn'])}
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-1"
            aria-label="Week starts on"
          />
        </Field>
      )}

      {isDateTime && (
        <Field label="Minute step">
          <Input
            type="number"
            min={1}
            value={config.minuteStep}
            onChange={(e) => set('minuteStep', Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>
      )}

      <Toggle
        label="Clearable"
        checked={config.clearable}
        onChange={(v) => set('clearable', v)}
      />

      <div className="grid grid-cols-2 gap-2">
        <Field label="Variant">
          <Select
            options={VARIANT_OPTIONS}
            value={config.variant}
            onChange={(v) => set('variant', v as DateConfig['variant'])}
          />
        </Field>
        <Field label="Size">
          <Select
            options={SIZE_OPTIONS}
            value={config.size}
            onChange={(v) => set('size', v as DateConfig['size'])}
          />
        </Field>
      </div>

      <Field label="Radius">
        <Select
          options={RADIUS_OPTIONS}
          value={config.radius}
          onChange={(v) => set('radius', v as DateConfig['radius'])}
        />
      </Field>
    </div>
  )
}
