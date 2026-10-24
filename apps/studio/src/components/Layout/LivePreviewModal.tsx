import {
  CustomComponentPlaceholder,
  GummyApp,
  HttpClientFactory,
  Modal,
  type GummyProject,
  type TActionMaster,
  type TComponentMaster,
  type CustomComponentProps,
} from '@gummy-ui/ui'
import { ArrowLeft, FileText, Maximize2, Minimize2, Undo2 } from 'lucide-react'
import {
  Component,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ContextType,
  type ReactElement,
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
import type { EndpointDef } from '../Api/types'
import { useApiUrl } from '../Env'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import { IconButton, Input, Select } from '../common'
import { designThemeStyle } from '../Theme/designTheme'
import { useThemeStore } from '../Theme/themeStore'
import { emptyProjectSnapshot, pathParams } from '../Workspace/snapshots'
import type { PageDef, PageGrid } from '../Workspace/types'
import { MOCK_USERS, useActivePages, useWorkspaceStore } from '../Workspace/workspaceStore'
import { pickedAuth } from '../Workspace/runtimeProject'
import { authProfileLoad } from '../Workspace/auth'
import { runtimeDocument } from '../Workspace/runtimeProject'
import type { PageLoadDef } from '../Workspace/pageLoads'
import { gridConfigToJson } from './gridConfig'
import { useGridStore } from './gridStore'
import { livePreviewProject, previewWiring } from './livePreview'
import { PreviewDevTools, PreviewDevToolsToggle, type ActionLogEntry, type ApiLogEntry } from './PreviewDevTools'
import { isValidActionName, type CustomActionDef } from '../Workspace/customActions'
import { isValidComponentName, type CustomComponentDef } from '../Workspace/customComponents'

const NO_CUSTOM_ACTIONS: CustomActionDef[] = []
const NO_CUSTOM_COMPONENTS: CustomComponentDef[] = []

/**
 * The preview's stand-in for one declared custom component (see the grilled
 * design): the library placeholder showing the props it was given and the
 * **resolved** `value` / `row` / `loading`, so a binding can be checked
 * before the app code exists.
 */
function StubComponent({ name, props, value, row, loading }: { name: string } & CustomComponentProps) {
  return (
    <CustomComponentPlaceholder
      name={name}
      note={loading ? 'loading…' : 'stub — the app\'s components.tsx renders it for real'}
      details={{ ...props, value, ...(row !== undefined ? { row } : {}) }}
    />
  )
}

/**
 * Renders the project's *runtime document* (`runtimeProject.ts` — the same
 * `GummyProject` the CLI writes) through the library's own `<GummyApp>`, so
 * the preview and the consumer app share one code path. The Env page's
 * `API_URL` is the HttpClientFactory base URL, so bins whose endpoint wiring
 * resolves fetch FOR REAL; the rest are rewritten to placeholders that say
 * what's missing before rendering (`livePreview.ts`, the grilled Env design).
 *
 * Pages (see the grilled page-router design): the whole project renders
 * through the library's `PageRouter` — every page's exported container keyed
 * by its `key` — inside a `MemoryRouter`, so a button's `Navigate` action and
 * a table's row click change pages exactly as they will in the exported app,
 * and the engine's `useParams` reads the real route. The preview opens on
 * the page being edited (drawn from the grid store, unsaved edits included;
 * the others from their snapshots). The page bar shows the route, one input
 * per `:param` (a page opened directly has none filled — type one), a page
 * select, and back.
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
/** The routed pages inside the shell, as HANDOFF wires them. Module-level so GummyApp's props stay stable. */
const renderPages = (pages: ReactElement) => <div className="p-4">{pages}</div>

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
  // The sign-in entry the project picked (shared library) and the studio's
  // mock user, who is signed in without MSAL (see the grilled design).
  const libraryAuth = useWorkspaceStore((s) => s.library.auth)
  const auth = useMemo(() => (project ? pickedAuth(project.snapshot, { auth: libraryAuth }) : null), [project, libraryAuth])
  const userName = useWorkspaceStore((s) => s.user)
  const authMock = useMemo(() => {
    const u = MOCK_USERS.find((m) => m.name === userName) ?? MOCK_USERS[0]
    return { email: u.email, name: u.name }
  }, [userName])
  // App-wide loads: mounted once beside the router (`<GlobalLoads>`), read by
  // every page — plus the sign-in's profile pseudo-load, so bindings to it resolve.
  const globalLoads = useMemo(() => {
    const list = project?.snapshot.globalLoads ?? []
    const profile = authProfileLoad(auth ?? undefined)
    return profile ? [...list, profile] : list
  }, [project?.snapshot.globalLoads, auth])
  // The declared custom actions: `fn:<id>` in a button resolves to `fn:<name>`
  // in its exported config, and the preview mounts a stub per name (below).
  const customActions = project?.snapshot.customActions ?? NO_CUSTOM_ACTIONS
  // The declared custom components: an item's declaration id resolves to the
  // name in its exported config, and the preview mounts a placeholder stub
  // per name (below) that shows the resolved value.
  const customComponents = project?.snapshot.customComponents ?? NO_CUSTOM_COMPONENTS
  // The project's attached endpoints and the models they reference — exactly
  // what its model.ts / api.ts exports contain.
  const models = useProjectModels()
  const endpoints = useProjectEndpoints()
  const apiUrl = useApiUrl()
  const themeConfig = useThemeStore((s) => s.config)
  const frameTheme = useMemo(() => designThemeStyle(themeConfig) ?? {}, [themeConfig])

  // Dev tools (see the grilled design): closed on every open — the modal
  // mounts fresh, and so does this. The request log is captured through the
  // engine client's onLog hook (the seam the API test runner uses); newest
  // first, capped so a polling table can't grow it unbounded.
  const [devOpen, setDevOpen] = useState(false)
  // Full screen: the library Modal fills the viewport and the engine shell
  // grows with it (its height is bounded to the modal either way).
  const [fullscreen, setFullscreen] = useState(false)
  const [apiLog, setApiLog] = useState<ApiLogEntry[]>([])
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([])
  const [configJson, setConfigJson] = useState('[]')
  const logSeq = useRef(0)
  const actionSeq = useRef(0)

  // The preview's `ActionsProvider` registry (see the grilled design): no app
  // code exists here, so every declared action is a stub that logs the call
  // with the context the real function would get, then returns — the chain
  // continues. A name a button uses but nobody declared is left out, so the
  // engine's own warn-and-skip shows, as it would in the app.
  const stubActions = useMemo<TActionMaster>(
    () =>
      Object.fromEntries(
        customActions
          .map((a) => a.name.trim())
          .filter((name) => isValidActionName(name))
          .map((name) => [
            name,
            (ctx: {
              form: { getValues: () => unknown }
              row: unknown
              contextData: unknown
              element: { label: string }
              snackbar: (variant: 'info', message: string) => void
            }) => {
              // Visible feedback too: without the app's code the step has no
              // effect of its own, which would read as a dead button.
              ctx.snackbar('info', `Custom action "${name}" called — stubbed in the preview (the app's actions.ts runs it for real; see dev tools → Actions)`)
              setActionLog((prev) =>
                [
                  {
                    id: ++actionSeq.current,
                    name,
                    button: ctx.element.label,
                    time: new Date().toLocaleTimeString(),
                    context: { form: ctx.form.getValues(), row: ctx.row, contextData: ctx.contextData },
                  },
                  ...prev,
                ].slice(0, 50),
              )
            },
          ]),
      ),
    [customActions],
  )

  // The preview's `ComponentsProvider` registry: no app code exists here, so
  // every declared component is the placeholder with its resolved bindings. A
  // name an item uses but nobody declared is left out, so the engine's own
  // "not registered" placeholder shows, as it would in the app.
  const stubComponents = useMemo<TComponentMaster>(
    () =>
      Object.fromEntries(
        customComponents
          .map((c) => c.name.trim())
          .filter((name) => isValidComponentName(name))
          .map((name) => [name, (p: CustomComponentProps) => <StubComponent name={name} {...p} />]),
      ),
    [customComponents],
  )

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

  // The runtime document — what the CLI writes to gummy/projects/<key>/ (split into page files; inline here) —
  // built from the live pages (the template editor gets an empty snapshot),
  // then its unresolvable bindings swapped for placeholders and its `api`
  // reduced to what the engine can build.
  const doc = useMemo<GummyProject>(() => {
    const snapshot = project?.snapshot ?? emptyProjectSnapshot('Template')
    const raw = runtimeDocument(
      { name: project?.name ?? 'Template', description: project?.description, snapshot: { ...snapshot, pages }, auth },
      endpoints,
      models,
    )
    return livePreviewProject(raw, previewWiring(raw, apiUrl))
  }, [project, pages, endpoints, models, apiUrl, auth])

  const projectSlug = (project?.name ?? 'project').toLowerCase().replace(/\s+/g, '-')


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
      fullscreen={fullscreen}
      headerActions={
        <IconButton
          label={fullscreen ? 'Exit full screen' : 'Full screen'}
          active={fullscreen}
          onClick={() => setFullscreen((v) => !v)}
        >
          {fullscreen ? (
            <Minimize2 size={14} aria-hidden="true" />
          ) : (
            <Maximize2 size={14} aria-hidden="true" />
          )}
        </IconButton>
      }
    >
      <NestedRouterBoundary>
        <MemoryRouter initialEntries={[fillPath(livePage.path, {})]}>
          <PreviewApp
            pages={pages}
            livePage={livePage}
            endpoints={endpoints}
            doc={doc}
            globalLoads={globalLoads}
            http={http}
            frameTheme={frameTheme}
            projectSlug={projectSlug}
            fullscreen={fullscreen}
            customActions={customActions}
            customComponents={customComponents}
            stubActions={stubActions}
            stubComponents={stubComponents}
            onConfigJson={setConfigJson}
            authMock={authMock}
          />
        </MemoryRouter>
      </NestedRouterBoundary>

      {/* Both render through portals above the Radix dialog layer, so they
          stay visible and clickable while engine modals (with full-screen
          backdrops) are open — react-query-devtools style. */}
      {devOpen ? (
        <PreviewDevTools
          log={apiLog}
          actionLog={actionLog}
          configJson={configJson}
          auth={doc.auth ? { profileKey: doc.auth.profile?.stateKey ?? 'me', hasProfile: !!doc.auth.profile } : null}
          onClose={() => setDevOpen(false)}
        />
      ) : (
        <PreviewDevToolsToggle onOpen={() => setDevOpen(true)} />
      )}
    </Modal>
  )
}

/**
 * The routed preview: page bar + the library's `<GummyApp>` over the runtime
 * document. Lives inside the `MemoryRouter` so it can read and drive the
 * preview's own location.
 * Memoized: the modal re-renders on every API log entry (dev tools), and
 * every prop here is stable, so the engine tree must not re-render for that.
 */
const PreviewApp = memo(function PreviewApp({
  pages,
  livePage,
  endpoints,
  doc,
  globalLoads,
  http,
  frameTheme,
  projectSlug,
  fullscreen,
  customActions,
  customComponents,
  stubActions,
  stubComponents,
  onConfigJson,
  authMock,
}: {
  pages: PreviewPage[]
  livePage: PreviewPage
  endpoints: EndpointDef[]
  doc: GummyProject
  globalLoads: PageLoadDef[]
  http: HttpClientFactory
  frameTheme: React.CSSProperties
  projectSlug: string
  fullscreen: boolean
  customActions: CustomActionDef[]
  customComponents: CustomComponentDef[]
  stubActions: TActionMaster
  stubComponents: TComponentMaster
  onConfigJson: (json: string) => void
  /** The studio user as the mock sign-in account (used when the document has `auth`). */
  authMock: { email: string; name: string }
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

  // The current page's raw code-tab export (pre-placeholder-rewrite): the dev tools' Config tab.
  const grid = current?.page.grid ?? null
  const configJson = useMemo(
    () =>
      grid
        ? gridConfigToJson(
            grid.containerSettings,
            grid.items,
            endpoints,
            pages,
            [...(current?.page.loads ?? []), ...globalLoads],
            customActions,
            customComponents,
          )
        : '[]',
    [grid, endpoints, pages, current?.page.loads, globalLoads, customActions, customComponents],
  )
  useEffect(() => onConfigJson(configJson), [configJson, onConfigJson])
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

      <div className="relative overflow-hidden rounded-md border border-line" style={frameTheme}>
        <PreviewErrorBoundary key={current?.page.id ?? 'none'}>
          {/* The library's own runtime entry, exactly as HANDOFF.md wires it: the
              stub registries where the app passes its real ones, the shell's height
              bounded to the modal (85vh, or the viewport in full screen) minus the
              modal and page-bar chrome. */}
          <GummyApp
            project={doc}
            http={http}
            actions={stubActions}
            components={stubComponents}
            shell={{ sidebarWidth: '13rem', height: fullscreen ? 'calc(100vh - 11rem)' : 'calc(85vh - 11rem)' }}
            auth={doc.auth ? { mock: authMock } : false}
            notFound={NOT_FOUND}
            documentTitle={false}
            renderPages={renderPages}
          />
        </PreviewErrorBoundary>

      </div>
    </>
  )
})
