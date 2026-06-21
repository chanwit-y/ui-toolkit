import { Code, Plus, Settings } from 'lucide-react'
import { IconButton } from '../common'
import { BreakpointSelector } from './BreakpointSelector'
import { useGridStore } from './gridStore'

export function PreviewToolbar() {
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
      {/* Empty spacer column mirrors the actions column so the pill stays
          centered over the canvas; grid (vs absolute) makes overlap impossible. */}
      <div aria-hidden="true" />

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
    </div>
  )
}
