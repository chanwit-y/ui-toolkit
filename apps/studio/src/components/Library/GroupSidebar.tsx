import { Modal } from '@gummy-ui/ui'
import { Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useApiStore } from '../Api/apiStore'
import { Button, cn, ConfirmDialog, Input } from '../common'
import { useModelStore } from '../Model/modelStore'
import { useGroupStore, type GroupDef } from './groupStore'
import { useLibraryUiStore, type GroupSelection } from './libraryUiStore'

/**
 * The library pages' left rail (mockup `.lib-side`): All groups, each group
 * with its model / endpoint counts, Ungrouped when anything is unfiled, and
 * New group. The selected group carries a pencil that opens its dialog.
 */
export function GroupSidebar() {
  const groups = useGroupStore((s) => s.groups)
  const models = useModelStore((s) => s.models)
  const endpoints = useApiStore((s) => s.endpoints)
  const groupSel = useLibraryUiStore((s) => s.groupSel)
  const setGroupSel = useLibraryUiStore((s) => s.setGroupSel)
  const [dialog, setDialog] = useState<{ kind: 'new' } | { kind: 'edit'; group: GroupDef } | null>(
    null,
  )

  const counts = (gid: string | null) => {
    const m = models.filter((x) => (x.groupId ?? null) === gid).length
    const a = endpoints.filter((x) => (x.groupId ?? null) === gid).length
    return `${m} model${m === 1 ? '' : 's'} · ${a} API${a === 1 ? '' : 's'}`
  }
  const ungrouped =
    models.some((m) => !m.groupId) || endpoints.some((e) => !e.groupId)

  return (
    <aside className="flex w-[206px] shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex h-[37px] shrink-0 items-center px-3">
        <span className="sec-label">Groups</span>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1.5 pb-3">
        <GroupRow
          sel="all"
          title="All groups"
          meta={`${models.length} models · ${endpoints.length} APIs`}
          current={groupSel === 'all'}
          onSelect={setGroupSel}
        />
        {groups.map((g) => (
          <GroupRow
            key={g.id}
            sel={g.id}
            title={g.name}
            meta={counts(g.id)}
            current={groupSel === g.id}
            onSelect={setGroupSel}
            onEdit={() => setDialog({ kind: 'edit', group: g })}
          />
        ))}
        {ungrouped && (
          <GroupRow
            sel="none"
            title="Ungrouped"
            meta={counts(null)}
            current={groupSel === 'none'}
            onSelect={setGroupSel}
          />
        )}
        <Button size="sm" className="mt-2 w-full" onClick={() => setDialog({ kind: 'new' })}>
          <Plus size={12} aria-hidden="true" />
          New group
        </Button>
      </div>
      {dialog && (
        <GroupDialog
          group={dialog.kind === 'edit' ? dialog.group : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </aside>
  )
}

function GroupRow({
  sel,
  title,
  meta,
  current,
  onSelect,
  onEdit,
}: {
  sel: GroupSelection
  title: string
  meta: string
  current: boolean
  onSelect: (sel: GroupSelection) => void
  onEdit?: () => void
}) {
  return (
    <div className="group/row relative">
      <button
        type="button"
        aria-current={current || undefined}
        onClick={() => onSelect(sel)}
        className={cn(
          'block w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-panel-2',
          current && 'bg-panel-2 shadow-[inset_2px_0_0_var(--accent)]',
        )}
      >
        <b className="block text-ui font-semibold text-ink">{title}</b>
        <span className="mt-0.5 block font-mono text-ui-xs text-ink-3">{meta}</span>
      </button>
      {onEdit && (
        <button
          type="button"
          aria-label={`Edit group ${title}`}
          title="Edit group"
          onClick={onEdit}
          className={cn(
            'absolute right-1.5 top-1.5 rounded p-1 text-ink-3 transition-opacity hover:text-ink',
            current ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100',
          )}
        >
          <Pencil size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

/** New / edit group: name + description, with delete on an existing group. */
function GroupDialog({ group, onClose }: { group?: GroupDef; onClose: () => void }) {
  const addGroup = useGroupStore((s) => s.addGroup)
  const updateGroup = useGroupStore((s) => s.updateGroup)
  const deleteGroup = useGroupStore((s) => s.deleteGroup)
  const setGroupSel = useLibraryUiStore((s) => s.setGroupSel)
  const memberCount = useApiStore((s) => s.endpoints.filter((e) => e.groupId === group?.id).length)
  const modelCount = useModelStore((s) => s.models.filter((m) => m.groupId === group?.id).length)
  const [name, setName] = useState(group?.name ?? '')
  const [description, setDescription] = useState(group?.description ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (group) updateGroup(group.id, { name: name.trim() || group.name, description })
    else setGroupSel(addGroup({ name, description }))
    onClose()
  }

  if (confirmDelete && group) {
    return (
      <ConfirmDialog
        title={`Delete group “${group.name}”?`}
        body={`Its ${modelCount} model${modelCount === 1 ? '' : 's'} and ${memberCount} endpoint${
          memberCount === 1 ? '' : 's'
        } are not deleted — they become Ungrouped.`}
        confirmLabel="Delete group"
        onConfirm={() => {
          deleteGroup(group.id)
          setGroupSel('all')
          onClose()
        }}
        onClose={() => setConfirmDelete(false)}
      />
    )
  }

  return (
    <Modal
      id={group ? `studio-group-${group.id}` : 'studio-group-new'}
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={group ? 'Group' : 'New group'}
      description="Groups keep the library tidy — a project can mix endpoints from as many groups as it needs."
      width="460px"
    >
      <form onSubmit={submit} className="space-y-3 pt-2 text-ink">
        <label className="block">
          <span className="mb-1 block text-ui-sm font-medium text-ink-2">Name</span>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="People & HR" />
        </label>
        <label className="block">
          <span className="mb-1 block text-ui-sm font-medium text-ink-2">What lives in here</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Employee directory, onboarding and payroll lookups."
            className="field field-area"
          />
        </label>
        <div className="flex gap-2 border-t border-line pt-3">
          {group && (
            <Button type="button" onClick={() => setConfirmDelete(true)} className="text-danger">
              Delete group
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {group ? 'Save' : 'Create group'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
