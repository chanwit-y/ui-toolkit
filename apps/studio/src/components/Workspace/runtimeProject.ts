import { splitProjectPages, type GummyPageBody, type GummyProject, type PageLoad, type TModelMaster, type TPageMaster } from '@gummy-ui/ui'
import { serializeEndpoints } from '../Api/serialize'
import type { EndpointDef } from '../Api/types'
import { buildBins, pageLoadsToEngine, rootContainer } from '../Layout/gridConfig'
import { serializeModels } from '../Model/serialize'
import type { ModelDef } from '../Model/types'
import { toThemeObjects } from '../Theme/serialize'
import { isValidActionName as isValidIdentifier } from './customActions'
import { logicLibraryToEngine } from './logic'
import { menuToEngine, shellToEngine } from './menu'
import { enginePageMeta } from './pageMeta'
import { attachedEndpoints, referencedModels } from './snapshots'
import type { LibraryData, ProjectDef, ProjectSnapshot } from './types'
import { authProfileEndpointId, authProfileLoad, authToEngine, normalizeAuthDef, type AuthDef } from './auth'

/**
 * The runtime document (`GummyProject`, `schemaVersion: 1`) a consumer app
 * renders with `<GummyApp>` — see the grilled library / CLI design. One per
 * project, written by the CLI as the folder `gummy/projects/<key>/`
 * (`project.json` + one `pages/<pageKey>.json` per page, see the grilled
 * design `split-pages-lazy-load`) on every save,
 * shown by the Export dialog, and rendered by the Live Preview. It is the
 * engine assembly (model + api lowered like the code panes, every page's
 * exported container, menu / shell / theme / loads) captured as data, so what
 * the preview renders is what the app renders.
 */

/** The file name a project is written under: its name as a slug (`My App` → `my-app`). */
export function projectKey(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'project'
}

/** What `runtimeDocument` reads: a project's name and snapshot (the Live Preview substitutes its live pages). */
export type RuntimeSource = {
  name: string
  description?: string
  snapshot: ProjectSnapshot
  /** The shared auth entry the snapshot's `authId` names (resolved by the caller). */
  auth?: AuthDef | null
}

/** The entry a snapshot picked, or `null` (none, or deleted). */
export function pickedAuth(snapshot: Pick<ProjectSnapshot, 'authId'>, library: Pick<LibraryData, 'auth'>): AuthDef | null {
  if (!snapshot.authId) return null
  const found = (library.auth ?? []).find((a) => a.id === snapshot.authId)
  // Entries saved by an older studio may lack newer fields (the card's keys): fill the defaults.
  return found ? normalizeAuthDef(found) : null
}

/**
 * A project snapshot → the runtime document, against the endpoints it has
 * attached and the models they reference (`endpoints` / `models` are the
 * project-scoped sets, as `useProjectEndpoints` / `useProjectModels` give them).
 */
export function runtimeDocument(source: RuntimeSource, endpoints: EndpointDef[], models: ModelDef[]): GummyProject {
  const { snapshot } = source
  const globalLoads = snapshot.globalLoads ?? []
  const customActions = snapshot.customActions ?? []
  const customComponents = snapshot.customComponents ?? []
  const pages = snapshot.pages
  // The sign-in's profile fetch shows up as a pseudo-load so bindings to it resolve to its slice key.
  const authLoad = authProfileLoad(source.auth ?? undefined)
  const readable = authLoad ? [...globalLoads, authLoad] : globalLoads

  const enginePages: TPageMaster = Object.fromEntries(
    pages.map((pg) => {
      const loads = pageLoadsToEngine(pg.loads, endpoints, readable) as PageLoad[] | undefined
      return [
        pg.key,
        {
          path: pg.path,
          ...enginePageMeta(pg, pages, globalLoads),
          containers: [
            rootContainer(
              `page-${pg.key}`,
              pg.grid.containerSettings,
              buildBins(
                pg.grid.containerSettings,
                pg.grid.items,
                endpoints,
                pages,
                undefined,
                undefined,
                [...(pg.loads ?? []), ...readable],
                customActions,
                customComponents,
                { formulas: snapshot.formulas, rules: snapshot.rules },
              ),
            ),
          ],
          ...(loads?.length ? { loads } : {}),
        },
      ]
    }),
  ) as TPageMaster

  const { theme, components } = toThemeObjects(snapshot.theme)
  const engineGlobalLoads = (pageLoadsToEngine(globalLoads, endpoints, readable) ?? []) as PageLoad[]
  const auth = source.auth ? authToEngine(source.auth, endpoints) : undefined
  const env = Object.fromEntries(snapshot.env.filter((e) => e.name.trim()).map((e) => [e.name.trim(), e.value]))

  return {
    schemaVersion: 1,
    name: source.name,
    ...(source.description ? { description: source.description } : {}),
    env,
    model: serializeModels(models) as TModelMaster,
    api: serializeEndpoints(endpoints, models) as GummyProject['api'],
    pages: enginePages,
    menu: menuToEngine(snapshot.menu, pages),
    shell: shellToEngine(snapshot.shell),
    ...(snapshot.shell.locale?.trim() ? { locale: snapshot.shell.locale.trim() } : {}),
    theme: { theme, components },
    globalLoads: engineGlobalLoads,
    ...(auth ? { auth } : {}),
    // Saved formulas / rules by name (load ids in them resolve to slice keys).
    ...logicLibraryToEngine(snapshot.formulas, snapshot.rules, [...pages.flatMap((pg) => pg.loads ?? []), ...readable]),
    customActions: customActions.map((a) => a.name.trim()).filter(isValidIdentifier),
    customComponents: customComponents
      .filter((c) => isValidIdentifier(c.name.trim()))
      .map((c) => ({
        name: c.name.trim(),
        ...(c.description ? { description: c.description } : {}),
        props: c.props.map((p) => ({
          key: p.key,
          kind: p.kind,
          ...(p.label ? { label: p.label } : {}),
          ...(p.kind === 'select' && p.options.length ? { options: p.options } : {}),
          ...(p.defaultValue !== '' ? { defaultValue: p.defaultValue } : {}),
        })),
      })),
  }
}

/** A stored project → its runtime document, resolving its endpoints and models against the shared library. */
export function projectToRuntime(project: ProjectDef, library: LibraryData): GummyProject {
  const auth = pickedAuth(project.snapshot, library)
  // The picked entry's profile endpoint rides along even when it was never attached (a safety net under the pick's auto-attach).
  const profileEndpointId = authProfileEndpointId(auth ?? undefined)
  const ids = profileEndpointId && !project.snapshot.endpointIds.includes(profileEndpointId)
    ? [...project.snapshot.endpointIds, profileEndpointId]
    : project.snapshot.endpointIds
  const endpoints = attachedEndpoints(ids, library.endpoints)
  const models = referencedModels(endpoints, library.models)
  return runtimeDocument({ ...project, auth }, endpoints, models)
}

/** Every project's file key, in workspace order; a name clash gets `-2`, `-3`… */
export function projectFileKeys(projects: ProjectDef[]): string[] {
  const taken = new Set<string>()
  return projects.map((project) => {
    const base = projectKey(project.name)
    let key = base
    for (let n = 2; taken.has(key); n++) key = `${base}-${n}`
    taken.add(key)
    return key
  })
}

/** Every project of a workspace by its file key, pages inline (the single-file form). */
export function runtimeProjects(projects: ProjectDef[], library: LibraryData): Record<string, GummyProject> {
  const keys = projectFileKeys(projects)
  return Object.fromEntries(projects.map((project, i) => [keys[i], projectToRuntime(project, library)]))
}

/** A project as the CLI / folder picker writes it: `project.json` (the manifest) and `pages/<file>.json` bodies by file name. */
export type ProjectFolder = { project: GummyProject; pages: Record<string, GummyPageBody> }

/** Every project as a folder (pages split out), or only those `only` keeps — keys are still computed over all of them. */
export function projectFolders(
  projects: ProjectDef[],
  library: LibraryData,
  only?: (project: ProjectDef, key: string) => boolean,
): Record<string, ProjectFolder> {
  const keys = projectFileKeys(projects)
  const out: Record<string, ProjectFolder> = {}
  projects.forEach((project, i) => {
    if (only && !only(project, keys[i])) return
    out[keys[i]] = splitProjectPages(projectToRuntime(project, library))
  })
  return out
}

function parsePayload(payload: string): { projects: ProjectDef[]; library: LibraryData } | null {
  const parsed = JSON.parse(payload) as { state?: { projects?: ProjectDef[]; library?: LibraryData } }
  const projects = parsed.state?.projects
  const library = parsed.state?.library
  return Array.isArray(projects) && library ? { projects, library } : null
}

/**
 * The CLI autosave's deriver (see the grilled design `split-pages-lazy-load`):
 * remembers what the last successful write carried and returns only the
 * folders of projects whose own data, file key or the shared library (whose
 * models / endpoints / auth every document embeds) changed since — a one-field
 * edit serializes one project. The first call ships everything. `commit` is
 * called once the CLI took the write; a refused write leaves the projects dirty.
 */
export function createProjectFolderDeriver(): (payload: string) => { projectFolders: Record<string, ProjectFolder>; commit: () => void } {
  let sentLibrary: string | null = null
  let sentProjects = new Map<string, string>()
  return (payload) => {
    const data = parsePayload(payload)
    if (!data) return { projectFolders: {}, commit: () => {} }
    const library = JSON.stringify(data.library)
    const libraryChanged = library !== sentLibrary
    const keys = projectFileKeys(data.projects)
    const signatures = new Map(data.projects.map((p, i) => [p.id, `${keys[i]}\u0000${JSON.stringify(p)}`]))
    const folders = projectFolders(data.projects, data.library, (p) => libraryChanged || sentProjects.get(p.id) !== signatures.get(p.id))
    return {
      projectFolders: folders,
      commit: () => {
        sentLibrary = library
        sentProjects = signatures
      },
    }
  }
}

/**
 * The same, from the persisted payload the `persist` middleware hands the
 * storage (`{ state: { projects, library, … }, version }`) — what the CLI
 * storage calls before each write.
 */
export function runtimeProjectsFromPayload(payload: string): Record<string, GummyProject> {
  const data = parsePayload(payload)
  return data ? runtimeProjects(data.projects, data.library) : {}
}
