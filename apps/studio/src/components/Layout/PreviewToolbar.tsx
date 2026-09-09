import { Columns3, Play } from 'lucide-react'
import { Button, cn, IconButton, SegmentedControl } from '../common'
import { useStudioStore } from '../studioStore'
import { BreakpointSelector } from './BreakpointSelector'
import {
  selectActiveItems,
  selectActiveSettings,
  useBreadcrumb,
  useGridStore,
} from './gridStore'

const COLUMN_PRESETS = [2, 4, 6, 8, 10, 12]

/**
 * The drill-in trail (Root › Paper › Tab: Details …) in the mockup's mono
 * path style; each ancestor jumps back (`exitToDepth`), the current canvas is
 * inert text. "Root" alone when the editor is at the top level.
 */
function Breadcrumb() {
  const trail = useBreadcrumb()
  const exitToDepth = useGridStore((s) => s.exitToDepth)
  return (
    <nav
      aria-label="Canvas breadcrumb"
      className="flex min-w-0 items-center gap-1 font-mono text-ui-sm text-ink-3"
    >
      <button
        type="button"
        onClick={() => exitToDepth(0)}
        disabled={trail.length === 0}
        className={cn(
          'rounded px-1 py-0.5 transition-colors',
          trail.length === 0 ? 'text-ink' : 'hover:text-ink hover:underline',
        )}
      >
        Root
      </button>
      {trail.map((seg, i) => {
        const isLast = i === trail.length - 1
        return (
          <span key={`${seg.itemId}-${seg.canvasIndex}`} className="flex min-w-0 items-center gap-1">
            <span aria-hidden="true">/</span>
            <button
              type="button"
              disabled={isLast}
              onClick={() => exitToDepth(i + 1)}
              className={cn(
                'max-w-32 truncate rounded px-1 py-0.5 transition-colors',
                isLast ? 'text-ink' : 'hover:text-ink hover:underline',
              )}
            >
              {seg.label}
            </button>
          </span>
        )
      })}
    </nav>
  )
}

/** The mockup's "Page grid" seg, bound to the active canvas's column count at
 * the preview breakpoint. A value outside the presets (set from the inspector)
 * is shown as an extra option so the control always reflects the state. */
function ColumnsSeg() {
  const previewBreakpoint = useGridStore((s) => s.previewBreakpoint)
  const columns = useGridStore((s) => selectActiveSettings(s).columns[previewBreakpoint])
  const updateContainer = useGridStore((s) => s.updateContainer)
  const values = COLUMN_PRESETS.includes(columns)
    ? COLUMN_PRESETS
    : [...COLUMN_PRESETS, columns].sort((a, b) => a - b)
  return (
    <SegmentedControl
      aria-label={`Columns at ${previewBreakpoint}`}
      options={values.map((n) => ({ value: String(n), label: String(n) }))}
      value={String(columns)}
      onChange={(v) => updateContainer(previewBreakpoint, 'columns', v)}
    />
  )
}

export function PreviewToolbar() {
  const canvasEmpty = useGridStore((s) => selectActiveItems(s).length === 0)
  const previewBreakpoint = useGridStore((s) => s.previewBreakpoint)
  const setPreviewBreakpoint = useGridStore((s) => s.setPreviewBreakpoint)
  const guides = useStudioStore((s) => s.guides)
  const toggleGuides = useStudioStore((s) => s.toggleGuides)
  const setPreviewOpen = useStudioStore((s) => s.setPreviewOpen)

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-panel px-2.5 py-[7px]">
      <Breadcrumb />

      <span aria-hidden="true" className="h-5 w-px bg-line" />

      <span className="sec-label">Preview</span>
      <BreakpointSelector value={previewBreakpoint} onChange={setPreviewBreakpoint} />

      <span className="sec-label ml-1.5">Columns</span>
      <ColumnsSeg />

      <div className="flex-1" />

      <IconButton
        label={guides ? 'Hide column guides' : 'Show column guides'}
        active={guides}
        onClick={toggleGuides}
      >
        <Columns3 size={14} aria-hidden="true" />
      </IconButton>
      <Button
        disabled={canvasEmpty}
        title={canvasEmpty ? 'Add a component to the canvas first' : 'Run the live preview'}
        onClick={() => setPreviewOpen(true)}
      >
        <Play size={14} aria-hidden="true" />
        Run
      </Button>
    </div>
  )
}
