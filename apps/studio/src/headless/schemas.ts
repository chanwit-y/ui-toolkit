import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv'
import generated from './schemas.generated.json'
import { ToolError } from './errors'

/*
 * The generated JSON Schemas of the studio's config types (see
 * `scripts/gen-schemas.ts`): handed to Claude by `describe_item_type` and used
 * to check every config a tool is about to store.
 */

type Schema = Record<string, unknown>
const DEFINITIONS = (generated as { definitions: Record<string, Schema> }).definitions

export function hasSchema(typeName: string): boolean {
  return Object.prototype.hasOwnProperty.call(DEFINITIONS, typeName)
}

/** `typeName`'s schema with only the definitions it reaches — a self-contained document for a client. */
export function schemaFor(typeName: string): Schema {
  if (!hasSchema(typeName)) throw new ToolError(`no schema for ${typeName}`)
  const needed = new Set<string>()
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    for (const [k, v] of Object.entries(node)) {
      if (k === '$ref' && typeof v === 'string' && v.startsWith('#/definitions/')) {
        const name = decodeURIComponent(v.slice('#/definitions/'.length))
        if (!needed.has(name)) {
          needed.add(name)
          visit(DEFINITIONS[name])
        }
      } else visit(v)
    }
  }
  visit(DEFINITIONS[typeName])
  needed.delete(typeName)
  return {
    ...DEFINITIONS[typeName],
    ...(needed.size ? { definitions: Object.fromEntries([...needed].sort().map((n) => [n, DEFINITIONS[n]])) } : {}),
  }
}

const ajv = new Ajv({ allErrors: true, strict: false })
ajv.addSchema({ $id: 'gummy', definitions: DEFINITIONS })
const validators = new Map<string, ValidateFunction>()

function validatorFor(typeName: string): ValidateFunction {
  let v = validators.get(typeName)
  if (!v) {
    v = ajv.compile({ $ref: `gummy#/definitions/${encodeURIComponent(typeName)}` })
    validators.set(typeName, v)
  }
  return v
}

function describe(error: ErrorObject): string {
  const at = error.instancePath ? error.instancePath.slice(1).replace(/\//g, '.') : ''
  const extra =
    error.keyword === 'additionalProperties'
      ? ` (${(error.params as { additionalProperty: string }).additionalProperty})`
      : error.keyword === 'enum'
        ? ` (${(error.params as { allowedValues: unknown[] }).allowedValues.map((x) => JSON.stringify(x)).join(' | ')})`
        : ''
  return `${at || '(root)'} ${error.message ?? 'is invalid'}${extra}`
}

/** Check `value` against `typeName`; throws a `ToolError` listing the first problems, prefixed by `path`. */
export function assertMatches(typeName: string, value: unknown, path: string): void {
  const validate = validatorFor(typeName)
  if (validate(value)) return
  // Union branches each report; keep the distinct, most specific lines.
  const lines = [...new Set((validate.errors ?? []).filter((e) => e.keyword !== 'anyOf' && e.keyword !== 'oneOf').map(describe))]
  throw new ToolError(`does not match ${typeName}: ${lines.slice(0, 8).join('; ')}${lines.length > 8 ? ` (+${lines.length - 8} more)` : ''}`, path)
}
