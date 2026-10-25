import type { ChildCanvas, GridItemData } from '../components/Layout/types'
import { ITEM_CONDITION_SOURCE } from '../components/Layout/types'
import { authProfileLoad } from '../components/Workspace/auth'
import { pickedAuth } from '../components/Workspace/runtimeProject'
import type { LibraryData, ProjectDef } from '../components/Workspace/types'
import { ToolError } from './errors'

/*
 * References inside a config patch (see the grilled design `mcp-server`): the
 * studio stores every reference by id — a page, an endpoint, a load, another
 * item, a custom action or component — and resolves ids to names at export.
 * The MCP lets Claude write either the id or the thing's unique name / key;
 * `resolveRefs` turns names into ids before the patch is stored and refuses a
 * name that matches nothing or more than one thing.
 */

type Named = { id: string; names: string[] }

export type RefScope = {
  pages: Named[]
  endpoints: Named[]
  loads: Named[]
  actions: Named[]
  components: Named[]
  /** Items of the page being edited (any canvas): id ↔ binding name / modal id / label. */
  items: Named[]
  /** Endpoint ids a resolved reference pointed at — the caller attaches the library ones the project lacks. */
  usedEndpoints: Set<string>
}

/** Every item of a canvas tree, depth first. */
export function allItems(canvas: ChildCanvas): GridItemData[] {
  const out: GridItemData[] = []
  const walk = (list: GridItemData[]) => {
    for (const item of list) {
      out.push(item)
      item.childCanvases?.forEach((c) => walk(c.items))
    }
  }
  walk(canvas.items)
  return out
}

function itemNames(item: GridItemData): string[] {
  const config = item.config as { name?: unknown; id?: unknown } | undefined
  return [config?.name, config?.id, item.label].filter((n): n is string => typeof n === 'string' && n.trim() !== '')
}

export function refScope(
  project: ProjectDef,
  library: LibraryData,
  pageId: string | null,
): RefScope {
  const snapshot = project.snapshot
  const page = pageId ? snapshot.pages.find((p) => p.id === pageId) : undefined
  const loads: Named[] = [...(page?.loads ?? []), ...(snapshot.globalLoads ?? [])].map((l) => ({ id: l.id, names: [l.key] }))
  // The sign-in's profile fetch is a read-only pseudo-load bindings may read.
  const authLoad = authProfileLoad(pickedAuth(snapshot, library) ?? undefined)
  if (authLoad) loads.push({ id: authLoad.id, names: [authLoad.key] })
  return {
    pages: snapshot.pages.map((p) => ({ id: p.id, names: [p.key, p.name, p.path] })),
    endpoints: library.endpoints.map((e) => ({ id: e.id, names: [e.name] })),
    loads,
    actions: (snapshot.customActions ?? []).map((a) => ({ id: a.id, names: [a.name] })),
    components: (snapshot.customComponents ?? []).map((c) => ({ id: c.id, names: [c.name] })),
    items: page ? allItems({ items: page.grid.items, settings: page.grid.containerSettings }).map((i) => ({ id: i.id, names: itemNames(i) })) : [],
    usedEndpoints: new Set(),
  }
}

/** An id or a unique name among `list` → the id. `''` / null pass through (= unset). */
function resolveOne(list: Named[], value: unknown, what: string, path: string): unknown {
  if (value === null || value === undefined || value === '') return value
  if (typeof value !== 'string') return value
  if (list.some((x) => x.id === value)) return value
  const hits = list.filter((x) => x.names.includes(value))
  if (hits.length === 1) return hits[0].id
  if (hits.length > 1) throw new ToolError(`"${value}" names ${hits.length} ${what}s — pass the id instead (${hits.map((h) => h.id).join(', ')})`, path)
  throw new ToolError(`no ${what} "${value}" (by id or name)`, path)
}

const ENDPOINT_KEYS = new Set(['endpointId', 'deleteEndpointId', 'readEndpointId', 'createEndpointId', 'updateEndpointId'])
const ITEM_KEYS = new Set(['modalItemId', 'observeToItemId', 'itemId'])
const ACTION_LIST_KEYS = new Set(['actions', 'confirmTrue', 'confirmFalse'])

/**
 * A copy of `patch` with every reference resolved to its id. Walks by key
 * name — the studio names its reference fields consistently (`pageId`,
 * `endpointId`, `loadId`, `componentId`, `*ItemId`, a `state` source's `key`,
 * `fn:<name>` in an action chain).
 */
export function resolveRefs(patch: unknown, scope: RefScope, path = 'config'): unknown {
  if (Array.isArray(patch)) return patch.map((v, i) => resolveRefs(v, scope, `${path}[${i}]`))
  if (!patch || typeof patch !== 'object') return patch
  const out: Record<string, unknown> = {}
  const obj = patch as Record<string, unknown>
  // A `state` source (an ItemBinding / NavParamSource / RequestSource) keys a page load.
  const isStateSource = (obj.source === 'state' || obj.type === 'state') && typeof obj.key === 'string'
  for (const [key, value] of Object.entries(obj)) {
    const at = `${path}.${key}`
    if (key === 'pageId') out[key] = resolveOne(scope.pages, value, 'page', at)
    else if (ENDPOINT_KEYS.has(key)) {
      const id = resolveOne(scope.endpoints, value, 'endpoint', at)
      if (typeof id === 'string' && id) scope.usedEndpoints.add(id)
      out[key] = id
    } else if (key === 'loadId') out[key] = value === ITEM_CONDITION_SOURCE ? value : resolveOne(scope.loads, value, 'page load', at)
    else if (key === 'componentId') out[key] = resolveOne(scope.components, value, 'custom component', at)
    else if (ITEM_KEYS.has(key)) out[key] = resolveOne(scope.items, value, 'item on this page', at)
    else if (key === 'reloadTableItemId') {
      // A table / form list / repeater on the page, or a page load.
      try {
        out[key] = resolveOne(scope.items, value, 'item on this page', at)
      } catch {
        out[key] = resolveOne(scope.loads, value, 'table or page load', at)
      }
    } else if (key === 'key' && isStateSource) out[key] = resolveOne(scope.loads, value, 'page load', at)
    else if (ACTION_LIST_KEYS.has(key) && Array.isArray(value))
      out[key] = value.map((a, i) =>
        typeof a === 'string' && a.startsWith('fn:') ? `fn:${resolveOne(scope.actions, a.slice(3), 'custom action', `${at}[${i}]`) as string}` : a,
      )
    else out[key] = resolveRefs(value, scope, at)
  }
  return out
}
