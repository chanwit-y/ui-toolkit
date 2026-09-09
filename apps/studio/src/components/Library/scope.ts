import { createContext, useContext, useMemo } from 'react'
import { useApiStore } from '../Api/apiStore'
import type { EndpointDef } from '../Api/types'
import { useModelStore } from '../Model/modelStore'
import type { ModelDef } from '../Model/types'
import { attachedEndpoints, referencedModels } from '../Workspace/snapshots'
import { useActiveEndpointIds, useWorkspaceStore } from '../Workspace/workspaceStore'

/**
 * Where the Models / APIs editors are rendered (see the grilled Shared
 * library design): inside a project they show only what the project has
 * attached (and its derived models); on the portal's library pages they show
 * the whole library. Edits hit the same live stores either way.
 */
export type LibraryScope = 'project' | 'library'

export const LibraryScopeContext = createContext<LibraryScope>('project')

export function useLibraryScope(): LibraryScope {
  return useContext(LibraryScopeContext)
}

/** The endpoints attached to the active project, in attach order. */
export function useProjectEndpoints(): EndpointDef[] {
  const ids = useActiveEndpointIds()
  const endpoints = useApiStore((s) => s.endpoints)
  return useMemo(() => attachedEndpoints(ids, endpoints), [ids, endpoints])
}

/** The models the active project's attached endpoints reference. */
export function useProjectModels(): ModelDef[] {
  const endpoints = useProjectEndpoints()
  const models = useModelStore((s) => s.models)
  return useMemo(() => referencedModels(endpoints, models), [endpoints, models])
}

/** Endpoints visible in the current scope (attached ones, or the whole library). */
export function useScopedEndpoints(): EndpointDef[] {
  const scope = useLibraryScope()
  const all = useApiStore((s) => s.endpoints)
  const project = useProjectEndpoints()
  return scope === 'library' ? all : project
}

/** Models visible in the current scope (derived ones, or the whole library). */
export function useScopedModels(): ModelDef[] {
  const scope = useLibraryScope()
  const all = useModelStore((s) => s.models)
  const project = useProjectModels()
  return scope === 'library' ? all : project
}

const SEP = '\u001e'

/** Names of the projects that have `endpointId` attached. */
export function useProjectsUsingEndpoint(endpointId: string): string[] {
  const joined = useWorkspaceStore((s) =>
    s.projects
      .filter((p) => p.snapshot.endpointIds.includes(endpointId))
      .map((p) => p.name)
      .join(SEP),
  )
  return useMemo(() => (joined ? joined.split(SEP) : []), [joined])
}
