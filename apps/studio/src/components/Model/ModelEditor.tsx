import { FieldTree } from './FieldTree'
import { ModelCode } from './ModelCode'
import { ModelList } from './ModelList'
import { useSelectedModel } from './modelStore'

/**
 * The Model page — a visual editor for the engine's `model` config
 * (`TModelMaster`). Three panes: the model list (left), the selected model's
 * recursive field tree (center), and the live code export (right). State lives
 * in `modelStore`; nothing here touches the grid/container builder.
 */
export function ModelEditor() {
  const selected = useSelectedModel()

  return (
    <div className="flex min-h-0 flex-1 bg-zinc-50">
      <ModelList />

      <div className="flex min-h-0 flex-1 flex-col bg-white">
        {selected ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {/* Keyed by model id so the single-edit UI state resets when you
                switch models. (Rename the model by double-clicking it in the
                sidebar list.) */}
            <FieldTree
              key={selected.id}
              modelId={selected.id}
              fields={selected.fields}
            />
          </div>
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
