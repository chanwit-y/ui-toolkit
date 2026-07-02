import { AlertTriangle, Copy, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../common'
import { playEnter, playExitThenRemove } from '../Model/animation'
import { useModelStore } from '../Model/modelStore'
import { useApiStore } from './apiStore'
import type { EndpointDef } from './types'
import { endpointWarnings } from './warnings'

type EndpointListItemProps = {
  endpoint: EndpointDef
  selected: boolean
  hasWarnings: boolean
  onSelect: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

/** One endpoint row — same interactions as the model list (click selects,
 * double-click renames inline), plus a duplicate action and a method tag. A
 * warning triangle marks endpoints with authoring issues (dangling refs, …). */
function EndpointListItem({
  endpoint,
  selected,
  hasWarnings,
  onSelect,
  onDuplicate,
  onDelete,
}: EndpointListItemProps) {
  const rootRef = useRef<HTMLLIElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const renameEndpoint = useApiStore((s) => s.renameEndpoint)

  const [editing, setEditing] = useState(false)
  // Name as it was when edit began, so Esc can revert the live edits.
  const snapshotName = useRef('')

  // Fade + slide the row in on mount (new endpoint added / duplicated).
  useEffect(() => {
    playEnter(rootRef.current)
  }, [])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const beginEdit = () => {
    snapshotName.current = endpoint.name
    setEditing(true)
  }
  const commit = () => setEditing(false)
  const cancel = () => {
    renameEndpoint(endpoint.id, snapshotName.current)
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
    playExitThenRemove(rootRef.current, () => onDelete(endpoint.id))
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
            value={endpoint.name}
            onChange={(e) => renameEndpoint(endpoint.id, e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commit}
            placeholder="endpointName"
            aria-label="Endpoint name"
            className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-1.5 py-0.5 font-mono text-sm text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
        ) : (
          <button
            type="button"
            onClick={() => onSelect(endpoint.id)}
            onDoubleClick={beginEdit}
            title="Double-click to rename"
            className={cn(
              'flex min-w-0 flex-1 items-center gap-1.5 text-left font-mono text-sm',
              selected ? 'text-teal-800' : 'text-zinc-700',
            )}
          >
            <span className="min-w-0 truncate">
              {endpoint.name || <span className="italic text-zinc-400">unnamed</span>}
            </span>
            {hasWarnings && (
              <AlertTriangle
                size={12}
                aria-label="Endpoint has warnings"
                className="shrink-0 text-amber-500"
              />
            )}
          </button>
        )}
        {!editing && (
          // Fixed-size slot: the method tag and the hover actions cross-fade in
          // place (the actions overlay absolutely), so hovering never changes
          // the row's height or the name's available width.
          <span className="relative flex h-6 w-14 shrink-0 items-center justify-end">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 transition-opacity group-hover:opacity-0">
              {endpoint.method}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onDuplicate(endpoint.id)}
                title="Duplicate endpoint"
                aria-label={`Duplicate ${endpoint.name}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:text-teal-700"
              >
                <Copy size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                title="Delete endpoint"
                aria-label={`Delete ${endpoint.name}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 transition-colors hover:text-red-600"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </span>
          </span>
        )}
      </div>
    </li>
  )
}

/** Left pane: the named endpoints in the master — select / add / duplicate / delete. */
export function EndpointList() {
  const endpoints = useApiStore((s) => s.endpoints)
  const selectedEndpointId = useApiStore((s) => s.selectedEndpointId)
  const selectEndpoint = useApiStore((s) => s.selectEndpoint)
  const addEndpoint = useApiStore((s) => s.addEndpoint)
  const duplicateEndpoint = useApiStore((s) => s.duplicateEndpoint)
  const deleteEndpoint = useApiStore((s) => s.deleteEndpoint)
  const models = useModelStore((s) => s.models)

  const warningIds = useMemo(() => {
    const ids = new Set<string>()
    for (const e of endpoints) {
      if (endpointWarnings(e, endpoints, models).length > 0) ids.add(e.id)
    }
    return ids
  }, [endpoints, models])

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">Endpoints</h2>
        <button
          type="button"
          onClick={addEndpoint}
          title="Add endpoint"
          aria-label="Add endpoint"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-teal-600 bg-teal-600 text-white transition-colors hover:bg-teal-700"
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {endpoints.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-zinc-400">
            No endpoints. Use + to add one.
          </p>
        ) : (
          <ul className="space-y-1">
            {endpoints.map((e) => (
              <EndpointListItem
                key={e.id}
                endpoint={e}
                selected={e.id === selectedEndpointId}
                hasWarnings={warningIds.has(e.id)}
                onSelect={selectEndpoint}
                onDuplicate={duplicateEndpoint}
                onDelete={deleteEndpoint}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
