import type { EndpointDef } from '../Api/types'
import type { EnvVarDef } from '../Env/types'
import type { GridContainerSettings, GridItemData } from '../Layout/types'
import type { GroupDef } from '../Library/groupStore'
import type { ModelDef } from '../Model/types'
import type { StudioThemeConfig, ThemeAppearance } from '../Theme/types'

/**
 * Everything a project owns (see the grilled Workspace + Shared library
 * designs): its canvas, env and theme, plus the ids of the library endpoints
 * it has attached. Models are not stored — they are derived from the attached
 * endpoints' references at read time.
 */
export type ProjectSnapshot = {
  grid: {
    items: GridItemData[]
    containerSettings: GridContainerSettings
    fieldSeq: number
  }
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

/** The shared library: one copy of every model and endpoint, filed in groups. */
export type LibraryData = {
  groups: GroupDef[]
  models: ModelDef[]
  endpoints: EndpointDef[]
}

/** The persisted shape (one localStorage key, versioned). */
export type WorkspaceData = {
  version: 2
  /** The portal's own appearance; inside a project the project theme wins. */
  appearance: ThemeAppearance
  projects: ProjectDef[]
  library: LibraryData
}
