import type { EndpointDef } from '../Api/types'
import { urlParams } from '../Api/warnings'
import type { FormListCrudRef, ItemBinding, NavParamSource } from '../Layout/types'
import type { ModelDef, ModelField } from '../Model/types'

/**
 * A page-level data load (see the grilled page-data design): the engine
 * `PageLoad` as the studio edits it. `id` is stable — bindings, conditions and
 * other loads' `state` sources store it, and export resolves it to the current
 * `key` (the global-state slice name), so the key can be renamed freely.
 * `read` is the same endpoint + `:param` sources + query extras the repeater
 * and form list use; `paths` is the dot path into the response.
 */
export type PageLoadDef = {
  id: string
  key: string
  read: FormListCrudRef
  paths: string
  blocking: boolean
  errorMessage: string
}

/** Load ids carry this prefix, so a `state` source can tell a load ref from a raw slice key. */
export const LOAD_ID_PREFIX = 'load-'
/** Emitted for a ref to a deleted load: no slice will ever carry that name. */
export const MISSING_LOAD = 'MISSING_LOAD'

export function createPageLoad(key: string): PageLoadDef {
  return {
    id: `${LOAD_ID_PREFIX}${crypto.randomUUID()}`,
    key,
    read: { endpointId: null, params: {}, extra: {} },
    paths: 'data',
    blocking: false,
    errorMessage: '',
  }
}

/** A key no other load on the page uses: `data`, `data2`, … */
export function uniqueLoadKey(loads: Pick<PageLoadDef, 'key'>[], base = 'data'): string {
  const taken = new Set(loads.map((l) => l.key))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}${n}`)) n++
  return `${base}${n}`
}

/** Resolves a stored `state` key: a load id → that load's key (`MISSING_LOAD` when deleted), anything else as is. */
export type LoadKeyResolver = (key: string) => string

export function makeLoadKeyResolver(loads: Pick<PageLoadDef, 'id' | 'key'>[]): LoadKeyResolver {
  const byId = new Map(loads.map((l) => [l.id, l.key.trim()]))
  return (key) => {
    if (!key.startsWith(LOAD_ID_PREFIX)) return key
    return byId.get(key) || MISSING_LOAD
  }
}

export const identityLoadKey: LoadKeyResolver = (key) => key

/** Load ids a load reads through `state` param / extra sources. */
export function loadReads(load: PageLoadDef): string[] {
  const out = new Set<string>()
  for (const src of [...Object.values(load.read.params), ...Object.values(load.read.extra)]) {
    if (src.type === 'state' && src.key.startsWith(LOAD_ID_PREFIX)) out.add(src.key)
  }
  return [...out]
}

/** Loads that sit on a cycle (they would each wait for the other forever). */
export function loadsOnCycle(loads: PageLoadDef[]): Set<string> {
  const reads = new Map(loads.map((l) => [l.id, loadReads(l)]))
  const bad = new Set<string>()
  const visit = (id: string, stack: string[]) => {
    const at = stack.indexOf(id)
    if (at >= 0) {
      stack.slice(at).forEach((x) => bad.add(x))
      return
    }
    for (const next of reads.get(id) ?? []) if (reads.has(next)) visit(next, [...stack, id])
  }
  for (const l of loads) visit(l.id, [])
  return bad
}

/**
 * What a load's slice holds: the endpoint's response model walked along
 * `paths`. `object` ⇒ `fields` are its fields; `array` of objects ⇒ `fields`
 * are one row's (the slice is the array); `value` ⇒ a primitive / primitive
 * array (bind it whole). `null` fields ⇒ unresolvable, with a `reason`.
 */
export type LoadShape =
  | { shape: 'object' | 'array'; fields: ModelField[]; reason?: undefined }
  | { shape: 'value'; fields: []; reason?: undefined }
  | { shape: null; fields: null; reason: string }

export function loadShape(load: PageLoadDef, endpoints: EndpointDef[], models: ModelDef[]): LoadShape {
  if (load.read.endpointId == null) return { shape: null, fields: null, reason: 'Pick the load’s endpoint.' }
  const endpoint = endpoints.find((e) => e.id === load.read.endpointId)
  if (!endpoint) return { shape: null, fields: null, reason: 'The load’s endpoint is missing.' }
  const model = endpoint.response == null ? undefined : models.find((m) => m.id === endpoint.response)
  if (!model) return { shape: null, fields: null, reason: 'The endpoint has no response model — type the field names.' }
  let level: ModelField[] = model.fields
  let current: ModelField | undefined
  for (const segment of load.paths.split('.').map((s) => s.trim()).filter(Boolean)) {
    if (current && current.kind !== 'object') {
      return { shape: null, fields: null, reason: `The path goes past “${current.name}”, which is not an object.` }
    }
    current = level.find((f) => f.name === segment)
    if (!current) return { shape: null, fields: null, reason: `“${segment}” is not in the ${model.name} model.` }
    level = current.children
  }
  if (!current) return { shape: 'object', fields: model.fields }
  if (current.kind === 'object') return { shape: 'object', fields: current.children }
  if (current.kind === 'array' && current.arrayOf === 'object') return { shape: 'array', fields: current.children }
  return { shape: 'value', fields: [] }
}

/** A binding / source of a state value: which load, which field. */
export type LoadFieldPick = { loadId: string; path: string }

/** The engine `PageLoad` for a studio load: endpoint name, paths, param + query DataValues. */
export function enginePageLoad(
  load: PageLoadDef,
  endpoints: { id: string; name: string; url?: string }[],
  resolveEndpoint: (id: string | null) => string | undefined,
  value: (src: NavParamSource) => Record<string, unknown> | undefined,
): Record<string, unknown> {
  const url = endpoints.find((e) => e.id === load.read.endpointId)?.url
  const keys = url != null ? urlParams(url) : Object.keys(load.read.params)
  const map = (m: Record<string, NavParamSource>, ks: string[]) =>
    Object.fromEntries(
      ks
        .filter((k) => k.trim() !== '' && m[k])
        .map((k) => [k, value(m[k])] as const)
        .filter((e): e is readonly [string, Record<string, unknown>] => e[1] !== undefined),
    )
  const params = map(load.read.params, keys)
  const query = map(load.read.extra, Object.keys(load.read.extra))
  const paths = load.paths.split('.').map((s) => s.trim()).filter(Boolean)
  return {
    key: load.key,
    api: {
      name: resolveEndpoint(load.read.endpointId) ?? '',
      ...(paths.length ? { paths } : {}),
      ...(Object.keys(params).length ? { params } : {}),
      ...(Object.keys(query).length ? { query } : {}),
    },
    ...(load.blocking ? { blocking: true } : {}),
    ...(load.errorMessage ? { errorMessage: load.errorMessage } : {}),
  }
}

/** The `{load.path}` token a state binding shows on the canvas. */
export function stateBindingToken(binding: NonNullable<ItemBinding>, loads: Pick<PageLoadDef, 'id' | 'key'>[]): string {
  const key = loads.find((l) => l.id === binding.key)?.key ?? '?'
  return `{${binding.path ? `${key}.${binding.path}` : key}}`
}
