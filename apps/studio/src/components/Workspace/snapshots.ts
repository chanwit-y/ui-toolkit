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
import type { LibraryData, ProjectSnapshot } from './types'

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

/** The countries example canvas, attached to the seeded endpoints. */
export function countryProjectSnapshot(library: LibraryData): ProjectSnapshot {
  return {
    grid: { items: countrySeedGridItems(), containerSettings: defaultContainerSettings, fieldSeq: 0 },
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

/** A blank project: empty canvas, nothing attached, the locked API_URL, default theme. */
export function emptyProjectSnapshot(): ProjectSnapshot {
  return {
    grid: { items: [], containerSettings: defaultContainerSettings, fieldSeq: 0 },
    env: countrySeedEnvVars(),
    theme: defaultThemeConfig(),
    endpointIds: [],
  }
}

/** The project-owned part of the live stores (grid / env / theme). */
export type ProjectStateSnapshot = Pick<ProjectSnapshot, 'grid' | 'env' | 'theme'>

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

/** Load a project's own state into the grid / env / theme stores. */
export function applyProjectState(snapshot: ProjectStateSnapshot): void {
  hydrating = true
  try {
    useGridStore.getState().hydrate(snapshot.grid)
    useEnvStore.getState().hydrate(snapshot.env)
    useThemeStore.getState().hydrate(snapshot.theme)
    useApiTestStore.getState().clear()
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
