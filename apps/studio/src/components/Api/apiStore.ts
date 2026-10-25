import { create } from 'zustand'
import { countrySeedEndpoints } from '../seed/country'
import { createEndpoint, nextCopyName, nextEndpointName, patchEndpoint, withEndpointPatch } from './endpointCommands'
import type { EndpointDef } from './types'

type ApiStore = {
  endpoints: EndpointDef[]
  selectedEndpointId: string | null

  /** Replace every endpoint (workspace open / switch). */
  hydrate: (endpoints: EndpointDef[]) => void
  selectEndpoint: (id: string) => void
  /** New endpoint, filed under `groupId` (null = Ungrouped). Returns its id. */
  addEndpoint: (groupId?: string | null) => string
  /** Clone an endpoint (method/url/refs/description) under an auto-suffixed name. */
  duplicateEndpoint: (id: string) => string | null
  deleteEndpoint: (id: string) => void
  renameEndpoint: (id: string, name: string) => void
  /** Patch any non-identity field of an endpoint (rename goes through renameEndpoint). */
  updateEndpoint: (id: string, patch: Partial<Omit<EndpointDef, 'id' | 'name'>>) => void
}

// Studio boots with the country mock (see seed/country.ts) — the same
// endpoints the example app's config/country/api.ts defines.
const initialEndpoints = countrySeedEndpoints()

export const useApiStore = create<ApiStore>((set, get) => ({
  endpoints: initialEndpoints,
  selectedEndpointId: initialEndpoints[0]?.id ?? null,

  hydrate: (endpoints) =>
    set({ endpoints, selectedEndpointId: endpoints[0]?.id ?? null }),

  selectEndpoint: (id) => set({ selectedEndpointId: id }),

  addEndpoint: (groupId = null) => {
    const endpoint = createEndpoint(nextEndpointName(get().endpoints), groupId)
    set((s) => ({ endpoints: [...s.endpoints, endpoint], selectedEndpointId: endpoint.id }))
    return endpoint.id
  },

  duplicateEndpoint: (id) => {
    const source = get().endpoints.find((e) => e.id === id)
    if (!source) return null
    const copy: EndpointDef = {
      ...source,
      id: crypto.randomUUID(),
      name: nextCopyName(get().endpoints, source.name || 'endpoint'),
    }
    set((s) => {
      const index = s.endpoints.indexOf(source)
      const endpoints = [
        ...s.endpoints.slice(0, index + 1),
        copy,
        ...s.endpoints.slice(index + 1),
      ]
      return { endpoints, selectedEndpointId: copy.id }
    })
    return copy.id
  },

  deleteEndpoint: (id) =>
    set((s) => {
      const endpoints = s.endpoints.filter((e) => e.id !== id)
      const selectedEndpointId =
        s.selectedEndpointId === id ? (endpoints[0]?.id ?? null) : s.selectedEndpointId
      return { endpoints, selectedEndpointId }
    }),

  renameEndpoint: (id, name) =>
    set((s) => ({ endpoints: patchEndpoint(s.endpoints, id, (e) => ({ ...e, name })) })),

  updateEndpoint: (id, patch) =>
    set((s) => ({
      endpoints: patchEndpoint(s.endpoints, id, (e) => withEndpointPatch(e, patch)),
    })),
}))

/** Selector: the currently selected endpoint, or null. */
export function useSelectedEndpoint(): EndpointDef | null {
  return useApiStore(
    (s) => s.endpoints.find((e) => e.id === s.selectedEndpointId) ?? null,
  )
}

// Dev-only: expose the store for scripted verification (mirrors __gridStore).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __apiStore?: typeof useApiStore }).__apiStore = useApiStore
}
