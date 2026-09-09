import { useEffect } from 'react'
import { useApiStore } from '../Api/apiStore'
import { useModelStore } from '../Model/modelStore'
import { applyLibrary, collectLibrary, isHydrating } from '../Workspace/snapshots'
import type { ActivityKind } from '../Workspace/types'
import { useWorkspaceStore } from '../Workspace/workspaceStore'
import { useGroupStore } from './groupStore'

const AUTOSAVE_DEBOUNCE_MS = 400

type Named = { id: string; name: string }

/**
 * Record the coarse library changes as activity (see the grilled design):
 * an item appearing, disappearing or changing name between two store states.
 * Field-level edits are too chatty to log and are covered by the autosave.
 */
function logNamedDiff(kind: ActivityKind, prev: Named[], next: Named[]) {
  if (prev === next || isHydrating()) return
  const log = useWorkspaceStore.getState().logActivity
  const before = new Map(prev.map((x) => [x.id, x]))
  const after = new Map(next.map((x) => [x.id, x]))
  for (const x of next) {
    const was = before.get(x.id)
    if (!was) {
      if (x.name.trim()) log('created', kind, x.name, '', null)
    } else if (was.name !== x.name && was.name.trim() && x.name.trim()) {
      log('renamed', kind, x.name, `was ${was.name}`, null)
    }
  }
  for (const x of prev) if (!after.has(x.id) && x.name.trim()) log('deleted', kind, x.name, '', null)
}

/**
 * Keeps the live library stores (groups / models / endpoints) and the
 * persisted workspace in step: hydrates them once at boot (and again after a
 * reset, via `libraryEpoch`), then mirrors every edit back, debounced. Mounted
 * once at the app root so the library is live on the portal and in projects.
 */
export function LibrarySync() {
  const epoch = useWorkspaceStore((s) => s.libraryEpoch)
  const saveLibrary = useWorkspaceStore((s) => s.saveLibrary)
  const setSaveState = useWorkspaceStore((s) => s.setSaveState)

  useEffect(() => {
    applyLibrary(useWorkspaceStore.getState().library)
  }, [epoch])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      if (isHydrating()) return
      setSaveState('pending')
      clearTimeout(timer)
      timer = setTimeout(() => {
        try {
          saveLibrary(collectLibrary())
        } catch {
          setSaveState('error')
        }
      }, AUTOSAVE_DEBOUNCE_MS)
    }
    const unsubs = [
      useGroupStore.subscribe((s, prev) => {
        if (s.groups !== prev.groups) {
          logNamedDiff('group', prev.groups, s.groups)
          schedule()
        }
      }),
      useModelStore.subscribe((s, prev) => {
        if (s.models !== prev.models) {
          logNamedDiff('model', prev.models, s.models)
          schedule()
        }
      }),
      useApiStore.subscribe((s, prev) => {
        if (s.endpoints !== prev.endpoints) {
          logNamedDiff('api', prev.endpoints, s.endpoints)
          schedule()
        }
      }),
    ]
    return () => {
      unsubs.forEach((u) => u())
      if (timer) {
        clearTimeout(timer)
        if (!isHydrating()) saveLibrary(collectLibrary())
      }
    }
  }, [saveLibrary, setSaveState])

  return null
}
