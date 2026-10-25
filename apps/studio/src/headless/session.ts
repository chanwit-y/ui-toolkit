import { locateItem, type PathSeg } from '../components/Layout/canvasCommands'
import type { ChildCanvas, GridItemData } from '../components/Layout/types'
import { attachEndpoints, patchProject } from '../components/Workspace/commands'
import { projectFileKeys } from '../components/Workspace/runtimeProject'
import type { ActivityEntry, ActivityKind, PageDef, ProjectDef, WorkspaceData } from '../components/Workspace/types'
import { ToolError } from './errors'
import { allItems } from './refs'

/*
 * One tool call's working state (see the grilled design `mcp-server`): the
 * workspace being edited (replaced, never mutated — a failed call or a batch
 * step that throws simply drops it), the warnings to report and the activity
 * lines to record, plus the lookups every tool shares: a project / page /
 * item by id or name, and a page's canvases by `{ item, canvas }`.
 */

const ACTIVITY_CAP = 500

export type CanvasRef = { item: string; canvas: number }

export class Session {
  ws: WorkspaceData
  readonly actor: string
  readonly warnings: string[] = []

  constructor(ws: WorkspaceData, actor: string) {
    this.ws = ws
    this.actor = actor
  }

  warn(message: string) {
    if (!this.warnings.includes(message)) this.warnings.push(message)
  }

  /** Record an Activity page line as the MCP's actor. */
  log(verb: string, kind: ActivityKind, name: string, detail: string, projectId: string | null) {
    const entry: ActivityEntry = { id: crypto.randomUUID(), ts: Date.now(), user: this.actor, verb, kind, name, detail, projectId }
    this.ws = { ...this.ws, activity: [entry, ...this.ws.activity].slice(0, ACTIVITY_CAP) }
  }

  // ------------------------------------------------------------ projects

  /** A project by id, file key (`book-shop`) or exact name. */
  project(ref: unknown, path = 'project'): ProjectDef {
    if (typeof ref !== 'string' || !ref) throw new ToolError('a project id, key or name is required', path)
    const { projects } = this.ws
    const byId = projects.find((p) => p.id === ref)
    if (byId) return byId
    const keys = projectFileKeys(projects)
    const byKey = projects.filter((_, i) => keys[i] === ref)
    if (byKey.length === 1) return byKey[0]
    const byName = projects.filter((p) => p.name === ref)
    if (byName.length === 1) return byName[0]
    if (byName.length > 1) throw new ToolError(`"${ref}" names ${byName.length} projects — use the id`, path)
    throw new ToolError(`no project "${ref}" (projects: ${projects.map((p, i) => `${keys[i]} (${p.name})`).join(', ') || 'none'})`, path)
  }

  setProjects(projects: ProjectDef[]) {
    this.ws = { ...this.ws, projects }
  }

  /** Attach library endpoints a config just referenced, when the project lacks them. */
  attachUsed(projectId: string, endpointIds: Iterable<string>) {
    const project = this.project(projectId)
    const missing = [...endpointIds].filter((id) => !project.snapshot.endpointIds.includes(id))
    if (!missing.length) return
    this.setProjects(attachEndpoints(this.ws.projects, projectId, missing))
    const names = missing.map((id) => this.ws.library.endpoints.find((e) => e.id === id)?.name ?? id)
    this.warn(`attached ${names.join(', ')} to ${project.name} (referenced by the config)`)
    this.log('attached', 'api', names.join(', '), `to ${project.name}`, projectId)
  }

  // --------------------------------------------------------------- pages

  /** A page by id, key, name or path. */
  page(project: ProjectDef, ref: unknown, path = 'page'): PageDef {
    if (typeof ref !== 'string' || !ref) throw new ToolError('a page id, key, name or path is required', path)
    const pages = project.snapshot.pages
    const byId = pages.find((p) => p.id === ref)
    if (byId) return byId
    for (const field of ['key', 'path', 'name'] as const) {
      const hits = pages.filter((p) => p[field] === ref)
      if (hits.length === 1) return hits[0]
      if (hits.length > 1) throw new ToolError(`"${ref}" is the ${field} of ${hits.length} pages — use the id`, path)
    }
    throw new ToolError(`no page "${ref}" in ${project.name} (pages: ${pages.map((p) => `${p.key} ${p.path}`).join(', ')})`, path)
  }

  /** Replace one page of a project (by id). */
  setPage(projectId: string, page: PageDef) {
    this.setProjects(
      patchProject(this.ws.projects, projectId, (p) => ({
        snapshot: { ...p.snapshot, pages: p.snapshot.pages.map((pg) => (pg.id === page.id ? page : pg)) },
      })),
    )
  }

  // ------------------------------------------------------------ canvases

  /** An item of the page by id, else by its binding name / modal id / label (unique). */
  item(page: PageDef, ref: unknown, path = 'item'): { item: GridItemData; path: PathSeg[] } {
    if (typeof ref !== 'string' || !ref) throw new ToolError('an item id or name is required', path)
    const root = rootCanvas(page)
    const direct = locateItem(root, ref)
    if (direct) return direct
    const hits = allItems(root).filter((i) => {
      const c = i.config as { name?: unknown; id?: unknown } | undefined
      return c?.name === ref || c?.id === ref || i.label === ref
    })
    if (hits.length === 1) return locateItem(root, hits[0].id)!
    if (hits.length > 1) throw new ToolError(`"${ref}" names ${hits.length} items on ${page.key} — use the id`, path)
    throw new ToolError(`no item "${ref}" on page ${page.key}`, path)
  }

  /** The drill-in path of `{ item, canvas }` (absent = the page's root canvas). */
  canvasPath(page: PageDef, ref: CanvasRef | undefined | null, path = 'parent'): PathSeg[] {
    if (!ref) return []
    const { item, path: itemPath } = this.item(page, ref.item, `${path}.item`)
    const index = ref.canvas ?? 0
    if (!item.childCanvases?.[index]) {
      const n = item.childCanvases?.length ?? 0
      throw new ToolError(
        n ? `${item.type} "${item.id}" has ${n} canvas(es) (0–${n - 1}), not ${index}` : `${item.type} "${item.id}" holds no canvas`,
        `${path}.canvas`,
      )
    }
    return [...itemPath, { itemId: item.id, canvasIndex: index }]
  }
}

export function rootCanvas(page: PageDef): ChildCanvas {
  return { items: page.grid.items, settings: page.grid.containerSettings }
}

/** The page with its canvas tree replaced by `root` (and `fieldSeq` when given). */
export function withRoot(page: PageDef, root: ChildCanvas, fieldSeq = page.grid.fieldSeq): PageDef {
  return { ...page, grid: { items: root.items, containerSettings: root.settings, fieldSeq } }
}
