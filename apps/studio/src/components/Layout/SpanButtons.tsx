import { SegmentedControl } from '../common'
import { MAX_GRID_COLUMNS } from './breakpoints'

type SpanButtonsProps = {
  value: string
  max: number
  onSelect: (span: string) => void
}

/** Column-span picker (1..max), rendered as the bordered "chips" segmented variant. */
export function SpanButtons({ value, max, onSelect }: SpanButtonsProps) {
  const limit = Math.min(MAX_GRID_COLUMNS, Math.max(1, max))
  const options = Array.from({ length: limit }, (_, i) => {
    const n = String(i + 1)
    return { value: n, label: n }
  })

  return (
    <SegmentedControl
      options={options}
      value={value}
      onChange={onSelect}
      variant="chips"
      aria-label="Column span"
    />
  )
}
