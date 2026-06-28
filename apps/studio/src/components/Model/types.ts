/**
 * Editor-side shapes for the Model page. These describe the *editing* tree
 * (stable ids, a single `kind` discriminator); `serialize.ts` lowers them onto
 * the engine's runtime `TModelMaster` shape (see
 * `packages/ui/src/model/converter.ts`) for export.
 */

/** The five primitives `convertValue` accepts in the engine converter. */
export type Primitive = 'string' | 'number' | 'boolean' | 'integer' | 'any'

export const PRIMITIVES: Primitive[] = [
  'string',
  'number',
  'boolean',
  'integer',
  'any',
]

/** A field is a primitive, a nested object, or an array. */
export type FieldKind = Primitive | 'object' | 'array'

/** What an `array` field holds: a primitive, or an object (nested fields). */
export type ArrayOf = Primitive | 'object'

export type ModelField = {
  /** Stable id for React keys + store tree ops; never serialized. */
  id: string
  name: string
  kind: FieldKind
  /** Nested fields — used when `kind === 'object'`, or `array` of object. */
  children: ModelField[]
  /** Element type — only meaningful when `kind === 'array'`. */
  arrayOf: ArrayOf
}

export type ModelDef = {
  id: string
  name: string
  fields: ModelField[]
}

export const PRIMITIVE_SET = new Set<string>(PRIMITIVES)

export function isPrimitive(kind: string): kind is Primitive {
  return PRIMITIVE_SET.has(kind)
}
