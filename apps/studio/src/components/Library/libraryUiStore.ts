import { create } from 'zustand'

/** Group filter on the library pages: every group, one group, or Ungrouped. */
export type GroupSelection = 'all' | 'none' | string

type LibraryUiState = {
  groupSel: GroupSelection
  setGroupSel: (sel: GroupSelection) => void
  /** The portal topbar search — filters projects and library lists alike. */
  query: string
  setQuery: (query: string) => void
}

/** Ephemeral portal / library UI state. */
export const useLibraryUiStore = create<LibraryUiState>((set) => ({
  groupSel: 'all',
  setGroupSel: (groupSel) => set({ groupSel }),
  query: '',
  setQuery: (query) => set({ query }),
}))

/** Does an item with `groupId` fall inside the current group selection? */
export function inGroupSelection(sel: GroupSelection, groupId: string | null | undefined): boolean {
  if (sel === 'all') return true
  if (sel === 'none') return !groupId
  return groupId === sel
}
