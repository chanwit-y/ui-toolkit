import { useApiStore } from '../Api/apiStore'
import { useApiTestStore } from '../Api/testStore'
import { useEnvStore } from '../Env/envStore'
import { useGridStore } from '../Layout/gridStore'
import { useGroupStore } from '../Library/groupStore'
import { useModelStore } from '../Model/modelStore'
import { useThemeStore } from '../Theme/themeStore'
import type { LiveLibrary, ProjectStateSnapshot } from './snapshots'
import type { PageGrid, ProjectSnapshot } from './types'

/*
 * The bridge between a stored project / library and the live editor stores
 * (grid, env, theme, groups, models, endpoints): capture them for autosave,
 * hydrate them on open. Kept apart from `snapshots.ts` so that module stays
 * pure — the headless build (`gummy mcp`) imports it without any store.
 */

export function collectProjectState(): ProjectStateSnapshot {
  const grid = useGridStore.getState()
  return {
    grid: { items: grid.items, containerSettings: grid.containerSettings, fieldSeq: grid.fieldSeq },
    env: useEnvStore.getState().vars,
    theme: useThemeStore.getState().config,
  }
}

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
