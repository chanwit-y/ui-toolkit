import { SegmentedControl } from '../common'
import { BREAKPOINTS, type Breakpoint } from './breakpoints'

const breakpointOptions = BREAKPOINTS.map((bp) => ({ value: bp.key, label: bp.label }))

type BreakpointSelectorProps = {
  value: Breakpoint
  onChange: (bp: Breakpoint) => void
  /** Extra classes for the button row (callers own the surrounding tray). */
  className?: string
}

/** Shared breakpoint picker used by the preview toolbar and the settings form. */
export function BreakpointSelector({ value, onChange, className }: BreakpointSelectorProps) {
  return (
    <SegmentedControl
      options={breakpointOptions}
      value={value}
      onChange={(v) => onChange(v as Breakpoint)}
      variant="pills"
      className={className}
      aria-label="Breakpoint"
    />
  )
}
