import { useApiStore } from '../Api/apiStore'
import { useApiTestStore } from '../Api/testStore'
import type { EndpointDef } from '../Api/types'
import { MODEL_REF_KEYS } from '../Api/types'
import { useEnvStore } from '../Env/envStore'
import { useGridStore } from '../Layout/gridStore'
import {
  createDefaultButtonItemConfig,
  createDefaultItemSettings,
  createDefaultTextConfig,
  defaultContainerSettings,
  type GridItemData,
} from '../Layout/types'
import { ensureDataTableCanvases } from '../Layout/types'
import { useGroupStore } from '../Library/groupStore'
import { useModelStore } from '../Model/modelStore'
import type { ModelDef } from '../Model/types'
import {
  countryLanguagesSeedItem,
  formListDemoSeedItems,
  REPEATER_PAGE_ID,
  repeaterDemoSeedItems,
  UPLOAD_PAGE_ID,
  uploadDemoSeedItems,
  PAGINATION_PAGE_ID,
  paginationDemoSeedItems,
  DATA_TABLE_PAGE_ID,
  HTML_COLUMNS_PAGE_ID,
  COLUMN_RESIZE_PAGE_ID,
  columnResizeDemoSeedItems,
  SERVER_FILTER_PAGE_ID,
  serverFilterDemoSeedItems,
  FILTER_API_PAGE_ID,
  filterApiDemoSeedItems,
  CELL_TOOLTIP_PAGE_ID,
  cellTooltipDemoSeedItems,
  TABLE_LAYOUT_PAGE_ID,
  tableLayoutDemoSeedItems,
  CARD_PAGE_ID,
  cardDemoSeedItems,
  HTML_CONTENT_PAGE_ID,
  htmlContentDemoSeedItems,
  DRAWER_PAGE_ID,
  CHIPS_PAGE_ID,
  chipsDemoSeedItems,
  SWITCH_PAGE_ID,
  switchDemoSeedItems,
  drawerDemoSeedItems,
  htmlColumnDemoSeedItems,
  dataTableDemoSeedItems,
  FORM_LIST_PAGE_ID,
  countrySeedEndpoints,
  countrySeedEnvVars,
  countrySeedGridItems,
  iconDemoSeedItems,
  optionDisplaySeedItems,
  countrySeedModels,
  countrySeedTheme,
} from '../seed/country'
import { builtinTemplates } from '../seed/templates'
import { useThemeStore } from '../Theme/themeStore'
import type { StudioThemeConfig } from '../Theme/types'
import type { LibraryData, PageDef, PageGrid, ProjectSnapshot, AppBarSettings, ShellSettings } from './types'
import { defaultMenu } from './menu'

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
    templates: builtinTemplates(),
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

/** `"Country detail"` → `"countryDetail"` — the default page key (a JS identifier). */
export function pageKey(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const raw = words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join('')
  const key = raw.replace(/^[0-9]+/, '')
  return key || 'page'
}

/** A page key not already in `taken`: the base, then `base2`, `base3`, … */
export function uniquePageKey(base: string, taken: Iterable<string>): string {
  const set = new Set(taken)
  const clean = pageKey(base)
  if (!set.has(clean)) return clean
  let n = 2
  while (set.has(`${clean}${n}`)) n++
  return `${clean}${n}`
}

/** True for a usable page key: a JS identifier (letters, digits, `_`, `$`). */
export function isValidPageKey(key: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
}

/** The `:param` names in a route, in order (`/countries/:code` → `['code']`). */
export function pathParams(path: string): string[] {
  const out: string[] = []
  const re = /:([A-Za-z_][A-Za-z0-9_]*)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(path))) out.push(m[1])
  return out
}

/** A new project's shell: sidebar navigation with the breadcrumb strip on. */
export function defaultAppBar(title: string): AppBarSettings {
  return { title, icon: '', logo: '', variant: 'panel', sidebarToggle: { hide: '', show: '' } }
}

/** Sidebar navigation, breadcrumbs on, a panel app bar titled after the project. */
export function defaultShell(title = 'My app'): ShellSettings {
  return {
    navigation: 'sidebar',
    breadcrumbs: true,
    appBar: defaultAppBar(title),
    menuIcons: true,
    collapsible: true,
  }
}

export function emptyPageGrid(): PageGrid {
  return { items: [], containerSettings: defaultContainerSettings, fieldSeq: 0 }
}

/** A new page: fresh id, the given name, its slug as the route, a key unique
 * among `takenKeys`, an empty canvas. */
export function createPage(
  name: string,
  path?: string,
  grid?: PageGrid,
  takenKeys: Iterable<string> = [],
  key?: string,
): PageDef {
  const cleanName = name.trim() || 'Untitled page'
  return {
    id: crypto.randomUUID(),
    key: uniquePageKey(key?.trim() || cleanName, takenKeys),
    name: cleanName,
    path: normalizePath(path ?? '', cleanName),
    grid: grid ?? emptyPageGrid(),
  }
}

/** The seeded detail page: a heading and a Back button that plays the engine
 * `Navigate` action — the round trip of the table's row navigation. */
function countryDetailSeedItems(): GridItemData[] {
  return [
    {
      id: 'seed-item-detail-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: { ...createDefaultTextConfig(), text: 'Country detail — :code comes from the row you clicked' },
    },
    {
      id: 'seed-item-detail-back',
      label: 'Button',
      type: 'button',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 3, lg: 3 } }),
      config: {
        ...createDefaultButtonItemConfig(),
        label: 'Back to countries',
        actions: ['Navigate'],
        navigate: { pageId: 'seed-page-countries', params: {}, replace: false },
      },
    },
    countryLanguagesSeedItem(),
  ]
}

/**
 * The select-family demo pages of the seeded project: "Option display" (icon,
 * title, subtitle and image on the three fields) and "Icons" (the two icon
 * slots on their own). Used by the fresh seed and by the workspace migration
 * that appends them to an existing seeded project (`migrateV10`).
 */
export function optionDemoPages(): PageDef[] {
  return [
    {
      id: 'seed-page-option-display',
      key: 'optionDisplay',
      name: 'Option display',
      path: '/option-display',
      grid: {
        items: optionDisplaySeedItems(),
        containerSettings: defaultContainerSettings,
        fieldSeq: 0,
      },
    },
    {
      id: 'seed-page-icons',
      key: 'icons',
      name: 'Icons',
      path: '/icons',
      grid: {
        items: iconDemoSeedItems(),
        containerSettings: defaultContainerSettings,
        fieldSeq: 0,
      },
    },
  ]
}

/**
 * The "Form list" demo page of the seeded project (the example app's
 * `/form-list`). Used by the fresh seed and appended to an existing seeded
 * project by `migrateV12`.
 */
export function formListDemoPage(): PageDef {
  return {
    id: FORM_LIST_PAGE_ID,
    key: 'formList',
    name: 'Form list',
    path: '/form-list',
    grid: {
      items: formListDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

/**
 * The "Repeater" demo page of the seeded project (the example app's
 * `/repeater`). Used by the fresh seed and appended to an existing seeded
 * project by `migrateV15`.
 */
export function repeaterDemoPage(): PageDef {
  return {
    id: REPEATER_PAGE_ID,
    key: 'repeater',
    name: 'Repeater',
    path: '/repeater',
    grid: {
      items: repeaterDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

/**
 * The "Upload" demo page of the seeded project (the example app's `/file-upload`).
 * Used by the fresh seed and appended to an existing seeded project by
 * `migrateV17`.
 */
export function uploadDemoPage(): PageDef {
  return {
    id: UPLOAD_PAGE_ID,
    key: 'upload',
    name: 'Upload',
    path: '/file-upload',
    grid: {
      items: uploadDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

/**
 * The "Pagination" demo page of the seeded project (the example app's
 * `/pagination`). Used by the fresh seed and appended to an existing seeded
 * project by `migrateV20`.
 */
export function paginationDemoPage(): PageDef {
  return {
    id: PAGINATION_PAGE_ID,
    key: 'pagination',
    name: 'Pagination',
    path: '/pagination',
    grid: {
      items: paginationDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

/**
 * The "Data table" demo page of the seeded project (the example app's
 * `/data-table`): column pinning on a deliberately overflowing table. Used by
 * the fresh seed and appended to an existing seeded project by `migrateV21`.
 */
export function dataTableDemoPage(): PageDef {
  return {
    id: DATA_TABLE_PAGE_ID,
    key: 'dataTable',
    name: 'Data table',
    path: '/data-table',
    grid: {
      items: dataTableDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

/**
 * The "HTML columns" demo page of the seeded project (the example app's
 * `/html-columns`): one table per aspect of a column's `html` template. Used
 * by the fresh seed and appended to an existing seeded project by `migrateV25`.
 */
export function htmlColumnDemoPage(): PageDef {
  return {
    id: HTML_COLUMNS_PAGE_ID,
    key: 'htmlColumns',
    name: 'HTML columns',
    path: '/html-columns',
    grid: {
      items: htmlColumnDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

/**
 * The "Column resize" demo page of the seeded project (the example app's
 * `/column-resize`). Used by the fresh seed and appended to an existing seeded
 * project by `migrateV28`.
 */
export function columnResizeDemoPage(): PageDef {
  return {
    id: COLUMN_RESIZE_PAGE_ID,
    key: 'columnResize',
    name: 'Column resize',
    path: '/column-resize',
    grid: {
      items: columnResizeDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

/**
 * The "Server filter" demo page of the seeded project (the example app's
 * `/server-filter`). Used by the fresh seed and appended to an existing seeded
 * project by `migrateV29`.
 */
export function serverFilterDemoPage(): PageDef {
  return {
    id: SERVER_FILTER_PAGE_ID,
    key: 'serverFilter',
    name: 'Server filter',
    path: '/server-filter',
    grid: {
      items: serverFilterDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

/**
 * The "Filter via API" demo page of the seeded project (the example app's
 * `/filter-api`). Used by the fresh seed and appended to an existing seeded
 * project by `migrateV30`.
 */
export function filterApiDemoPage(): PageDef {
  return {
    id: FILTER_API_PAGE_ID,
    key: 'filterApi',
    name: 'Filter via API',
    path: '/filter-api',
    grid: {
      items: filterApiDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

/**
 * The "Cell tooltip" demo page of the seeded project (the example app's
 * `/cell-tooltip`). Used by the fresh seed and appended to an existing seeded
 * project by `migrateV32`.
 */
export function cellTooltipDemoPage(): PageDef {
  return {
    id: CELL_TOOLTIP_PAGE_ID,
    key: 'cellTooltip',
    name: 'Cell tooltip',
    path: '/cell-tooltip',
    grid: {
      items: cellTooltipDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

/**
 * The "Table layout" demo page of the seeded project (the example app's
 * `/table-layout`). Used by the fresh seed and appended to an existing seeded
 * project by `migrateV33`.
 */
export function cardDemoPage(): PageDef {
  return {
    id: CARD_PAGE_ID,
    key: 'card',
    name: 'Card',
    path: '/card',
    grid: {
      items: cardDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

export function htmlContentDemoPage(): PageDef {
  return {
    id: HTML_CONTENT_PAGE_ID,
    key: 'htmlContent',
    name: 'HTML content',
    path: '/html-content',
    grid: {
      items: htmlContentDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

export function drawerDemoPage(): PageDef {
  return {
    id: DRAWER_PAGE_ID,
    key: 'drawer',
    name: 'Drawer',
    path: '/drawer',
    grid: {
      items: drawerDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

export function chipsDemoPage(): PageDef {
  return {
    id: CHIPS_PAGE_ID,
    key: 'chips',
    name: 'Chips',
    path: '/chips',
    grid: {
      items: chipsDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

export function switchDemoPage(): PageDef {
  return {
    id: SWITCH_PAGE_ID,
    key: 'switch',
    name: 'Switch',
    path: '/switch',
    grid: {
      items: switchDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

export function tableLayoutDemoPage(): PageDef {
  return {
    id: TABLE_LAYOUT_PAGE_ID,
    key: 'tableLayout',
    name: 'Table layout',
    path: '/table-layout',
    grid: {
      items: tableLayoutDemoSeedItems(),
      containerSettings: defaultContainerSettings,
      fieldSeq: 0,
    },
    parentId: 'seed-page-countries',
  }
}

/** Sidebar glyph per demo page id. */
export const OPTION_DEMO_MENU_ICONS: Record<string, string> = {
  'seed-page-option-display': 'list',
  'seed-page-icons': 'star',
  [FORM_LIST_PAGE_ID]: 'listFilter',
  [REPEATER_PAGE_ID]: 'grid',
  [PAGINATION_PAGE_ID]: 'database',
  [DATA_TABLE_PAGE_ID]: 'list',
  [HTML_COLUMNS_PAGE_ID]: 'code',
  [COLUMN_RESIZE_PAGE_ID]: 'columns',
  [SERVER_FILTER_PAGE_ID]: 'filter',
  [FILTER_API_PAGE_ID]: 'search',
  [CELL_TOOLTIP_PAGE_ID]: 'info',
  [TABLE_LAYOUT_PAGE_ID]: 'table',
  [CARD_PAGE_ID]: 'creditCard',
  [HTML_CONTENT_PAGE_ID]: 'code',
  [DRAWER_PAGE_ID]: 'panelRight',
  [CHIPS_PAGE_ID]: 'tag',
  [SWITCH_PAGE_ID]: 'toggleLeft',
  [UPLOAD_PAGE_ID]: 'upload',
}

/** The countries example: the list page (modal + table), a detail page routed
 * with a `:code` param, and the option-display example page, attached to the
 * seeded endpoints. */
export function countryProjectSnapshot(library: LibraryData): ProjectSnapshot {
  const pages: PageDef[] = [
      {
        id: 'seed-page-countries',
        key: 'countries',
        name: 'Countries',
        path: '/countries',
        grid: {
          items: countrySeedGridItems(),
          containerSettings: defaultContainerSettings,
          fieldSeq: 0,
        },
        // The list is the root: no trail worth a strip.
        hideBreadcrumbs: true,
      },
      {
        id: 'seed-page-country-detail',
        key: 'countryDetail',
        name: 'Country detail',
        path: '/countries/:code',
        grid: {
          items: countryDetailSeedItems(),
          containerSettings: defaultContainerSettings,
          fieldSeq: 0,
        },
        // Breadcrumb "Countries / TH": under the list, labelled by the route's :code.
        parentId: 'seed-page-countries',
        crumb: { type: 'url', key: 'code', source: 'param' },
      },
      ...optionDemoPages(),
      formListDemoPage(),
      repeaterDemoPage(),
      paginationDemoPage(),
      dataTableDemoPage(),
      htmlColumnDemoPage(),
      columnResizeDemoPage(),
      serverFilterDemoPage(),
      filterApiDemoPage(),
      cellTooltipDemoPage(),
      tableLayoutDemoPage(),
      cardDemoPage(),
      htmlContentDemoPage(),
      drawerDemoPage(),
      chipsDemoPage(),
      switchDemoPage(),
      uploadDemoPage(),
  ]
  // Every data table carries its two canvases (edit modal + filter form).
  for (const page of pages) ensureDataTableCanvases(page.grid.items)
  const menu = defaultMenu(pages)
  if (menu[0]?.kind === 'page') menu[0].icon = 'globe'
  for (const item of menu) {
    if (item.kind === 'page') item.icon ||= OPTION_DEMO_MENU_ICONS[item.navigate.pageId] ?? ''
  }
  return {
    pages,
    menu,
    shell: defaultShell('Country manager'),
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
export function emptyProjectSnapshot(name = 'My app'): ProjectSnapshot {
  const pages = [createPage('Page 1')]
  return {
    pages,
    menu: defaultMenu(pages),
    shell: defaultShell(name),
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

/** The library part of the live stores (groups / models / endpoints).
 * Templates have no live store — they are edited in the workspace directly. */
export type LiveLibrary = Omit<LibraryData, 'templates'>

export function collectLibrary(): LiveLibrary {
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
export function applyLibrary(library: LiveLibrary): void {
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
