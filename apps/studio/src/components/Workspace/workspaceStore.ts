import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EndpointDef } from '../Api/types'
import type { ModelDef } from '../Model/types'
import type { ThemeAppearance } from '../Theme/types'
import {
  COUNTRIES_GROUP_ID,
  countryEndpointIds,
  countryLibrary,
  countryProjectSnapshot,
  emptyProjectSnapshot,
  type ProjectStateSnapshot,
} from './snapshots'
import type { LibraryData, ProjectDef, ProjectSnapshot, WorkspaceData } from './types'

export const WORKSPACE_STORAGE_KEY = 'gummy.studio.workspace.v1'

export type SaveState = 'saved' | 'pending' | 'error'

type WorkspaceStore = WorkspaceData & {
  /** Autosave status shown by the topbar dot. */
  saveState: SaveState
  /** The project the studio is inside (route-driven; not persisted). */
  activeProjectId: string | null
  /** Bumped whenever `library` is replaced from outside the live stores
   * (reset), so LibrarySync re-hydrates them. */
  libraryEpoch: number

  createProject: (input: { name: string; description: string; fromSeed: boolean }) => ProjectDef
  updateProject: (id: string, patch: { name?: string; description?: string }) => void
  deleteProject: (id: string) => void
  /** Write the live grid/env/theme back into a project (autosave). */
  saveProjectState: (id: string, state: ProjectStateSnapshot) => void
  /** Write the live library stores back (autosave). */
  saveLibrary: (library: LibraryData) => void
  attachEndpoints: (projectId: string, endpointIds: string[]) => void
  detachEndpoint: (projectId: string, endpointId: string) => void
  /** Drop an endpoint id from every project (library delete). */
  detachEverywhere: (endpointId: string) => void
  setActiveProjectId: (id: string | null) => void
  setSaveState: (state: SaveState) => void
  setAppearance: (appearance: ThemeAppearance) => void
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

/** v1 projects carried their own models/endpoints; the library didn't exist. */
type V1Project = Omit<ProjectDef, 'snapshot'> & {
  snapshot: Omit<ProjectSnapshot, 'endpointIds'> & {
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
function migrateV1(projects: V1Project[]): { projects: ProjectDef[]; library: LibraryData } {
  const models = new Map<string, ModelDef>()
  const endpoints = new Map<string, EndpointDef>()
  const isSeed = (id: string) => id.startsWith('seed-')
  const out: ProjectDef[] = projects.map((p) => {
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
    },
  }
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
      version: 2,
      appearance: 'light',
      projects: seedProjects(initialLibrary),
      library: initialLibrary,
      saveState: 'saved',
      activeProjectId: null,
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
          projects: s.projects.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...(patch.name != null ? { name: patch.name } : {}),
                  ...(patch.description != null ? { description: patch.description } : {}),
                  updatedAt: Date.now(),
                }
              : p,
          ),
        })),

      deleteProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      saveProjectState: (id, state) =>
        set((s) => ({
          saveState: 'saved',
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, snapshot: { ...p.snapshot, ...state }, updatedAt: Date.now() }
              : p,
          ),
        })),

      saveLibrary: (library) => set({ library, saveState: 'saved' }),

      attachEndpoints: (projectId, endpointIds) =>
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== projectId) return p
            const have = new Set(p.snapshot.endpointIds)
            const next = [...p.snapshot.endpointIds, ...endpointIds.filter((id) => !have.has(id))]
            return { ...p, snapshot: { ...p.snapshot, endpointIds: next }, updatedAt: Date.now() }
          }),
        })),

      detachEndpoint: (projectId, endpointId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  snapshot: {
                    ...p.snapshot,
                    endpointIds: p.snapshot.endpointIds.filter((id) => id !== endpointId),
                  },
                  updatedAt: Date.now(),
                }
              : p,
          ),
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

      setActiveProjectId: (activeProjectId) => set({ activeProjectId }),

      setSaveState: (saveState) => set({ saveState }),

      setAppearance: (appearance) => set({ appearance }),

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
      version: 2,
      partialize: (s) => ({
        version: s.version,
        appearance: s.appearance,
        projects: s.projects,
        library: s.library,
      }),
      merge: (persisted, current) => {
        const data = persisted as
          | (Partial<Omit<WorkspaceData, 'version'>> & { version?: number })
          | undefined
        if (!data || !Array.isArray(data.projects)) return current
        const appearance = data.appearance === 'dark' ? 'dark' : 'light'
        if (data.version === 1) {
          const { projects, library } = migrateV1(data.projects as unknown as V1Project[])
          return { ...current, appearance, projects, library }
        }
        if (data.version !== 2 || !data.library) return current
        return { ...current, appearance, projects: data.projects, library: data.library }
      },
      // The version bump is handled in `merge` (it sees the raw v1 payload);
      // keep the middleware's own migrate a pass-through.
      migrate: (persisted) => persisted as WorkspaceStore,
    },
  ),
)

/** Selector: one project by id (or undefined). */
export function useProject(id: string | undefined): ProjectDef | undefined {
  return useWorkspaceStore((s) => (id ? s.projects.find((p) => p.id === id) : undefined))
}

/** Selector: the attached endpoint ids of the active project ([] outside one). */
export function useActiveEndpointIds(): string[] {
  return useWorkspaceStore(
    (s) => s.projects.find((p) => p.id === s.activeProjectId)?.snapshot.endpointIds ?? EMPTY_IDS,
  )
}
const EMPTY_IDS: string[] = []

// Dev-only: expose the store for scripted verification (mirrors __gridStore).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __workspaceStore?: typeof useWorkspaceStore }).__workspaceStore =
    useWorkspaceStore
}
