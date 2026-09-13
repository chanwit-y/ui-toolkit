import { type SelectHTMLAttributes } from 'react'
import { cn } from './cn'
import type { SegmentedOption } from './SegmentedControl'

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
}

/** Data-driven `<select>` carrying the shared `field` styling (custom chevron). */
export function Select({ options, value, onChange, className, ...rest }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn('field field-select', className)}
      {...rest}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
