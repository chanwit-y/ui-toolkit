import type { ModelDef } from '../Model/types'
import type { EndpointDef } from './types'

/**
 * Lowers the editor's endpoints onto the engine's `TApiMaster` shape (see
 * `packages/ui/src/api/APIMaster.ts`) and prints them two ways for the code
 * pane: a paste-ready `api.ts` typed against the sibling `model.ts`, and raw
 * JSON. Model refs are resolved id → current name at this point.
 */

/**
 * Emitted for a ref whose model was deleted (or left unnamed, which the model
 * export skips). The name can't exist in `model`, so the pasted `api.ts` fails
 * `TApiMaster<typeof model>` typechecking instead of silently compiling.
 */
export const MISSING_MODEL = 'MISSING_MODEL'

type TApiEntry = {
  url: string
  description: string
  methods: string
  response: string | undefined
  query?: string
  parameter?: string
  body?: string
  withOptions: boolean
}

type TApiValue = Record<string, TApiEntry>

function resolveRef(
  id: string | null,
  modelById: Map<string, ModelDef>,
): string | undefined {
  if (id == null) return undefined
  const name = modelById.get(id)?.name.trim()
  return name || MISSING_MODEL
}

/** Build the full `TApiMaster` value from the editor's endpoints. */
export function serializeEndpoints(
  endpoints: EndpointDef[],
  models: ModelDef[],
): TApiValue {
  const modelById = new Map(models.map((m) => [m.id, m]))
  const master: TApiValue = {}
  for (const e of endpoints) {
    const name = e.name.trim()
    if (!name) continue // skip unnamed endpoints rather than emit an empty key
    const query = resolveRef(e.query, modelById)
    const parameter = resolveRef(e.parameter, modelById)
    const body = resolveRef(e.body, modelById)
    // Key order mirrors the example config: url, description, methods,
    // response, the optional refs, withOptions.
    master[name] = {
      url: e.url,
      description: e.description,
      methods: e.method,
      response: resolveRef(e.response, modelById),
      ...(query !== undefined && { query }),
      ...(parameter !== undefined && { parameter }),
      ...(body !== undefined && { body }),
      withOptions: e.withOptions,
    }
  }
  return master
}


/** The same value as raw JSON (an unset `response` is dropped by JSON). */
export function toApiJson(endpoints: EndpointDef[], models: ModelDef[]): string {
  return JSON.stringify(serializeEndpoints(endpoints, models), null, 2)
}
