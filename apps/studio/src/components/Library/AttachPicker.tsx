import { Modal } from '@gummy-ui/ui'
import { useMemo, useState } from 'react'
import { useApiStore } from '../Api/apiStore'
import { MODEL_REF_KEYS } from '../Api/types'
import { Button } from '../common'
import { useModelStore } from '../Model/modelStore'
import { useActiveEndpointIds, useWorkspaceStore } from '../Workspace/workspaceStore'
import { useGroupStore } from './groupStore'

/**
 * "Add endpoints from the library" — the mockup's picker: every library
 * endpoint grouped, already-attached ones checked and disabled, one Add
 * button for the rest. Attaches to the active project.
 */
export function AttachPicker({ onClose }: { onClose: () => void }) {
  const endpoints = useApiStore((s) => s.endpoints)
  const models = useModelStore((s) => s.models)
  const groups = useGroupStore((s) => s.groups)
  const attached = useActiveEndpointIds()
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId)
  const attachEndpoints = useWorkspaceStore((s) => s.attachEndpoints)
  const [picked, setPicked] = useState<Set<string>>(() => new Set())

  const attachedSet = useMemo(() => new Set(attached), [attached])
  const modelName = (id: string | null) => models.find((m) => m.id === id)?.name
  const buckets = [
    ...groups.map((g) => ({ id: g.id as string | null, name: g.name })),
    { id: null, name: 'Ungrouped' },
  ]

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Modal
      id="studio-attach-picker"
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Add endpoints from the library"
      description="Groups keep the library tidy — a project can mix endpoints from as many groups as it needs."
      width="620px"
      maxHeight="80vh"
    >
      <div className="max-h-[52vh] overflow-y-auto pt-1 text-ink">
        {buckets.map((bucket) => {
          const items = endpoints.filter((e) => (e.groupId ?? null) === bucket.id)
          if (items.length === 0) return null
          return (
            <div key={bucket.id ?? 'none'} className="mb-2">
              <span className="sec-label block py-2">{bucket.name}</span>
              {items.map((e) => {
                const already = attachedSet.has(e.id)
                const refs = MODEL_REF_KEYS.map((k) => modelName(e[k])).filter(Boolean)
                return (
                  <label
                    key={e.id}
                    className="mb-1.5 flex cursor-pointer items-start gap-2.5 rounded-md border border-line px-2.5 py-2 hover:border-line-strong hover:bg-panel"
                  >
                    <input
                      type="checkbox"
                      checked={already || picked.has(e.id)}
                      disabled={already}
                      onChange={() => toggle(e.id)}
                      className="mt-0.5 h-3.5 w-3.5 accent-accent"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <b className="font-mono text-ui font-semibold">{e.name || '(unnamed)'}</b>
                        <span className="tag">{e.method}</span>
                        {already && <span className="tag">in project</span>}
                      </span>
                      {e.description && (
                        <span className="mt-0.5 block text-ui text-ink-2">{e.description}</span>
                      )}
                      <span className="mt-0.5 block font-mono text-ui-sm text-ink-3">
                        {e.url || '(no url)'} · models: {refs.length ? refs.join(', ') : 'none'}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          )
        })}
        {endpoints.length === 0 && (
          <p className="py-8 text-center text-ui text-ink-3">
            The library is empty. Create an endpoint on the portal's APIs page first.
          </p>
        )}
      </div>
      <div className="mt-3 flex justify-end gap-2 border-t border-line pt-3">
        <Button type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={picked.size === 0 || !activeProjectId}
          onClick={() => {
            if (activeProjectId) attachEndpoints(activeProjectId, [...picked])
            onClose()
          }}
        >
          Add {picked.size || ''} endpoint{picked.size === 1 ? '' : 's'}
        </Button>
      </div>
    </Modal>
  )
}
