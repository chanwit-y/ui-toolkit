import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../common'
import { playEnter, playExitThenRemove } from './animation'
import { useModelStore } from './modelStore'
import type { ModelDef } from './types'

type ModelListItemProps = {
  model: ModelDef
  selected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

/** One model row — eases in on mount, collapses out before deletion. Single
 * click selects; double click renames inline (Enter/blur commits, Esc reverts).
 * The selection highlight animates via `transition-colors`. */
function ModelListItem({ model, selected, onSelect, onDelete }: ModelListItemProps) {
  const rootRef = useRef<HTMLLIElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const renameModel = useModelStore((s) => s.renameModel)

  const [editing, setEditing] = useState(false)
  // Name as it was when edit began, so Esc can revert the live edits.
  const snapshotName = useRef('')

  // Fade + slide the row in on mount (new model added).
  useEffect(() => {
    playEnter(rootRef.current)
  }, [])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const beginEdit = () => {
    snapshotName.current = model.name
    setEditing(true)
  }
  const commit = () => setEditing(false)
  const cancel = () => {
    renameModel(model.id, snapshotName.current)
    setEditing(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  const handleDelete = () => {
    playExitThenRemove(rootRef.current, () => onDelete(model.id))
  }

  return (
    <li ref={rootRef}>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md border px-2 py-1.5 transition-colors',
          selected ? 'border-teal-500 bg-teal-50' : 'border-transparent hover:bg-zinc-50',
        )}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={model.name}
            onChange={(e) => renameModel(model.id, e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commit}
            placeholder="modelName"
            aria-label="Model name"
            className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-1.5 py-0.5 font-mono text-sm text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
        ) : (
          <button
            type="button"
            onClick={() => onSelect(model.id)}
            onDoubleClick={beginEdit}
            title="Double-click to rename"
            className={cn(
              'min-w-0 flex-1 truncate text-left font-mono text-sm',
              selected ? 'text-teal-800' : 'text-zinc-700',
            )}
          >
            {model.name || <span className="italic text-zinc-400">unnamed</span>}
          </button>
        )}
        {!editing && (
          <button
            type="button"
            onClick={handleDelete}
            title="Delete model"
            aria-label={`Delete ${model.name}`}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  )
}

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
              <ModelListItem
                key={m.id}
                model={m}
                selected={m.id === selectedModelId}
                onSelect={selectModel}
                onDelete={deleteModel}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
