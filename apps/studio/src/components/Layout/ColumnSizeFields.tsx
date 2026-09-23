import { Input } from '../common'
import type { ColumnSizingConfig } from './types'

/**
 * The column-width knobs shared by the data table and editable table column
 * cards: the engine's `size` / `minSize` / `maxSize` (px, `''` = unset) and the
 * `enableResizing` lock. Any column with a Width starts its table in
 * exact-pixel mode; otherwise columns share the container until the first drag.
 */
export function ColumnSizeFields({
  column,
  onChange,
}: {
  column: ColumnSizingConfig
  onChange: (patch: Partial<ColumnSizingConfig>) => void
}) {
  const number = (key: 'size' | 'minSize' | 'maxSize', label: string, placeholder: string) => (
    <label className="block min-w-0 flex-1 space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      <Input
        type="number"
        min={0}
        value={column[key]}
        placeholder={placeholder}
        onChange={(e) => onChange({ [key]: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) })}
      />
    </label>
  )
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {number('size', 'Width (px)', 'auto')}
        {number('minSize', 'Min', '60')}
        {number('maxSize', 'Max', 'none')}
      </div>
      <label className="flex items-center justify-between gap-2">
        <span className="text-ui-sm font-medium text-ink-2">Resizable by dragging</span>
        <input
          type="checkbox"
          checked={column.resizable}
          onChange={(e) => onChange({ resizable: e.target.checked })}
          className="h-4 w-4 rounded border-line-strong text-ink focus:ring-focus/30"
        />
      </label>
    </div>
  )
}
