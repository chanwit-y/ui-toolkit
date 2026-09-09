import { AlertTriangle, Copy, Library, Plus, Trash2, Unlink } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, cn, ConfirmDialog } from '../common'
import {
  AttachPicker,
  inGroupSelection,
  useLibraryScope,
  useLibraryUiStore,
  useProjectsUsingEndpoint,
  useScopedEndpoints,
} from '../Library'
import { playEnter, playExitThenRemove } from '../Model/animation'
import { useModelStore } from '../Model/modelStore'
import { useWorkspaceStore } from '../Workspace/workspaceStore'
import { useApiStore } from './apiStore'
import type { EndpointDef } from './types'
import { endpointWarnings } from './warnings'

type EndpointListItemProps = {
  endpoint: EndpointDef
  selected: boolean
  hasWarnings: boolean
  onSelect: (id: string) => void
  onDuplicate: (id: string) => void
  /** Library scope: delete from the library. Project scope: detach. */
  onRemove: (id: string) => void
  removeLabel: string
  RemoveIcon: typeof Trash2
}

/** One endpoint row — click selects, double-click renames inline, plus a
 * duplicate action and the scope's remove action (delete vs detach). A
 * warning triangle marks endpoints with authoring issues (dangling refs, …). */
function EndpointListItem({
  endpoint,
  selected,
  hasWarnings,
  onSelect,
  onDuplicate,
  onRemove,
  removeLabel,
  RemoveIcon,
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

  const handleRemove = () => {
    playExitThenRemove(rootRef.current, () => onRemove(endpoint.id))
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
            value={endpoint.name}
            onChange={(e) => renameEndpoint(endpoint.id, e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commit}
            placeholder="endpointName"
            aria-label="Endpoint name"
            className="field h-6 min-w-0 flex-1 font-mono text-ui-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => onSelect(endpoint.id)}
            onDoubleClick={beginEdit}
            title="Double-click to rename"
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left font-mono text-ui-sm"
          >
            <span className="min-w-0 truncate">
              {endpoint.name || <span className="italic text-ink-3">unnamed</span>}
            </span>
            {hasWarnings && (
              <AlertTriangle
                size={12}
                aria-label="Endpoint has warnings"
                className="shrink-0 text-warn"
              />
            )}
          </button>
        )}
        {!editing && (
          // Fixed-size slot: the method tag and the hover actions cross-fade in
          // place (the actions overlay absolutely), so hovering never changes
          // the row's height or the name's available width.
          <span className="relative flex h-6 w-14 shrink-0 items-center justify-end">
            <span className="tag transition-opacity group-hover:opacity-0">{endpoint.method}</span>
            <span className="absolute inset-y-0 right-0 flex items-center opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onDuplicate(endpoint.id)}
                title="Duplicate endpoint"
                aria-label={`Duplicate ${endpoint.name}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded text-ink-3 transition-colors hover:text-ink"
              >
                <Copy size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                title={removeLabel}
                aria-label={`${removeLabel} ${endpoint.name}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded text-ink-3 transition-colors hover:text-danger"
              >
                <RemoveIcon size={14} aria-hidden="true" />
              </button>
            </span>
          </span>
        )}
      </div>
    </li>
  )
}

/** The library delete confirm, listing the projects that still use the endpoint. */
function DeleteEndpointDialog({
  endpoint,
  onConfirm,
  onClose,
}: {
  endpoint: EndpointDef
  onConfirm: () => void
  onClose: () => void
}) {
  const users = useProjectsUsingEndpoint(endpoint.id)
  return (
    <ConfirmDialog
      title={`Delete “${endpoint.name || 'unnamed'}” from the library?`}
      body={
        users.length ? (
          <>
            It is attached to {users.length} project{users.length === 1 ? '' : 's'} (
            {users.join(', ')}). They lose the endpoint, and any component bound to it will
            show a warning until rebound.
          </>
        ) : (
          'No project uses this endpoint. There is no undo.'
        )
      }
      confirmLabel="Delete endpoint"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}

/**
 * Left pane: the endpoints in scope — inside a project, the attached ones
 * (+ creates in the library and attaches; Add from library opens the picker;
 * the row action detaches); on the library page, every endpoint in the
 * selected group (+ files into that group; the row action deletes, after a
 * confirm that lists the projects using it).
 */
export function EndpointList() {
  const scope = useLibraryScope()
  const scoped = useScopedEndpoints()
  const allEndpoints = useApiStore((s) => s.endpoints)
  const selectedEndpointId = useApiStore((s) => s.selectedEndpointId)
  const selectEndpoint = useApiStore((s) => s.selectEndpoint)
  const addEndpoint = useApiStore((s) => s.addEndpoint)
  const duplicateEndpoint = useApiStore((s) => s.duplicateEndpoint)
  const deleteEndpoint = useApiStore((s) => s.deleteEndpoint)
  const models = useModelStore((s) => s.models)
  const groupSel = useLibraryUiStore((s) => s.groupSel)
  const query = useLibraryUiStore((s) => s.query)
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId)
  const attachEndpoints = useWorkspaceStore((s) => s.attachEndpoints)
  const detachEndpoint = useWorkspaceStore((s) => s.detachEndpoint)
  const detachEverywhere = useWorkspaceStore((s) => s.detachEverywhere)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<EndpointDef | null>(null)

  const endpoints = useMemo(() => {
    if (scope !== 'library') return scoped
    const q = query.trim().toLowerCase()
    return scoped.filter(
      (e) =>
        inGroupSelection(groupSel, e.groupId) &&
        (!q || e.name.toLowerCase().includes(q) || e.url.toLowerCase().includes(q)),
    )
  }, [scope, scoped, groupSel, query])

  const warningIds = useMemo(() => {
    const ids = new Set<string>()
    for (const e of endpoints) {
      if (endpointWarnings(e, allEndpoints, models).length > 0) ids.add(e.id)
    }
    return ids
  }, [endpoints, allEndpoints, models])

  const attachIfProject = (id: string | null) => {
    if (id && scope === 'project' && activeProjectId) attachEndpoints(activeProjectId, [id])
  }
  const handleAdd = () => {
    const groupId = scope === 'library' && groupSel !== 'all' && groupSel !== 'none' ? groupSel : null
    attachIfProject(addEndpoint(groupId))
  }
  const handleDuplicate = (id: string) => attachIfProject(duplicateEndpoint(id))
  const handleRemove = (id: string) => {
    if (scope === 'project') {
      if (activeProjectId) detachEndpoint(activeProjectId, id)
      return
    }
    const target = allEndpoints.find((e) => e.id === id)
    if (target) setPendingDelete(target)
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex h-[37px] shrink-0 items-center justify-between gap-2 border-b border-line px-3">
        <h2 className="sec-label">
          {scope === 'project' ? 'In project' : 'Endpoints'}
          <span className="ml-1.5 font-mono normal-case tracking-normal">{endpoints.length}</span>
        </h2>
        <div className="flex items-center gap-1">
          {scope === 'project' && (
            <Button size="sm" onClick={() => setPickerOpen(true)} title="Add endpoints from the library">
              <Library size={12} aria-hidden="true" />
              Library
            </Button>
          )}
          <button
            type="button"
            onClick={handleAdd}
            title={scope === 'project' ? 'New endpoint (created in the library and attached)' : 'New endpoint'}
            aria-label="Add endpoint"
            className="btn btn-icon-sm btn-primary"
          >
            <Plus size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {endpoints.length === 0 ? (
          <p className="px-2 py-6 text-center text-ui text-ink-3">
            {scope === 'project'
              ? 'No endpoint attached. Add one from the library, or use + to create one.'
              : query
                ? 'No endpoint matches that search.'
                : 'No endpoint in this group yet. Use + to create one.'}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {endpoints.map((e) => (
              <EndpointListItem
                key={e.id}
                endpoint={e}
                selected={e.id === selectedEndpointId}
                hasWarnings={warningIds.has(e.id)}
                onSelect={selectEndpoint}
                onDuplicate={handleDuplicate}
                onRemove={handleRemove}
                removeLabel={scope === 'project' ? 'Remove from project' : 'Delete endpoint'}
                RemoveIcon={scope === 'project' ? Unlink : Trash2}
              />
            ))}
          </ul>
        )}
      </div>

      {pickerOpen && <AttachPicker onClose={() => setPickerOpen(false)} />}
      {pendingDelete && (
        <DeleteEndpointDialog
          endpoint={pendingDelete}
          onConfirm={() => {
            detachEverywhere(pendingDelete.id)
            deleteEndpoint(pendingDelete.id)
            setPendingDelete(null)
          }}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </aside>
  )
}
