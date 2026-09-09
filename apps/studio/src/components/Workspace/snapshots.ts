import { useApiStore } from '../Api/apiStore'
import { useApiTestStore } from '../Api/testStore'
import type { EndpointDef } from '../Api/types'
import { MODEL_REF_KEYS } from '../Api/types'
import { useEnvStore } from '../Env/envStore'
import { useGridStore } from '../Layout/gridStore'
import { defaultContainerSettings, type GridItemData } from '../Layout/types'
import { useGroupStore } from '../Library/groupStore'
import { useModelStore } from '../Model/modelStore'
import type { ModelDef } from '../Model/types'
import {
  countrySeedEndpoints,
  countrySeedEnvVars,
  countrySeedGridItems,
  countrySeedModels,
  countrySeedTheme,
} from '../seed/country'
import { useThemeStore } from '../Theme/themeStore'
import type { StudioThemeConfig } from '../Theme/types'
import type { LibraryData, PageDef, PageGrid, ProjectSnapshot } from './types'

export const COUNTRIES_GROUP_ID = 'seed-group-countries'

/** The seeded shared library: the country models + endpoints in one group. */
export function countryLibrary(): LibraryData {
  return {
    groups: [
      {
        id: COUNTRIES_GROUP_ID,
        name: 'Countries',
        description: 'Reference data behind the country collection (the mock API).',
      },
    ],
    models: countrySeedModels().map((m) => ({ ...m, groupId: COUNTRIES_GROUP_ID })),
    endpoints: countrySeedEndpoints().map((e) => ({ ...e, groupId: COUNTRIES_GROUP_ID })),
  }
}

/** The ids the countries example attaches (only those still in the library). */
export function countryEndpointIds(library: LibraryData): string[] {
  const seedIds = new Set(countrySeedEndpoints().map((e) => e.id))
  return library.endpoints.filter((e) => seedIds.has(e.id)).map((e) => e.id)
}

/* ----------------------------------------------------------------- pages */

/** `"Country detail"` → `"/country-detail"` — the default route for a page. */
export function slugPath(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9:]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return '/' + (slug || 'page')
}

/** Normalise a hand-typed route: one leading slash, no trailing one. */
export function normalizePath(path: string, fallbackName: string): string {
  const trimmed = path.trim().replace(/\s+/g, '-')
  if (!trimmed || trimmed === '/') return slugPath(fallbackName)
  const withSlash = trimmed.startsWith('/') ? trimmed : '/' + trimmed
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash
}

/** The `:param` names in a route, in order (`/countries/:code` → `['code']`). */
export function pathParams(path: string): string[] {
  const out: string[] = []
  const re = /:([A-Za-z_][A-Za-z0-9_]*)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(path))) out.push(m[1])
  return out
}

export function emptyPageGrid(): PageGrid {
  return { items: [], containerSettings: defaultContainerSettings, fieldSeq: 0 }
}

/** A new page: fresh id, the given name, its slug as the route, an empty canvas. */
export function createPage(name: string, path?: string, grid?: PageGrid): PageDef {
  const cleanName = name.trim() || 'Untitled page'
  return {
    id: crypto.randomUUID(),
    name: cleanName,
    path: normalizePath(path ?? '', cleanName),
    grid: grid ?? emptyPageGrid(),
  }
}

/** The countries example: the list page (modal + table), plus an empty detail
 * page routed with a `:code` param, attached to the seeded endpoints. */
export function countryProjectSnapshot(library: LibraryData): ProjectSnapshot {
  return {
    pages: [
      {
        id: 'seed-page-countries',
        name: 'Countries',
        path: '/countries',
        grid: {
          items: countrySeedGridItems(),
          containerSettings: defaultContainerSettings,
          fieldSeq: 0,
        },
      },
      {
        id: 'seed-page-country-detail',
        name: 'Country detail',
        path: '/countries/:code',
        grid: emptyPageGrid(),
      },
    ],
    env: countrySeedEnvVars(),
    theme: countrySeedTheme(),
    endpointIds: countryEndpointIds(library),
  }
}

/** ThemeProvider's own defaults, nothing overridden. */
function defaultThemeConfig(): StudioThemeConfig {
  return {
    appearance: 'light',
    accentColor: 'blue',
    radius: 'small',
    panelBackground: 'translucent',
    buttonColor: '',
    dataTable: {
      headerColor: '',
      headerTextColor: '',
      headerFontSize: '',
      headerFontWeight: '',
      headerHoverColor: '',
      paginationButtonColor: '',
      paginationButtonHoverColor: '',
      rowHoverColor: '',
      editButtonColor: '',
      deleteButtonColor: '',
    },
  }
}

/** A blank project: one empty page, nothing attached, the locked API_URL, default theme. */
export function emptyProjectSnapshot(): ProjectSnapshot {
  return {
    pages: [createPage('Page 1')],
    env: countrySeedEnvVars(),
    theme: defaultThemeConfig(),
    endpointIds: [],
  }
}

/** The project-owned part of the live stores: the active page's grid, env, theme. */
export type ProjectStateSnapshot = Pick<ProjectSnapshot, 'env' | 'theme'> & { grid: PageGrid }

export function collectProjectState(): ProjectStateSnapshot {
  const grid = useGridStore.getState()
  return {
    grid: { items: grid.items, containerSettings: grid.containerSettings, fieldSeq: grid.fieldSeq },
    env: useEnvStore.getState().vars,
    theme: useThemeStore.getState().config,
  }
}

/** The library part of the live stores (groups / models / endpoints). */
export function collectLibrary(): LibraryData {
  return {
    groups: useGroupStore.getState().groups,
    models: useModelStore.getState().models,
    endpoints: useApiStore.getState().endpoints,
  }
}

/**
 * True while a hydration is writing the stores, so the autosave subscribers
 * can tell a hydration from an edit.
 */
let hydrating = false
export const isHydrating = () => hydrating

/** Load a project's shared state (env / theme) into the live stores. */
export function applyProjectState(snapshot: Pick<ProjectSnapshot, 'env' | 'theme'>): void {
  hydrating = true
  try {
    useEnvStore.getState().hydrate(snapshot.env)
    useThemeStore.getState().hydrate(snapshot.theme)
    useApiTestStore.getState().clear()
  } finally {
    hydrating = false
  }
}

/** Load one page's canvas into the grid store (project open / page switch). */
export function applyPageGrid(grid: PageGrid): void {
  hydrating = true
  try {
    useGridStore.getState().hydrate(grid)
  } finally {
    hydrating = false
  }
}

/** Load the shared library into the group / model / api stores. */
export function applyLibrary(library: LibraryData): void {
  hydrating = true
  try {
    useGroupStore.getState().hydrate(library.groups)
    useModelStore.getState().hydrate(library.models)
    useApiStore.getState().hydrate(library.endpoints)
  } finally {
    hydrating = false
  }
}

/** Every cell across every page of a project (child canvases included). */
export function countProjectComponents(pages: PageDef[]): number {
  return pages.reduce((n, p) => n + countComponents(p.grid.items), 0)
}

/** Every cell in the tree, child canvases included — the portal row's "N components". */
export function countComponents(items: GridItemData[]): number {
  let n = 0
  const walk = (list: GridItemData[]) => {
    for (const item of list) {
      n++
      item.childCanvases?.forEach((c) => walk(c.items))
    }
  }
  walk(items)
  return n
}

/** The endpoints a project has attached, in attach order (missing ids skipped). */
export function attachedEndpoints(endpointIds: string[], endpoints: EndpointDef[]): EndpointDef[] {
  const byId = new Map(endpoints.map((e) => [e.id, e]))
  return endpointIds.map((id) => byId.get(id)).filter((e): e is EndpointDef => !!e)
}

/** The models the given endpoints reference (deduplicated, library order). */
export function referencedModels(endpoints: EndpointDef[], models: ModelDef[]): ModelDef[] {
  const ids = new Set<string>()
  for (const e of endpoints) for (const key of MODEL_REF_KEYS) if (e[key]) ids.add(e[key]!)
  return models.filter((m) => ids.has(m.id))
}
