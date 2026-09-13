import {
  AppShell,
  HttpClientFactory,
  Modal,
  PageRouter,
  type TApiMaster,
  type TMenu,
  type TModelMaster,
  type TPageMaster,
} from '@gummy-ui/ui'
import { ArrowLeft, FileText, Undo2 } from 'lucide-react'
import {
  Component,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ContextType,
  type ReactNode,
} from 'react'
import {
  MemoryRouter,
  matchPath,
  UNSAFE_LocationContext,
  UNSAFE_NavigationContext,
  UNSAFE_RouteContext,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { serializeEndpoints } from '../Api/serialize'
import type { EndpointDef } from '../Api/types'
import { useApiUrl } from '../Env'
import { serializeModels } from '../Model/serialize'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import { IconButton, Input, Select } from '../common'
import { designThemeStyle } from '../Theme/designTheme'
import { useThemeStore } from '../Theme/themeStore'
import { defaultShell, pathParams } from '../Workspace/snapshots'
import type { PageDef, PageGrid, ShellSettings } from '../Workspace/types'
import { useActivePages, useWorkspaceStore } from '../Workspace/workspaceStore'
import { menuToEngine, shellToEngine, type EngineShellProps } from '../Workspace/menu'
import { enginePageMeta } from '../Workspace/pageMeta'
import { DialogPreview, ToastPreview } from './DesignPreviews'
import type { DialogConfig, OverlayAxis, ToastConfig } from './designTypes'
import { gridConfigToJson } from './gridConfig'
import { useGridStore } from './gridStore'
import { buildLivePreviewContainer, collectPreviewNavigation, type LivePreviewWiring } from './livePreview'
import { indexItems } from './pageLinks'
import { PreviewDevTools, PreviewDevToolsToggle, type ApiLogEntry } from './PreviewDevTools'
import type { GridItemData } from './types'

/**
 * Renders the project's *exported JSON config* through the real declarative
 * engine — a round-trip test of the code-tab output (see `livePreview.ts`).
 * The engine's `ApiMaster` is built from the Model + API pages' stores with
 * the Env page's `API_URL` as the HttpClientFactory base URL, so bins whose
 * endpoint wiring resolves fetch FOR REAL; the rest are rewritten to
 * placeholders that say what's missing before rendering (see the grilled Env
 * design).
 *
 * Pages (see the grilled page-router design): the whole project renders
 * through the library's `PageRouter` — every page's exported container keyed
 * by its `key` — inside a `MemoryRouter`, so a button's `Navigate` action and
 * a table's row click change pages exactly as they will in the exported app,
 * and the engine's `useParams` reads the real route. The preview opens on
 * the page being edited (drawn from the grid store, unsaved edits included;
 * the others from their snapshots). The page bar shows the route, one input
 * per `:param` (a page opened directly has none filled — type one), a page
 * select, and back. The design-only kinds (link / toast / dialog) are still
 * played by the studio: a capture-phase click matched by button label opens
 * the link or shows the mock overlay over the page.
 *
 * react-router forbids a `<Router>` inside another, and the studio itself is
 * a `BrowserRouter`. `NestedRouterBoundary` clears the router contexts right
 * above the `MemoryRouter`, so the preview app is a self-contained router the
 * studio's routes never see (its `useRoutes` starts from `/`).
 *
 * The dialog chrome is the library's own `Modal` — the preview dogfoods
 * packages/ui for the shell, not just the content. It portals to body, which
 * is safe: the app-level ThemeProvider reaches it via React context (context
 * crosses portals), and Modal re-provides a `.radix-themes` wrapper inside
 * the portal, so the engine's Radix-based fields still resolve the accent
 * CSS vars. Escape / backdrop close come from Radix.
 *
 * Mount fresh on every open (`{open && <LivePreviewModal/>}` in the toolbar)
 * so form state and the memory history reset.
 *
 * No viewport control by design: the engine's `sm-col-span-*` classes are
 * window media queries, so narrowing a wrapper div can't change the active
 * breakpoint — the preview renders at whatever breakpoint the real window is
 * at. A faithful switcher needs an iframe (own viewport); possible v2.
 */

type BoundaryState = { error: Error | null }

/** Anything the pre-render placeholder pass missed lands here instead of
 * blanking the studio. */
class PreviewErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-warn/40 bg-warn/8 p-4 text-ui text-warn">
          <p className="font-semibold">The engine could not render this config.</p>
          <p className="mt-1 font-mono text-ui-sm">{this.state.error.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Resets react-router's contexts so a `MemoryRouter` can mount inside the
 * studio's `BrowserRouter` (the `Router` invariant only checks that no
 * location context is above it; the route context reset keeps the nested
 * `useRoutes` from prefixing the studio's `/p/:projectId/...` path).
 */
function NestedRouterBoundary({ children }: { children: ReactNode }) {
  return (
    <UNSAFE_LocationContext.Provider
      value={null as unknown as ContextType<typeof UNSAFE_LocationContext>}
    >
      <UNSAFE_NavigationContext.Provider
        value={null as unknown as ContextType<typeof UNSAFE_NavigationContext>}
      >
        <UNSAFE_RouteContext.Provider value={{ outlet: null, matches: [], isDataRoute: false }}>
          {children}
        </UNSAFE_RouteContext.Provider>
      </UNSAFE_NavigationContext.Provider>
    </UNSAFE_LocationContext.Provider>
  )
}

/** `/countries/:code` + `{code: 'TH'}` → `/countries/TH`; an unfilled param
 * stays literal (`/countries/:code`), which the route still matches. */
function fillPath(path: string, params: Record<string, string | undefined>): string {
  return path.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, k: string) => params[k] || `:${k}`)
}

/** CSS placement for an overlay stack (the mockup's `posStyle`). */
function overlayPosition(x: OverlayAxis, y: OverlayAxis): React.CSSProperties {
  const style: React.CSSProperties = {}
  if (x === 'start') style.left = 16
  else if (x === 'end') style.right = 16
  else style.left = '50%'
  if (y === 'start') style.top = 16
  else if (y === 'end') style.bottom = 16
  else style.top = '50%'
  const tx = x === 'center'
  const ty = y === 'center'
  if (tx && ty) style.transform = 'translate(-50%, -50%)'
  else if (tx) style.transform = 'translateX(-50%)'
  else if (ty) style.transform = 'translateY(-50%)'
  return style
}

type OpenOverlay = { itemId: string; openedAt: number }

/** `PageRouter`'s `notFound` — a component, so the element PreviewApp passes
 * can be created once (a fresh inline element per render would make
 * PageRouter rebuild its routes). */
function NotFoundNote() {
  const { pathname } = useLocation()
  return (
    <p className="p-4 text-ui text-ink-3">
      No page matches <span className="font-mono">{pathname}</span>.
    </p>
  )
}
const NOT_FOUND = <NotFoundNote />
/** The template editor has no project, so no authored shell settings. */
const DEFAULT_SHELL: ShellSettings = defaultShell('Template')

/** A page with its grid resolved (the live page from the grid store). */
type PreviewPage = PageDef & { grid: PageGrid }

export function LivePreviewModal({ onClose }: { onClose: () => void }) {
  const liveItems = useGridStore((s) => s.items)
  const liveSettings = useGridStore((s) => s.containerSettings)
  const projectPages = useActivePages()
  const livePageId = useWorkspaceStore((s) => s.activePageId)
  const project = useWorkspaceStore((s) =>
    s.projects.find((p) => p.id === s.activeProjectId),
  )
  // The project's attached endpoints and the models they reference — exactly
  // what its model.ts / api.ts exports contain.
  const models = useProjectModels()
  const endpoints = useProjectEndpoints()
  const apiUrl = useApiUrl()
  const themeConfig = useThemeStore((s) => s.config)
  const frameTheme = useMemo(() => designThemeStyle(themeConfig), [themeConfig])

  // Dev tools (see the grilled design): closed on every open — the modal
  // mounts fresh, and so does this. The request log is captured through the
  // engine client's onLog hook (the seam the API test runner uses); newest
  // first, capped so a polling table can't grow it unbounded.
  const [devOpen, setDevOpen] = useState(false)
  const [apiLog, setApiLog] = useState<ApiLogEntry[]>([])
  const [configJson, setConfigJson] = useState('[]')
  const logSeq = useRef(0)

  // The live page draws from the grid store; the others from their
  // snapshots. Outside a project (the template editor) the live canvas is the
  // only page.
  const liveGrid: PageGrid = useMemo(
    () => ({ items: liveItems, containerSettings: liveSettings, fieldSeq: 0 }),
    [liveItems, liveSettings],
  )
  const pages: PreviewPage[] = useMemo(
    () =>
      projectPages.length
        ? projectPages.map((pg) => (pg.id === livePageId ? { ...pg, grid: liveGrid } : pg))
        : [{ id: 'live', key: 'live', name: 'Template', path: '/', grid: liveGrid }],
    [projectPages, livePageId, liveGrid],
  )
  const livePage = pages.find((p) => p.id === livePageId) ?? pages[0]

  // onLog fires for successes and API errors alike (it's the only hook that
  // sees the raw axios response) — exactly what the dev-tools API tab wants.
  const http = useMemo(
    () =>
      new HttpClientFactory(
        apiUrl,
        async () => '',
        '1.0.0',
        30000,
        [],
        [],
        undefined,
        undefined,
        (response) => {
          setApiLog((prev) =>
            [
              {
                id: ++logSeq.current,
                method: (response?.config?.method ?? '?').toUpperCase(),
                url: response?.config?.url ?? '(unknown)',
                status: response?.status ?? null,
                time: new Date().toLocaleTimeString(),
                data: response?.data,
              },
              ...prev,
            ].slice(0, 50),
          )
        },
      ),
    [apiUrl],
  )

  const engine = useMemo(() => {
    // The same lowering the Model/API code tabs export — the preview's
    // ApiMaster is exactly what a consumer pasting model.ts + api.ts would run.
    const model = serializeModels(models) as TModelMaster
    const api = serializeEndpoints(endpoints, models) as unknown as TApiMaster<TModelMaster>
    const apiNames = new Set(Object.keys(api))
    // Fetchable = the response-model ref resolves to a model that exists;
    // without one the engine's schema conversion throws, so those bins stay
    // placeholders (with a message) instead of crashing the preview.
    const fetchableNames = new Set(
      Object.keys(api).filter((n) => {
        const response = (api as Record<string, { response?: unknown }>)[n].response
        return typeof response === 'string' && response in model
      }),
    )
    // Only the fetchable entries reach the engine: an endpoint whose response
    // model is missing (a freshly created one, say) would make its schema
    // conversion throw and blank the whole preview, while the bins bound to it
    // are already placeholders.
    const fetchableApi = Object.fromEntries(
      Object.entries(api).filter(([name]) => fetchableNames.has(name)),
    ) as TApiMaster<TModelMaster>
    const wiring: LivePreviewWiring = { apiUrl, apiNames, fetchableNames }
    return { model, api: fetchableApi, wiring }
  }, [models, endpoints, apiUrl])

  // The engine's pages record: every page's exported container under its key,
  // with its breadcrumb meta (title / parent / breadcrumb) as pages.ts emits
  // it. PageRouter gets `documentTitle={false}` so the studio's tab keeps its name.
  const enginePages = useMemo<TPageMaster>(
    () =>
      Object.fromEntries(
        pages.map((pg) => [
          pg.key,
          {
            path: pg.path,
            ...enginePageMeta(pg, pages),
            containers: [
              buildLivePreviewContainer(
                pg.grid.containerSettings,
                pg.grid.items,
                endpoints,
                engine.wiring,
                pages,
                `page-${pg.key}`,
              ),
            ],
          },
        ]),
      ),
    [pages, endpoints, engine],
  )

  const projectSlug = (project?.name ?? 'project').toLowerCase().replace(/\s+/g, '-')
  // The project's sidebar menu, as the exported menu.ts has it (no project →
  // the template editor → no shell menu).
  const engineMenu = useMemo<TMenu>(
    () => (project ? menuToEngine(project.snapshot.menu, pages) : []),
    [project, pages],
  )
  const engineShell = useMemo(() => shellToEngine(project?.snapshot.shell ?? DEFAULT_SHELL), [project])

  return (
    <Modal
      id="studio-live-preview"
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
      title="Live preview"
      description="Rendered by the engine from the exported JSON config"
      width="min(90vw, 72rem)"
      height="85vh"
    >
      <NestedRouterBoundary>
        <MemoryRouter initialEntries={[fillPath(livePage.path, {})]}>
          <PreviewApp
            pages={pages}
            livePage={livePage}
            endpoints={endpoints}
            enginePages={enginePages}
            engineMenu={engineMenu}
            engineShell={engineShell}
            http={http}
            model={engine.model}
            api={engine.api}
            frameTheme={frameTheme}
            projectSlug={projectSlug}
            onConfigJson={setConfigJson}
          />
        </MemoryRouter>
      </NestedRouterBoundary>

      {/* Both render through portals above the Radix dialog layer, so they
          stay visible and clickable while engine modals (with full-screen
          backdrops) are open — react-query-devtools style. */}
      {devOpen ? (
        <PreviewDevTools
          log={apiLog}
          configJson={configJson}
          onClose={() => setDevOpen(false)}
        />
      ) : (
        <PreviewDevToolsToggle onOpen={() => setDevOpen(true)} />
      )}
    </Modal>
  )
}

/**
 * The routed preview: page bar + the engine's `PageRouter`, plus the
 * design-only overlays the studio plays itself. Lives inside the
 * `MemoryRouter` so it can read and drive the preview's own location.
 * Memoized: the modal re-renders on every API log entry (dev tools), and
 * every prop here is stable, so the engine tree must not re-render for that.
 */
const PreviewApp = memo(function PreviewApp({
  pages,
  livePage,
  endpoints,
  enginePages,
  engineMenu,
  engineShell,
  http,
  model,
  api,
  frameTheme,
  projectSlug,
  onConfigJson,
}: {
  pages: PreviewPage[]
  livePage: PreviewPage
  endpoints: EndpointDef[]
  enginePages: TPageMaster
  engineMenu: TMenu
  engineShell: EngineShellProps
  http: HttpClientFactory
  model: TModelMaster
  api: TApiMaster<TModelMaster>
  frameTheme: React.CSSProperties
  projectSlug: string
  onConfigJson: (json: string) => void
}) {
  const location = useLocation()
  const navigate = useNavigate()

  // Which page the preview's location matches, with its `:params`.
  const current = useMemo(() => {
    for (const pg of pages) {
      const m = matchPath({ path: pg.path, end: true }, location.pathname)
      if (m) return { page: pg, params: m.params as Record<string, string | undefined> }
    }
    return null
  }, [pages, location.pathname])

  // The last params seen per page, so the page select can reopen a page at
  // the values it was last shown with.
  const paramsByPage = useRef(new Map<string, Record<string, string | undefined>>())
  useEffect(() => {
    if (current) paramsByPage.current.set(current.page.id, current.params)
  }, [current])

  const goTo = (pg: PreviewPage) =>
    navigate(fillPath(pg.path, paramsByPage.current.get(pg.id) ?? {}))
  const setParam = (key: string, value: string) => {
    if (!current) return
    navigate(fillPath(current.page.path, { ...current.params, [key]: value }), { replace: true })
  }

  // The current page's raw code-tab export (pre-placeholder-rewrite): the dev
  // tools' Config tab, and the source of the design-only navigation lookup.
  const grid = current?.page.grid ?? null
  const configJson = useMemo(
    () => (grid ? gridConfigToJson(grid.containerSettings, grid.items, endpoints, pages) : '[]'),
    [grid, endpoints, pages],
  )
  useEffect(() => onConfigJson(configJson), [configJson, onConfigJson])
  const navigation = useMemo(
    () => collectPreviewNavigation(JSON.parse(configJson)),
    [configJson],
  )
  const itemsById = useMemo(() => indexItems(grid?.items ?? []), [grid])

  const [overlays, setOverlays] = useState<OpenOverlay[]>([])
  const currentPageId = current?.page.id
  useEffect(() => setOverlays([]), [currentPageId])

  // Design-only navigation (link / toast / dialog): a capture-phase click on
  // any engine button whose label carries one. The engine's own handler —
  // including a `Navigate` action — still runs after.
  const onCaptureClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null
      const button = target?.closest?.('button')
      if (!button) return
      const label = (button.textContent ?? '').trim()
      const nav = navigation.get(label)
      if (!nav) return
      if (nav.kind === 'link') {
        if (nav.href) window.open(nav.href, nav.newTab ? '_blank' : '_self', 'noopener')
      } else if (nav.kind === 'toast' || nav.kind === 'dialog') {
        if (!nav.targetItemId || !itemsById.has(nav.targetItemId)) return
        setOverlays((prev) =>
          prev.some((o) => o.itemId === nav.targetItemId)
            ? prev
            : [...prev, { itemId: nav.targetItemId, openedAt: Date.now() }],
        )
      }
    },
    [navigation, itemsById],
  )

  // Auto-dismiss overlays whose duration has elapsed.
  useEffect(() => {
    if (overlays.length === 0) return
    const timers = overlays.flatMap((o) => {
      const item = itemsById.get(o.itemId)
      const duration = Number((item?.config as { duration?: number } | undefined)?.duration ?? 0)
      if (!duration) return []
      const remaining = Math.max(0, o.openedAt + duration * 1000 - Date.now())
      return [
        setTimeout(
          () => setOverlays((prev) => prev.filter((x) => x.itemId !== o.itemId)),
          remaining,
        ),
      ]
    })
    return () => timers.forEach(clearTimeout)
  }, [overlays, itemsById])

  const dismiss = (itemId: string) =>
    setOverlays((prev) => prev.filter((o) => o.itemId !== itemId))

  // Overlay stacks by corner, plus the topmost dimming dialog's backdrop.
  const stacks = new Map<string, GridItemData[]>()
  let scrim: { color: string; opacity: number; itemId: string; closes: boolean } | null = null
  for (const o of overlays) {
    const item = itemsById.get(o.itemId)
    if (!item?.config) continue
    const c = item.config as ToastConfig | DialogConfig
    const key = `${c.posX}|${c.posY}`
    stacks.set(key, [...(stacks.get(key) ?? []), item])
    if (item.type === 'dialog' && (c as DialogConfig).backdrop === 'Dim the page') {
      const d = c as DialogConfig
      scrim = {
        color: d.backdropColor || '#14161a',
        opacity: Math.max(0, Math.min(90, Number(d.backdropOpacity) || 20)) / 100,
        itemId: item.id,
        closes: d.backdropClose,
      }
    }
  }

  const paramKeys = current ? pathParams(current.page.path) : []

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel px-2 py-1.5">
        <IconButton label="Back" className="btn-icon-sm h-6!" onClick={() => navigate(-1)}>
          <Undo2 size={13} aria-hidden="true" />
        </IconButton>
        <IconButton
          label="Back to the page you were editing"
          className="btn-icon-sm h-6!"
          disabled={current?.page.id === livePage.id}
          onClick={() => goTo(livePage)}
        >
          <ArrowLeft size={13} aria-hidden="true" />
        </IconButton>
        <FileText size={13} aria-hidden="true" className="text-ink-3" />
        <span className="font-mono text-ui-xs text-ink-3">
          {projectSlug}
          <b className="font-semibold text-ink">{location.pathname}</b>
          {location.search && <span className="text-ink-3">{location.search}</span>}
        </span>
        {paramKeys.map((key) => {
          const raw = current?.params[key] ?? ''
          const shown = raw === `:${key}` ? '' : raw
          return (
            <div key={key} className="w-32">
              <Input
                aria-label={`Value of :${key}`}
                value={shown}
                onChange={(e) => setParam(key, e.target.value)}
                placeholder={`:${key}`}
                className="h-6! font-mono text-ui-xs"
              />
            </div>
          )
        })}
        <span className="flex-1" />
        <div className="w-52">
          <Select
            aria-label="Preview page"
            options={[
              ...(current ? [] : [{ value: '', label: '— no page matches —' }]),
              ...pages.map((p) => ({ value: p.id, label: p.name })),
            ]}
            value={current?.page.id ?? ''}
            onChange={(id) => {
              const pg = pages.find((p) => p.id === id)
              if (pg) goTo(pg)
            }}
          />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-md border border-line" style={frameTheme} onClickCapture={onCaptureClick}>
        <PreviewErrorBoundary key={current?.page.id ?? 'none'}>
          {/* The exported app's chrome: AppShell around PageRouter, exactly as
              HANDOFF.md wires it. Its height is bounded to the modal. */}
          <AppShell
            pages={enginePages}
            menu={engineMenu}
            {...engineShell}
            sidebarWidth="13rem"
            height="calc(85vh - 11rem)"
          >
            <div className="p-4">
              <PageRouter
                http={http}
                model={model}
                api={api}
                pages={enginePages}
                notFound={NOT_FOUND}
                documentTitle={false}
              />
            </div>
          </AppShell>
        </PreviewErrorBoundary>

        {scrim && (
          <div
            aria-hidden={!scrim.closes}
            role={scrim.closes ? 'button' : undefined}
            onClick={scrim.closes ? () => dismiss(scrim!.itemId) : undefined}
            className="absolute inset-0 z-[20] rounded-md"
            style={{ background: scrim.color, opacity: scrim.opacity }}
          />
        )}
        {[...stacks.entries()].map(([key, list]) => {
          const [x, y] = key.split('|') as [OverlayAxis, OverlayAxis]
          return (
            <div
              key={key}
              className="absolute z-[24] flex w-[min(340px,72%)] flex-col gap-2.5"
              style={overlayPosition(x, y)}
            >
              {list.map((item) =>
                item.type === 'dialog' ? (
                  <DialogPreview
                    key={item.id}
                    config={item.config as DialogConfig}
                    onDismiss={() => dismiss(item.id)}
                  />
                ) : (
                  <ToastPreview
                    key={item.id}
                    config={item.config as ToastConfig}
                    onDismiss={() => dismiss(item.id)}
                  />
                ),
              )}
            </div>
          )
        })}
      </div>
    </>
  )
})
