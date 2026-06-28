import { Plus, Trash2 } from 'lucide-react'
import { cn } from '../common'
import { useModelStore } from './modelStore'

/** Left pane: the named models in the master — select / add / delete. */
export function ModelList() {
  const models = useModelStore((s) => s.models)
  const selectedModelId = useModelStore((s) => s.selectedModelId)
  const selectModel = useModelStore((s) => s.selectModel)
  const addModel = useModelStore((s) => s.addModel)
  const deleteModel = useModelStore((s) => s.deleteModel)

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">Models</h2>
        <button
          type="button"
          onClick={addModel}
          title="Add model"
          aria-label="Add model"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-teal-600 bg-teal-600 text-white transition-colors hover:bg-teal-700"
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {models.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-zinc-400">
            No models. Use + to add one.
          </p>
        ) : (
          <ul className="space-y-1">
            {models.map((m) => (
              <li key={m.id}>
                <div
                  className={cn(
                    'group flex items-center gap-1 rounded-md border px-2 py-1.5 transition-colors',
                    m.id === selectedModelId
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-transparent hover:bg-zinc-50',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selectModel(m.id)}
                    className={cn(
                      'min-w-0 flex-1 truncate text-left font-mono text-sm',
                      m.id === selectedModelId
                        ? 'text-teal-800'
                        : 'text-zinc-700',
                    )}
                  >
                    {m.name || <span className="italic text-zinc-400">unnamed</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteModel(m.id)}
                    title="Delete model"
                    aria-label={`Delete ${m.name}`}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
