import type { GummyProject, PageLoad, TModelMaster, TPageMaster } from '@gummy-ui/ui'
import { serializeEndpoints } from '../Api/serialize'
import { buildBins, pageLoadsToEngine, rootContainer } from '../Layout/gridConfig'
import { serializeModels } from '../Model/serialize'
import { toThemeObjects } from '../Theme/serialize'
import { isValidActionName as isValidIdentifier } from './customActions'
import { menuToEngine, shellToEngine } from './menu'
import { enginePageMeta } from './pageMeta'
import { attachedEndpoints, referencedModels } from './snapshots'
import type { LibraryData, ProjectDef } from './types'

/**
 * The runtime document (`GummyProject`, `schemaVersion: 1`) a consumer app
 * renders with `<GummyApp>` — see the grilled library / CLI design. One per
 * project, written by the CLI to `gummy/projects/<key>.json` on every save.
 * It is the Live Preview's engine assembly (model + api lowered like the
 * code tabs, every page's exported container, menu / shell / theme / loads)
 * captured as data, so what the preview renders is what the app renders.
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

export function projectToRuntime(project: ProjectDef, library: LibraryData): GummyProject {
  const { snapshot } = project
  const endpoints = attachedEndpoints(snapshot.endpointIds, library.endpoints)
  const models = referencedModels(endpoints, library.models)
  const globalLoads = snapshot.globalLoads ?? []
  const customActions = snapshot.customActions ?? []
  const customComponents = snapshot.customComponents ?? []
  const pages = snapshot.pages

  const enginePages: TPageMaster = Object.fromEntries(
    pages.map((pg) => {
      const loads = pageLoadsToEngine(pg.loads, endpoints, globalLoads) as PageLoad[] | undefined
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
                [...(pg.loads ?? []), ...globalLoads],
                customActions,
                customComponents,
              ),
            ),
          ],
          ...(loads?.length ? { loads } : {}),
        },
      ]
    }),
  ) as TPageMaster

  const { theme, components } = toThemeObjects(snapshot.theme)
  const engineGlobalLoads = (pageLoadsToEngine(globalLoads, endpoints) ?? []) as PageLoad[]
  const env = Object.fromEntries(snapshot.env.filter((e) => e.name.trim()).map((e) => [e.name.trim(), e.value]))

  return {
    schemaVersion: 1,
    name: project.name,
    ...(project.description ? { description: project.description } : {}),
    env,
    model: serializeModels(models) as TModelMaster,
    api: serializeEndpoints(endpoints, models) as GummyProject['api'],
    pages: enginePages,
    menu: menuToEngine(snapshot.menu, pages),
    shell: shellToEngine(snapshot.shell),
    theme: { theme, components },
    globalLoads: engineGlobalLoads,
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

/** Every project of a workspace by its file key; a name clash gets `-2`, `-3`… */
export function runtimeProjects(projects: ProjectDef[], library: LibraryData): Record<string, GummyProject> {
  const out: Record<string, GummyProject> = {}
  for (const project of projects) {
    const base = projectKey(project.name)
    let key = base
    for (let n = 2; key in out; n++) key = `${base}-${n}`
    out[key] = projectToRuntime(project, library)
  }
  return out
}

/**
 * The same, from the persisted payload the `persist` middleware hands the
 * storage (`{ state: { projects, library, … }, version }`) — what the CLI
 * storage calls before each write.
 */
export function runtimeProjectsFromPayload(payload: string): Record<string, GummyProject> {
  const parsed = JSON.parse(payload) as { state?: { projects?: ProjectDef[]; library?: LibraryData } }
  const projects = parsed.state?.projects
  const library = parsed.state?.library
  if (!Array.isArray(projects) || !library) return {}
  return runtimeProjects(projects, library)
}
