import { Select, SegmentedControl } from '../common'
import { BREAKPOINTS, type Breakpoint } from './breakpoints'

const breakpointOptions = BREAKPOINTS.map((bp) => ({ value: bp.key, label: bp.label }))

type BreakpointSelectorProps = {
  value: Breakpoint
  onChange: (bp: Breakpoint) => void
  /** Extra classes for the button row (callers own the surrounding tray). */
  className?: string
  /**
   * Toolbar mode: when the surrounding `@container` is too narrow for four pills
   * alongside the action buttons, fall back to a compact `<select>`. Both
   * controls render and a container query shows exactly one (the hidden one is
   * `display:none`, so it stays out of the a11y tree). The settings form leaves
   * this off and always shows the segmented pills.
   */
  responsive?: boolean
}

/** Shared breakpoint picker used by the preview toolbar and the settings form. */
export function BreakpointSelector({
  value,
  onChange,
  className,
  responsive,
}: BreakpointSelectorProps) {
  const segmented = (
    <SegmentedControl
      options={breakpointOptions}
      value={value}
      onChange={(v) => onChange(v as Breakpoint)}
      variant="pills"
      className={className}
      aria-label="Breakpoint"
    />
  )

  if (!responsive) return segmented

  return (
    <>
      {/* Wide enough for the full row: segmented pills. */}
      <div className="hidden @[22rem]:block">{segmented}</div>
      {/* Too narrow: compact dropdown (fixed width since `cn` is a plain join,
          not tailwind-merge, so Select's `w-full` can't be overridden inline). */}
      <div className="w-14 @[22rem]:hidden">
        <Select
          options={breakpointOptions}
          value={value}
          onChange={(v) => onChange(v as Breakpoint)}
          aria-label="Breakpoint"
        />
      </div>
    </>
  )
}
