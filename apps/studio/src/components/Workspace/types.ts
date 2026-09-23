import type { EndpointDef } from '../Api/types'
import type { EnvVarDef } from '../Env/types'
import type { GridContainerSettings, GridItemData, NavParamSource, StudioNavigate } from '../Layout/types'
import type { GroupDef } from '../Library/groupStore'
import type { ModelDef } from '../Model/types'
import type { StudioThemeConfig, ThemeAppearance } from '../Theme/types'

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
   * the page name. Limited to literal / URL sources — studio pages can't
   * author a container `load`, so a state slice would never be filled. */
  crumb?: NavParamSource
  /** Hide the shell's breadcrumb strip while this page is current. */
  hideBreadcrumbs?: boolean
}

/** The exported `AppShell`'s layout props (see the grilled breadcrumbs + top-nav design). */
/** The exported app's top bar (the library `AppBarConfig`); empty strings mean unset. */
export type AppBarSettings = {
  title: string
  /** `IconData` key shown before the title. */
  icon: string
  /** Logo image URL shown before the title (wins over `icon`). */
  logo: string
  /** Neutral panel surface, or painted in the theme accent. */
  variant: 'panel' | 'accent'
  /** `IconData` keys of the desktop collapse button (empty = library chevrons). */
  sidebarToggle: { hide: string; show: string }
}

export type ShellSettings = {
  /** Where the menu renders: the collapsible sidebar or a strip in the top bar. */
  navigation: 'sidebar' | 'top'
  /** Show the breadcrumb strip under the top bar. */
  breadcrumbs: boolean
  appBar: AppBarSettings
  /** Show the icons of menu items (sidebar, drawer, top strip). */
  menuIcons: boolean
  /** Sidebar placement: offer the collapse-to-rail toggle. */
  collapsible: boolean
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
}

export type ActivityKind = 'project' | 'page' | 'group' | 'api' | 'model' | 'template' | 'theme'

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
  version: 39
  /** The portal's own appearance; inside a project the project theme wins. */
  appearance: ThemeAppearance
  /** The mock identity stamped on activity and templates (see `MOCK_USERS`). */
  user: string
  projects: ProjectDef[]
  library: LibraryData
  /** Newest first. */
  activity: ActivityEntry[]
}
