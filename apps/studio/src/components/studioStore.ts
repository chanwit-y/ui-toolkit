import { create } from 'zustand'

type StudioState = {
  /** The Live Preview modal — opened from the topbar's Preview and the canvas
   * bar's Run alike, so the flag lives here rather than in either. */
  previewOpen: boolean
  setPreviewOpen: (open: boolean) => void
  /** Column guides drawn behind the canvas cells (canvas-bar toggle). */
  guides: boolean
  toggleGuides: () => void
}

/**
 * Studio-chrome UI state shared across the shell and the layout editor.
 * Ephemeral like every other studio store; nothing here reaches an export.
 */
export const useStudioStore = create<StudioState>((set) => ({
  previewOpen: false,
  setPreviewOpen: (previewOpen) => set({ previewOpen }),
  guides: true,
  toggleGuides: () => set((s) => ({ guides: !s.guides })),
}))
