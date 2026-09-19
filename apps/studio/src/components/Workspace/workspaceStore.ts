import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EndpointDef } from '../Api/types'
import type { ModelDef } from '../Model/types'
import type { ThemeAppearance } from '../Theme/types'
import { seedActivity } from '../seed/activity'
import {
  countryLanguagesSeedItem,
  formListDemoSeedEndpoints,
  formListDemoSeedModels,
  repeaterDemoSeedEndpoints,
  repeaterDemoSeedModels,
  languageSeedEndpoints,
  languageSeedModels,
  LANGUAGES_ITEM_ID,
} from '../seed/country'
import { builtinTemplates } from '../seed/templates'
import {
  COUNTRIES_GROUP_ID,
  countryEndpointIds,
  countryLibrary,
  countryProjectSnapshot,
  createPage,
  isValidPageKey,
  uniquePageKey,
  emptyPageGrid,
  emptyProjectSnapshot,
  normalizePath,
  defaultAppBar,
  defaultShell,
  optionDemoPages,
  formListDemoPage,
  repeaterDemoPage,
  uploadDemoPage,
  OPTION_DEMO_MENU_ICONS,
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
  ProjectSnapshot,
  AppBarSettings,
  ShellSettings,
  TemplateDef,
  WorkspaceData,
  MenuItemDef,
} from './types'
import { walkItems } from '../Layout/pageLinks'
import { defaultMenu } from './menu'
import type { AvatarConfig, ButtonItemConfig, FormListConfig, GridItemData, ModalConfig, NavParamSource, PopoverConfig, SelectFieldConfig, TextConfig, TypographyConfig, UploadFileConfig } from '../Layout/types'

const ACTIVITY_CAP = 500
/** Autosaves are continuous; a "saved" line is worth recording this often. */
const SAVE_LOG_INTERVAL_MS = 10 * 60 * 1000
const lastSaveLog = new Map<string, number>()

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
  /** Replace the project's app-shell menu (the Menu tab). */
  updateProjectMenu: (id: string, menu: MenuItemDef[]) => void
  updateProjectShell: (id: string, shell: ShellSettings) => void
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

/** Is `candidate` reachable from `ancestorId` by following `parentId` upward? (Cycle guard for parent picks.) */
function isDescendant(pages: PageDef[], candidate: string, ancestorId: string): boolean {
  const seen = new Set<string>()
  let cur: string | undefined = candidate
  while (cur && !seen.has(cur)) {
    if (cur === ancestorId) return true
    seen.add(cur)
    cur = pages.find((pg) => pg.id === cur)?.parentId
  }
  return false
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

/** v3 pages had no `key`. */
type V3Page = Omit<PageDef, 'key'> & { key?: string }
type V3Project = Omit<ProjectDef, 'snapshot'> & {
  snapshot: Omit<ProjectSnapshot, 'pages'> & { pages: V3Page[] }
}

/** v2 → v3: the single canvas becomes the project's first (and only) page. */
function migrateV2(projects: V2Project[]): V3Project[] {
  return projects.map((p) => {
    const { grid, ...rest } = p.snapshot
    return { ...p, snapshot: { ...rest, pages: [createPage('Page 1', '/', grid)] } }
  })
}

/** The v3 design-only page navigation a button carried. */
type V3PageNavigation = { kind: 'page'; pageId: string; params: Record<string, string> }

/**
 * v3 → v4 (see the grilled page-router design): every page gets a `key`
 * derived from its name, and a button's design-only "go to page" becomes the
 * engine `Navigate` action with a `navigate` target (fixed values → `value`
 * sources), appended to its direct or confirm-true action list. Templates
 * carry the same button configs, so their grids are migrated too (their page
 * refs are dropped on insert anyway, see `cloneItems`).
 */
function migrateButtonNavigation(items: GridItemData[]): void {
  walkItems(items, (item) => {
    if (item.type !== 'button' || !item.config) return
    const c = item.config as ButtonItemConfig & { navigation?: { kind: string } }
    const nav = c.navigation as V3PageNavigation | { kind: string } | undefined
    if (!nav || nav.kind !== 'page') return
    const page = nav as V3PageNavigation
    c.navigate = {
      pageId: page.pageId ?? '',
      params: Object.fromEntries(
        Object.entries(page.params ?? {}).map(([k, v]) => [k, { type: 'value', value: v }]),
      ),
      replace: false,
    }
    const list = c.mode === 'confirm' ? c.confirmTrue : c.actions
    if (!list.includes('Navigate')) list.push('Navigate')
    c.navigation = { kind: 'none' }
  })
}

/** v4 projects had no app-shell menu. */
type V4Project = Omit<ProjectDef, 'snapshot'> & {
  snapshot: Omit<ProjectSnapshot, 'menu' | 'shell'> & { menu?: MenuItemDef[] }
}

/** v4 → v5: every project gets a menu, seeded with one link per param-less page. */
function migrateV4(projects: V4Project[]): V5Project[] {
  return projects.map((p) => ({
    ...p,
    snapshot: {
      ...p.snapshot,
      menu: Array.isArray(p.snapshot.menu) ? p.snapshot.menu : defaultMenu(p.snapshot.pages),
    },
  }))
}

/** v5 projects had no shell settings. */
type V5Project = Omit<ProjectDef, 'snapshot'> & {
  snapshot: Omit<ProjectSnapshot, 'shell'> & { shell?: Omit<ShellSettings, 'appBar' | 'menuIcons' | 'collapsible'> }
}

/** v5 → v6: every project gets shell settings (sidebar navigation, breadcrumbs on). */
function migrateV5(projects: V5Project[]): V6Project[] {
  return projects.map((p) => ({
    ...p,
    snapshot: { ...p.snapshot, shell: p.snapshot.shell ?? defaultShell() },
  }))
}

/** v6 shell settings had no app bar. */
type V6Project = Omit<ProjectDef, 'snapshot'> & {
  snapshot: Omit<ProjectSnapshot, 'shell'> & {
    shell: Omit<ShellSettings, 'appBar' | 'menuIcons' | 'collapsible'> & {
      appBar?: V8Project['snapshot']['shell']['appBar']
      menuIcons?: boolean
      collapsible?: boolean
    }
  }
}

/** v6 → v7: the app bar defaults to a panel bar titled after the project. */
function migrateV6(projects: V6Project[]): V7Project[] {
  return projects.map((p) => ({
    ...p,
    snapshot: {
      ...p.snapshot,
      shell: { ...p.snapshot.shell, appBar: p.snapshot.shell.appBar ?? defaultAppBar(p.name) },
    },
  }))
}

/** v7 shell settings had no menu-icons switch. */
type V7Project = Omit<ProjectDef, 'snapshot'> & {
  snapshot: Omit<ProjectSnapshot, 'shell'> & {
    shell: Omit<ShellSettings, 'menuIcons' | 'appBar' | 'collapsible'> & {
      menuIcons?: boolean
      appBar: V8Project['snapshot']['shell']['appBar']
      collapsible?: boolean
    }
  }
}

/** v7 → v8: menu item icons shown. */
function migrateV7(projects: V7Project[]): V8Project[] {
  return projects.map((p) => ({
    ...p,
    snapshot: {
      ...p.snapshot,
      shell: { ...p.snapshot.shell, menuIcons: p.snapshot.shell.menuIcons ?? true },
    },
  }))
}

/** v8 had no sidebar-toggle icons and no collapsible switch. */
type V8Project = Omit<ProjectDef, 'snapshot'> & {
  snapshot: Omit<ProjectSnapshot, 'shell'> & {
    shell: Omit<ShellSettings, 'appBar' | 'collapsible'> & {
      appBar: Omit<AppBarSettings, 'sidebarToggle'> & { sidebarToggle?: AppBarSettings['sidebarToggle'] }
      collapsible?: boolean
    }
  }
}

/** v8 → v9: collapsible sidebar with the library's default toggle glyphs. */
function migrateV8(projects: V8Project[]): ProjectDef[] {
  return projects.map((p) => ({
    ...p,
    snapshot: {
      ...p.snapshot,
      shell: {
        ...p.snapshot.shell,
        appBar: {
          ...p.snapshot.shell.appBar,
          sidebarToggle: p.snapshot.shell.appBar.sidebarToggle ?? { hide: '', show: '' },
        },
        collapsible: p.snapshot.shell.collapsible ?? true,
      },
    },
  }))
}

const SELECT_FAMILY = new Set(['select', 'autocomplete', 'multiAutocomplete'])

/**
 * v9 → v10 (see the grilled option-display design): the select family keeps one
 * flat key set for both modes. Source mode used to edit `dataSource.valueKey` /
 * `labelKey`, which the export never read (it always emitted the static-only
 * `idKey`/`displayKey`/`searchKey`) — so what the author typed there is carried
 * onto the flat keys, then dropped. The new option-display fields start unset.
 * Templates carry the same configs, so their grids are migrated too.
 */
function migrateSelectKeys(items: GridItemData[]): void {
  walkItems(items, (item) => {
    if (!SELECT_FAMILY.has(item.type) || !item.config) return
    const c = item.config as SelectFieldConfig & {
      dataSource: SelectFieldConfig['dataSource'] & { valueKey?: string; labelKey?: string }
    }
    const { valueKey, labelKey, ...dataSource } = c.dataSource ?? { endpointId: null, paths: '' }
    if (c.mode === 'source') {
      if (valueKey?.trim()) c.idKey = valueKey.trim()
      if (labelKey?.trim()) c.displayKey = c.searchKey = labelKey.trim()
    }
    c.dataSource = dataSource
    c.subtitleKey ??= ''
    c.avatarKey ??= ''
    c.inputIcon ??= ''
    c.itemIcon ??= ''
  })
}

function migrateV9(projects: ProjectDef[], library: LibraryData): ProjectDef[] {
  for (const p of projects) for (const pg of p.snapshot.pages) migrateSelectKeys(pg.grid.items)
  for (const t of library.templates) migrateSelectKeys(t.grid.items)
  return projects
}

/**
 * v10 → v11: the seeded Country manager gains the select-family demo pages
 * ("Option display", "Icons") that only fresh demo data used to get — appended
 * once, with a sidebar link each, and only when that page id is absent, so a
 * page the user deleted afterwards stays deleted. Other projects are untouched.
 */
/**
 * Append demo pages (with a sidebar link each) to a project, skipping page
 * ids it already has — so a page the user deleted afterwards stays deleted.
 * Seed keys stay camelCase unless the user already took them.
 */
function appendDemoPages(p: ProjectDef, demos: PageDef[]): ProjectDef {
  const missing = demos.filter((demo) => !p.snapshot.pages.some((pg) => pg.id === demo.id))
  if (missing.length === 0) return p
  const taken = new Set(p.snapshot.pages.map((pg) => pg.key))
  const pages = missing.map((demo) => ({
    ...demo,
    key: taken.has(demo.key) ? uniquePageKey(demo.key, taken) : demo.key,
  }))
  const menu: MenuItemDef[] = pages.map((pg) => ({
    id: crypto.randomUUID(),
    kind: 'page',
    label: pg.name,
    icon: OPTION_DEMO_MENU_ICONS[pg.id] ?? '',
    navigate: { pageId: pg.id, params: {}, replace: false },
  }))
  return {
    ...p,
    snapshot: {
      ...p.snapshot,
      pages: [...p.snapshot.pages, ...pages],
      menu: [...p.snapshot.menu, ...menu],
    },
  }
}

function migrateV10(projects: ProjectDef[]): ProjectDef[] {
  return projects.map((p) => (p.id === 'seed-project-country' ? appendDemoPages(p, optionDemoPages()) : p))
}

/**
 * Add seeded models / endpoints the library doesn't have yet (by id, filed
 * under the Countries group) and attach the endpoints to the seeded project.
 */
function seedLibraryAdditions(
  projects: ProjectDef[],
  library: LibraryData,
  models: ModelDef[],
  endpoints: EndpointDef[],
): { projects: ProjectDef[]; library: LibraryData } {
  const modelIds = new Set(library.models.map((m) => m.id))
  const endpointIds = new Set(library.endpoints.map((e) => e.id))
  const newModels = models.filter((m) => !modelIds.has(m.id)).map((m) => ({ ...m, groupId: COUNTRIES_GROUP_ID }))
  const newEndpoints = endpoints
    .filter((e) => !endpointIds.has(e.id))
    .map((e) => ({ ...e, groupId: COUNTRIES_GROUP_ID }))
  const nextLibrary =
    newModels.length || newEndpoints.length
      ? { ...library, models: [...library.models, ...newModels], endpoints: [...library.endpoints, ...newEndpoints] }
      : library
  const seedEndpointIds = endpoints.map((e) => e.id)
  const nextProjects = projects.map((p) => {
    if (p.id !== 'seed-project-country') return p
    const attached = new Set(p.snapshot.endpointIds)
    const missing = seedEndpointIds.filter((id) => !attached.has(id))
    if (missing.length === 0) return p
    return { ...p, snapshot: { ...p.snapshot, endpointIds: [...p.snapshot.endpointIds, ...missing] } }
  })
  return { projects: nextProjects, library: nextLibrary }
}

/**
 * v11 → v12: the FormList demo. The shared library gains the seeded
 * `languages` models and endpoints (by id, so re-runs and user edits are
 * safe), and the seeded Country manager attaches them and gets the Languages
 * form list on its detail page — only when that item is absent, so a list
 * the user deleted stays deleted. Other projects are untouched.
 */
function migrateV11(
  projects: ProjectDef[],
  library: LibraryData,
): { projects: ProjectDef[]; library: LibraryData } {
  const seeded = seedLibraryAdditions(projects, library, languageSeedModels(), languageSeedEndpoints())
  const nextProjects = seeded.projects.map((p) => {
    if (p.id !== 'seed-project-country') return p
    const pages = p.snapshot.pages.map((pg) => {
      if (pg.id !== 'seed-page-country-detail') return pg
      if (pg.grid.items.some((it) => it.id === LANGUAGES_ITEM_ID)) return pg
      return { ...pg, grid: { ...pg.grid, items: [...pg.grid.items, countryLanguagesSeedItem()] } }
    })
    return { ...p, snapshot: { ...p.snapshot, pages } }
  })
  return { projects: nextProjects, library: seeded.library }
}

/**
 * v12 → v13: the Form list demo page. The shared library gains the seeded
 * `contacts` / `notes` models and endpoints, the seeded Country manager
 * attaches them and gets the "Form list" page (+ sidebar link) unless that
 * page id already exists. Other projects are untouched.
 */
function migrateV12(data: { projects: ProjectDef[]; library: LibraryData }): {
  projects: ProjectDef[]
  library: LibraryData
} {
  const seeded = seedLibraryAdditions(
    data.projects,
    data.library,
    formListDemoSeedModels(),
    formListDemoSeedEndpoints(),
  )
  return {
    projects: seeded.projects.map((p) =>
      p.id === 'seed-project-country' ? appendDemoPages(p, [formListDemoPage()]) : p,
    ),
    library: seeded.library,
  }
}

/**
 * v13 → v14: form lists gain Add / Remove button icons, placement and display
 * (`addIcon/addPosition/addAlign/addDisplay`, `removeIcon/removePosition/
 * removeDisplay`), filled with the component's defaults on every canvas
 * (pages and templates). v14 → v15 reruns the same fill for `*Display`.
 */
function migrateFormListChrome(items: GridItemData[]): void {
  walkItems(items, (item) => {
    if (item.type !== 'formlist' || !item.config) return
    const c = item.config as FormListConfig
    c.addIcon ??= ''
    c.addPosition ??= 'bottom'
    c.addAlign ??= 'start'
    c.removeIcon ??= ''
    c.removePosition ??= 'end'
    c.addDisplay ??= 'both'
    c.removeDisplay ??= 'both'
  })
}

function migrateV13(data: { projects: ProjectDef[]; library: LibraryData }): {
  projects: ProjectDef[]
  library: LibraryData
} {
  for (const p of data.projects) for (const pg of p.snapshot.pages) migrateFormListChrome(pg.grid.items)
  for (const t of data.library.templates) migrateFormListChrome(t.grid.items)
  return data
}

/**
 * v15 → v16: the repeater. Text / Typography / Avatar configs gain their
 * item bindings (`binding`, `srcBinding` / `fallbackBinding`), filled `null`
 * (static) on every canvas — pages and templates. The shared library gains
 * the seeded `regions` model and endpoint, and the seeded Country manager
 * attaches them and gets the "Repeater" page (+ sidebar link) unless that
 * page id already exists. Other projects are untouched.
 */
function migrateItemBindings(items: GridItemData[]): void {
  walkItems(items, (item) => {
    if (!item.config) return
    if (item.type === 'text' || item.type === 'typography') {
      ;(item.config as TextConfig | TypographyConfig).binding ??= null
    } else if (item.type === 'avatar') {
      const c = item.config as AvatarConfig
      c.srcBinding ??= null
      c.fallbackBinding ??= null
    }
  })
}

function migrateV15(data: { projects: ProjectDef[]; library: LibraryData }): {
  projects: ProjectDef[]
  library: LibraryData
} {
  for (const p of data.projects) for (const pg of p.snapshot.pages) migrateItemBindings(pg.grid.items)
  for (const t of data.library.templates) migrateItemBindings(t.grid.items)
  const seeded = seedLibraryAdditions(
    data.projects,
    data.library,
    repeaterDemoSeedModels(),
    repeaterDemoSeedEndpoints(),
  )
  return {
    projects: seeded.projects.map((p) =>
      p.id === 'seed-project-country' ? appendDemoPages(p, [repeaterDemoPage()]) : p,
    ),
    library: seeded.library,
  }
}

/**
 * v16 → v17: the file upload's preview + accept presets. Every Upload File —
 * pages and templates — gains `acceptPresets: []` (its free-text `accept`
 * carries on as the extra types), `preview: true` and `previewLayout: 'list'`,
 * the engine defaults.
 */
function migrateUploadFiles(items: GridItemData[]): void {
  walkItems(items, (item) => {
    if (item.type !== 'uploadfile' || !item.config) return
    const c = item.config as UploadFileConfig
    c.acceptPresets ??= []
    c.preview ??= true
    c.previewLayout ??= 'list'
  })
}

function migrateV16(data: { projects: ProjectDef[]; library: LibraryData }): {
  projects: ProjectDef[]
  library: LibraryData
} {
  for (const p of data.projects) for (const pg of p.snapshot.pages) migrateUploadFiles(pg.grid.items)
  for (const t of data.library.templates) migrateUploadFiles(t.grid.items)
  return data
}

/**
 * v17 → v18: the seeded Country manager gets the "Upload" demo page (+ sidebar
 * link) unless that page id already exists. Other projects are untouched.
 */
function migrateV17(data: { projects: ProjectDef[]; library: LibraryData }): {
  projects: ProjectDef[]
  library: LibraryData
} {
  return {
    projects: data.projects.map((p) =>
      p.id === 'seed-project-country' ? appendDemoPages(p, [uploadDemoPage()]) : p,
    ),
    library: data.library,
  }
}

/**
 * v18 → v19: the button `variant`. Every button — standalone items and the
 * modal / popover trigger buttons, pages and templates — gains
 * `variant: 'contained'`, the engine default.
 */
function migrateButtonVariants(items: GridItemData[]): void {
  walkItems(items, (item) => {
    if (!item.config) return
    if (item.type === 'button') (item.config as ButtonItemConfig).variant ??= 'contained'
    else if (item.type === 'modal') (item.config as ModalConfig).trigger.variant ??= 'contained'
    else if (item.type === 'popover') (item.config as PopoverConfig).triggerButton.variant ??= 'contained'
  })
}

function migrateV18(data: { projects: ProjectDef[]; library: LibraryData }): {
  projects: ProjectDef[]
  library: LibraryData
} {
  for (const p of data.projects) for (const pg of p.snapshot.pages) migrateButtonVariants(pg.grid.items)
  for (const t of data.library.templates) migrateButtonVariants(t.grid.items)
  return data
}

function migrateV3(projects: V3Project[], library: LibraryData): { projects: V4Project[]; library: LibraryData } {
  const out: V4Project[] = projects.map((p) => {
    const taken: string[] = []
    const pages: PageDef[] = p.snapshot.pages.map((pg) => {
      const key = uniquePageKey(pg.key?.trim() || pg.name, taken)
      taken.push(key)
      migrateButtonNavigation(pg.grid.items)
      return { ...pg, key }
    })
    return { ...p, snapshot: { ...p.snapshot, pages } }
  })
  for (const t of library.templates) migrateButtonNavigation(t.grid.items)
  return { projects: out, library }
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
      version: 19,
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
              : emptyProjectSnapshot(name.trim() || 'Untitled project'),
          }
          return { projects: [created, ...s.projects] }
        })
        log('created', 'project', created.name, fromSeed ? 'from the countries example' : 'empty project', created.id)
        return created
      },

      updateProjectMenu: (id, menu) => {
        set((s) => ({
          projects: patchProject(s.projects, id, (p) => ({ snapshot: { ...p.snapshot, menu } })),
        }))
      },

      updateProjectShell: (id, shell) => {
        set((s) => ({
          projects: patchProject(s.projects, id, (p) => ({ snapshot: { ...p.snapshot, shell } })),
        }))
      },

      updateProject: (id, patch) =>
        set((s) => ({
          projects: patchProject(s.projects, id, () => ({
            ...(patch.name != null ? { name: patch.name } : {}),
            ...(patch.description != null ? { description: patch.description } : {}),
          })),
        })),

      deleteProject: (id) => {
        const name = projectName(id)
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
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
        set((s) => ({
          projects: patchProject(s.projects, projectId, (p) => {
            const have = new Set(p.snapshot.endpointIds)
            const next = [...p.snapshot.endpointIds, ...endpointIds.filter((id) => !have.has(id))]
            return { snapshot: { ...p.snapshot, endpointIds: next } }
          }),
        }))
        const names = endpointIds
          .map((id) => get().library.endpoints.find((e) => e.id === id)?.name)
          .filter((n): n is string => !!n)
        if (names.length) log('attached', 'api', names.join(', '), `to ${projectName(projectId)}`, projectId)
      },

      detachEndpoint: (projectId, endpointId) => {
        set((s) => ({
          projects: patchProject(s.projects, projectId, (p) => ({
            snapshot: {
              ...p.snapshot,
              endpointIds: p.snapshot.endpointIds.filter((id) => id !== endpointId),
            },
          })),
        }))
        const name = get().library.endpoints.find((e) => e.id === endpointId)?.name
        if (name) log('detached', 'api', name, `from ${projectName(projectId)}`, projectId)
      },

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

      addPage: (projectId, { name, path, grid, key }) => {
        const taken = get().projects.find((p) => p.id === projectId)?.snapshot.pages.map((pg) => pg.key) ?? []
        const page = createPage(name, path, grid, taken, key)
        set((s) => ({
          projects: patchProject(s.projects, projectId, (p) => ({
            snapshot: { ...p.snapshot, pages: [...p.snapshot.pages, page] },
          })),
        }))
        log('created', 'page', page.name, grid ? 'from a template' : 'blank page', projectId)
        return page
      },

      updatePage: (projectId, pageId, patch) => {
        const before = pageOf(projectId, pageId)
        set((s) => ({
          projects: patchProject(s.projects, projectId, (p) => ({
            snapshot: {
              ...p.snapshot,
              pages: p.snapshot.pages.map((pg) => {
                if (pg.id !== pageId) return pg
                const name = patch.name != null ? patch.name.trim() || pg.name : pg.name
                const path = patch.path != null ? normalizePath(patch.path, name) : pg.path
                // A key is accepted only when it is a valid identifier no other
                // page of the project uses; otherwise the current one stays.
                const wanted = patch.key?.trim()
                const key =
                  wanted &&
                  isValidPageKey(wanted) &&
                  !p.snapshot.pages.some((other) => other.id !== pageId && other.key === wanted)
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
                return next
              }),
            },
          })),
        }))
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

      deletePage: (projectId, pageId) => {
        const page = pageOf(projectId, pageId)
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
        }))
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
      version: 19,
      partialize: (s) => ({
        version: s.version,
        appearance: s.appearance,
        user: s.user,
        projects: s.projects,
        library: s.library,
        activity: s.activity,
      }),
      merge: (persisted, current) => {
        const data = persisted as
          | (Partial<Omit<WorkspaceData, 'version'>> & { version?: number })
          | undefined
        if (!data || !Array.isArray(data.projects)) return current
        const appearance = data.appearance === 'dark' ? 'dark' : 'light'
        const user =
          typeof data.user === 'string' && data.user ? data.user : MOCK_USERS[0].name
        const activity = Array.isArray(data.activity) ? data.activity : seedActivity()
        if (data.version === 1) {
          const v1 = migrateV1(data.projects as unknown as V1Project[])
          const { projects, library } = migrateV3(migrateV2(v1.projects), v1.library)
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13(migrateV12(migrateV11(migrateV10(migrateV9(migrateV8(migrateV7(migrateV6(migrateV5(migrateV4(projects))))), library)), library))))))) }
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
          const migrated = migrateV3(migrateV2(data.projects as unknown as V2Project[]), library)
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13(migrateV12(migrateV11(migrateV10(migrateV9(migrateV8(migrateV7(migrateV6(migrateV5(migrateV4(migrated.projects))))), migrated.library)), migrated.library))))))) }
        }
        if (data.version === 3) {
          const migrated = migrateV3(data.projects as unknown as V3Project[], library)
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13(migrateV12(migrateV11(migrateV10(migrateV9(migrateV8(migrateV7(migrateV6(migrateV5(migrateV4(migrated.projects))))), migrated.library)), migrated.library))))))) }
        }
        if (data.version === 4) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13(migrateV12(migrateV11(migrateV10(migrateV9(migrateV8(migrateV7(migrateV6(migrateV5(migrateV4(data.projects as unknown as V4Project[]))))), library)), library))))))) }
        }
        if (data.version === 5) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13(migrateV12(migrateV11(migrateV10(migrateV9(migrateV8(migrateV7(migrateV6(migrateV5(data.projects as unknown as V5Project[])))), library)), library))))))) }
        }
        if (data.version === 6) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13(migrateV12(migrateV11(migrateV10(migrateV9(migrateV8(migrateV7(migrateV6(data.projects as unknown as V6Project[]))), library)), library))))))) }
        }
        if (data.version === 7) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13(migrateV12(migrateV11(migrateV10(migrateV9(migrateV8(migrateV7(data.projects as unknown as V7Project[])), library)), library))))))) }
        }
        if (data.version === 8) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13(migrateV12(migrateV11(migrateV10(migrateV9(migrateV8(data.projects as unknown as V8Project[]), library)), library))))))) }
        }
        if (data.version === 9) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13(migrateV12(migrateV11(migrateV10(migrateV9(data.projects, library)), library))))))) }
        }
        if (data.version === 10) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13(migrateV12(migrateV11(migrateV10(data.projects), library))))))) }
        }
        if (data.version === 11) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13(migrateV12(migrateV11(data.projects, library))))))) }
        }
        if (data.version === 12) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13(migrateV12({ projects: data.projects, library })))))) }
        }
        if (data.version === 13) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13({ projects: data.projects, library }))))) }
        }
        if (data.version === 14) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15(migrateV13({ projects: data.projects, library }))))) }
        }
        if (data.version === 15) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16(migrateV15({ projects: data.projects, library })))) }
        }
        if (data.version === 16) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17(migrateV16({ projects: data.projects, library }))) }
        }
        if (data.version === 17) {
          return { ...current, appearance, user, activity, ...migrateV18(migrateV17({ projects: data.projects, library })) }
        }
        if (data.version === 18) {
          return { ...current, appearance, user, activity, ...migrateV18({ projects: data.projects, library }) }
        }
        if (data.version !== 19) return current
        return { ...current, appearance, user, activity, projects: data.projects, library }
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
