import type { EndpointDef } from '../Api/types'
import type { EnvVarDef } from '../Env/types'
import type { GridContainerSettings, GridItemData, NavParamSource, StudioNavigate } from '../Layout/types'
import type { GroupDef } from '../Library/groupStore'
import type { ModelDef } from '../Model/types'
import type { StudioThemeConfig, ThemeAppearance } from '../Theme/types'
import type { PageLoadDef } from './pageLoads'
import type { CustomActionDef } from './customActions'
import type { CustomComponentDef } from './customComponents'
import type { AuthDef } from './auth'

/** One canvas tree — the shape `gridStore.hydrate` takes and autosave writes. */
export type PageGrid = {
  items: GridItemData[]
  containerSettings: GridContainerSettings
  fieldSeq: number
}

/**
 * One screen of a project (see the grilled pages design). `path` is the
 * route the exported app serves it at (`/countries/:code` — `:params` are
 * read by `pathParams`); only one page's grid is ever live in `gridStore`.
 */
export type PageDef = {
  id: string
  /** Identifier in the exported `pages` record (`countryDetail`) — what an
   * engine `NavigateTarget.page` names. Unique per project; navigation refs
   * store the `id` and resolve to this at export, so it can be edited freely. */
  key: string
  name: string
  path: string
  grid: PageGrid
  /** The page above this one in the app-shell breadcrumb trail (a page id,
   * resolved to its key at export — `MISSING_PAGE` when deleted). */
  parentId?: string
  /** Where the breadcrumb label (and exported `title`) comes from; unset =
   * the page name. Literal / URL sources, or a field of one of the page's
   * loads (`state`, keyed by load id — offered once the page has loads). */
  crumb?: NavParamSource
  /** Hide the shell's breadcrumb strip while this page is current. */
  hideBreadcrumbs?: boolean
  /**
   * Page-level data loads (the engine `PageElement.loads`), edited in the
   * Layout's Data tab. Bindings / conditions / other loads refer to them by
   * `id` (see `pageLoads.ts`).
   */
  loads?: PageLoadDef[]
}

/** The exported `AppShell`'s layout props (see the grilled breadcrumbs + top-nav design). */
/** The exported app's top bar (the library `AppBarConfig`); empty strings mean unset. */
export type AppBarSettings = {
  title: string
  /** `IconData` key shown before the title. */
  icon: string
  /** Logo image URL — or the `data:` URL of an uploaded image — shown before the title (wins over `icon`). */
  logo: string
  /** CSS height of the logo (empty = the library's `1.5rem`). */
  logoSize: string
  /** Neutral panel surface, painted in the theme accent, or a custom colour / gradient. */
  variant: 'panel' | 'accent' | 'custom'
  /** The custom bar's colour (any CSS colour). */
  background: string
  /** The custom bar's gradient (wins over `background` while enabled): `from` → `to` at `angle` degrees. */
  gradient: { enabled: boolean; from: string; to: string; angle: number }
  /** Text / icon colour on the custom bar; empty = picked from the paint's luminance. */
  foreground: '' | 'light' | 'dark'
  /** CSS padding of the bar (empty = the library's `0 0.75rem`). */
  padding: string
  /** `IconData` keys of the desktop collapse button (empty = library chevrons). */
  sidebarToggle: { hide: string; show: string }
}

/** The studio side of the engine `PageTransition`. */
export type StudioPageTransition = {
  type: 'none' | 'fade' | 'fade-up' | 'slide' | 'scale'
  duration: number | ''
  easing: 'ease-out' | 'ease-in-out' | 'linear'
}

/**
 * The exported app's sidebar look (the library `SidebarConfig`, see the
 * grilled design `sidebar-pill-variant`); empty strings mean unset.
 */
export type SidebarSettings = {
  variant: 'plain' | 'pill'
  /** Collapse toggle in the top bar, or an icon + label row at the sidebar's foot. */
  toggle: 'header' | 'footer'
  /** The footer toggle's label (empty = the library's "Hide Menu"). */
  toggleLabel: string
  /** CSS width of the icon rail (empty = 3.5rem plain / 4.5rem pill). */
  railWidth: string
  /** Idle pill colour (empty = `--accent-2`). */
  itemBackground: string
  /** Active pill colour, used while the gradient is off (empty = the accent gradient). */
  activeBackground: string
  /** Active pill gradient (wins while enabled, both stops needed). */
  activeGradient: { enabled: boolean; from: string; to: string; angle: number }
  /** The edge bar beside the active item; `null` = the variant's default (pill on, plain off). */
  indicator: boolean | null
  /** Indicator colour (empty = `--accent-11`). */
  indicatorColor: string
}

export type ShellSettings = {
  /** Where the menu renders: the collapsible sidebar or a strip in the top bar. */
  navigation: 'sidebar' | 'top'
  /** Show the breadcrumb strip under the top bar. */
  breadcrumbs: boolean
  appBar: AppBarSettings
  /** Show the icons of menu items (sidebar, drawer, top strip). */
  menuIcons: boolean
  /**
   * Text colour of the active sidebar / drawer item (any CSS colour) on its
   * accent background; `''` / absent = the accent's contrast colour.
   * Optional, so shells saved before it existed need no migration.
   */
  menuActiveColor?: string
  /**
   * How a page enters on a route change (the engine `shell.pageTransition`,
   * see the grilled design `page-transition`). Optional: absent = none, so
   * older shells need no migration. `duration: ''` = the engine's 250 ms.
   */
  pageTransition?: StudioPageTransition
  /** Sidebar placement: offer the collapse-to-rail toggle. */
  collapsible: boolean
  /** Sidebar look and collapse-toggle placement (workspace v53). */
  sidebar: SidebarSettings
  /**
   * BCP 47 locale for formatted table cells (`ColumnDef.format`), exported as
   * `project.locale`; `''` / absent = the viewer's browser. Optional, no migration.
   */
  locale?: string
}

/**
 * Everything a project owns (see the grilled Workspace + Shared library
 * designs): its pages, env and theme, plus the ids of the library endpoints
 * it has attached. Models are not stored — they are derived from the attached
 * endpoints' references at read time.
 */
/**
 * One entry of the project's app-shell menu (see the grilled app-shell
 * design) — the studio-side mirror of the library `MenuItem`, with a stable
 * `id` for the sortable editor and an explicit `kind`. Page links store the
 * page id and resolve to its key at export.
 */
export type MenuItemDef =
  | { id: string; kind: 'page'; label: string; icon: string; navigate: StudioNavigate }
  | { id: string; kind: 'link'; label: string; icon: string; href: string; newTab: boolean }
  | { id: string; kind: 'group'; label: string; icon: string; collapsed: boolean; items: MenuItemDef[] }
  | { id: string; kind: 'divider' }

export type ProjectSnapshot = {
  pages: PageDef[]
  /** The sidebar menu the exported `AppShell` renders (`menu.ts`). */
  menu: MenuItemDef[]
  /** The `AppShell` layout props exported beside the menu. */
  shell: ShellSettings
  env: EnvVarDef[]
  theme: StudioThemeConfig
  /** Attached `EndpointDef.id`s from the shared library, in attach order. */
  endpointIds: string[]
  /**
   * App-wide data loads (the library `<GlobalLoads>`): fetched once when the
   * app starts, kept across pages, bindable from every page. Same shape and
   * id space as `PageDef.loads`.
   */
  globalLoads?: PageLoadDef[]
  /**
   * The project's declared custom button actions (names only — the code
   * lives in the app; see `customActions.ts`). Optional: absent = none.
   */
  customActions?: CustomActionDef[]
  /**
   * The project's declared custom components (names + prop shapes — the code
   * lives in the app; see `customComponents.ts`). Optional: absent = none.
   */
  customComponents?: CustomComponentDef[]
  /** The shared auth entry this project signs in with (`library.auth[].id`); null / absent = no sign-in. */
  authId?: string | null
}

export type ProjectDef = {
  id: string
  name: string
  description: string
  /** Epoch ms. */
  createdAt: number
  updatedAt: number
  snapshot: ProjectSnapshot
}

/**
 * A starting layout the team can drop into any page (see the grilled design:
 * templates live in the shared library). `grid` is a page grid; `active`
 * hides it from the studio's Templates tab without deleting it; `builtin`
 * marks the seeded ones.
 */
export type TemplateDef = {
  id: string
  name: string
  description: string
  category: string
  active: boolean
  builtin: boolean
  createdBy: string
  /** Epoch ms. */
  updatedAt: number
  grid: PageGrid
}

/** The shared library: one copy of every model and endpoint, filed in groups,
 * plus the team's page templates. */
export type LibraryData = {
  groups: GroupDef[]
  models: ModelDef[]
  endpoints: EndpointDef[]
  templates: TemplateDef[]
  /** Shared sign-in entries (Azure SSO), picked per project (`ProjectSnapshot.authId`). Optional: absent = none. */
  auth?: AuthDef[]
}

export type ActivityKind = 'project' | 'page' | 'group' | 'api' | 'model' | 'template' | 'theme' | 'auth'

/**
 * One line of the Activity page (see the grilled design): who did what, to
 * which named thing, optionally inside a project. Written by the coarse
 * workspace actions, capped, persisted with the workspace.
 */
export type ActivityEntry = {
  id: string
  /** Epoch ms. */
  ts: number
  user: string
  /** "created" / "renamed" / "attached" / … */
  verb: string
  kind: ActivityKind
  name: string
  detail: string
  projectId: string | null
}

/** The persisted shape (one localStorage key, versioned). */
export type WorkspaceData = {
  version: 58
  /** The portal's own appearance; inside a project the project theme wins. */
  appearance: ThemeAppearance
  /** The mock identity stamped on activity and templates (see `MOCK_USERS`). */
  user: string
  projects: ProjectDef[]
  library: LibraryData
  /** Newest first. */
  activity: ActivityEntry[]
}
