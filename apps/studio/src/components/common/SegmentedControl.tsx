import { cn } from './cn'

export type SegmentedOption = {
  value: string
  label: string
}

type SegmentedControlProps = {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  variant?: 'pills' | 'chips'
  /** Extra classes for the button row container (callers own the tray). */
  className?: string
  'aria-label'?: string
}

const containerBase: Record<NonNullable<SegmentedControlProps['variant']>, string> = {
  pills: 'flex flex-wrap items-center gap-1',
  chips: 'flex flex-wrap gap-1.5',
}

const buttonBase: Record<NonNullable<SegmentedControlProps['variant']>, string> = {
  pills: 'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
  chips:
    'min-w-[2.25rem] rounded-md border px-2 py-1.5 font-mono text-xs font-semibold transition-colors',
}

const buttonActive: Record<NonNullable<SegmentedControlProps['variant']>, string> = {
  pills: 'bg-violet-600 text-white shadow-sm',
  chips: 'border-violet-600 bg-violet-600 text-white shadow-sm',
}

const buttonInactive: Record<NonNullable<SegmentedControlProps['variant']>, string> = {
  pills: 'text-zinc-600 hover:bg-white hover:text-zinc-900',
  chips: 'border-zinc-300 bg-white text-zinc-700 hover:border-violet-400 hover:bg-violet-50',
}

/**
 * Controlled single-select button group. Presentational only — the surrounding
 * "tray" (background/border/padding) is the caller's responsibility, so the same
 * control works both inside a toolbar chip group and a settings tray.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  variant = 'pills',
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps) {
  return (
    <div className={cn(containerBase[variant], className)} role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              buttonBase[variant],
              isActive ? buttonActive[variant] : buttonInactive[variant],
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
