import { create } from 'zustand'
import type { ArrayOf, FieldKind, ModelDef, ModelField } from './types'

/** Mirror gridStore's id strategy. */
function createId(): string {
  return crypto.randomUUID()
}

function createField(name: string): ModelField {
  return { id: createId(), name, kind: 'string', children: [], arrayOf: 'string' }
}

function createModel(name: string): ModelDef {
  return { id: createId(), name, fields: [] }
}

/** Recursively map the one field matching `id`, returning a new tree. */
function patchField(
  fields: ModelField[],
  id: string,
  fn: (f: ModelField) => ModelField,
): ModelField[] {
  return fields.map((f) => {
    if (f.id === id) return fn(f)
    if (f.children.length) {
      const children = patchField(f.children, id, fn)
      if (children !== f.children) return { ...f, children }
    }
    return f
  })
}

/** Recursively drop the field matching `id`. */
function removeField(fields: ModelField[], id: string): ModelField[] {
  const next: ModelField[] = []
  let changed = false
  for (const f of fields) {
    if (f.id === id) {
      changed = true
      continue
    }
    if (f.children.length) {
      const children = removeField(f.children, id)
      if (children !== f.children) {
        next.push({ ...f, children })
        changed = true
        continue
      }
    }
    next.push(f)
  }
  return changed ? next : fields
}

/** Recursively append a child under `parentId`. */
function appendChild(
  fields: ModelField[],
  parentId: string,
  child: ModelField,
): ModelField[] {
  return fields.map((f) => {
    if (f.id === parentId) return { ...f, children: [...f.children, child] }
    if (f.children.length) {
      const children = appendChild(f.children, parentId, child)
      if (children !== f.children) return { ...f, children }
    }
    return f
  })
}

/**
 * A field "has children" — and therefore renders a nested subtree — when it is
 * an `object`, or an `array` of `object`. Switching a field away from those
 * shapes drops its accumulated children so the export stays consistent.
 */
export function fieldHasChildren(kind: FieldKind, arrayOf: ArrayOf): boolean {
  return kind === 'object' || (kind === 'array' && arrayOf === 'object')
}

type ModelStore = {
  models: ModelDef[]
  selectedModelId: string | null

  selectModel: (id: string) => void
  addModel: () => void
  deleteModel: (id: string) => void
  renameModel: (id: string, name: string) => void

  /** Add a field to a model root (`parentId` null) or under a parent field. */
  addField: (modelId: string, parentId: string | null) => void
  renameField: (modelId: string, fieldId: string, name: string) => void
  setFieldKind: (modelId: string, fieldId: string, kind: FieldKind) => void
  setFieldArrayOf: (modelId: string, fieldId: string, arrayOf: ArrayOf) => void
  deleteField: (modelId: string, fieldId: string) => void
}

/** Unique "Field N" within a sibling list. */
function nextFieldName(siblings: ModelField[]): string {
  let n = siblings.length + 1
  const taken = new Set(siblings.map((f) => f.name))
  while (taken.has(`field${n}`)) n++
  return `field${n}`
}

/** Unique "modelN" across the master. */
function nextModelName(models: ModelDef[]): string {
  let n = models.length + 1
  const taken = new Set(models.map((m) => m.name))
  while (taken.has(`model${n}`)) n++
  return `model${n}`
}

const firstModel = createModel('model1')

/** Apply `fn` to the model with `id`, leaving the rest untouched. */
function patchModel(
  models: ModelDef[],
  id: string,
  fn: (m: ModelDef) => ModelDef,
): ModelDef[] {
  return models.map((m) => (m.id === id ? fn(m) : m))
}

export const useModelStore = create<ModelStore>((set) => ({
  models: [firstModel],
  selectedModelId: firstModel.id,

  selectModel: (id) => set({ selectedModelId: id }),

  addModel: () =>
    set((s) => {
      const model = createModel(nextModelName(s.models))
      return { models: [...s.models, model], selectedModelId: model.id }
    }),

  deleteModel: (id) =>
    set((s) => {
      const models = s.models.filter((m) => m.id !== id)
      const selectedModelId =
        s.selectedModelId === id ? (models[0]?.id ?? null) : s.selectedModelId
      return { models, selectedModelId }
    }),

  renameModel: (id, name) =>
    set((s) => ({ models: patchModel(s.models, id, (m) => ({ ...m, name })) })),

  addField: (modelId, parentId) =>
    set((s) => ({
      models: patchModel(s.models, modelId, (m) => {
        if (parentId == null) {
          return { ...m, fields: [...m.fields, createField(nextFieldName(m.fields))] }
        }
        // Name uniqueness is scoped to the parent's existing children.
        const parent = findField(m.fields, parentId)
        const child = createField(nextFieldName(parent?.children ?? []))
        return { ...m, fields: appendChild(m.fields, parentId, child) }
      }),
    })),

  renameField: (modelId, fieldId, name) =>
    set((s) => ({
      models: patchModel(s.models, modelId, (m) => ({
        ...m,
        fields: patchField(m.fields, fieldId, (f) => ({ ...f, name })),
      })),
    })),

  setFieldKind: (modelId, fieldId, kind) =>
    set((s) => ({
      models: patchModel(s.models, modelId, (m) => ({
        ...m,
        fields: patchField(m.fields, fieldId, (f) => {
          const next: ModelField = { ...f, kind }
          // Drop now-meaningless children when the field can't hold them.
          if (!fieldHasChildren(kind, f.arrayOf)) next.children = []
          return next
        }),
      })),
    })),

  setFieldArrayOf: (modelId, fieldId, arrayOf) =>
    set((s) => ({
      models: patchModel(s.models, modelId, (m) => ({
        ...m,
        fields: patchField(m.fields, fieldId, (f) => {
          const next: ModelField = { ...f, arrayOf }
          if (!fieldHasChildren(f.kind, arrayOf)) next.children = []
          return next
        }),
      })),
    })),

  deleteField: (modelId, fieldId) =>
    set((s) => ({
      models: patchModel(s.models, modelId, (m) => ({
        ...m,
        fields: removeField(m.fields, fieldId),
      })),
    })),
}))

/** Recursively locate a field by id (read-only helper). */
export function findField(fields: ModelField[], id: string): ModelField | null {
  for (const f of fields) {
    if (f.id === id) return f
    if (f.children.length) {
      const hit = findField(f.children, id)
      if (hit) return hit
    }
  }
  return null
}

/** Selector: the currently selected model, or null. */
export function useSelectedModel(): ModelDef | null {
  return useModelStore(
    (s) => s.models.find((m) => m.id === s.selectedModelId) ?? null,
  )
}
