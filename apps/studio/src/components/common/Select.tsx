import { type SelectHTMLAttributes } from 'react'
import { cn } from './cn'
import type { SegmentedOption } from './SegmentedControl'

const selectBase =
  'w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
}

/** Data-driven `<select>` carrying the shared field styling. */
export function Select({ options, value, onChange, className, ...rest }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(selectBase, className)}
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
