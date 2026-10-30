import type { GridItemData } from '../../components/Layout/types'
import { projectFileKeys } from '../../components/Workspace/runtimeProject'
import type { PageDef, ProjectDef } from '../../components/Workspace/types'
import { ToolError } from '../errors'
import { ITEM_TYPES } from '../itemTypes'
import type { Session } from '../session'

/*
 * What every tool module shares: the tool shape, the input-schema helpers, the
 * deep-merge patch semantics and the compact views the read tools return.
 */

export type JsonSchema = Record<string, unknown>

export type Tool = {
  name: string
  description: string
  inputSchema: JsonSchema
  /** Changes the workspace (takes `dryRun`; the server saves after it). */
  write: boolean
  /** May be async (`test_endpoint` awaits a request). */
  run: (session: Session, input: Record<string, unknown>) => unknown | Promise<unknown>
}

// ------------------------------------------------------------ input schema

export const str = (description: string): JsonSchema => ({ type: 'string', description })
export const num = (description: string): JsonSchema => ({ type: 'number', description })
export const bool = (description: string): JsonSchema => ({ type: 'boolean', description })
export const obj = (description: string): JsonSchema => ({ type: 'object', description })

export const PROJECT = str('Project id, file key (e.g. "book-shop") or exact name.')
export const PAGE = str('Page id, key, name or path.')
export const ITEM = str('Item id, or its unique binding name / modal id / label on the page.')
export const PARENT: JsonSchema = {
  type: 'object',
  description: 'A child canvas: the hosting item and the canvas index (get_page lists them). Absent = the page root.',
  properties: { item: ITEM, canvas: num('Canvas index (0 for single-canvas types).') },
  required: ['item'],
}
export const DRY_RUN = bool('Validate and report what would change without saving.')
export const CONFIRM = bool('Must be true to delete; without it the tool answers what would be removed.')

export function input(properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema {
  return { type: 'object', properties, required, additionalProperties: false }
}

export function writeInput(properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema {
  return input({ ...properties, dryRun: DRY_RUN }, required)
}

// ------------------------------------------------------------- patches

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Objects merge key by key; arrays, scalars and `null` replace; `undefined` leaves the value. */
export function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined) return base
  if (!isPlainObject(patch) || !isPlainObject(base)) return patch as T
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    out[k] = deepMerge(out[k], v)
  }
  return out as T
}

export function optionalObject(value: unknown, path: string): Record<string, unknown> | undefined {
  if (value === undefined) return undefined
  if (!isPlainObject(value)) throw new ToolError('must be an object', path)
  return value
}

// --------------------------------------------------------------- views

export function projectKeyOf(session: Session, project: ProjectDef): string {
  const keys = projectFileKeys(session.ws.projects)
  return keys[session.ws.projects.findIndex((p) => p.id === project.id)]
}

function bindingName(item: GridItemData): string | undefined {
  const c = item.config as { name?: unknown; id?: unknown } | undefined
  const name = typeof c?.name === 'string' && c.name ? c.name : undefined
  const id = (item.type === 'modal' || item.type === 'drawer') && typeof c?.id === 'string' ? c.id : undefined
  return name ?? id
}

export type ItemView = {
  id: string
  type: string
  label: string
  name?: string
  /** Has a Show when / Enabled when / value formula (get_item prints them). */
  condition?: true
  enabledWhen?: true
  valueFormula?: true
  canvases?: { canvas: number; label: string; items: ItemView[] }[]
}

/** The item tree as `get_page` shows it: ids, types, names and labelled canvases. */
export function itemView(item: GridItemData): ItemView {
  const labels = ITEM_TYPES[item.type]?.canvases(item) ?? []
  return {
    id: item.id,
    type: item.type,
    label: item.label,
    ...(bindingName(item) ? { name: bindingName(item) } : {}),
    ...(item.condition ? { condition: true as const } : {}),
    ...(item.enabledWhen ? { enabledWhen: true as const } : {}),
    ...(item.valueFormula ? { valueFormula: true as const } : {}),
    ...(item.childCanvases?.length
      ? {
          canvases: item.childCanvases.map((c, i) => ({
            canvas: i,
            label: labels[i] ?? `canvas ${i}`,
            items: c.items.map(itemView),
          })),
        }
      : {}),
  }
}

export function pageSummary(page: PageDef) {
  let count = 0
  const walk = (items: GridItemData[]) => {
    for (const i of items) {
      count++
      i.childCanvases?.forEach((c) => walk(c.items))
    }
  }
  walk(page.grid.items)
  return {
    id: page.id,
    key: page.key,
    name: page.name,
    path: page.path,
    ...(page.parentId ? { parentId: page.parentId } : {}),
    items: count,
    loads: (page.loads ?? []).map((l) => l.key),
  }
}
