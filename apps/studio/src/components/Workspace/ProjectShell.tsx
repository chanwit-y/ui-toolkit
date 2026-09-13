import { useEffect } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { AppearanceSync } from '../AppearanceSync'
import { AppShell } from '../AppShell'
import { useEnvStore } from '../Env/envStore'
import { useGridStore } from '../Layout/gridStore'
import { LibraryScopeContext } from '../Library/scope'
import { useThemeStore } from '../Theme/themeStore'
import { applyPageGrid, applyProjectState, collectProjectState, isHydrating } from './snapshots'
import { useProject, useWorkspaceStore } from './workspaceStore'

const AUTOSAVE_DEBOUNCE_MS = 400

/**
 * The `/p/:projectId` route: loads the project's shared state (env / theme)
 * and the routed page's canvas into the live stores, marks the project and
 * page active so the library scope hooks and the canvas bar know where they
 * are, then mirrors every edit back into the workspace (debounced). The
 * studio pages below (`<Outlet/>`) are untouched.
 *
 * Pages (see the grilled design): only one page's grid is ever live. The page
 * comes from the `pages/:pageId` route; on the APIs / Env / Theme tabs (no
 * page in the URL) the last page stays live so its autosave keeps working. A
 * page switch flushes the outgoing page's pending save before hydrating the
 * next one. An unknown project id sends you back to the portal; an unknown
 * page id to the project's first page.
 */
export function ProjectShell() {
  const { projectId, pageId: routePageId } = useParams()
  const project = useProject(projectId)
  const storedPageId = useWorkspaceStore((s) => s.activePageId)
  const appearance = useThemeStore((s) => s.config.appearance)
  const saveProjectState = useWorkspaceStore((s) => s.saveProjectState)
  const setSaveState = useWorkspaceStore((s) => s.setSaveState)
  const setActiveProjectId = useWorkspaceStore((s) => s.setActiveProjectId)
  const setActivePageId = useWorkspaceStore((s) => s.setActivePageId)

  const pages = project?.snapshot.pages
  const routePageKnown = !routePageId || !!pages?.some((pg) => pg.id === routePageId)
  const pageId =
    routePageId && routePageKnown
      ? routePageId
      : storedPageId && pages?.some((pg) => pg.id === storedPageId)
        ? storedPageId
        : pages?.[0]?.id

  // Hydrate the shared state on open (and when switching projects). Reading
  // the snapshot via getState keeps this effect keyed on the id only —
  // autosaves must not re-hydrate the stores they just wrote from.
  useEffect(() => {
    if (!projectId) return
    const p = useWorkspaceStore.getState().projects.find((x) => x.id === projectId)
    if (!p) return
    setActiveProjectId(projectId)
    applyProjectState(p.snapshot)
    return () => {
      setActiveProjectId(null)
      setActivePageId(null)
    }
  }, [projectId, setActiveProjectId, setActivePageId])

  // Hydrate the page's canvas when the page changes. Declared before the
  // autosave effect so, on a switch, the old page's flush (that effect's
  // cleanup) runs before this hydrates the new one.
  useEffect(() => {
    if (!projectId || !pageId) return
    const p = useWorkspaceStore.getState().projects.find((x) => x.id === projectId)
    const page = p?.snapshot.pages.find((pg) => pg.id === pageId)
    if (!page) return
    setActivePageId(pageId)
    applyPageGrid(page.grid)
  }, [projectId, pageId, setActivePageId])

  // Autosave: any change to the project-owned stores (that isn't a hydration)
  // schedules a debounced write into this project + page. The library stores
  // have their own sync at the app root.
  useEffect(() => {
    if (!projectId || !pageId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      if (isHydrating()) return
      setSaveState('pending')
      clearTimeout(timer)
      timer = setTimeout(() => {
        try {
          saveProjectState(projectId, pageId, collectProjectState())
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
      // Flush a pending save when leaving the page/project so nothing is lost.
      if (timer) {
        clearTimeout(timer)
        if (!isHydrating()) saveProjectState(projectId, pageId, collectProjectState())
      }
    }
  }, [projectId, pageId, saveProjectState, setSaveState])

  if (!project) return <Navigate to="/" replace />
  if (!routePageKnown) return <Navigate to={`/p/${project.id}`} replace />

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

/** `/p/:projectId` alone: land on the live page (or the first one). */
export function ProjectIndexRedirect() {
  const { projectId } = useParams()
  const project = useProject(projectId)
  const storedPageId = useWorkspaceStore((s) => s.activePageId)
  if (!project) return <Navigate to="/" replace />
  const pages = project.snapshot.pages
  const target = pages.find((pg) => pg.id === storedPageId) ?? pages[0]
  return <Navigate to={`pages/${target.id}`} replace />
}
