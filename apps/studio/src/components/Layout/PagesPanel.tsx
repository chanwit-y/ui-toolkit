import { FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, cn } from '../common'
import { PageDialog } from '../Workspace/PageDialog'
import { countComponents } from '../Workspace/snapshots'
import { useActivePages, useWorkspaceStore } from '../Workspace/workspaceStore'

/**
 * The Pages tab of the left pane: every page of the project with its route
 * and component count; the live page is highlighted and a click routes to
 * another. Modals, dialogs and toasts are not pages — they are actions on a
 * page and live in the Layers tab (the mockup's note).
 */
export function PagesPanel() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId)
  const activePageId = useWorkspaceStore((s) => s.activePageId)
  const pages = useActivePages()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  if (!projectId) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
      <span className="sec-label block px-1 pb-1.5 pt-1">Pages</span>
      <div className="flex flex-col gap-0.5">
        {pages.map((pg) => {
          const isCurrent = pg.id === activePageId
          return (
            <button
              key={pg.id}
              type="button"
              aria-current={isCurrent || undefined}
              onClick={() => navigate(`/p/${projectId}/pages/${pg.id}`)}
              className={cn('list-row w-full py-1 text-left', isCurrent && 'font-semibold')}
            >
              <FileText className="h-[13px] w-[13px] shrink-0 text-ink-3" aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate">{pg.name}</span>
                <span className="truncate font-mono text-ui-xs font-normal text-ink-3">
                  {pg.path}
                </span>
              </span>
              <span
                className="font-mono text-ui-xs text-ink-3"
                title={`${countComponents(pg.grid.items)} component(s)`}
              >
                {countComponents(pg.grid.items)}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-2.5 px-1 text-ui-xs leading-snug text-ink-3">
        Pages only. Modals, dialogs and toasts are actions on a page — they live in the Layers
        tab.
      </p>
      <Button size="sm" className="mt-2.5 w-full" onClick={() => setCreating(true)}>
        <Plus size={13} aria-hidden="true" />
        New page
      </Button>

      {creating && (
        <PageDialog
          projectId={projectId}
          onClose={() => setCreating(false)}
          onCreated={(created) => navigate(`/p/${projectId}/pages/${created.id}`)}
        />
      )}
    </div>
  )
}
