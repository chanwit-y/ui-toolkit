import { ApiCode } from './ApiCode'
import { useSelectedEndpoint } from './apiStore'
import { EndpointForm } from './EndpointForm'
import { EndpointList } from './EndpointList'

/**
 * The API page — a visual editor for the engine's `api` config (`TApiMaster`).
 * Three panes: the endpoint list (left), the selected endpoint's form (center),
 * and the live code export (right). State lives in `apiStore`; model dropdowns
 * read the Model page's store, and the dependency stays one-directional
 * (api → model — the Model page knows nothing about endpoints).
 */
export function ApiEditor() {
  const selected = useSelectedEndpoint()

  return (
    <div className="flex min-h-0 flex-1 bg-zinc-50">
      <EndpointList />

      <div className="flex min-h-0 flex-1 flex-col bg-white">
        {selected ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {/* Keyed by endpoint id so transient UI state resets when you
                switch endpoints. (Rename via double-click in the sidebar.) */}
            <EndpointForm key={selected.id} endpoint={selected} />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
            Add an endpoint to get started.
          </div>
        )}
      </div>

      <ApiCode />
    </div>
  )
}
