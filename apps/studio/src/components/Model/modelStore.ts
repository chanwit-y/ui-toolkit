import { create } from 'zustand'
import { countrySeedModels } from '../seed/country'
import { appendChild, createField, createModel, fieldHasChildren, findField, nextFieldName, nextModelName, patchField, patchModel, removeField, replaceFieldNode } from './modelCommands'
import type { ArrayOf, FieldKind, ModelDef, ModelField } from './types'

export { fieldHasChildren, findField } from './modelCommands'

type ModelStore = {
  models: ModelDef[]
  selectedModelId: string | null

  /** Replace every model (workspace open / switch). */
  hydrate: (models: ModelDef[]) => void
  selectModel: (id: string) => void
  /** New model, filed under `groupId` (null = Ungrouped). Returns its id. */
  addModel: (groupId?: string | null) => string
  deleteModel: (id: string) => void
  /** Patch group membership (rename goes through renameModel). */
  setModelGroup: (id: string, groupId: string | null) => void
  renameModel: (id: string, name: string) => void

  /** Add a field to a model root (`parentId` null) or under a parent field. */
  addField: (modelId: string, parentId: string | null) => void
  renameField: (modelId: string, fieldId: string, name: string) => void
  setFieldKind: (modelId: string, fieldId: string, kind: FieldKind) => void
  setFieldArrayOf: (modelId: string, fieldId: string, arrayOf: ArrayOf) => void
  deleteField: (modelId: string, fieldId: string) => void
  /** Swap the whole field node at `fieldId` for `field` — used to revert an
   * in-progress edit on Escape (restores children a kind-change had dropped). */
  replaceField: (modelId: string, fieldId: string, field: ModelField) => void
}

// Studio boots with the country mock (see seed/country.ts) — the same models
// the example app's config/country/model.ts defines.
const initialModels = countrySeedModels()

export const useModelStore = create<ModelStore>((set, get) => ({
  models: initialModels,
  selectedModelId: initialModels[0]?.id ?? null,

  hydrate: (models) => set({ models, selectedModelId: models[0]?.id ?? null }),

  selectModel: (id) => set({ selectedModelId: id }),

  addModel: (groupId = null) => {
    const model = createModel(nextModelName(get().models), groupId)
    set((s) => ({ models: [...s.models, model], selectedModelId: model.id }))
    return model.id
  },

  setModelGroup: (id, groupId) =>
    set((s) => ({ models: patchModel(s.models, id, (m) => ({ ...m, groupId })) })),

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

  replaceField: (modelId, fieldId, field) =>
    set((s) => ({
      models: patchModel(s.models, modelId, (m) => ({
        ...m,
        fields: replaceFieldNode(m.fields, fieldId, field),
      })),
    })),
}))

/** Selector: the currently selected model, or null. */
export function useSelectedModel(): ModelDef | null {
  return useModelStore(
    (s) => s.models.find((m) => m.id === s.selectedModelId) ?? null,
  )
}

// Dev-only: expose the store for scripted verification (mirrors __gridStore).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __modelStore?: typeof useModelStore }).__modelStore = useModelStore
}
