import type { EndpointDef } from '../Api/types'
import type { EnvVarDef } from '../Env/types'
import type { GridContainerSettings, GridItemData } from '../Layout/types'
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
  name: string
  path: string
  grid: PageGrid
}

/**
 * Everything a project owns (see the grilled Workspace + Shared library
 * designs): its pages, env and theme, plus the ids of the library endpoints
 * it has attached. Models are not stored — they are derived from the attached
 * endpoints' references at read time.
 */
export type ProjectSnapshot = {
  pages: PageDef[]
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
  version: 3
  /** The portal's own appearance; inside a project the project theme wins. */
  appearance: ThemeAppearance
  /** The mock identity stamped on activity and templates (see `MOCK_USERS`). */
  user: string
  projects: ProjectDef[]
  library: LibraryData
  /** Newest first. */
  activity: ActivityEntry[]
}
