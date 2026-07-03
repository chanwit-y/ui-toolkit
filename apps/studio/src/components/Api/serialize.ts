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

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/** A key is emitted bare when it's a valid JS identifier, else quoted. */
function emitKey(key: string): string {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key)
}

/** Pretty-print one endpoint entry as a TS object literal. */
function emitEntry(entry: TApiEntry, indent: number): string {
  const pad = '  '.repeat(indent + 1)
  const close = '  '.repeat(indent)
  const lines = [
    `url: ${JSON.stringify(entry.url)},`,
    `description: ${JSON.stringify(entry.description)},`,
    `methods: ${JSON.stringify(entry.methods)},`,
    // `response` is a required key of the entry type, so an unset ref is
    // emitted as an explicit `undefined` rather than dropped.
    `response: ${entry.response === undefined ? 'undefined' : JSON.stringify(entry.response)},`,
  ]
  if (entry.query !== undefined) lines.push(`query: ${JSON.stringify(entry.query)},`)
  if (entry.parameter !== undefined) {
    lines.push(`parameter: ${JSON.stringify(entry.parameter)},`)
  }
  if (entry.body !== undefined) lines.push(`body: ${JSON.stringify(entry.body)},`)
  lines.push(`withOptions: ${entry.withOptions},`)
  return `{\n${lines.map((l) => pad + l).join('\n')}\n${close}}`
}

/**
 * The paste-ready `api.ts` source. Typed as `TApiMaster<typeof model>` against
 * the sibling `model.ts` (the `config/<feature>/` convention), so TypeScript
 * verifies every model reference at the paste destination.
 */
export function toApiTs(endpoints: EndpointDef[], models: ModelDef[]): string {
  const master = serializeEndpoints(endpoints, models)
  const names = Object.keys(master)
  const body = names
    .map((name) => `  ${emitKey(name)}: ${emitEntry(master[name], 1)},`)
    .join('\n')
  const inner = names.length === 0 ? '{}' : `{\n${body}\n}`
  return `import type { TApiMaster } from "@gummy-ui/ui";\n\nimport { model } from "./model";\n\nexport const api: TApiMaster<typeof model> = ${inner};\n`
}

/** The same value as raw JSON (an unset `response` is dropped by JSON). */
export function toApiJson(endpoints: EndpointDef[], models: ModelDef[]): string {
  return JSON.stringify(serializeEndpoints(endpoints, models), null, 2)
}
