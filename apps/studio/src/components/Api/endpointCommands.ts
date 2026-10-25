import type { EndpointDef } from './types'

/*
 * The endpoint editing rules, pure (see the grilled design `mcp-server`):
 * `apiStore` applies them to the live library and `gummy mcp` to a stored one.
 */

/** Mirror gridStore's id strategy. */
export function createId(): string {
  return crypto.randomUUID()
}

export function createEndpoint(name: string, groupId: string | null = null): EndpointDef {
  return {
    id: createId(),
    groupId,
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
export function nextEndpointName(endpoints: EndpointDef[]): string {
  let n = endpoints.length + 1
  const taken = new Set(endpoints.map((e) => e.name))
  while (taken.has(`endpoint${n}`)) n++
  return `endpoint${n}`
}

/** Unique "<base>N" for a clone (updateCountry → updateCountry2). */
export function nextCopyName(endpoints: EndpointDef[], base: string): string {
  const taken = new Set(endpoints.map((e) => e.name))
  let n = 2
  while (taken.has(`${base}${n}`)) n++
  return `${base}${n}`
}

/** Apply `fn` to the endpoint with `id`, leaving the rest untouched. */
export function patchEndpoint(
  endpoints: EndpointDef[],
  id: string,
  fn: (e: EndpointDef) => EndpointDef,
): EndpointDef[] {
  return endpoints.map((e) => (e.id === id ? fn(e) : e))
}


/** `patch` applied to an endpoint: `withOptions` only exists for GET, so it resets when the method moves away. */
export function withEndpointPatch(e: EndpointDef, patch: Partial<Omit<EndpointDef, 'id'>>): EndpointDef {
  const next: EndpointDef = { ...e, ...patch }
  if (next.method !== 'GET') next.withOptions = false
  return next
}
