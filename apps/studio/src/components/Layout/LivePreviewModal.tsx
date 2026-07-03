import {
  ApiFactory,
  ApiMaster,
  ContainerBuilder,
  HttpClientFactory,
  Modal,
  type TApiMaster,
  type TModelMaster,
} from '@gummy-ui/ui'
import { Component, useMemo, useRef, useState, type ReactNode } from 'react'
import { serializeEndpoints } from '../Api/serialize'
import { useApiStore } from '../Api/apiStore'
import { useApiUrl } from '../Env'
import { serializeModels } from '../Model/serialize'
import { useModelStore } from '../Model/modelStore'
import { gridConfigToJson } from './gridConfig'
import { useGridStore } from './gridStore'
import { buildLivePreviewContainer } from './livePreview'
import { PreviewDevTools, PreviewDevToolsToggle, type ApiLogEntry } from './PreviewDevTools'

/**
 * Renders the canvas's *exported JSON config* through the real declarative
 * engine — a round-trip test of the code-tab output (see `livePreview.ts`).
 * The engine's `ApiMaster` is built from the Model + API pages' stores with
 * the Env page's `API_URL` as the HttpClientFactory base URL, so bins whose
 * endpoint wiring resolves fetch FOR REAL; the rest are rewritten to
 * placeholders that say what's missing before rendering (see the grilled Env
 * design).
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
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">The engine could not render this config.</p>
          <p className="mt-1 font-mono text-xs">{this.state.error.message}</p>
        </div>
      )
    }
    return this.props.children
  }
}

export function LivePreviewModal({ onClose }: { onClose: () => void }) {
  const items = useGridStore((s) => s.items)
  const containerSettings = useGridStore((s) => s.containerSettings)
  const models = useModelStore((s) => s.models)
  const endpoints = useApiStore((s) => s.endpoints)
  const apiUrl = useApiUrl()

  // Dev tools (see the grilled design): closed on every open — the modal
  // mounts fresh, and so does this. The request log is captured through the
  // engine client's onLog hook (the seam the API test runner uses); newest
  // first, capped so a polling table can't grow it unbounded.
  const [devOpen, setDevOpen] = useState(false)
  const [apiLog, setApiLog] = useState<ApiLogEntry[]>([])
  const logSeq = useRef(0)

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
    const apis = new ApiMaster(model, api, new ApiFactory(http, model))
    // draw(true, false) mirrors Core.run(): isRoot gives the preview its own
    // engine context (form, query client, observe table) isolated from the
    // canvas's cell previews; withAuth stays off.
    return new ContainerBuilder([container], apis).draw(true, false)
  }, [containerSettings, items, models, endpoints, apiUrl])

  // The raw code-tab export (pre-placeholder-rewrite) for the Config tab.
  const configJson = useMemo(
    () => gridConfigToJson(containerSettings, items, endpoints),
    [containerSettings, items, endpoints],
  )

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
      <PreviewErrorBoundary>{preview}</PreviewErrorBoundary>
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
