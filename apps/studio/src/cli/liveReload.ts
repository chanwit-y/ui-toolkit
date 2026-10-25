import { useGridStore } from '../components/Layout/gridStore'
import { applyPageGrid, applyProjectState } from '../components/Workspace/liveStores'
import { useWorkspaceStore } from '../components/Workspace/workspaceStore'
import type { LiveReload } from './cliStorage'

/**
 * Loading a `workspace.json` that changed on disk into a clean tab (see
 * `cliStorage.ts` and the grilled design `mcp-server`): the workspace store
 * re-reads its storage (the new payload, migrated by its own `merge`), the
 * library stores re-hydrate through `libraryEpoch`, and the open project's
 * env / theme and page canvas are re-applied — keeping the route, the
 * drill-in path and the selection when they still exist.
 */
export function liveReload(): LiveReload {
  return {
    // The editor stores' debounced autosave into the workspace store is still waiting.
    hasPendingEdits: () => useWorkspaceStore.getState().saveState === 'pending',
    apply: () => {
      const { activePath, selectedItemId } = useGridStore.getState()
      void useWorkspaceStore.persist.rehydrate()
      const ws = useWorkspaceStore.getState()
      useWorkspaceStore.setState({ libraryEpoch: ws.libraryEpoch + 1 })
      const project = ws.projects.find((p) => p.id === ws.activeProjectId)
      if (!project) return
      applyProjectState(project.snapshot)
      const page = project.snapshot.pages.find((pg) => pg.id === ws.activePageId)
      if (!page) return
      applyPageGrid(page.grid)
      useGridStore.getState().goToCanvas(activePath, selectedItemId)
    },
  }
}
