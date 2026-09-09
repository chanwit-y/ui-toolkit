import {
  ArrowLeft,
  Boxes,
  Eye,
  LayoutGrid,
  Moon,
  Palette,
  Plug,
  SlidersHorizontal,
  Sun,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useProjectEndpoints } from './Library/scope'
import { Button, cn, IconButton } from './common'
import { useGridStore } from './Layout/gridStore'
import { LivePreviewModal } from './Layout/LivePreviewModal'
import { useStudioStore } from './studioStore'
import { useThemeStore } from './Theme/themeStore'
import type { ProjectDef } from './Workspace/types'
import { useWorkspaceStore } from './Workspace/workspaceStore'

// Relative to the `/p/:projectId` route the shell is rendered under.
const TABS = [
  { to: '.', label: 'Layout', icon: LayoutGrid, end: true },
  { to: 'model', label: 'Models', icon: Boxes, end: false },
  { to: 'api', label: 'APIs', icon: Plug, end: false },
  { to: 'env', label: 'Env', icon: SlidersHorizontal, end: false },
  { to: 'theme', label: 'Theme', icon: Palette, end: false },
]

const SAVE_LABEL = { saved: 'saved locally', pending: 'saving…', error: 'not saved' } as const

/**
 * The studio topbar shared by every project page (the mockup's studio
 * topbar): back arrow + brand glyph + "Projects / <name>" crumb, page tabs
 * (APIs carries its endpoint count), and on the right the autosave dot, the
 * appearance toggle and Preview. Rendered by ProjectShell above its Outlet.
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
  const canvasEmpty = useGridStore((s) => s.items.length === 0)

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

        <nav className="flex h-full items-stretch gap-0.5" aria-label="Pages">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-1.5 px-[11px] text-ui font-medium text-ink-2 transition-colors hover:text-ink',
                  'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-t-sm after:bg-accent after:opacity-0 after:content-[""]',
                  isActive && 'font-semibold text-ink after:opacity-100',
                )
              }
            >
              <Icon size={15} aria-hidden="true" />
              {label}
              {to === '/api' && <span className="tag">{endpointCount}</span>}
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

        <IconButton
          label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => updateTheme({ appearance: isDark ? 'light' : 'dark' })}
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
      </header>

      {/* Mount fresh on every open so the engine form state resets. */}
      {previewOpen && <LivePreviewModal onClose={() => setPreviewOpen(false)} />}
    </>
  )
}
