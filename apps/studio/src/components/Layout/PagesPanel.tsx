import { FileText, Network, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, cn } from '../common'
import { PageDialog } from '../Workspace/PageDialog'
import { countComponents } from '../Workspace/snapshots'
import type { PageDef } from '../Workspace/types'
import { useActivePages, useWorkspaceStore } from '../Workspace/workspaceStore'
import { pageLinks } from './pageLinks'
import { useStudioStore } from '../studioStore'

/**
 * The Pages tab of the left pane (the mockup's page tree): pages nest under
 * the page whose button links to them ("via 'Add country'"), roots are the
 * pages nothing links to; each row shows the route, how many overlays its
 * buttons open, and its component count. The live page is highlighted and a
 * click routes to another. Modals, dialogs and toasts are not pages — they
 * are actions on a page and live in the Layers tab.
 */
export function PagesPanel() {
  const projectId = useWorkspaceStore((s) => s.activeProjectId)
  const activePageId = useWorkspaceStore((s) => s.activePageId)
  const pages = useActivePages()
  const navigate = useNavigate()
  const setOverviewOpen = useStudioStore((s) => s.setOverviewOpen)
  const [creating, setCreating] = useState(false)

  if (!projectId) return null

  const byId = new Map(pages.map((pg) => [pg.id, pg]))
  const linksOf = new Map(pages.map((pg) => [pg.id, pageLinks(pg)]))
  const targeted = new Set<string>()
  for (const links of linksOf.values())
    for (const l of links) if (l.kind === 'page') targeted.add(l.pageId)
  const seen = new Set<string>()

  const row = (pg: PageDef, depth: number, via?: string) => {
    const isCurrent = pg.id === activePageId
    const links = linksOf.get(pg.id) ?? []
    const overlays = links.filter((l) => l.kind === 'toast' || l.kind === 'dialog').length
    return (
      <div key={`${pg.id}-${depth}-${via ?? ''}`}>
        {via && (
          <div className="px-1 pt-1 text-ui-xs italic text-ink-3" style={{ marginLeft: depth * 12 }}>
            via “{via}”
          </div>
        )}
        <button
          type="button"
          aria-current={isCurrent || undefined}
          onClick={() => navigate(`/p/${projectId}/pages/${pg.id}`)}
          className={cn('list-row w-full py-1 text-left', isCurrent && 'font-semibold')}
          style={{ marginLeft: depth * 12, width: `calc(100% - ${depth * 12}px)` }}
        >
          <FileText className="h-[13px] w-[13px] shrink-0 text-ink-3" aria-hidden="true" />
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate">{pg.name}</span>
            <span className="truncate font-mono text-ui-xs font-normal text-ink-3">{pg.path}</span>
          </span>
          {overlays > 0 && (
            <span
              className="font-mono text-ui-xs text-ink-3"
              title="modals, dialogs and toasts opened from this page"
            >
              {overlays} act
            </span>
          )}
          <span
            className="font-mono text-ui-xs text-ink-3"
            title={`${countComponents(pg.grid.items)} component(s)`}
          >
            {countComponents(pg.grid.items)}
          </span>
        </button>
      </div>
    )
  }

  const tree = (pg: PageDef, depth: number, via?: string): React.ReactNode => {
    if (seen.has(pg.id) || depth > 4) {
      return (
        <div
          key={`${pg.id}-again-${depth}`}
          className="px-1 py-0.5 text-ui-xs text-ink-3"
          style={{ marginLeft: depth * 12 }}
        >
          {via && <span className="italic">via “{via}” · </span>}
          {pg.name} · already shown
        </div>
      )
    }
    seen.add(pg.id)
    const kids = (linksOf.get(pg.id) ?? []).filter((l) => l.kind === 'page')
    return (
      <div key={pg.id}>
        {row(pg, depth, via)}
        {kids.map((l) => {
          const target = l.kind === 'page' ? byId.get(l.pageId) : undefined
          return target ? tree(target, depth + 1, l.via) : null
        })}
      </div>
    )
  }

  const roots = pages.filter((pg) => !targeted.has(pg.id))

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
      <span className="sec-label block px-1 pb-1.5 pt-1">Pages</span>
      <div className="flex flex-col gap-0.5">
        {roots.map((pg) => tree(pg, 0))}
        {pages.filter((pg) => !seen.has(pg.id)).map((pg) => tree(pg, 0))}
      </div>
      <p className="mt-2.5 px-1 text-ui-xs leading-snug text-ink-3">
        Pages only. Modals, dialogs and toasts are actions on a page — they live in the Layers
        tab.
      </p>
      <Button size="sm" className="mt-2.5 w-full" onClick={() => setCreating(true)}>
        <Plus size={13} aria-hidden="true" />
        New page
      </Button>
      <Button size="sm" className="mt-1.5 w-full" onClick={() => setOverviewOpen(true)}>
        <Network size={13} aria-hidden="true" />
        See the whole project
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
