import type { NavParamSource } from '../Layout/types'
import { builtinTemplates } from '../seed/templates'
import { authEnvRows, authProfileEndpointId } from './auth'
import { withSeedLibrary } from './migrate'
import type { PageLoadDef } from './pageLoads'
import {
  countryEndpointIds,
  countryProjectSnapshot,
  createPage,
  emptyProjectSnapshot,
  isValidPageKey,
  normalizePath,
} from './snapshots'
import type { LibraryData, PageDef, PageGrid, ProjectDef, ProjectSnapshot } from './types'

/*
 * The workspace editing rules as pure functions (see the grilled design
 * `mcp-server`): `workspaceStore` commits them to the live workspace and the
 * headless `gummy mcp` to a stored one. Activity logging stays with the
 * caller — each records its own lines.
 */

function createId(): string {
  return crypto.randomUUID()
}

/** Apply `fn` to one project, stamping `updatedAt`. */
export function patchProject(
  projects: ProjectDef[],
  id: string,
  fn: (p: ProjectDef) => Partial<ProjectDef>,
): ProjectDef[] {
  return projects.map((p) => (p.id === id ? { ...p, ...fn(p), updatedAt: Date.now() } : p))
}

/** Replace one field of a project's snapshot (menu, shell, env, theme, loads, …). */
export function setSnapshotField<K extends keyof ProjectSnapshot>(
  projects: ProjectDef[],
  id: string,
  key: K,
  value: ProjectSnapshot[K],
): ProjectDef[] {
  return patchProject(projects, id, (p) => ({ snapshot: { ...p.snapshot, [key]: value } }))
}

/** Is `candidate` reachable from `ancestorId` by following `parentId` upward? (Cycle guard for parent picks.) */
export function isDescendant(pages: PageDef[], candidate: string, ancestorId: string): boolean {
  const seen = new Set<string>()
  let cur: string | undefined = candidate
  while (cur && !seen.has(cur)) {
    if (cur === ancestorId) return true
    seen.add(cur)
    cur = pages.find((pg) => pg.id === cur)?.parentId
  }
  return false
}

/**
 * A new project, first in the list: empty, or the countries example (whose
 * pages bind to the seed endpoints / models by id, so a library that lacks
 * them gets the missing entries added — nothing it already has is touched).
 */
export function createProject(
  data: { projects: ProjectDef[]; library: LibraryData },
  input: { name: string; description: string; fromSeed: boolean },
): { projects: ProjectDef[]; library: LibraryData; project: ProjectDef } {
  const now = Date.now()
  const library = input.fromSeed ? withSeedLibrary(data.library) : data.library
  const name = input.name.trim() || 'Untitled project'
  const project: ProjectDef = {
    id: createId(),
    name,
    description: input.description.trim(),
    createdAt: now,
    updatedAt: now,
    snapshot: input.fromSeed
      ? { ...countryProjectSnapshot(library), endpointIds: countryEndpointIds(library) }
      : emptyProjectSnapshot(name),
  }
  return { projects: [project, ...data.projects], library, project }
}

/** A fresh CLI folder's workspace: one empty project named after the consumer package, an empty library. */
export function freshWorkspace(projectName: string): { projects: ProjectDef[]; library: LibraryData } {
  const now = Date.now()
  const name = projectName.trim() || 'My app'
  return {
    projects: [{ id: createId(), name, description: '', createdAt: now, updatedAt: now, snapshot: emptyProjectSnapshot(name) }],
    library: { groups: [], models: [], endpoints: [], templates: builtinTemplates(), auth: [] },
  }
}

export function updateProject(projects: ProjectDef[], id: string, patch: { name?: string; description?: string }): ProjectDef[] {
  return patchProject(projects, id, () => ({
    ...(patch.name != null ? { name: patch.name } : {}),
    ...(patch.description != null ? { description: patch.description } : {}),
  }))
}

export function deleteProject(projects: ProjectDef[], id: string): ProjectDef[] {
  return projects.filter((p) => p.id !== id)
}

/** A new page at the end of the project; its key is made unique (an explicit valid `key` is honoured when free). */
export function addPage(
  projects: ProjectDef[],
  projectId: string,
  input: { name: string; path?: string; grid?: PageGrid; key?: string },
): { projects: ProjectDef[]; page: PageDef } {
  const taken = projects.find((p) => p.id === projectId)?.snapshot.pages.map((pg) => pg.key) ?? []
  const page = createPage(input.name, input.path, input.grid, taken, input.key)
  return {
    projects: patchProject(projects, projectId, (p) => ({ snapshot: { ...p.snapshot, pages: [...p.snapshot.pages, page] } })),
    page,
  }
}

export type PagePatch = {
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
  /** Replaces the page's canvas tree. */
  grid?: PageGrid
}

/**
 * Patch one page. A key is accepted only when it is a valid identifier no
 * other page of the project uses, a parent only when it exists and makes no
 * cycle — otherwise the current value stays.
 */
export function updatePage(projects: ProjectDef[], projectId: string, pageId: string, patch: PagePatch): ProjectDef[] {
  return patchProject(projects, projectId, (p) => ({
    snapshot: {
      ...p.snapshot,
      pages: p.snapshot.pages.map((pg) => {
        if (pg.id !== pageId) return pg
        const name = patch.name != null ? patch.name.trim() || pg.name : pg.name
        const path = patch.path != null ? normalizePath(patch.path, name) : pg.path
        const wanted = patch.key?.trim()
        const key =
          wanted && isValidPageKey(wanted) && !p.snapshot.pages.some((other) => other.id !== pageId && other.key === wanted)
            ? wanted
            : pg.key
        const next: PageDef = { ...pg, name, path, key }
        if (patch.parentId !== undefined) {
          if (patch.parentId === null) delete next.parentId
          else if (
            patch.parentId !== pageId &&
            p.snapshot.pages.some((other) => other.id === patch.parentId) &&
            !isDescendant(p.snapshot.pages, patch.parentId, pageId)
          )
            next.parentId = patch.parentId
        }
        if (patch.crumb !== undefined) {
          if (patch.crumb === null) delete next.crumb
          else next.crumb = patch.crumb
        }
        if (patch.hideBreadcrumbs !== undefined) {
          if (patch.hideBreadcrumbs) next.hideBreadcrumbs = true
          else delete next.hideBreadcrumbs
        }
        if (patch.loads !== undefined) next.loads = patch.loads
        if (patch.grid !== undefined) next.grid = patch.grid
        return next
      }),
    },
  }))
}

/** Reorder: move the page `delta` positions (clamped). */
export function movePage(projects: ProjectDef[], projectId: string, pageId: string, delta: number): ProjectDef[] {
  return patchProject(projects, projectId, (p) => {
    const pages = p.snapshot.pages.slice()
    const from = pages.findIndex((pg) => pg.id === pageId)
    if (from === -1) return {}
    const to = Math.max(0, Math.min(pages.length - 1, from + delta))
    if (to === from) return {}
    const [pg] = pages.splice(from, 1)
    pages.splice(to, 0, pg)
    return { snapshot: { ...p.snapshot, pages } }
  })
}

/** Delete a page — a project always keeps at least one. */
export function deletePage(projects: ProjectDef[], projectId: string, pageId: string): ProjectDef[] {
  return patchProject(projects, projectId, (p) => {
    if (p.snapshot.pages.length < 2) return {}
    return { snapshot: { ...p.snapshot, pages: p.snapshot.pages.filter((pg) => pg.id !== pageId) } }
  })
}

export function attachEndpoints(projects: ProjectDef[], projectId: string, endpointIds: string[]): ProjectDef[] {
  return patchProject(projects, projectId, (p) => {
    const have = new Set(p.snapshot.endpointIds)
    const next = [...p.snapshot.endpointIds, ...endpointIds.filter((id) => !have.has(id))]
    return { snapshot: { ...p.snapshot, endpointIds: next } }
  })
}

export function detachEndpoint(projects: ProjectDef[], projectId: string, endpointId: string): ProjectDef[] {
  return patchProject(projects, projectId, (p) => ({
    snapshot: { ...p.snapshot, endpointIds: p.snapshot.endpointIds.filter((id) => id !== endpointId) },
  }))
}

/** Drop an endpoint id from every project (library delete). */
export function detachEverywhere(projects: ProjectDef[], endpointId: string): ProjectDef[] {
  return projects.map((p) =>
    p.snapshot.endpointIds.includes(endpointId)
      ? { ...p, snapshot: { ...p.snapshot, endpointIds: p.snapshot.endpointIds.filter((id) => id !== endpointId) } }
      : p,
  )
}

/**
 * Pick the shared sign-in entry a project uses (`null` = none): sets
 * `authId` and attaches the entry's profile endpoint. With `withEnv`, also
 * the env rows the pick implies (the four var names present and locked,
 * unlocked on a change of entry) — the studio leaves that to its live env
 * store, the headless side applies it to the snapshot.
 */
export function setProjectAuth(
  data: { projects: ProjectDef[]; library: LibraryData },
  projectId: string,
  authId: string | null,
  withEnv = false,
): ProjectDef[] {
  const auth = data.library.auth ?? []
  const def = authId ? auth.find((a) => a.id === authId) : undefined
  const endpointId = authProfileEndpointId(def)
  return patchProject(data.projects, projectId, (p) => {
    const previous = p.snapshot.authId ? (auth.find((a) => a.id === p.snapshot.authId) ?? null) : null
    return {
      snapshot: {
        ...p.snapshot,
        authId,
        endpointIds:
          endpointId && !p.snapshot.endpointIds.includes(endpointId) ? [...p.snapshot.endpointIds, endpointId] : p.snapshot.endpointIds,
        ...(withEnv ? { env: authEnvRows(def ?? null, p.snapshot.env, previous) } : {}),
      },
    }
  })
}
