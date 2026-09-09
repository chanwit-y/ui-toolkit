import { useEffect } from 'react'
import { useApiStore } from '../Api/apiStore'
import { useModelStore } from '../Model/modelStore'
import { applyLibrary, collectLibrary, isHydrating } from '../Workspace/snapshots'
import { useWorkspaceStore } from '../Workspace/workspaceStore'
import { useGroupStore } from './groupStore'

const AUTOSAVE_DEBOUNCE_MS = 400

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
        if (s.groups !== prev.groups) schedule()
      }),
      useModelStore.subscribe((s, prev) => {
        if (s.models !== prev.models) schedule()
      }),
      useApiStore.subscribe((s, prev) => {
        if (s.endpoints !== prev.endpoints) schedule()
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
