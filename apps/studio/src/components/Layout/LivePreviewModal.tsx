import {
  ApiFactory,
  ApiMaster,
  ContainerBuilder,
  HttpClientFactory,
  Modal,
  type TApiMaster,
  type TModelMaster,
} from '@gummy-ui/ui'
import { ArrowLeft, FileText } from 'lucide-react'
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { serializeEndpoints } from '../Api/serialize'
import { useApiUrl } from '../Env'
import { serializeModels } from '../Model/serialize'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import { IconButton, Select } from '../common'
import type { PageDef, PageGrid } from '../Workspace/types'
import { useActivePages, useWorkspaceStore } from '../Workspace/workspaceStore'
import { DialogPreview, ToastPreview } from './DesignPreviews'
import type { DialogConfig, OverlayAxis, ToastConfig } from './designTypes'
import { gridConfigToJson } from './gridConfig'
import { useGridStore } from './gridStore'
import { buildLivePreviewContainer, collectPreviewNavigation } from './livePreview'
import { indexItems } from './pageLinks'
import { PreviewDevTools, PreviewDevToolsToggle, type ApiLogEntry } from './PreviewDevTools'
import type { GridItemData } from './types'

/**
 * Renders a page's *exported JSON config* through the real declarative
 * engine — a round-trip test of the code-tab output (see `livePreview.ts`).
 * The engine's `ApiMaster` is built from the Model + API pages' stores with
 * the Env page's `API_URL` as the HttpClientFactory base URL, so bins whose
 * endpoint wiring resolves fetch FOR REAL; the rest are rewritten to
 * placeholders that say what's missing before rendering (see the grilled Env
 * design).
 *
 * Pages (see the grilled design): the preview opens on the live page and a
 * page bar switches between the project's pages; the live page renders from
 * the grid store (unsaved edits included), the others from their snapshots.
 * A button's design-only navigation is played by the studio: a capture-phase
 * click matched by button label switches the page (with its fixed `:params`
 * shown in the bar), opens the link, or shows the mock toast / dialog
 * overlay over the page. Engine actions on the same button still run.
 *
 * The dialog chrome is the library's own `Modal` — the preview dogfoods
 * packages/ui for the shell, not just the content. It portals to body, which
 * is safe: the app-level ThemeProvider reaches it via React context (context
 * crosses portals), and Modal re-provides a `.radix-themes` wrapper inside
 * the portal, so the engine's Radix-based fields still resolve the accent
 * CSS vars. Escape / backdrop close come from Radix.
 *
 * Mount fresh on every open (`{open && <LivePreviewModal/>}` in the toolbar)
 * so form state resets.
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

/** `/countries/:code` + `{code: 'TH'}` → `/countries/TH`. */
function fillPath(path: string, params: Record<string, string>): string {
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

export function LivePreviewModal({ onClose }: { onClose: () => void }) {
  const liveItems = useGridStore((s) => s.items)
  const liveSettings = useGridStore((s) => s.containerSettings)
  const pages = useActivePages()
  const livePageId = useWorkspaceStore((s) => s.activePageId)
  const project = useWorkspaceStore((s) =>
    s.projects.find((p) => p.id === s.activeProjectId),
  )
  // The project's attached endpoints and the models they reference — exactly
  // what its model.ts / api.ts exports contain.
  const models = useProjectModels()
  const endpoints = useProjectEndpoints()
  const apiUrl = useApiUrl()

  // Which page is being previewed, plus the `:params` the navigation
  // supplied. The live page draws from the grid store; others from snapshot.
  const [pageId, setPageId] = useState<string | null>(livePageId)
  const [params, setParams] = useState<Record<string, string>>({})
  const [overlays, setOverlays] = useState<OpenOverlay[]>([])
  const page: PageDef | undefined = pages.find((p) => p.id === pageId) ?? pages[0]
  const grid: PageGrid | null = page
    ? page.id === livePageId
      ? { items: liveItems, containerSettings: liveSettings, fieldSeq: 0 }
      : page.grid
    : liveItems.length
      ? { items: liveItems, containerSettings: liveSettings, fieldSeq: 0 }
      : null

  // Dev tools (see the grilled design): closed on every open — the modal
  // mounts fresh, and so does this. The request log is captured through the
  // engine client's onLog hook (the seam the API test runner uses); newest
  // first, capped so a polling table can't grow it unbounded.
  const [devOpen, setDevOpen] = useState(false)
  const [apiLog, setApiLog] = useState<ApiLogEntry[]>([])
  const logSeq = useRef(0)

  const items = grid?.items ?? []
  const containerSettings = grid?.containerSettings ?? liveSettings

  // The raw code-tab export (pre-placeholder-rewrite) for the Config tab, and
  // the source of the navigation lookup.
  const configJson = useMemo(
    () => gridConfigToJson(containerSettings, items, endpoints),
    [containerSettings, items, endpoints],
  )
  const navigation = useMemo(
    () => collectPreviewNavigation(JSON.parse(configJson)),
    [configJson],
  )
  const itemsById = useMemo(() => indexItems(items), [items])

  const preview = useMemo(() => {
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
    const container = buildLivePreviewContainer(containerSettings, items, endpoints, {
      apiUrl,
      apiNames,
      fetchableNames,
    })
    // onLog fires for successes and API errors alike (it's the only hook that
    // sees the raw axios response) — exactly what the dev-tools API tab wants.
    const http = new HttpClientFactory(
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
    )
    // Only the fetchable entries reach the engine: an endpoint whose response
    // model is missing (a freshly created one, say) would make its schema
    // conversion throw and blank the whole preview, while the bins bound to it
    // are already placeholders.
    const fetchableApi = Object.fromEntries(
      Object.entries(api).filter(([name]) => fetchableNames.has(name)),
    ) as TApiMaster<TModelMaster>
    const apis = new ApiMaster(model, fetchableApi, new ApiFactory(http, model))
    // draw(true, false) mirrors Core.run(): isRoot gives the preview its own
    // engine context (form, query client, observe table) isolated from the
    // canvas's cell previews; withAuth stays off.
    return new ContainerBuilder([container], apis).draw(true, false)
  }, [containerSettings, items, models, endpoints, apiUrl])

  // Design-only navigation: a capture-phase click on any engine button whose
  // label carries a navigation. The engine's own handler still runs after.
  const onCaptureClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null
      const button = target?.closest?.('button')
      if (!button) return
      const label = (button.textContent ?? '').trim()
      const nav = navigation.get(label)
      if (!nav) return
      if (nav.kind === 'page') {
        if (!nav.pageId || !pages.some((p) => p.id === nav.pageId)) return
        setOverlays([])
        setParams(nav.params ?? {})
        setPageId(nav.pageId)
      } else if (nav.kind === 'link') {
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
    [navigation, pages, itemsById],
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

  const projectSlug = (project?.name ?? 'project').toLowerCase().replace(/\s+/g, '-')
  const shownPath = page ? fillPath(page.path, params) : ''

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
      {pages.length > 0 && page && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel px-2 py-1.5">
          <IconButton
            label="Back to the page you were editing"
            className="btn-icon-sm h-6!"
            disabled={page.id === livePageId}
            onClick={() => {
              setOverlays([])
              setParams({})
              setPageId(livePageId)
            }}
          >
            <ArrowLeft size={13} aria-hidden="true" />
          </IconButton>
          <FileText size={13} aria-hidden="true" className="text-ink-3" />
          <span className="font-mono text-ui-xs text-ink-3">
            {projectSlug}
            <b className="font-semibold text-ink">{shownPath}</b>
          </span>
          <span className="flex-1" />
          <div className="w-52">
            <Select
              aria-label="Preview page"
              options={pages.map((p) => ({ value: p.id, label: p.name }))}
              value={page.id}
              onChange={(id) => {
                setOverlays([])
                setParams({})
                setPageId(id)
              }}
            />
          </div>
        </div>
      )}

      <div className="relative" onClickCapture={onCaptureClick}>
        <PreviewErrorBoundary key={page?.id ?? 'live'}>{preview}</PreviewErrorBoundary>

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
