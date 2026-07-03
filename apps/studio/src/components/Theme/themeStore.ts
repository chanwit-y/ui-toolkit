import { create } from 'zustand'
import { countrySeedTheme } from '../seed/country'
import type { DataTableThemeConfig, StudioThemeConfig } from './types'

type ThemeStore = {
  config: StudioThemeConfig

  /** Patch the top-level tokens (appearance, accent, radius, panel, button). */
  update: (patch: Partial<Omit<StudioThemeConfig, 'dataTable'>>) => void
  /** Patch the dataTable role overrides. */
  updateDataTable: (patch: Partial<DataTableThemeConfig>) => void
}

/**
 * The Theme page's store — the app-wide ThemeProvider config (see the grilled
 * design). In-memory like every other studio store, seeded with the example
 * app's theme so studio boots looking exactly as before. App.tsx derives the
 * live ThemeProvider props from this store, so edits re-tint the canvas and
 * Live Preview immediately.
 */
export const useThemeStore = create<ThemeStore>((set) => ({
  config: countrySeedTheme(),

  update: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  updateDataTable: (patch) =>
    set((s) => ({
      config: { ...s.config, dataTable: { ...s.config.dataTable, ...patch } },
    })),
}))

// Dev-only: expose the store for scripted verification (mirrors __gridStore).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __themeStore?: typeof useThemeStore }).__themeStore =
    useThemeStore
}
