import { Plus, Trash2 } from 'lucide-react'
import { Input, Select } from '../common'
import type { SegmentedOption } from '../common'
import { fieldHasChildren, useModelStore } from './modelStore'
import { PRIMITIVES, type ArrayOf, type FieldKind, type ModelField } from './types'

const KIND_OPTIONS: SegmentedOption[] = [
  ...PRIMITIVES.map((p) => ({ value: p, label: p })),
  { value: 'object', label: 'object' },
  { value: 'array', label: 'array' },
]

// `array of` can be any primitive or an object (nested fields), but not another
// array — the engine's TModelArray.collection is `TModel | string`, so a
// nested array is expressed as `array of object` with an array field inside.
const ARRAY_OF_OPTIONS: SegmentedOption[] = [
  ...PRIMITIVES.map((p) => ({ value: p, label: p })),
  { value: 'object', label: 'object' },
]

type FieldRowProps = {
  modelId: string
  field: ModelField
  depth: number
}

function FieldRow({ modelId, field, depth }: FieldRowProps) {
  const renameField = useModelStore((s) => s.renameField)
  const setFieldKind = useModelStore((s) => s.setFieldKind)
  const setFieldArrayOf = useModelStore((s) => s.setFieldArrayOf)
  const deleteField = useModelStore((s) => s.deleteField)
  const addField = useModelStore((s) => s.addField)

  const hasChildren = fieldHasChildren(field.kind, field.arrayOf)
  const isArray = field.kind === 'array'

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 py-1">
        <div className="min-w-[7rem] flex-1">
          <Input
            value={field.name}
            onChange={(e) => renameField(modelId, field.id, e.target.value)}
            placeholder="fieldName"
            className="font-mono"
            aria-label="Field name"
          />
        </div>
        <Select
          options={KIND_OPTIONS}
          value={field.kind}
          onChange={(v) => setFieldKind(modelId, field.id, v as FieldKind)}
          className="w-28 shrink-0"
          aria-label="Field type"
        />
        {isArray && (
          <Select
            options={ARRAY_OF_OPTIONS}
            value={field.arrayOf}
            onChange={(v) => setFieldArrayOf(modelId, field.id, v as ArrayOf)}
            className="w-28 shrink-0"
            aria-label="Array element type"
          />
        )}
        {hasChildren && (
          <button
            type="button"
            onClick={() => addField(modelId, field.id)}
            title="Add nested field"
            aria-label="Add nested field"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-teal-700"
          >
            <Plus size={15} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => deleteField(modelId, field.id)}
          title="Delete field"
          aria-label="Delete field"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>

      {hasChildren && (
        <div className="ml-3 border-l border-zinc-200 pl-3">
          {field.children.length === 0 ? (
            <p className="py-1 text-xs text-zinc-400">
              No nested fields yet — use + to add one.
            </p>
          ) : (
            field.children.map((child) => (
              <FieldRow
                key={child.id}
                modelId={modelId}
                field={child}
                depth={depth + 1}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

type FieldTreeProps = {
  modelId: string
  fields: ModelField[]
}

export function FieldTree({ modelId, fields }: FieldTreeProps) {
  const addField = useModelStore((s) => s.addField)

  return (
    <div>
      {fields.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">
          This model has no fields yet.
        </p>
      ) : (
        fields.map((f) => (
          <FieldRow key={f.id} modelId={modelId} field={f} depth={0} />
        ))
      )}
      <button
        type="button"
        onClick={() => addField(modelId, null)}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-teal-600 bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
      >
        <Plus size={15} aria-hidden="true" />
        Add field
      </button>
    </div>
  )
}
