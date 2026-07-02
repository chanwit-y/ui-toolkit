import { create } from 'zustand'
import type { EndpointDef } from './types'

/** Mirror gridStore's id strategy. */
function createId(): string {
  return crypto.randomUUID()
}

function createEndpoint(name: string): EndpointDef {
  return {
    id: createId(),
    name,
    description: '',
    url: '',
    method: 'GET',
    withOptions: false,
    response: null,
    query: null,
    parameter: null,
    body: null,
  }
}

/** Unique "endpointN" across the master. */
function nextEndpointName(endpoints: EndpointDef[]): string {
  let n = endpoints.length + 1
  const taken = new Set(endpoints.map((e) => e.name))
  while (taken.has(`endpoint${n}`)) n++
  return `endpoint${n}`
}

/** Unique "<base>N" for a clone (updateCountry → updateCountry2). */
function nextCopyName(endpoints: EndpointDef[], base: string): string {
  const taken = new Set(endpoints.map((e) => e.name))
  let n = 2
  while (taken.has(`${base}${n}`)) n++
  return `${base}${n}`
}

type ApiStore = {
  endpoints: EndpointDef[]
  selectedEndpointId: string | null

  selectEndpoint: (id: string) => void
  addEndpoint: () => void
  /** Clone an endpoint (method/url/refs/description) under an auto-suffixed name. */
  duplicateEndpoint: (id: string) => void
  deleteEndpoint: (id: string) => void
  renameEndpoint: (id: string, name: string) => void
  /** Patch any non-identity field of an endpoint (rename goes through renameEndpoint). */
  updateEndpoint: (id: string, patch: Partial<Omit<EndpointDef, 'id' | 'name'>>) => void
}

const firstEndpoint = createEndpoint('endpoint1')

/** Apply `fn` to the endpoint with `id`, leaving the rest untouched. */
function patchEndpoint(
  endpoints: EndpointDef[],
  id: string,
  fn: (e: EndpointDef) => EndpointDef,
): EndpointDef[] {
  return endpoints.map((e) => (e.id === id ? fn(e) : e))
}

export const useApiStore = create<ApiStore>((set) => ({
  endpoints: [firstEndpoint],
  selectedEndpointId: firstEndpoint.id,

  selectEndpoint: (id) => set({ selectedEndpointId: id }),

  addEndpoint: () =>
    set((s) => {
      const endpoint = createEndpoint(nextEndpointName(s.endpoints))
      return { endpoints: [...s.endpoints, endpoint], selectedEndpointId: endpoint.id }
    }),

  duplicateEndpoint: (id) =>
    set((s) => {
      const source = s.endpoints.find((e) => e.id === id)
      if (!source) return s
      const copy: EndpointDef = {
        ...source,
        id: createId(),
        name: nextCopyName(s.endpoints, source.name || 'endpoint'),
      }
      const index = s.endpoints.indexOf(source)
      const endpoints = [
        ...s.endpoints.slice(0, index + 1),
        copy,
        ...s.endpoints.slice(index + 1),
      ]
      return { endpoints, selectedEndpointId: copy.id }
    }),

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
      endpoints: patchEndpoint(s.endpoints, id, (e) => {
        const next: EndpointDef = { ...e, ...patch }
        // withOptions only exists for GET — reset it when the method moves away,
        // the same way modelStore drops children a kind-change made meaningless.
        if (next.method !== 'GET') next.withOptions = false
        return next
      }),
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
