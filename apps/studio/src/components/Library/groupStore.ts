import { create } from 'zustand'
import { useApiStore } from '../Api/apiStore'
import { useModelStore } from '../Model/modelStore'

/** A shared-library group: a named bucket models and endpoints are filed under. */
export type GroupDef = {
  id: string
  name: string
  description: string
}

type GroupStore = {
  groups: GroupDef[]
  /** Replace every group (workspace boot / reset). */
  hydrate: (groups: GroupDef[]) => void
  addGroup: (input: { name: string; description: string }) => string
  updateGroup: (id: string, patch: Partial<Omit<GroupDef, 'id'>>) => void
  /** Remove the group; its models and endpoints become Ungrouped. */
  deleteGroup: (id: string) => void
}

function createId(): string {
  return crypto.randomUUID()
}

/**
 * The library's groups (see the grilled Shared library design). Live like the
 * api/model stores — hydrated from the workspace at boot and mirrored back.
 */
export const useGroupStore = create<GroupStore>((set) => ({
  groups: [],

  hydrate: (groups) => set({ groups }),

  addGroup: ({ name, description }) => {
    const group: GroupDef = {
      id: createId(),
      name: name.trim() || 'Untitled group',
      description: description.trim(),
    }
    set((s) => ({ groups: [...s.groups, group] }))
    return group.id
  },

  updateGroup: (id, patch) =>
    set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),

  deleteGroup: (id) => {
    set((s) => ({ groups: s.groups.filter((g) => g.id !== id) }))
    // Members fall back to Ungrouped rather than dangling at a missing id.
    const api = useApiStore.getState()
    api.endpoints.forEach((e) => {
      if (e.groupId === id) api.updateEndpoint(e.id, { groupId: null })
    })
    const models = useModelStore.getState()
    models.models.forEach((m) => {
      if (m.groupId === id) models.setModelGroup(m.id, null)
    })
  },
}))

/** Display name for a group id (Ungrouped when null / missing). */
export function useGroupName(groupId: string | null | undefined): string {
  return useGroupStore(
    (s) => (groupId ? s.groups.find((g) => g.id === groupId)?.name : undefined) ?? 'Ungrouped',
  )
}
