import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EndpointDef } from '../Api/types'
import type { ModelDef } from '../Model/types'
import type { ThemeAppearance } from '../Theme/types'
import { builtinTemplates } from '../seed/templates'
import {
  COUNTRIES_GROUP_ID,
  countryEndpointIds,
  countryLibrary,
  countryProjectSnapshot,
  createPage,
  emptyPageGrid,
  emptyProjectSnapshot,
  normalizePath,
  type LiveLibrary,
  type ProjectStateSnapshot,
} from './snapshots'
import type {
  LibraryData,
  PageDef,
  PageGrid,
  ProjectDef,
  ProjectSnapshot,
  TemplateDef,
  WorkspaceData,
} from './types'

export const WORKSPACE_STORAGE_KEY = 'gummy.studio.workspace.v1'

export type SaveState = 'saved' | 'pending' | 'error'

/** The mockup's four people — a mock identity with no auth behind it. */
export const MOCK_USERS: { name: string; role: string }[] = [
  { name: 'Sarawut K.', role: 'Product design' },
  { name: 'Pimchanok S.', role: 'Backend' },
  { name: 'Thanapat R.', role: 'QA' },
  { name: 'Nattapong V.', role: 'Head of Digital' },
]

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
  updateProject: (id: string, patch: { name?: string; description?: string }) => void
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
  addPage: (projectId: string, input: { name: string; path?: string; grid?: PageGrid }) => PageDef
  updatePage: (projectId: string, pageId: string, patch: { name?: string; path?: string }) => void
  /** Reorder: move the page `delta` positions (clamped). */
  movePage: (projectId: string, pageId: string, delta: number) => void
  deletePage: (projectId: string, pageId: string) => void

  setActiveProjectId: (id: string | null) => void
  setActivePageId: (id: string | null) => void
  setSaveState: (state: SaveState) => void
  setAppearance: (appearance: ThemeAppearance) => void
  /** Switch the mock identity (the topbar user button). */
  setUser: (name: string) => void
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

/** Apply `fn` to one project, stamping `updatedAt`. */
function patchProject(
  projects: ProjectDef[],
  id: string,
  fn: (p: ProjectDef) => Partial<ProjectDef>,
): ProjectDef[] {
  return projects.map((p) => (p.id === id ? { ...p, ...fn(p), updatedAt: Date.now() } : p))
}

/** v2 projects owned one canvas (`snapshot.grid`) instead of pages. */
type V2Snapshot = Omit<ProjectSnapshot, 'pages'> & { grid: PageGrid }
type V2Project = Omit<ProjectDef, 'snapshot'> & { snapshot: V2Snapshot }

/** v1 projects carried their own models/endpoints; the library didn't exist. */
type V1Project = Omit<ProjectDef, 'snapshot'> & {
  snapshot: Omit<V2Snapshot, 'endpointIds'> & {
    models?: ModelDef[]
    endpoints?: EndpointDef[]
    endpointIds?: string[]
  }
}

/**
 * v1 → v2: promote every project's models and endpoints into one shared
 * library (first copy of an id wins — projects created from the seed share
 * ids), file the seed items under the Countries group, and leave each project
 * attached to the endpoints it used to own.
 */
function migrateV1(projects: V1Project[]): { projects: V2Project[]; library: LibraryData } {
  const models = new Map<string, ModelDef>()
  const endpoints = new Map<string, EndpointDef>()
  const isSeed = (id: string) => id.startsWith('seed-')
  const out: V2Project[] = projects.map((p) => {
    for (const m of p.snapshot.models ?? []) {
      if (!models.has(m.id)) models.set(m.id, { ...m, groupId: isSeed(m.id) ? COUNTRIES_GROUP_ID : null })
    }
    for (const e of p.snapshot.endpoints ?? []) {
      if (!endpoints.has(e.id))
        endpoints.set(e.id, { ...e, groupId: isSeed(e.id) ? COUNTRIES_GROUP_ID : null })
    }
    return {
      ...p,
      snapshot: {
        grid: p.snapshot.grid,
        env: p.snapshot.env,
        theme: p.snapshot.theme,
        endpointIds:
          p.snapshot.endpointIds ?? (p.snapshot.endpoints ?? []).map((e) => e.id),
      },
    }
  })
  const hasSeed = [...models.keys(), ...endpoints.keys()].some(isSeed)
  return {
    projects: out,
    library: {
      groups: hasSeed ? countryLibrary().groups : [],
      models: [...models.values()],
      endpoints: [...endpoints.values()],
      templates: builtinTemplates(),
    },
  }
}

/** v2 → v3: the single canvas becomes the project's first (and only) page. */
function migrateV2(projects: V2Project[]): ProjectDef[] {
  return projects.map((p) => {
    const { grid, ...rest } = p.snapshot
    return { ...p, snapshot: { ...rest, pages: [createPage('Page 1', '/', grid)] } }
  })
}

const initialLibrary = countryLibrary()

/**
 * The workspace: the project list (each with its snapshot) and the shared
 * library, persisted to one localStorage key (see the grilled designs).
 * Unreadable or foreign data falls back to the seed rather than blanking the
 * portal.
 */
export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      version: 3,
      appearance: 'light',
      user: MOCK_USERS[0].name,
      projects: seedProjects(initialLibrary),
      library: initialLibrary,
      saveState: 'saved',
      activeProjectId: null,
      activePageId: null,
      libraryEpoch: 0,

      createProject: ({ name, description, fromSeed }) => {
        const now = Date.now()
        let created!: ProjectDef
        set((s) => {
          created = {
            id: createId(),
            name: name.trim() || 'Untitled project',
            description: description.trim(),
            createdAt: now,
            updatedAt: now,
            snapshot: fromSeed
              ? { ...countryProjectSnapshot(s.library), endpointIds: countryEndpointIds(s.library) }
              : emptyProjectSnapshot(),
          }
          return { projects: [created, ...s.projects] }
        })
        return created
      },

      updateProject: (id, patch) =>
        set((s) => ({
          projects: patchProject(s.projects, id, () => ({
            ...(patch.name != null ? { name: patch.name } : {}),
            ...(patch.description != null ? { description: patch.description } : {}),
          })),
        })),

      deleteProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      saveProjectState: (id, pageId, state) =>
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
        })),

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
        return template
      },

      updateTemplate: (id, patch) =>
        set((s) => ({
          library: {
            ...s.library,
            templates: s.library.templates.map((t) =>
              t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t,
            ),
          },
        })),

      saveTemplateGrid: (id, grid) =>
        set((s) => ({
          saveState: 'saved',
          library: {
            ...s.library,
            templates: s.library.templates.map((t) =>
              t.id === id ? { ...t, grid, updatedAt: Date.now() } : t,
            ),
          },
        })),

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
        return copy
      },

      deleteTemplate: (id) =>
        set((s) => ({
          library: { ...s.library, templates: s.library.templates.filter((t) => t.id !== id) },
        })),

      attachEndpoints: (projectId, endpointIds) =>
        set((s) => ({
          projects: patchProject(s.projects, projectId, (p) => {
            const have = new Set(p.snapshot.endpointIds)
            const next = [...p.snapshot.endpointIds, ...endpointIds.filter((id) => !have.has(id))]
            return { snapshot: { ...p.snapshot, endpointIds: next } }
          }),
        })),

      detachEndpoint: (projectId, endpointId) =>
        set((s) => ({
          projects: patchProject(s.projects, projectId, (p) => ({
            snapshot: {
              ...p.snapshot,
              endpointIds: p.snapshot.endpointIds.filter((id) => id !== endpointId),
            },
          })),
        })),

      detachEverywhere: (endpointId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.snapshot.endpointIds.includes(endpointId)
              ? {
                  ...p,
                  snapshot: {
                    ...p.snapshot,
                    endpointIds: p.snapshot.endpointIds.filter((id) => id !== endpointId),
                  },
                }
              : p,
          ),
        })),

      addPage: (projectId, { name, path, grid }) => {
        const page = createPage(name, path, grid)
        set((s) => ({
          projects: patchProject(s.projects, projectId, (p) => ({
            snapshot: { ...p.snapshot, pages: [...p.snapshot.pages, page] },
          })),
        }))
        return page
      },

      updatePage: (projectId, pageId, patch) =>
        set((s) => ({
          projects: patchProject(s.projects, projectId, (p) => ({
            snapshot: {
              ...p.snapshot,
              pages: p.snapshot.pages.map((pg) => {
                if (pg.id !== pageId) return pg
                const name = patch.name != null ? patch.name.trim() || pg.name : pg.name
                const path = patch.path != null ? normalizePath(patch.path, name) : pg.path
                return { ...pg, name, path }
              }),
            },
          })),
        })),

      movePage: (projectId, pageId, delta) =>
        set((s) => ({
          projects: patchProject(s.projects, projectId, (p) => {
            const pages = p.snapshot.pages.slice()
            const from = pages.findIndex((pg) => pg.id === pageId)
            if (from === -1) return {}
            const to = Math.max(0, Math.min(pages.length - 1, from + delta))
            if (to === from) return {}
            const [pg] = pages.splice(from, 1)
            pages.splice(to, 0, pg)
            return { snapshot: { ...p.snapshot, pages } }
          }),
        })),

      deletePage: (projectId, pageId) =>
        set((s) => ({
          projects: patchProject(s.projects, projectId, (p) => {
            if (p.snapshot.pages.length < 2) return {}
            return {
              snapshot: {
                ...p.snapshot,
                pages: p.snapshot.pages.filter((pg) => pg.id !== pageId),
              },
            }
          }),
        })),

      setActiveProjectId: (activeProjectId) => set({ activeProjectId }),

      setActivePageId: (activePageId) => set({ activePageId }),

      setSaveState: (saveState) => set({ saveState }),

      setAppearance: (appearance) => set({ appearance }),

      setUser: (user) => set({ user }),

      resetDemo: () => {
        const library = countryLibrary()
        set((s) => ({
          projects: seedProjects(library),
          library,
          appearance: 'light',
          saveState: 'saved',
          libraryEpoch: s.libraryEpoch + 1,
        }))
      },
    }),
    {
      name: WORKSPACE_STORAGE_KEY,
      version: 3,
      partialize: (s) => ({
        version: s.version,
        appearance: s.appearance,
        user: s.user,
        projects: s.projects,
        library: s.library,
      }),
      merge: (persisted, current) => {
        const data = persisted as
          | (Partial<Omit<WorkspaceData, 'version'>> & { version?: number })
          | undefined
        if (!data || !Array.isArray(data.projects)) return current
        const appearance = data.appearance === 'dark' ? 'dark' : 'light'
        const user =
          typeof data.user === 'string' && data.user ? data.user : MOCK_USERS[0].name
        if (data.version === 1) {
          const { projects, library } = migrateV1(data.projects as unknown as V1Project[])
          return { ...current, appearance, user, projects: migrateV2(projects), library }
        }
        if (!data.library) return current
        // Libraries saved before templates existed get the builtin set.
        const library: LibraryData = {
          ...data.library,
          templates: Array.isArray(data.library.templates)
            ? data.library.templates
            : builtinTemplates(),
        }
        if (data.version === 2) {
          return {
            ...current,
            appearance,
            user,
            projects: migrateV2(data.projects as unknown as V2Project[]),
            library,
          }
        }
        if (data.version !== 3) return current
        return { ...current, appearance, user, projects: data.projects, library }
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
