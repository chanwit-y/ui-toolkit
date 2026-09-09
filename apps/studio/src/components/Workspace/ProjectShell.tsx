import { useEffect } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { AppearanceSync } from '../AppearanceSync'
import { AppShell } from '../AppShell'
import { useEnvStore } from '../Env/envStore'
import { useGridStore } from '../Layout/gridStore'
import { LibraryScopeContext } from '../Library/scope'
import { useThemeStore } from '../Theme/themeStore'
import { applyProjectState, collectProjectState, isHydrating } from './snapshots'
import { useProject, useWorkspaceStore } from './workspaceStore'

const AUTOSAVE_DEBOUNCE_MS = 400

/**
 * The `/p/:projectId` route: loads the project's own state (grid / env /
 * theme) into the live stores, marks the project active so the library
 * scope hooks filter to its attached endpoints, then mirrors every edit back
 * into the workspace (debounced). The studio pages below (`<Outlet/>`) are
 * untouched. An unknown id sends you back to the portal.
 */
export function ProjectShell() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const appearance = useThemeStore((s) => s.config.appearance)
  const saveProjectState = useWorkspaceStore((s) => s.saveProjectState)
  const setSaveState = useWorkspaceStore((s) => s.setSaveState)
  const setActiveProjectId = useWorkspaceStore((s) => s.setActiveProjectId)

  // Hydrate on open (and when switching projects). Reading the snapshot via
  // getState keeps this effect keyed on the id only — autosaves must not
  // re-hydrate the stores they just wrote from.
  useEffect(() => {
    if (!projectId) return
    const p = useWorkspaceStore.getState().projects.find((x) => x.id === projectId)
    if (!p) return
    setActiveProjectId(projectId)
    applyProjectState(p.snapshot)
    return () => setActiveProjectId(null)
  }, [projectId, setActiveProjectId])

  // Autosave: any change to the project-owned stores (that isn't a hydration)
  // schedules a debounced write into this project. The library stores have
  // their own sync at the app root.
  useEffect(() => {
    if (!projectId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      if (isHydrating()) return
      setSaveState('pending')
      clearTimeout(timer)
      timer = setTimeout(() => {
        try {
          saveProjectState(projectId, collectProjectState())
        } catch {
          setSaveState('error')
        }
      }, AUTOSAVE_DEBOUNCE_MS)
    }
    const unsubs = [
      useGridStore.subscribe((s, prev) => {
        if (
          s.items !== prev.items ||
          s.containerSettings !== prev.containerSettings ||
          s.fieldSeq !== prev.fieldSeq
        )
          schedule()
      }),
      useEnvStore.subscribe((s, prev) => {
        if (s.vars !== prev.vars) schedule()
      }),
      useThemeStore.subscribe((s, prev) => {
        if (s.config !== prev.config) schedule()
      }),
    ]
    return () => {
      unsubs.forEach((u) => u())
      // Flush a pending save when leaving the project so nothing is lost.
      if (timer) {
        clearTimeout(timer)
        if (!isHydrating()) saveProjectState(projectId, collectProjectState())
      }
    }
  }, [projectId, saveProjectState, setSaveState])

  if (!project) return <Navigate to="/" replace />

  return (
    <LibraryScopeContext.Provider value="project">
      <AppearanceSync appearance={appearance} />
      <AppShell project={project} />
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </LibraryScopeContext.Provider>
  )
}
