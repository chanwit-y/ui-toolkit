import { ChevronRight, Code, Home, Play, Plus, Settings } from 'lucide-react'
import { useState } from 'react'
import { cn, IconButton } from '../common'
import { BreakpointSelector } from './BreakpointSelector'
import { selectActiveItems, useBreadcrumb, useGridStore } from './gridStore'
import { LivePreviewModal } from './LivePreviewModal'

/**
 * The drill-in trail (Root › Paper › Tab: Details …). Rendered only when the
 * editor is inside a child canvas; each ancestor is a jump-back button
 * (`exitToDepth`), the current canvas is inert text.
 */
function Breadcrumb() {
  const trail = useBreadcrumb()
  const exitToDepth = useGridStore((s) => s.exitToDepth)
  if (trail.length === 0) return <div aria-hidden="true" />
  return (
    <nav
      aria-label="Canvas breadcrumb"
      className="flex min-w-0 items-center gap-0.5 justify-self-start rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-xs"
    >
      <button
        type="button"
        onClick={() => exitToDepth(0)}
        className="flex items-center gap-1 rounded-md px-1.5 py-1 font-medium text-teal-700 transition-colors hover:bg-teal-50"
      >
        <Home className="h-3.5 w-3.5" aria-hidden="true" />
        Root
      </button>
      {trail.map((seg, i) => {
        const isLast = i === trail.length - 1
        return (
          <span key={`${seg.itemId}-${seg.canvasIndex}`} className="flex min-w-0 items-center gap-0.5">
            <ChevronRight className="h-3 w-3 shrink-0 text-zinc-400" aria-hidden="true" />
            <button
              type="button"
              disabled={isLast}
              onClick={() => exitToDepth(i + 1)}
              className={cn(
                'max-w-32 truncate rounded-md px-1.5 py-1 font-medium transition-colors',
                isLast
                  ? 'cursor-default text-zinc-700'
                  : 'text-teal-700 hover:bg-teal-50',
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

export function PreviewToolbar() {
  // Local to the toolbar (nothing in gridStore, same principle as the cell
  // preview gating); conditional mount makes every open a fresh engine form.
  const [previewOpen, setPreviewOpen] = useState(false)
  const canvasEmpty = useGridStore((s) => selectActiveItems(s).length === 0)
  const previewBreakpoint = useGridStore((s) => s.previewBreakpoint)
  const sidebarView = useGridStore((s) => s.sidebarView)
  const selectedItemId = useGridStore((s) => s.selectedItemId)
  const setPreviewBreakpoint = useGridStore((s) => s.setPreviewBreakpoint)
  const showContainer = useGridStore((s) => s.showContainer)
  const setSidebarView = useGridStore((s) => s.setSidebarView)
  const addItem = useGridStore((s) => s.addItem)

  const containerActive = sidebarView === 'layout' && !selectedItemId
  const codeActive = sidebarView === 'code'

  return (
    <div className="@container grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-1 border-b border-zinc-200 bg-white/70 px-3 py-2">
      {/* Left column: the drill-in breadcrumb when inside a child canvas,
          otherwise an empty spacer mirroring the actions column so the pill
          stays centered; grid (vs absolute) makes overlap impossible. */}
      <Breadcrumb />

      <div className="flex items-center gap-1 justify-self-center rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        <span className="hidden px-1.5 text-xs font-medium text-zinc-500 @[28rem]:inline">
          Preview
        </span>
        <BreakpointSelector
          value={previewBreakpoint}
          onChange={setPreviewBreakpoint}
          responsive
        />
      </div>

      <div className="flex items-center gap-0.5 justify-self-end rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        <IconButton
          label="Grid container settings"
          active={containerActive}
          className="h-8! w-8! border-0 bg-transparent shadow-none"
          onClick={(e) => {
            e.stopPropagation()
            showContainer()
          }}
        >
          <Settings size={18} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="View component config (JSON / CSS)"
          active={codeActive}
          className="h-8! w-8! border-0 bg-transparent shadow-none"
          onClick={(e) => {
            e.stopPropagation()
            setSidebarView(codeActive ? 'inspector' : 'code')
          }}
        >
          <Code size={18} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="Live preview"
          disabled={canvasEmpty}
          className="h-8! w-8! border-0 bg-transparent shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-700"
          onClick={(e) => {
            e.stopPropagation()
            setPreviewOpen(true)
          }}
        >
          <Play size={18} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="Add grid item"
          variant="primary"
          className="h-8! w-8! shadow-none"
          onClick={(e) => {
            e.stopPropagation()
            addItem()
          }}
        >
          <Plus size={18} aria-hidden="true" />
        </IconButton>
      </div>

      {previewOpen && <LivePreviewModal onClose={() => setPreviewOpen(false)} />}
    </div>
  )
}
