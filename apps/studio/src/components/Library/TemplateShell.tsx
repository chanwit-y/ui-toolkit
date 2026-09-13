import { ArrowLeft, Eye, LayoutTemplate, Moon, Redo2, Sun, Undo2 } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppearanceSync } from '../AppearanceSync'
import { Button, cn, IconButton } from '../common'
import { useGridStore } from '../Layout/gridStore'
import { Layout } from '../Layout'
import { LivePreviewModal } from '../Layout/LivePreviewModal'
import { useStudioStore } from '../studioStore'
import { applyPageGrid, isHydrating } from '../Workspace/snapshots'
import { UserButton } from '../Workspace/UserButton'
import { useWorkspaceStore } from '../Workspace/workspaceStore'
import { LibraryScopeContext } from './scope'

const AUTOSAVE_DEBOUNCE_MS = 400
const SAVE_LABEL = { saved: 'saved locally', pending: 'saving…', error: 'not saved' } as const

/**
 * The master-layout editor at `/library/templates/:templateId/layout` (the
 * mockup's template mode): the same Layout editor, hydrated from the
 * template's grid and autosaved back into the library, under its own topbar
 * (Templates / name, the "master layout" tag, undo / redo, Preview, Done) and
 * a banner reminding you every page created from it starts like this. Library
 * scope, so endpoint pickers offer the whole library.
 */
export function TemplateShell() {
  const { templateId } = useParams()
  const template = useWorkspaceStore((s) => s.library.templates.find((t) => t.id === templateId))
  const appearance = useWorkspaceStore((s) => s.appearance)
  const setAppearance = useWorkspaceStore((s) => s.setAppearance)
  const saveTemplateGrid = useWorkspaceStore((s) => s.saveTemplateGrid)
  const setSaveState = useWorkspaceStore((s) => s.setSaveState)
  const saveState = useWorkspaceStore((s) => s.saveState)
  const undoDepth = useGridStore((s) => s.undoDepth)
  const redoDepth = useGridStore((s) => s.redoDepth)
  const undo = useGridStore((s) => s.undo)
  const redo = useGridStore((s) => s.redo)
  const canvasEmpty = useGridStore((s) => s.items.length === 0)
  const previewOpen = useStudioStore((s) => s.previewOpen)
  const setPreviewOpen = useStudioStore((s) => s.setPreviewOpen)
  const navigate = useNavigate()

  useEffect(() => {
    if (!templateId) return
    const t = useWorkspaceStore.getState().library.templates.find((x) => x.id === templateId)
    if (t) applyPageGrid(t.grid)
  }, [templateId])

  useEffect(() => {
    if (!templateId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const collect = () => {
      const g = useGridStore.getState()
      return { items: g.items, containerSettings: g.containerSettings, fieldSeq: g.fieldSeq }
    }
    const unsub = useGridStore.subscribe((s, prev) => {
      if (
        s.items === prev.items &&
        s.containerSettings === prev.containerSettings &&
        s.fieldSeq === prev.fieldSeq
      )
        return
      if (isHydrating()) return
      setSaveState('pending')
      clearTimeout(timer)
      timer = setTimeout(() => saveTemplateGrid(templateId, collect()), AUTOSAVE_DEBOUNCE_MS)
    })
    return () => {
      unsub()
      if (timer) {
        clearTimeout(timer)
        if (!isHydrating()) saveTemplateGrid(templateId, collect())
      }
    }
  }, [templateId, saveTemplateGrid, setSaveState])

  if (!template) return <Navigate to="/library/templates" replace />
  const isDark = appearance === 'dark'

  return (
    <LibraryScopeContext.Provider value="library">
      <AppearanceSync appearance={appearance} />
      <header className="flex h-[46px] shrink-0 items-center gap-2.5 border-b border-line bg-panel px-3">
        <Link to="/library/templates" className="btn btn-icon" title="Back to templates" aria-label="Back to templates">
          <ArrowLeft size={15} aria-hidden="true" />
        </Link>
        <span
          aria-hidden="true"
          className="grid h-[22px] w-[22px] place-items-center rounded-md bg-accent font-mono text-[12px] font-bold text-accent-ink"
        >
          G
        </span>
        <div className="flex min-w-0 items-center gap-1.5 text-ui">
          <Link to="/library/templates" className="text-ink-2 hover:text-ink hover:underline">
            Templates
          </Link>
          <span className="text-ink-3" aria-hidden="true">
            /
          </span>
          <b className="truncate font-semibold text-ink">{template.name}</b>
          <span className="tag">master layout</span>
        </div>
        <div className="flex-1" />
        <span className="flex items-center gap-1.5 whitespace-nowrap font-mono text-ui-sm text-ink-3">
          <i
            aria-hidden="true"
            className={cn(
              'block h-1.5 w-1.5 rounded-full',
              saveState === 'saved' ? 'bg-ink-2' : saveState === 'error' ? 'bg-danger' : 'bg-line-strong',
            )}
          />
          {SAVE_LABEL[saveState]}
        </span>
        <IconButton label="Undo (⌘Z)" disabled={undoDepth === 0} onClick={undo}>
          <Undo2 size={15} aria-hidden="true" />
        </IconButton>
        <IconButton label="Redo (⇧⌘Z)" disabled={redoDepth === 0} onClick={redo}>
          <Redo2 size={15} aria-hidden="true" />
        </IconButton>
        <UserButton />
        <IconButton
          label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setAppearance(isDark ? 'light' : 'dark')}
        >
          {isDark ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
        </IconButton>
        <Button
          disabled={canvasEmpty}
          title={canvasEmpty ? 'Add a component to the canvas first' : 'Open the live preview'}
          onClick={() => setPreviewOpen(true)}
        >
          <Eye size={15} aria-hidden="true" />
          Preview
        </Button>
        <Button variant="primary" onClick={() => navigate('/library/templates')}>
          Done
        </Button>
      </header>
      <div className="flex shrink-0 items-center gap-2.5 border-b border-line bg-panel-2 px-3.5 py-1.5 text-ui text-ink-2">
        <LayoutTemplate size={13} aria-hidden="true" className="text-ink-3" />
        <b className="font-semibold text-ink">{template.name}</b>
        <span>you are editing the master layout — every page created from it starts like this</span>
        <span className="flex-1" />
        <span className="font-mono text-ui-xs text-ink-3">{template.grid.items.length} block(s)</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <Layout templateMode />
      </div>
      {previewOpen && <LivePreviewModal onClose={() => setPreviewOpen(false)} />}
    </LibraryScopeContext.Provider>
  )
}
