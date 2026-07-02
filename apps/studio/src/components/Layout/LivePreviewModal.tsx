import {
  ApiFactory,
  ApiMaster,
  ContainerBuilder,
  HttpClientFactory,
} from '@gummy-ui/ui'
import { X } from 'lucide-react'
import { Component, useEffect, useMemo, type ReactNode } from 'react'
import { IconButton } from '../common'
import { useGridStore } from './gridStore'
import { buildLivePreviewContainer } from './livePreview'

/**
 * Renders the canvas's *exported JSON config* through the real declarative
 * engine — a round-trip test of the code-tab output (see `livePreview.ts`).
 * The engine needs an `ApiMaster`, but every API-dependent bin is rewritten to
 * a placeholder before rendering, so a stub built from empty model/api configs
 * is never actually called.
 *
 * Mount fresh on every open (`{open && <LivePreviewModal/>}` in the toolbar) so
 * form state resets. Not portaled: the overlay must stay inside ThemeProvider's
 * DOM subtree — the engine's Radix-based fields read the accent CSS vars from
 * the `.radix-themes` ancestor, which a body portal would escape. `fixed`
 * positioning covers the viewport from here regardless.
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const preview = useMemo(() => {
    const container = buildLivePreviewContainer(containerSettings, items)
    const http = new HttpClientFactory('', async () => '', '1.0.0', 30000)
    const apis = new ApiMaster({}, {}, new ApiFactory(http, {}))
    // draw(true, false) mirrors Core.run(): isRoot gives the preview its own
    // engine context (form, query client, observe table) isolated from the
    // canvas's cell previews; withAuth stays off.
    return new ContainerBuilder([container], apis).draw(true, false)
  }, [containerSettings, items])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Live preview"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex h-[85vh] w-[min(90vw,72rem)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-800">Live preview</h2>
            <p className="text-xs text-zinc-500">
              Rendered by the engine from the exported JSON config
            </p>
          </div>
          <IconButton
            label="Close live preview"
            className="h-8! w-8! border-0 bg-transparent shadow-none"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </IconButton>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <PreviewErrorBoundary>{preview}</PreviewErrorBoundary>
        </div>
      </div>
    </div>
  )
}
