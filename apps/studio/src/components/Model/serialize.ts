import type { ModelDef, ModelField } from './types'

/**
 * Lowers the editor tree onto the engine's runtime shapes (the `TModel` /
 * `TModelObject` / `TModelArray` union from `packages/ui/src/model/converter.ts`)
 * and prints them two ways for the code pane: a paste-ready `model.ts` literal
 * and raw JSON. We don't import the engine's `TModel` type here — studio only
 * needs the *serialized* value, and the shapes are mirrored exactly.
 */

type TModelValue =
  | string
  | { type: 'object'; collection: Record<string, TModelValue> }
  | { type: 'array'; collection: string | Record<string, TModelValue> }

type TModel = Record<string, TModelValue>
type TModelMaster = Record<string, TModel>

function serializeFields(fields: ModelField[]): TModel {
  const out: TModel = {}
  for (const f of fields) {
    const name = f.name.trim()
    if (!name) continue // skip unnamed fields rather than emit an empty key
    out[name] = serializeField(f)
  }
  return out
}

function serializeField(f: ModelField): TModelValue {
  if (f.kind === 'object') {
    return { type: 'object', collection: serializeFields(f.children) }
  }
  if (f.kind === 'array') {
    return {
      type: 'array',
      collection:
        f.arrayOf === 'object' ? serializeFields(f.children) : f.arrayOf,
    }
  }
  return f.kind // a primitive
}

/** Build the full `TModelMaster` object from the editor's models. */
export function serializeModels(models: ModelDef[]): TModelMaster {
  const master: TModelMaster = {}
  for (const m of models) {
    const name = m.name.trim()
    if (!name) continue
    master[name] = serializeFields(m.fields)
  }
  return master
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/** A key is emitted bare when it's a valid JS identifier, else quoted. */
function emitKey(key: string): string {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key)
}

/** Pretty-print a serialized value as a TS literal (double quotes, 2-space). */
function emitValue(value: TModelValue, indent: number): string {
  if (typeof value === 'string') return JSON.stringify(value)
  if (value.type === 'array' && typeof value.collection === 'string') {
    const pad = '  '.repeat(indent + 1)
    const close = '  '.repeat(indent)
    return `{\n${pad}type: "array",\n${pad}collection: ${JSON.stringify(value.collection)},\n${close}}`
  }
  // object, or array-of-object: both carry a nested TModel collection.
  const collection = value.collection as Record<string, TModelValue>
  const pad = '  '.repeat(indent + 1)
  const close = '  '.repeat(indent)
  return `{\n${pad}type: ${JSON.stringify(value.type)},\n${pad}collection: ${emitObject(collection, indent + 1)},\n${close}}`
}

/** Pretty-print a TModel object literal. */
function emitObject(model: Record<string, TModelValue>, indent: number): string {
  const keys = Object.keys(model)
  if (keys.length === 0) return '{}'
  const pad = '  '.repeat(indent + 1)
  const close = '  '.repeat(indent)
  const body = keys
    .map((k) => `${pad}${emitKey(k)}: ${emitValue(model[k], indent + 1)},`)
    .join('\n')
  return `{\n${body}\n${close}}`
}

/** The paste-ready `model.ts` source, mirroring the example config's model.ts. */
export function toModelTs(models: ModelDef[]): string {
  const master = serializeModels(models)
  const names = Object.keys(master)
  const body = names
    .map((name) => `  ${emitKey(name)}: ${emitObject(master[name], 1)},`)
    .join('\n')
  const inner = names.length === 0 ? '{}' : `{\n${body}\n}`
  return `import type { TModelMaster } from "@gummy-ui/ui";\n\nexport const model: TModelMaster = ${inner};\n`
}

/** The same value as raw JSON. */
export function toModelJson(models: ModelDef[]): string {
  return JSON.stringify(serializeModels(models), null, 2)
}
