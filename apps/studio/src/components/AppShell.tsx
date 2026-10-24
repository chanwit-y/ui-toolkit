import {
  ArrowLeft,
  Boxes,
  Download,
  Eye,
  LayoutGrid,
  Moon,
  Network,
  Palette,
  PanelLeft,
  Plug,
  Redo2,
  Save,
  SlidersHorizontal,
  Sun,
  Undo2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { cliInfo, isCliMode } from '../cli/cliStorage'
import { canPickFolder, pickedFolderName, saveToProject, type SaveResult } from '../cli/saveToProject'
import { runtimeProjectsFromPayload } from './Workspace/runtimeProject'
import { currentPayload } from '../cli/cliStorage'
import { useProjectEndpoints } from './Library/scope'
import { cn, IconButton, Tooltip, TooltipProvider } from './common'
import { useGridStore } from './Layout/gridStore'
import { LivePreviewModal } from './Layout/LivePreviewModal'
import { useStudioStore } from './studioStore'
import { useThemeStore } from './Theme/themeStore'
import { ExportDialog } from './Workspace/ExportDialog'
import { OverviewDialog } from './Workspace/OverviewDialog'
import type { ProjectDef } from './Workspace/types'
import { UserButton } from './Workspace/UserButton'
import { useWorkspaceStore, WORKSPACE_STORAGE_KEY } from './Workspace/workspaceStore'

// Relative to the `/p/:projectId` route the shell is rendered under. Layout's
// target is filled in per render (`pages/<live page>`), so the tab keeps you on
// the page you were editing.
const TABS = [
  { to: 'model', label: 'Models', icon: Boxes },
  { to: 'api', label: 'APIs', icon: Plug },
  { to: 'env', label: 'Env', icon: SlidersHorizontal },
  { to: 'theme', label: 'Theme', icon: Palette },
  { to: 'menu', label: 'Menu', icon: PanelLeft },
]

// Icon-only like the topbar's action buttons; the label is a hover tooltip +
// aria-label (the APIs tab keeps its endpoint count beside the glyph). The
// link spans the header so the underline sits on its edge; the tooltip
// anchors to the 28px glyph box inside it, so the chip hangs right under the
// icon instead of 30px below it in the canvas bar.
const TAB_CLASS = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative flex items-center gap-1 px-1.5 text-ui font-medium text-ink-2 transition-colors hover:text-ink',
    'after:absolute after:inset-x-1.5 after:bottom-0 after:h-0.5 after:rounded-t-sm after:bg-accent after:opacity-0 after:content-[""]',
    isActive && 'text-ink after:opacity-100',
  )
const TAB_GLYPH = 'grid h-7 w-7 place-items-center rounded-md'

const SAVE_LABEL = { saved: 'saved locally', pending: 'saving…', error: 'not saved' } as const
/** Served by `gummy studio`, the autosave lands in the project folder, not the browser. */
const CLI_SAVE_LABEL = { saved: 'saved to project', pending: 'saving…', error: 'not saved' } as const

/** One line of feedback after Save to project, in the topbar for a few seconds. */
function saveMessage(r: SaveResult): string {
  switch (r.mode) {
    case 'cli':
      // The CLI rewrites only what changed, so a file count would overstate it.
      return `Saved to ${r.where}`
    case 'folder':
      return `Saved ${r.files.length} files to ${r.where}`
    case 'download':
      return `Downloaded ${r.files.length} files — drop them into your project's gummy/ folder`
    case 'cancelled':
      return ''
    case 'error':
      return `Could not save: ${r.message}`
  }
}

/**
 * The Save to project button: writes `gummy/workspace.json` + `gummy/projects/<key>/` (a downloaded copy: `<key>.json`)
 * where the consumer app reads them (see `cli/saveToProject.ts`). Under the
 * CLI it flushes the autosave; elsewhere it asks for the project folder once
 * (File System Access API), or downloads the files where no picker exists.
 * Shift-click asks for the folder again.
 */
function SaveToProjectButton() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 6000)
    return () => clearTimeout(t)
  }, [message])
  const cli = isCliMode()
  const folder = pickedFolderName()
  const label = cli
    ? `Save to project — write now to ${cliInfo()?.dir ?? 'gummy'}/ (autosaved on every change)`
    : canPickFolder()
      ? folder
        ? `Save to project — write gummy/ into "${folder}" (shift-click to pick another folder)`
        : 'Save to project — pick your app\'s folder and write gummy/ into it'
      : 'Save to project — download gummy/workspace.json and projects/*.json'
  const run = async (repick: boolean) => {
    const payload = currentPayload(WORKSPACE_STORAGE_KEY)
    if (!payload) {
      setMessage('Could not save: nothing is persisted yet')
      return
    }
    setBusy(true)
    try {
      setMessage(saveMessage(await saveToProject(payload, runtimeProjectsFromPayload(payload), { repick })))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      {message && (
        <span role="status" className={cn('max-w-[28rem] truncate font-mono text-ui-xs', message.startsWith('Could not') ? 'text-danger' : 'text-ink-3')}>
          {message}
        </span>
      )}
      <IconButton label={label} disabled={busy} onClick={(e) => void run(e.shiftKey)}>
        <Save size={15} aria-hidden="true" />
      </IconButton>
    </>
  )
}

/**
 * The studio topbar shared by every project page (the mockup's studio
 * topbar): back arrow + brand glyph + "Projects / <name>" crumb, studio tabs
 * (Layout targets the live page; APIs carries its endpoint count), and on the
 * right the autosave dot, undo/redo, the appearance toggle and Preview. Rendered by ProjectShell above its Outlet.
 *
 * The appearance toggle writes the Theme page's `appearance` — one setting
 * drives the chrome (`.dark` on <html>, set by the library ThemeProvider) and
 * the canvas previews together (see the grilled redesign). Preview hosts the
 * Live Preview modal here so it's reachable from every page.
 */
export function AppShell({ project }: { project: ProjectDef }) {
  const endpointCount = useProjectEndpoints().length
  const saveState = useWorkspaceStore((s) => s.saveState)
  const appearance = useThemeStore((s) => s.config.appearance)
  const updateTheme = useThemeStore((s) => s.update)
  const previewOpen = useStudioStore((s) => s.previewOpen)
  const setPreviewOpen = useStudioStore((s) => s.setPreviewOpen)
  const overviewOpen = useStudioStore((s) => s.overviewOpen)
  const setOverviewOpen = useStudioStore((s) => s.setOverviewOpen)
  const exportOpen = useStudioStore((s) => s.exportOpen)
  const setExportOpen = useStudioStore((s) => s.setExportOpen)
  const canvasEmpty = useGridStore((s) => s.items.length === 0)
  const undoDepth = useGridStore((s) => s.undoDepth)
  const redoDepth = useGridStore((s) => s.redoDepth)
  const undo = useGridStore((s) => s.undo)
  const redo = useGridStore((s) => s.redo)
  const activePageId = useWorkspaceStore((s) => s.activePageId)
  const pageId =
    project.snapshot.pages.find((pg) => pg.id === activePageId)?.id ?? project.snapshot.pages[0]?.id

  const isDark = appearance === 'dark'

  return (
    <>
      <header className="flex h-[46px] shrink-0 items-center gap-2.5 border-b border-line bg-panel px-3">
        <Link to="/" className="btn btn-icon" title="Back to projects" aria-label="Back to projects">
          <ArrowLeft size={15} aria-hidden="true" />
        </Link>
        <span
          aria-hidden="true"
          className="grid h-[22px] w-[22px] place-items-center rounded-md bg-accent font-mono text-[12px] font-bold text-accent-ink"
        >
          G
        </span>
        <div className="flex min-w-0 items-center gap-1.5 text-ui">
          <Link to="/" className="text-ink-2 hover:text-ink hover:underline">
            Projects
          </Link>
          <span className="text-ink-3" aria-hidden="true">
            /
          </span>
          <b className="truncate font-semibold text-ink">{project.name}</b>
        </div>

        <TooltipProvider>
          <nav className="flex h-full items-stretch gap-0.5" aria-label="Studio tabs">
            <NavLink to={pageId ? `pages/${pageId}` : '.'} className={TAB_CLASS} aria-label="Layout">
              <Tooltip label="Layout">
                <span className={TAB_GLYPH}>
                  <LayoutGrid size={15} aria-hidden="true" />
                </span>
              </Tooltip>
            </NavLink>
            {TABS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={TAB_CLASS} aria-label={label}>
                <Tooltip label={label}>
                  <span className={TAB_GLYPH}>
                    <Icon size={15} aria-hidden="true" />
                  </span>
                </Tooltip>
                {to === 'api' && <span className="tag">{endpointCount}</span>}
              </NavLink>
            ))}
          </nav>
        </TooltipProvider>

        <div className="flex-1" />

        <span className="flex items-center gap-1.5 whitespace-nowrap font-mono text-ui-sm text-ink-3">
          <i
            aria-hidden="true"
            className={cn(
              'block h-1.5 w-1.5 rounded-full',
              saveState === 'saved' ? 'bg-ink-2' : saveState === 'error' ? 'bg-danger' : 'bg-line-strong',
            )}
          />
          {(isCliMode() ? CLI_SAVE_LABEL : SAVE_LABEL)[saveState]}
        </span>
        <SaveToProjectButton />

        <IconButton label="Undo (⌘Z)" disabled={undoDepth === 0} onClick={undo}>
          <Undo2 size={15} aria-hidden="true" />
        </IconButton>
        <IconButton label="Redo (⇧⌘Z)" disabled={redoDepth === 0} onClick={redo}>
          <Redo2 size={15} aria-hidden="true" />
        </IconButton>
        <UserButton />

        <IconButton
          label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => updateTheme({ appearance: isDark ? 'light' : 'dark' })}
        >
          {isDark ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
        </IconButton>
        {/* Icon-only, like the rest of the topbar; the label lives in the tooltip / aria-label. */}
        <IconButton label="Overview — see the whole project" onClick={() => setOverviewOpen(true)}>
          <Network size={15} aria-hidden="true" />
        </IconButton>
        <IconButton label="Export — hand this project to a developer" onClick={() => setExportOpen(true)}>
          <Download size={15} aria-hidden="true" />
        </IconButton>
        <IconButton
          disabled={canvasEmpty}
          label={canvasEmpty ? 'Preview — add a component to the canvas first' : 'Preview — open the live preview'}
          onClick={() => setPreviewOpen(true)}
        >
          <Eye size={15} aria-hidden="true" />
        </IconButton>
      </header>

      {/* Mount fresh on every open so the engine form state resets. */}
      {previewOpen && <LivePreviewModal onClose={() => setPreviewOpen(false)} />}
      {overviewOpen && <OverviewDialog project={project} onClose={() => setOverviewOpen(false)} />}
      {exportOpen && <ExportDialog project={project} onClose={() => setExportOpen(false)} />}
    </>
  )
}
