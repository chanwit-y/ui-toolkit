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
  SlidersHorizontal,
  Sun,
  Undo2,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useProjectEndpoints } from './Library/scope'
import { cn, IconButton } from './common'
import { useGridStore } from './Layout/gridStore'
import { LivePreviewModal } from './Layout/LivePreviewModal'
import { useStudioStore } from './studioStore'
import { useThemeStore } from './Theme/themeStore'
import { ExportDialog } from './Workspace/ExportDialog'
import { OverviewDialog } from './Workspace/OverviewDialog'
import type { ProjectDef } from './Workspace/types'
import { UserButton } from './Workspace/UserButton'
import { useWorkspaceStore } from './Workspace/workspaceStore'

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

const TAB_CLASS = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative flex items-center gap-1.5 px-[11px] text-ui font-medium text-ink-2 transition-colors hover:text-ink',
    'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-t-sm after:bg-accent after:opacity-0 after:content-[""]',
    isActive && 'font-semibold text-ink after:opacity-100',
  )

const SAVE_LABEL = { saved: 'saved locally', pending: 'saving…', error: 'not saved' } as const

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

        <nav className="flex h-full items-stretch gap-0.5" aria-label="Studio tabs">
          <NavLink to={pageId ? `pages/${pageId}` : '.'} className={TAB_CLASS}>
            <LayoutGrid size={15} aria-hidden="true" />
            Layout
          </NavLink>
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={TAB_CLASS}>
              <Icon size={15} aria-hidden="true" />
              {label}
              {to === 'api' && <span className="tag">{endpointCount}</span>}
            </NavLink>
          ))}
        </nav>

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
