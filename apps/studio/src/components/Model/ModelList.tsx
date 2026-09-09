import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApiStore } from '../Api/apiStore'
import { MODEL_REF_KEYS } from '../Api/types'
import { cn, ConfirmDialog } from '../common'
import {
  inGroupSelection,
  useLibraryScope,
  useLibraryUiStore,
  useScopedModels,
} from '../Library'
import { playEnter, playExitThenRemove } from './animation'
import { useModelStore } from './modelStore'
import type { ModelDef } from './types'

type ModelListItemProps = {
  model: ModelDef
  selected: boolean
  canDelete: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

/** One model row — eases in on mount, collapses out before deletion. Single
 * click selects; double click renames inline (Enter/blur commits, Esc reverts). */
function ModelListItem({ model, selected, canDelete, onSelect, onDelete }: ModelListItemProps) {
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
        aria-current={selected || undefined}
        className={cn('list-row group', editing && 'bg-transparent hover:bg-transparent')}
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
            className="field h-6 min-w-0 flex-1 font-mono text-ui-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => onSelect(model.id)}
            onDoubleClick={beginEdit}
            title="Double-click to rename"
            className="min-w-0 flex-1 truncate py-1 text-left font-mono text-ui-sm"
          >
            {model.name || <span className="italic text-ink-3">unnamed</span>}
          </button>
        )}
        {!editing && (
          <span className="font-mono text-ui-xs text-ink-3 group-hover:hidden">
            {model.fields.length}
          </span>
        )}
        {!editing && canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            title="Delete model"
            aria-label={`Delete ${model.name}`}
            className="hidden h-5 w-5 shrink-0 items-center justify-center rounded text-ink-3 transition-colors hover:text-danger group-hover:inline-flex"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  )
}

/**
 * Left pane: the models in scope — inside a project, the ones its attached
 * endpoints reference (nothing to add or delete here: models are created in
 * the library or referenced from an endpoint); on the library page, every
 * model in the selected group, with + (filed into that group) and delete
 * (after a confirm listing the endpoints that reference it).
 */
export function ModelList() {
  const scope = useLibraryScope()
  const scoped = useScopedModels()
  const selectedModelId = useModelStore((s) => s.selectedModelId)
  const selectModel = useModelStore((s) => s.selectModel)
  const addModel = useModelStore((s) => s.addModel)
  const deleteModel = useModelStore((s) => s.deleteModel)
  const endpoints = useApiStore((s) => s.endpoints)
  const groupSel = useLibraryUiStore((s) => s.groupSel)
  const query = useLibraryUiStore((s) => s.query)
  const [pendingDelete, setPendingDelete] = useState<ModelDef | null>(null)

  const models = useMemo(() => {
    if (scope !== 'library') return scoped
    const q = query.trim().toLowerCase()
    return scoped.filter(
      (m) => inGroupSelection(groupSel, m.groupId) && (!q || m.name.toLowerCase().includes(q)),
    )
  }, [scope, scoped, groupSel, query])

  const referencing = (id: string) =>
    endpoints.filter((e) => MODEL_REF_KEYS.some((k) => e[k] === id)).map((e) => e.name || '(unnamed)')

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex h-[37px] shrink-0 items-center justify-between gap-2 border-b border-line px-3">
        <h2 className="sec-label">
          {scope === 'project' ? 'Models in use' : 'Models'}
          <span className="ml-1.5 font-mono normal-case tracking-normal">{models.length}</span>
        </h2>
        {scope === 'library' && (
          <button
            type="button"
            onClick={() => addModel(groupSel !== 'all' && groupSel !== 'none' ? groupSel : null)}
            title="Add model"
            aria-label="Add model"
            className="btn btn-icon-sm btn-primary"
          >
            <Plus size={13} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {models.length === 0 ? (
          <p className="px-2 py-6 text-center text-ui text-ink-3">
            {scope === 'project'
              ? 'Attach an endpoint first — its models land here.'
              : query
                ? 'No model matches that search.'
                : 'No model in this group yet. Use + to add one.'}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {models.map((m) => (
              <ModelListItem
                key={m.id}
                model={m}
                selected={m.id === selectedModelId}
                canDelete={scope === 'library'}
                onSelect={selectModel}
                onDelete={(id) => setPendingDelete(models.find((x) => x.id === id) ?? null)}
              />
            ))}
          </ul>
        )}
        {scope === 'project' && models.length > 0 && (
          <p className="px-2 pt-3 text-ui-xs text-ink-3">
            Derived from the attached endpoints. Create models on the library page.
          </p>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title={`Delete “${pendingDelete.name || 'unnamed'}” from the library?`}
          body={
            referencing(pendingDelete.id).length ? (
              <>
                {referencing(pendingDelete.id).join(', ')} reference{referencing(pendingDelete.id).length === 1 ? 's' : ''}{' '}
                this model — those references will show a warning until repointed.
              </>
            ) : (
              'No endpoint references this model. There is no undo.'
            )
          }
          confirmLabel="Delete model"
          onConfirm={() => {
            deleteModel(pendingDelete.id)
            setPendingDelete(null)
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </aside>
  )
}
