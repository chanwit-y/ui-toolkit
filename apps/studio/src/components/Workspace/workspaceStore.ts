import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { studioStorage } from '../../cli/cliStorage'
import type { ThemeAppearance } from '../Theme/types'
import type { PageLoadDef } from './pageLoads'
import type { CustomActionDef } from './customActions'
import type { FormulaLibDef, RuleLibDef } from './logic'
import type { CustomComponentDef } from './customComponents'
import { createAuthDef, type AuthDef } from './auth'
import { seedActivity } from '../seed/activity'
import {
  countryLibrary,
  countryProjectSnapshot,
  emptyPageGrid,
  type LiveLibrary,
  type ProjectStateSnapshot,
} from './snapshots'
import type {
  ActivityEntry,
  ActivityKind,
  LibraryData,
  PageDef,
  PageGrid,
  ProjectDef,
  ShellSettings,
  TemplateDef,
  WorkspaceData,
  MenuItemDef,
} from './types'
import type { NavParamSource } from '../Layout/types'

import { migrateWorkspace } from './migrate'
import * as cmd from './commands'
import { patchProject } from './commands'
import { MOCK_USERS } from './mockUsers'
const ACTIVITY_CAP = 500
/** Autosaves are continuous; a "saved" line is worth recording this often. */
const SAVE_LOG_INTERVAL_MS = 10 * 60 * 1000
const lastSaveLog = new Map<string, number>()

export const WORKSPACE_STORAGE_KEY = 'gummy.studio.workspace.v1'

export type SaveState = 'saved' | 'pending' | 'error'

export { MOCK_USERS } from './mockUsers'

type WorkspaceStore = WorkspaceData & {
  /** Autosave status shown by the topbar dot. */
  saveState: SaveState
  /** The project the studio is inside (route-driven; not persisted). */
  activeProjectId: string | null
  /** The page whose grid is live in `gridStore` (route-driven; not persisted).
   * Kept while the APIs / Env / Theme tabs are open so autosave still knows
   * which page the canvas belongs to. */
  activePageId: string | null
  /** Bumped whenever `library` is replaced from outside the live stores
   * (reset), so LibrarySync re-hydrates them. */
  libraryEpoch: number

  createProject: (input: { name: string; description: string; fromSeed: boolean }) => ProjectDef
  /** CLI mode, fresh folder: drop the seed and start with one empty project named after the consumer package (see `cli/cliStorage.ts`). */
  resetWorkspace: (projectName: string) => void
  updateProject: (id: string, patch: { name?: string; description?: string }) => void
  /** Replace the project's app-shell menu (the Menu tab). */
  updateProjectMenu: (id: string, menu: MenuItemDef[]) => void
  updateProjectShell: (id: string, shell: ShellSettings) => void
  /** Replace the project's app-wide data loads (the Page data tab's Global section). */
  updateProjectGlobalLoads: (id: string, loads: PageLoadDef[]) => void
  /** Replace the project's declared custom button actions (the Env page's section). */
  updateProjectCustomActions: (id: string, actions: CustomActionDef[]) => void
  /** Replace the project's declared custom components (the Env page's section). */
  updateProjectCustomComponents: (id: string, components: CustomComponentDef[]) => void
  /** The project's saved formulas and rules (the Logic tab). */
  updateProjectLogic: (id: string, patch: { formulas?: FormulaLibDef[]; rules?: RuleLibDef[] }) => void
  /**
   * Pick the shared auth entry the project signs in with (null = none). Also
   * attaches the entry's profile endpoint; the Env rows are the caller's (they
   * live in the live env store while a project is open).
   */
  setProjectAuth: (id: string, authId: string | null) => void
  // Shared auth entries (Azure SSO, see the grilled design `azure-sso-auth`).
  addAuth: (name?: string) => AuthDef
  updateAuth: (id: string, patch: Partial<AuthDef>) => void
  deleteAuth: (id: string) => void
  deleteProject: (id: string) => void
  /** Write the live env/theme and the active page's grid back (autosave). */
  saveProjectState: (id: string, pageId: string, state: ProjectStateSnapshot) => void
  /** Write the live library stores back (autosave); templates are untouched. */
  saveLibrary: (library: LiveLibrary) => void

  // Templates (see the grilled design): shared-library starting layouts.
  addTemplate: (input: {
    name: string
    description: string
    category: string
    grid?: PageGrid
    createdBy: string
  }) => TemplateDef
  updateTemplate: (
    id: string,
    patch: Partial<Pick<TemplateDef, 'name' | 'description' | 'category' | 'active'>>,
  ) => void
  /** Autosave from the master-layout editor. */
  saveTemplateGrid: (id: string, grid: PageGrid) => void
  duplicateTemplate: (id: string, createdBy: string) => TemplateDef | undefined
  deleteTemplate: (id: string) => void
  attachEndpoints: (projectId: string, endpointIds: string[]) => void
  detachEndpoint: (projectId: string, endpointId: string) => void
  /** Drop an endpoint id from every project (library delete). */
  detachEverywhere: (endpointId: string) => void

  // Pages (see the grilled pages design): a project always keeps at least one.
  addPage: (
    projectId: string,
    input: { name: string; path?: string; grid?: PageGrid; key?: string },
  ) => PageDef
  updatePage: (
    projectId: string,
    pageId: string,
    patch: {
      name?: string
      path?: string
      key?: string
      /** `null` clears. Rejected when it is the page itself or one of its descendants (a cycle). */
      parentId?: string | null
      /** `null` clears (label falls back to the page name). */
      crumb?: NavParamSource | null
      hideBreadcrumbs?: boolean
      /** Replaces the page's data loads (the Layout's Data tab). */
      loads?: PageLoadDef[]
    },
  ) => void
  /** Reorder: move the page `delta` positions (clamped). */
  movePage: (projectId: string, pageId: string, delta: number) => void
  deletePage: (projectId: string, pageId: string) => void

  setActiveProjectId: (id: string | null) => void
  setActivePageId: (id: string | null) => void
  setSaveState: (state: SaveState) => void
  setAppearance: (appearance: ThemeAppearance) => void
  /** Switch the mock identity (the topbar user button). */
  setUser: (name: string) => void
  /** Record one activity line against the current user (see the grilled design). */
  logActivity: (
    verb: string,
    kind: ActivityKind,
    name: string,
    detail?: string,
    projectId?: string | null,
  ) => void
  /** Back to first-run: the seeded library + project, light appearance. */
  resetDemo: () => void
}

function createId(): string {
  return crypto.randomUUID()
}

function seedProjects(library: LibraryData): ProjectDef[] {
  const now = Date.now()
  return [
    {
      id: 'seed-project-country',
      name: 'Country manager',
      description: 'The countries example: a searchable table with an Add Country modal, wired to the mock API.',
      createdAt: now,
      updatedAt: now,
      snapshot: countryProjectSnapshot(library),
    },
  ]
}

const initialLibrary = countryLibrary()

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => {
      const log = (
        verb: string,
        kind: ActivityKind,
        name: string,
        detail = '',
        projectId: string | null = get().activeProjectId,
      ) => {
        const entry: ActivityEntry = {
          id: createId(),
          ts: Date.now(),
          user: get().user,
          verb,
          kind,
          name,
          detail,
          projectId,
        }
        set((s) => ({ activity: [entry, ...s.activity].slice(0, ACTIVITY_CAP) }))
      }
      const projectName = (id: string) => get().projects.find((p) => p.id === id)?.name ?? ''
      const pageOf = (projectId: string, pageId: string) =>
        get().projects.find((p) => p.id === projectId)?.snapshot.pages.find((pg) => pg.id === pageId)
      const templateOf = (id: string) => get().library.templates.find((t) => t.id === id)

      return {
      version: 64,
      appearance: 'light',
      user: MOCK_USERS[0].name,
      projects: seedProjects(initialLibrary),
      library: initialLibrary,
      activity: seedActivity(),
      saveState: 'saved',
      activeProjectId: null,
      activePageId: null,
      libraryEpoch: 0,

      logActivity: (verb, kind, name, detail, projectId) => log(verb, kind, name, detail, projectId),

      resetWorkspace: (projectName) => {
        set({
          ...cmd.freshWorkspace(projectName),
          activity: [],
          activeProjectId: null,
          activePageId: null,
          libraryEpoch: get().libraryEpoch + 1,
        })
      },

      createProject: ({ name, description, fromSeed }) => {
        let created!: ProjectDef
        set((s) => {
          const next = cmd.createProject(s, { name, description, fromSeed })
          created = next.project
          return {
            projects: next.projects,
            ...(next.library !== s.library ? { library: next.library, libraryEpoch: s.libraryEpoch + 1 } : {}),
          }
        })
        log('created', 'project', created.name, fromSeed ? 'from the countries example' : 'empty project', created.id)
        return created
      },

      updateProjectMenu: (id, menu) => {
        set((s) => ({ projects: cmd.setSnapshotField(s.projects, id, 'menu', menu) }))
      },

      updateProjectShell: (id, shell) => {
        set((s) => ({ projects: cmd.setSnapshotField(s.projects, id, 'shell', shell) }))
      },

      updateProjectCustomActions: (id, customActions) => {
        set((s) => ({ projects: cmd.setSnapshotField(s.projects, id, 'customActions', customActions) }))
      },

      updateProjectCustomComponents: (id, customComponents) => {
        set((s) => ({ projects: cmd.setSnapshotField(s.projects, id, 'customComponents', customComponents) }))
      },

      updateProjectLogic: (id, patch) => {
        set((s) => {
          let projects = s.projects
          if (patch.formulas) projects = cmd.setSnapshotField(projects, id, 'formulas', patch.formulas)
          if (patch.rules) projects = cmd.setSnapshotField(projects, id, 'rules', patch.rules)
          return { projects }
        })
      },

      setProjectAuth: (id, authId) => {
        const def = authId ? (get().library.auth ?? []).find((a) => a.id === authId) : undefined
        set((s) => ({ projects: cmd.setProjectAuth(s, id, authId) }))
        log(def ? 'updated' : 'updated', 'auth', def?.name ?? 'none', def ? `${projectName(id)} signs in with it` : `${projectName(id)} has no sign-in`, id)
      },

      addAuth: (name) => {
        const def = createAuthDef(name)
        set((s) => ({ library: { ...s.library, auth: [...(s.library.auth ?? []), def] } }))
        log('created', 'auth', def.name, 'Azure SSO', null)
        return def
      },

      updateAuth: (id, patch) => {
        const before = (get().library.auth ?? []).find((a) => a.id === id)
        set((s) => ({
          library: { ...s.library, auth: (s.library.auth ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)) },
        }))
        if (before && patch.name !== undefined && patch.name !== before.name) log('renamed', 'auth', patch.name, `was ${before.name}`, null)
      },

      deleteAuth: (id) => {
        const before = (get().library.auth ?? []).find((a) => a.id === id)
        set((s) => ({
          library: { ...s.library, auth: (s.library.auth ?? []).filter((a) => a.id !== id) },
          // Projects that picked it keep the dangling id (shown as missing), like a deleted endpoint.
        }))
        if (before) log('deleted', 'auth', before.name, '', null)
      },

      updateProjectGlobalLoads: (id, globalLoads) => {
        set((s) => ({ projects: cmd.setSnapshotField(s.projects, id, 'globalLoads', globalLoads) }))
      },

      updateProject: (id, patch) => set((s) => ({ projects: cmd.updateProject(s.projects, id, patch) })),

      deleteProject: (id) => {
        const name = projectName(id)
        set((s) => ({ projects: cmd.deleteProject(s.projects, id) }))
        if (name) log('deleted', 'project', name, '', null)
      },

      saveProjectState: (id, pageId, state) => {
        set((s) => ({
          saveState: 'saved',
          projects: patchProject(s.projects, id, (p) => ({
            snapshot: {
              ...p.snapshot,
              env: state.env,
              theme: state.theme,
              pages: p.snapshot.pages.map((pg) =>
                pg.id === pageId ? { ...pg, grid: state.grid } : pg,
              ),
            },
          })),
        }))
        const now = Date.now()
        if (now - (lastSaveLog.get(id) ?? 0) > SAVE_LOG_INTERVAL_MS) {
          lastSaveLog.set(id, now)
          const page = pageOf(id, pageId)
          log('saved', 'project', projectName(id), page ? `${page.name} · ${state.grid.items.length} element(s)` : '', id)
        }
      },

      saveLibrary: (library) =>
        set((s) => ({ library: { ...s.library, ...library }, saveState: 'saved' })),

      addTemplate: ({ name, description, category, grid, createdBy }) => {
        const template: TemplateDef = {
          id: createId(),
          name: name.trim() || 'Untitled template',
          description: description.trim(),
          category: category.trim() || 'General',
          active: true,
          builtin: false,
          createdBy,
          updatedAt: Date.now(),
          grid: grid ?? emptyPageGrid(),
        }
        set((s) => ({
          library: { ...s.library, templates: [...s.library.templates, template] },
        }))
        log('created', 'template', template.name, grid ? `from a page · ${grid.items.length} block(s)` : `in ${template.category}`, null)
        return template
      },

      updateTemplate: (id, patch) => {
        const before = templateOf(id)
        set((s) => ({
          library: {
            ...s.library,
            templates: s.library.templates.map((t) =>
              t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
            ),
          },
        }))
        if (before) {
          if (patch.active != null && patch.active !== before.active)
            log(patch.active ? 'activated' : 'deactivated', 'template', before.name, '', null)
          else log('updated', 'template', patch.name ?? before.name, patch.name && patch.name !== before.name ? `was ${before.name}` : 'details', null)
        }
      },

      saveTemplateGrid: (id, grid) => {
        set((s) => ({
          saveState: 'saved',
          library: {
            ...s.library,
            templates: s.library.templates.map((t) =>
              t.id === id ? { ...t, grid, updatedAt: Date.now() } : t,
            ),
          },
        }))
        const now = Date.now()
        const key = `tpl:${id}`
        if (now - (lastSaveLog.get(key) ?? 0) > SAVE_LOG_INTERVAL_MS) {
          lastSaveLog.set(key, now)
          const t = templateOf(id)
          if (t) log('updated', 'template', t.name, `layout · ${grid.items.length} block(s)`, null)
        }
      },

      duplicateTemplate: (id, createdBy) => {
        let copy: TemplateDef | undefined
        set((s) => {
          const source = s.library.templates.find((t) => t.id === id)
          if (!source) return {}
          copy = {
            ...source,
            id: createId(),
            name: `${source.name} copy`,
            builtin: false,
            createdBy,
            updatedAt: Date.now(),
            grid: JSON.parse(JSON.stringify(source.grid)) as PageGrid,
          }
          const at = s.library.templates.indexOf(source)
          const templates = s.library.templates.slice()
          templates.splice(at + 1, 0, copy)
          return { library: { ...s.library, templates } }
        })
        if (copy) log('duplicated', 'template', copy.name, '', null)
        return copy
      },

      deleteTemplate: (id) => {
        const t = templateOf(id)
        set((s) => ({
          library: { ...s.library, templates: s.library.templates.filter((t) => t.id !== id) },
        }))
        if (t) log('deleted', 'template', t.name, '', null)
      },

      attachEndpoints: (projectId, endpointIds) => {
        set((s) => ({ projects: cmd.attachEndpoints(s.projects, projectId, endpointIds) }))
        const names = endpointIds
          .map((id) => get().library.endpoints.find((e) => e.id === id)?.name)
          .filter((n): n is string => !!n)
        if (names.length) log('attached', 'api', names.join(', '), `to ${projectName(projectId)}`, projectId)
      },

      detachEndpoint: (projectId, endpointId) => {
        set((s) => ({ projects: cmd.detachEndpoint(s.projects, projectId, endpointId) }))
        const name = get().library.endpoints.find((e) => e.id === endpointId)?.name
        if (name) log('detached', 'api', name, `from ${projectName(projectId)}`, projectId)
      },

      detachEverywhere: (endpointId) => set((s) => ({ projects: cmd.detachEverywhere(s.projects, endpointId) })),

      addPage: (projectId, { name, path, grid, key }) => {
        let page!: PageDef
        set((s) => {
          const next = cmd.addPage(s.projects, projectId, { name, path, grid, key })
          page = next.page
          return { projects: next.projects }
        })
        log('created', 'page', page.name, grid ? 'from a template' : 'blank page', projectId)
        return page
      },

      updatePage: (projectId, pageId, patch) => {
        const before = pageOf(projectId, pageId)
        set((s) => ({ projects: cmd.updatePage(s.projects, projectId, pageId, patch) }))
        const after = pageOf(projectId, pageId)
        if (before && after && (before.name !== after.name || before.path !== after.path)) {
          log(
            before.name !== after.name ? 'renamed' : 'updated',
            'page',
            after.name,
            before.name !== after.name ? `was ${before.name}` : `route ${after.path}`,
            projectId,
          )
        }
      },

      movePage: (projectId, pageId, delta) => set((s) => ({ projects: cmd.movePage(s.projects, projectId, pageId, delta) })),

      deletePage: (projectId, pageId) => {
        const page = pageOf(projectId, pageId)
        set((s) => ({ projects: cmd.deletePage(s.projects, projectId, pageId) }))
        if (page) log('deleted', 'page', page.name, '', projectId)
      },

      setActiveProjectId: (activeProjectId) => set({ activeProjectId }),

      setActivePageId: (activePageId) => set({ activePageId }),

      setSaveState: (saveState) => set({ saveState }),

      setAppearance: (appearance) => set({ appearance }),

      setUser: (user) => set({ user }),

      resetDemo: () => {
        const library = countryLibrary()
        lastSaveLog.clear()
        set((s) => ({
          projects: seedProjects(library),
          library,
          activity: seedActivity(),
          user: MOCK_USERS[0].name,
          appearance: 'light',
          saveState: 'saved',
          libraryEpoch: s.libraryEpoch + 1,
        }))
      },
      }
    },
    {
      name: WORKSPACE_STORAGE_KEY,
      // localStorage, or the `gummy studio` CLI's file API — decided before this module loads.
      storage: createJSONStorage(() => studioStorage),
      version: 64,
      partialize: (s) => ({
        version: s.version,
        appearance: s.appearance,
        user: s.user,
        projects: s.projects,
        library: s.library,
        activity: s.activity,
      }),
      merge: (persisted, current) => {
        const migrated = migrateWorkspace(persisted)
        return migrated ? { ...current, ...migrated } : current
      },
      // The version bumps are handled in `merge` (it sees the raw payload);
      // keep the middleware's own migrate a pass-through.
      migrate: (persisted) => persisted as WorkspaceStore,
    },
  ),
)

/** Selector: one project by id (or undefined). */
export function useProject(id: string | undefined): ProjectDef | undefined {
  return useWorkspaceStore((s) => (id ? s.projects.find((p) => p.id === id) : undefined))
}

/** Selector: the project the studio is inside (undefined on the portal). */
export function useActiveProject(): ProjectDef | undefined {
  return useWorkspaceStore((s) =>
    s.activeProjectId ? s.projects.find((p) => p.id === s.activeProjectId) : undefined,
  )
}

/** Selector: the active project's pages ([] outside one). */
export function useActivePages(): PageDef[] {
  return useWorkspaceStore(
    (s) => s.projects.find((p) => p.id === s.activeProjectId)?.snapshot.pages ?? EMPTY_PAGES,
  )
}

/** Selector: the page whose grid is live (undefined outside a project). */
export function useActivePage(): PageDef | undefined {
  return useWorkspaceStore((s) =>
    s.projects
      .find((p) => p.id === s.activeProjectId)
      ?.snapshot.pages.find((pg) => pg.id === s.activePageId),
  )
}

/** Selector: the activity log, newest first. */
export function useActivity(): ActivityEntry[] {
  return useWorkspaceStore((s) => s.activity)
}

/** Selector: the library's templates. */
export function useTemplates(): TemplateDef[] {
  return useWorkspaceStore((s) => s.library.templates)
}

/** Selector: the attached endpoint ids of the active project ([] outside one). */
export function useActiveEndpointIds(): string[] {
  return useWorkspaceStore(
    (s) => s.projects.find((p) => p.id === s.activeProjectId)?.snapshot.endpointIds ?? EMPTY_IDS,
  )
}
const EMPTY_IDS: string[] = []
const EMPTY_PAGES: PageDef[] = []

// Dev-only: expose the store for scripted verification (mirrors __gridStore).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __workspaceStore?: typeof useWorkspaceStore }).__workspaceStore =
    useWorkspaceStore
}
