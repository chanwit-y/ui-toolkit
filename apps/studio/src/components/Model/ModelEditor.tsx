import { Input } from '../common'
import { FieldTree } from './FieldTree'
import { ModelCode } from './ModelCode'
import { ModelList } from './ModelList'
import { useModelStore, useSelectedModel } from './modelStore'

/**
 * The Model page — a visual editor for the engine's `model` config
 * (`TModelMaster`). Three panes: the model list (left), the selected model's
 * recursive field tree (center), and the live code export (right). State lives
 * in `modelStore`; nothing here touches the grid/container builder.
 */
export function ModelEditor() {
  const selected = useSelectedModel()
  const renameModel = useModelStore((s) => s.renameModel)

  return (
    <div className="flex min-h-0 flex-1 bg-zinc-50">
      <ModelList />

      <div className="flex min-h-0 flex-1 flex-col">
        {selected ? (
          <>
            <div className="shrink-0 border-b border-zinc-200 bg-white px-6 py-3">
              <label className="block text-xs font-medium text-zinc-500">
                Model name
              </label>
              <Input
                value={selected.name}
                onChange={(e) => renameModel(selected.id, e.target.value)}
                placeholder="modelName"
                className="mt-1 max-w-sm font-mono"
                aria-label="Model name"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <FieldTree modelId={selected.id} fields={selected.fields} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
            Add a model to get started.
          </div>
        )}
      </div>

      <ModelCode />
    </div>
  )
}
