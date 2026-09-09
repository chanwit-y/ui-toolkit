import { cn } from './cn'

export type SegmentedOption = {
  value: string
  label: string
}

type SegmentedControlProps = {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  /** `pills` is the single-row toolbar seg; `chips` wraps for long option
   * lists (column spans 1..12). Both share the mockup's `seg` look. */
  variant?: 'pills' | 'chips'
  className?: string
  'aria-label'?: string
}

/**
 * Controlled single-select button group in the mockup's `.seg` style — the
 * control owns its tray (panel-2 well + line border), so callers place it bare.
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
    <div
      className={cn('seg', variant === 'chips' && 'flex-wrap', className)}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(opt.value)}
            className={cn('seg-btn', variant === 'chips' && 'min-w-7 px-1.5 font-mono')}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
