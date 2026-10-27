import { Input, Select } from '../common'
import { defaultColumnFormat, type ColumnFormatConfig, type ColumnFormatType } from './types'

const FORMAT_OPTIONS: { value: ColumnFormatType; label: string }[] = [
  { value: '', label: 'as is (raw value)' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'percent', label: 'Percent' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date + time' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'text', label: 'Text' },
]

const PERCENT_OF_OPTIONS = [
  { value: '1', label: 'a ratio (0.25 → 25%)' },
  { value: '100', label: 'whole points (25 → 25%)' },
]

/**
 * The engine's `ColumnDef.format` for a data table / editable table column:
 * a type, then the few knobs that type has. Numeric formats align the column
 * to the end unless Align says otherwise; a date `pattern` uses dayjs tokens,
 * blank = the locale's medium style (in `timeZone` when set).
 */
export function ColumnFormatFields({
  column,
  onChange,
}: {
  column: { format: ColumnFormatConfig }
  onChange: (format: ColumnFormatConfig) => void
}) {
  const f = column.format ?? defaultColumnFormat()
  const set = (patch: Partial<ColumnFormatConfig>) => onChange({ ...f, ...patch })
  const text = (key: 'currency' | 'pattern' | 'timeZone' | 'trueLabel' | 'falseLabel', label: string, placeholder: string, mono = false) => (
    <label className="block min-w-0 flex-1 space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      <Input value={f[key]} placeholder={placeholder} onChange={(e) => set({ [key]: e.target.value })} className={mono ? 'font-mono' : undefined} />
    </label>
  )
  const decimals = (
    <label className="block min-w-0 flex-1 space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">Decimals</span>
      <Input
        type="number"
        min={0}
        max={20}
        value={f.decimals}
        placeholder="auto"
        onChange={(e) => set({ decimals: e.target.value === '' ? '' : Math.min(20, Math.max(0, Math.floor(Number(e.target.value)))) })}
      />
    </label>
  )
  return (
    <div className="space-y-1.5">
      <label className="block space-y-1">
        <span className="text-ui-sm font-medium text-ink-2">Format</span>
        <Select options={FORMAT_OPTIONS} value={f.type} onChange={(v) => set({ type: v as ColumnFormatType })} />
      </label>
      {f.type === 'number' && (
        <div className="flex items-end gap-1.5">
          {decimals}
          <label className="flex h-8 items-center gap-2 pb-0.5">
            <input
              type="checkbox"
              checked={f.grouping}
              onChange={(e) => set({ grouping: e.target.checked })}
              className="h-4 w-4 rounded border-line-strong text-ink focus:ring-focus/30"
            />
            <span className="text-ui-sm text-ink-2">Group digits</span>
          </label>
        </div>
      )}
      {f.type === 'currency' && (
        <div className="flex gap-1.5">
          {text('currency', 'Currency (ISO)', 'THB', true)}
          {decimals}
        </div>
      )}
      {f.type === 'percent' && (
        <div className="flex gap-1.5">
          <label className="block min-w-0 flex-[2] space-y-1">
            <span className="text-ui-sm font-medium text-ink-2">The value is</span>
            <Select options={PERCENT_OF_OPTIONS} value={f.percentOf} onChange={(v) => set({ percentOf: v as ColumnFormatConfig['percentOf'] })} />
          </label>
          {decimals}
        </div>
      )}
      {(f.type === 'date' || f.type === 'datetime') && (
        <div className="flex gap-1.5">
          {text('pattern', 'Pattern (dayjs)', 'locale default', true)}
          {text('timeZone', 'Time zone', 'viewer’s', true)}
        </div>
      )}
      {f.type === 'boolean' && (
        <div className="flex gap-1.5">
          {text('trueLabel', 'When true', 'Yes')}
          {text('falseLabel', 'When false', 'No')}
        </div>
      )}
    </div>
  )
}
