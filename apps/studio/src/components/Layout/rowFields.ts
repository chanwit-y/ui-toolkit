import type { EndpointDef } from '../Api/types'
import type { ModelDef, ModelField } from '../Model/types'
import type { PickableField } from '../common'
import type { SelectFieldConfig } from './types'

/** Kinds a title / id / search / subtitle field may have (the engine prints them). */
export const TEXT_KINDS = ['string', 'number', 'integer', 'boolean', 'any'] as const
/** `itemAvatar` reads a URL string or a `{ src, alt, fallback }` object. */
export const IMAGE_KINDS = ['string', 'any', 'object'] as const

export type RowFields =
  | { fields: PickableField[]; reason?: undefined }
  /** Unresolvable — the pickers fall back to free text and show `reason`. */
  | { fields: null; reason: string }

function kindOf(value: unknown): string {
  if (value === null || value === undefined) return 'any'
  if (Array.isArray(value)) return 'array'
  const t = typeof value
  return t === 'string' || t === 'number' || t === 'boolean' || t === 'object' ? t : 'any'
}

/**
 * The fields of one option row, for the select family's field pickers. Top-level
 * only: the engine reads `item[key]`, so a nested `address.city` could never work.
 *
 * - `static`: the union of keys across the option records (a key like `avatar`
 *   may exist on only some rows); a key seen with two kinds is `any`.
 * - `source`: the endpoint's response model walked along `dataSource.paths`
 *   (objects on the way, an array of objects at the end — its children are the row).
 */
export function rowFieldsFor(
  config: SelectFieldConfig,
  endpoints: EndpointDef[],
  models: ModelDef[],
): RowFields {
  if (config.mode === 'static') {
    const kinds = new Map<string, string>()
    for (const option of config.options) {
      for (const [key, value] of Object.entries(option)) {
        const kind = kindOf(value)
        const seen = kinds.get(key)
        kinds.set(key, seen === undefined || seen === kind ? kind : 'any')
      }
    }
    if (kinds.size === 0) return { fields: null, reason: 'Add an option record to pick from its keys.' }
    return { fields: [...kinds].map(([name, kind]) => ({ name, kind })) }
  }

  const { endpointId, paths } = config.dataSource
  const row = rowModelFields(endpointId, paths, endpoints, models)
  if (row.fields === null) return row
  return { fields: row.fields.map((f) => ({ name: f.name, kind: f.kind })) }
}

/**
 * Where a data table's server pagination keys go: the authored placement, or
 * — on `'auto'` — the engine's inference off the endpoint declaration (a body
 * model ⇒ body, else query). Unknown endpoint ⇒ query, like a GET.
 */
export function paginationPlacement(
  endpoint: EndpointDef | undefined,
  placement: 'auto' | 'query' | 'body',
): 'query' | 'body' {
  if (placement !== 'auto') return placement
  return endpoint?.body != null ? 'body' : 'query'
}

/**
 * The top-level fields of the model an endpoint declares for one request
 * segment (or its response), for the pagination key pickers — the engine
 * writes `offset`/`limit` straight onto that object and reads `total` off
 * the response, so nesting is never in play.
 */
export function segmentFields(
  endpoint: EndpointDef | undefined,
  segment: 'query' | 'body' | 'response',
  models: ModelDef[],
): RowFields {
  if (!endpoint) return { fields: null, reason: 'Pick the data endpoint to choose from its model fields.' }
  const modelId = endpoint[segment]
  const model = modelId == null ? undefined : models.find((m) => m.id === modelId)
  if (!model) {
    const what = segment === 'response' ? 'response' : `${segment} model`
    return { fields: null, reason: `The endpoint declares no ${what} — type the key names.` }
  }
  return { fields: model.fields.map((f) => ({ name: f.name, kind: f.kind })) }
}

/** The model fields of one row, or why they can't be resolved. */
export type RowModel = { fields: ModelField[]; reason?: undefined } | { fields: null; reason: string }

/**
 * The fields of one row of an endpoint's response: the response `ModelDef`
 * walked along the dot path `paths` (objects on the way, an array of objects
 * at the end — its children are the row). Full `ModelField`s, so a caller can
 * keep walking into nested objects / arrays (the repeater does).
 */
export function rowModelFields(
  endpointId: string | null,
  paths: string,
  endpoints: EndpointDef[],
  models: ModelDef[],
): RowModel {
  if (endpointId == null) return { fields: null, reason: 'Pick a source endpoint to choose from its response fields.' }
  const endpoint = endpoints.find((e) => e.id === endpointId)
  if (!endpoint) return { fields: null, reason: 'The source endpoint is missing.' }
  const model = endpoint.response == null ? undefined : models.find((m) => m.id === endpoint.response)
  if (!model) return { fields: null, reason: 'The endpoint has no response model — type the field names.' }

  const segments = paths.split('.').map((s) => s.trim()).filter(Boolean)
  if (segments.length === 0) {
    return { fields: null, reason: 'Set the response row path to the array of rows (e.g. data).' }
  }
  let level: ModelField[] = model.fields
  for (const [index, segment] of segments.entries()) {
    const field = level.find((f) => f.name === segment)
    if (!field) return { fields: null, reason: `“${segment}” is not in the ${model.name} model.` }
    const isLast = index === segments.length - 1
    const isRows = field.kind === 'array' && field.arrayOf === 'object'
    if (isLast ? !isRows : field.kind !== 'object') {
      return { fields: null, reason: `The row path doesn't reach an array of objects in ${model.name}.` }
    }
    level = field.children
  }
  return { fields: level }
}
