import type { ChildCanvas, GridItemData } from '../components/Layout/types'
import { ITEM_CONDITION_SOURCE } from '../components/Layout/types'
import { authProfileLoad } from '../components/Workspace/auth'
import { selectionLoads } from '../components/Workspace/selectionLoads'
import { pickedAuth } from '../components/Workspace/runtimeProject'
import type { LibraryData, ProjectDef } from '../components/Workspace/types'
import { inlineFormula, makeLogicNames, parseCondition, parseExpr, type LogicNames } from '../components/Workspace/logic'
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
  /** Saved formulas / rules (logic nodes name them `{ formula }` / `{ rule }` / `formulaId`). */
  formulas: Named[]
  rules: Named[]
  /** What Code-mode text parses against (saved names, load keys). */
  logic: LogicNames
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
  // A data table's selection is page data under its state key (the id is the key).
  if (page) for (const sel of selectionLoads(page.grid.items)) loads.push({ id: sel.id, names: [sel.key] })
  return {
    pages: snapshot.pages.map((p) => ({ id: p.id, names: [p.key, p.name, p.path] })),
    endpoints: library.endpoints.map((e) => ({ id: e.id, names: [e.name] })),
    loads,
    actions: (snapshot.customActions ?? []).map((a) => ({ id: a.id, names: [a.name] })),
    components: (snapshot.customComponents ?? []).map((c) => ({ id: c.id, names: [c.name] })),
    formulas: (snapshot.formulas ?? []).map((f) => ({ id: f.id, names: [f.name] })),
    rules: (snapshot.rules ?? []).map((r) => ({ id: r.id, names: [r.name] })),
    logic: makeLogicNames(snapshot.formulas, snapshot.rules, [
      ...loads.map((l) => ({ id: l.id, key: l.names[0] })),
      // A saved item may read any page's loads.
      ...snapshot.pages.flatMap((p) => p.loads ?? []).map((l) => ({ id: l.id, key: l.key })),
    ]),
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
const ITEM_KEYS = new Set(['modalItemId', 'observeToItemId', 'itemId', 'exportTableItemId'])
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
  // A saved formula / rule in a logic node: `{ formula: "Subtotal" }`, `{ rule: "Is business" }`.
  const keys = Object.keys(obj)
  if (keys.length === 1 && typeof obj.formula === 'string') return { formula: resolveOne(scope.formulas, obj.formula, 'saved formula', `${path}.formula`) }
  if (keys.length === 1 && typeof obj.rule === 'string') return { rule: resolveOne(scope.rules, obj.rule, 'saved rule', `${path}.rule`) }
  // A `state` source (an ItemBinding / NavParamSource / RequestSource, a logic `{ ref: "state" }`) keys a page load.
  const isStateSource = (obj.source === 'state' || obj.type === 'state' || obj.ref === 'state') && typeof obj.key === 'string'
  for (const [key, value] of Object.entries(obj)) {
    const at = `${path}.${key}`
    if (key === 'condition' && typeof value === 'string') out[key] = logicCondition(value, scope, at)
    else if (key === 'expr' && typeof value === 'string') out[key] = logicExpr(value, scope, at)
    else if (key === 'formula' && typeof value === 'string' && obj.source === 'formula') out[key] = logicFormula(value, scope, at)
    else if (key === 'formulaId') out[key] = resolveSavedValue(scope, value, at)
    else if (key === 'pageId') out[key] = resolveOne(scope.pages, value, 'page', at)
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

/** A saved formula or a saved rule (a value slot may show either) → its id. */
function resolveSavedValue(scope: RefScope, value: unknown, at: string): unknown {
  try {
    return resolveOne(scope.formulas, value, 'saved formula', at)
  } catch {
    return resolveOne(scope.rules, value, 'saved formula or rule', at)
  }
}

/** Code-mode text → a condition (names → ids), or a ToolError naming the problem and its column. */
export function logicCondition(text: string, scope: RefScope, at: string): unknown {
  const r = parseCondition(text, scope.logic)
  if (r.value === undefined) throw new ToolError(`${r.error} (at column ${r.at + 1} of ${JSON.stringify(text)})`, at)
  return r.value
}

export function logicExpr(text: string, scope: RefScope, at: string): unknown {
  const r = parseExpr(text, scope.logic)
  if (r.value === undefined) throw new ToolError(`${r.error} (at column ${r.at + 1} of ${JSON.stringify(text)})`, at)
  return r.value
}

/**
 * A formula slot's input → a `StudioFormula`: a saved name (`"((Subtotal))"`
 * or `"Subtotal"` when it names one) → `{ formulaId }`; other text → an inline
 * formula; an object → its references resolved (`expr` may be text).
 */
export function logicFormula(input: unknown, scope: RefScope, at: string): unknown {
  if (typeof input === 'string') {
    const saved = /^\(\((.+)\)\)$/.exec(input.trim())?.[1] ?? input.trim()
    if (scope.formulas.some((f) => f.names.includes(saved)) || scope.rules.some((r) => r.names.includes(saved)))
      return { formulaId: resolveSavedValue(scope, saved, at) }
    return inlineFormula(logicExpr(input, scope, at) as never)
  }
  if (input && typeof input === 'object' && 'expr' in input) return { ...inlineFormula(), ...(resolveRefs(input, scope, at) as object) }
  return resolveRefs(input, scope, at)
}
