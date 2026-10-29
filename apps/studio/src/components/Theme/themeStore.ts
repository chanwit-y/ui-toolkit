import { create } from 'zustand'
import { countrySeedTheme } from '../seed/country'
import {
  createDefaultBackdrop,
  createDefaultDesignTheme,
  paletteTheme,
  type BackdropConfig,
  type DataTableThemeConfig,
  type DesignSurfaces,
  type StudioThemeConfig,
  type ThemeAppearance,
  type ThemePalette,
} from './types'

type ThemeStore = {
  config: StudioThemeConfig

  /** Replace the whole config (workspace open / switch). */
  hydrate: (config: StudioThemeConfig) => void
  /** Patch the top-level tokens (appearance, accent, radius, panel, button). */
  update: (patch: Partial<Omit<StudioThemeConfig, 'dataTable'>>) => void
  /** Patch the dataTable role overrides. */
  updateDataTable: (patch: Partial<DataTableThemeConfig>) => void
  /** Patch the glass backdrop. */
  updateBackground: (patch: Partial<BackdropConfig>) => void
  /** Patch one mode's design-only surfaces. */
  updateSurfaces: (mode: ThemeAppearance, patch: Partial<DesignSurfaces>) => void
  /** Set the design-only font. */
  setFont: (font: string) => void
  /** Apply a palette preset to every colour setting (`paletteTheme`). */
  applyPalette: (palette: ThemePalette) => void
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

  hydrate: (config) => set({ config }),

  update: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  updateDataTable: (patch) =>
    set((s) => ({
      config: { ...s.config, dataTable: { ...s.config.dataTable, ...patch } },
    })),

  updateBackground: (patch) =>
    set((s) => ({
      config: { ...s.config, background: { ...(s.config.background ?? createDefaultBackdrop()), ...patch } },
    })),

  updateSurfaces: (mode, patch) =>
    set((s) => {
      const design = s.config.design ?? createDefaultDesignTheme()
      return { config: { ...s.config, design: { ...design, [mode]: { ...design[mode], ...patch } } } }
    }),

  setFont: (font) =>
    set((s) => ({
      config: { ...s.config, design: { ...(s.config.design ?? createDefaultDesignTheme()), font } },
    })),

  applyPalette: (palette) =>
    set((s) => {
      const t = paletteTheme(palette)
      const design = s.config.design ?? createDefaultDesignTheme()
      return {
        config: {
          ...s.config,
          accentColor: t.accentColor,
          buttonColor: t.buttonColor,
          dataTable: { ...s.config.dataTable, ...t.dataTable },
          design: { ...design, ...t.surfaces },
          background: t.background,
        },
      }
    }),
}))

// Dev-only: expose the store for scripted verification (mirrors __gridStore).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __themeStore?: typeof useThemeStore }).__themeStore =
    useThemeStore
}
