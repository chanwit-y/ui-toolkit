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


/** The same value as raw JSON. */
export function toModelJson(models: ModelDef[]): string {
  return JSON.stringify(serializeModels(models), null, 2)
}
