import { useEffect } from 'react'
import { useLibraryScope, useScopedEndpoints } from '../Library'
import { ApiCode } from './ApiCode'
import { useApiStore } from './apiStore'
import { EndpointForm } from './EndpointForm'
import { EndpointList } from './EndpointList'

/**
 * The API page — a visual editor for the engine's `api` config (`TApiMaster`).
 * Three panes: the endpoint list (left), the selected endpoint's form (center),
 * and the live code export (right). The endpoints are the shared library's
 * (see the grilled Shared library design); inside a project only the attached
 * ones are in scope, on the portal's library page all of them. Model
 * dropdowns read the Model store, and the dependency stays one-directional
 * (api → model).
 */
export function ApiEditor() {
  const scope = useLibraryScope()
  const endpoints = useScopedEndpoints()
  const selectedEndpointId = useApiStore((s) => s.selectedEndpointId)
  const selectEndpoint = useApiStore((s) => s.selectEndpoint)

  // The store's selection is library-wide; keep it inside the scope so
  // switching between a project and the library never shows a foreign item.
  const selected = endpoints.find((e) => e.id === selectedEndpointId) ?? endpoints[0] ?? null
  useEffect(() => {
    if (selected && selected.id !== selectedEndpointId) selectEndpoint(selected.id)
  }, [selected, selectedEndpointId, selectEndpoint])

  return (
    <div className="flex min-h-0 flex-1 bg-surface">
      <EndpointList />

      <div className="flex min-h-0 flex-1 flex-col bg-surface">
        {selected ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {/* Keyed by endpoint id so transient UI state resets when you
                switch endpoints. (Rename via double-click in the sidebar.) */}
            <EndpointForm key={selected.id} endpoint={selected} />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-ui text-ink-3">
            {scope === 'project'
              ? 'Attach an endpoint from the library, or create one, to get started.'
              : 'Add an endpoint to get started.'}
          </div>
        )}
      </div>

      <ApiCode />
    </div>
  )
}
