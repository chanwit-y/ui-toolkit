import { Code, Plus, Settings } from 'lucide-react'
import { IconButton } from '../common'
import { BreakpointSelector } from './BreakpointSelector'
import { useGridStore } from './gridStore'

export function PreviewToolbar() {
  const previewBreakpoint = useGridStore((s) => s.previewBreakpoint)
  const settingsTarget = useGridStore((s) => s.settingsTarget)
  const setPreviewBreakpoint = useGridStore((s) => s.setPreviewBreakpoint)
  const openContainerSettings = useGridStore((s) => s.openContainerSettings)
  const openCodePanel = useGridStore((s) => s.openCodePanel)
  const addItem = useGridStore((s) => s.addItem)

  return (
    <div className="relative flex shrink-0 items-center justify-end gap-2 border-b border-zinc-200 bg-white/70 px-3 py-2">
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        <span className="px-1.5 text-xs font-medium text-zinc-500">Preview</span>
        <BreakpointSelector
          value={previewBreakpoint}
          onChange={setPreviewBreakpoint}
        />
      </div>

      <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        <IconButton
          label="Grid container settings"
          active={settingsTarget === 'container'}
          className="h-8! w-8! border-0 bg-transparent shadow-none"
          onClick={(e) => {
            e.stopPropagation()
            openContainerSettings(e.currentTarget.getBoundingClientRect())
          }}
        >
          <Settings size={18} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="View component config (JSON / CSS)"
          active={settingsTarget === 'code'}
          className="h-8! w-8! border-0 bg-transparent shadow-none"
          onClick={(e) => {
            e.stopPropagation()
            openCodePanel(e.currentTarget.getBoundingClientRect())
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
