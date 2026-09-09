import { ChevronLeft, ChevronRight, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog, IconButton } from '../common'
import { PageDialog } from '../Workspace/PageDialog'
import { useActivePage, useActivePages, useWorkspaceStore } from '../Workspace/workspaceStore'

type Dialog = { kind: 'new' } | { kind: 'rename' } | { kind: 'delete' } | null

/**
 * The page controls at the head of the canvas bar (the mockup's crumb +
 * rename / move earlier / move later / delete / new page). The live page is
 * named with its route; deleting is disabled on the last page. Navigation is
 * URL-driven, so a new or deleted page just routes to the right `pages/:id`.
 */
export function PageBar() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId)
  const pages = useActivePages()
  const page = useActivePage()
  const movePage = useWorkspaceStore((s) => s.movePage)
  const deletePage = useWorkspaceStore((s) => s.deletePage)
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<Dialog>(null)

  if (!projectId || !page) return null
  const index = pages.findIndex((pg) => pg.id === page.id)

  return (
    <>
      <div className="flex min-w-0 items-center gap-1">
        <FileText size={13} aria-hidden="true" className="shrink-0 text-ink-3" />
        <button
          type="button"
          onClick={() => setDialog({ kind: 'rename' })}
          title={`${page.path} — click to rename`}
          className="max-w-48 truncate rounded px-1 py-0.5 text-ui font-semibold text-ink hover:bg-panel-2"
        >
          {page.name}
        </button>
        <span className="hidden max-w-40 truncate font-mono text-ui-xs text-ink-3 @[40rem]:inline">
          {page.path}
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <IconButton
          label="Rename page"
          className="btn-icon-sm h-6! text-ink-3 hover:text-ink"
          onClick={() => setDialog({ kind: 'rename' })}
        >
          <Pencil size={12} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="Move page earlier"
          className="btn-icon-sm h-6! text-ink-3 hover:text-ink"
          disabled={index <= 0}
          onClick={() => movePage(projectId, page.id, -1)}
        >
          <ChevronLeft size={13} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="Move page later"
          className="btn-icon-sm h-6! text-ink-3 hover:text-ink"
          disabled={index === -1 || index >= pages.length - 1}
          onClick={() => movePage(projectId, page.id, 1)}
        >
          <ChevronRight size={13} aria-hidden="true" />
        </IconButton>
        <IconButton
          label={pages.length < 2 ? 'The last page cannot be deleted' : 'Delete page'}
          className="btn-icon-sm h-6! text-ink-3 hover:text-danger"
          disabled={pages.length < 2}
          onClick={() => setDialog({ kind: 'delete' })}
        >
          <Trash2 size={12} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="New page"
          className="btn-icon-sm h-6! text-ink-3 hover:text-ink"
          onClick={() => setDialog({ kind: 'new' })}
        >
          <Plus size={13} aria-hidden="true" />
        </IconButton>
      </div>

      {dialog?.kind === 'new' && (
        <PageDialog
          projectId={projectId}
          onClose={() => setDialog(null)}
          onCreated={(created) => navigate(`/p/${projectId}/pages/${created.id}`)}
        />
      )}
      {dialog?.kind === 'rename' && (
        <PageDialog projectId={projectId} page={page} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title={`Delete “${page.name}”?`}
          body="The page and every component on it are removed. Buttons on other pages that link here lose their target. There is no undo."
          confirmLabel="Delete page"
          onConfirm={() => {
            const next = pages.find((pg) => pg.id !== page.id)
            deletePage(projectId, page.id)
            setDialog(null)
            if (next) navigate(`/p/${projectId}/pages/${next.id}`, { replace: true })
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
