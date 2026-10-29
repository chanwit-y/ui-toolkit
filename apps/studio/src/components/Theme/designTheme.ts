import type { CSSProperties } from 'react'
import {
  hexLuminance,
  SURFACE_DEFAULTS,
  type DesignSurfaces,
  type StudioThemeConfig,
  type ThemeAppearance,
} from './types'

/** One mode's surfaces with unset values filled from the studio defaults. */
export function resolvedSurfaces(config: StudioThemeConfig, mode: ThemeAppearance): DesignSurfaces {
  const set = config.design?.[mode]
  const def = SURFACE_DEFAULTS[mode]
  return {
    surface: set?.surface || def.surface,
    panel: set?.panel || def.panel,
    text: set?.text || def.text,
    border: set?.border || def.border,
  }
}

/**
 * The CSS custom properties that paint a canvas frame (or the Live Preview
 * wrapper) with the design-only theme (the mockup's `themeStyle`): the four
 * surfaces of the active mode, the muted shades mixed from them, the font,
 * and Radix `scaling`. Nothing is emitted when everything is at its default,
 * so the frame keeps the plain studio tokens.
 */
export function designThemeStyle(config: StudioThemeConfig): CSSProperties | undefined {
  const mode = config.appearance
  const d = config.design
  const custom =
    !!d &&
    (Object.values(d[mode]).some(Boolean) || (d.font && d.font !== 'Inter')) ||
    (config.scaling && config.scaling !== '100%')
  if (!custom) return undefined
  const s = resolvedSurfaces(config, mode)
  const style: Record<string, string> = {}
  if (d && Object.values(d[mode]).some(Boolean)) {
    style['--bg'] = s.surface
    style['--bg-sunken'] = `color-mix(in srgb, ${s.text} 5%, ${s.surface})`
    style['--panel'] = s.panel
    style['--panel-2'] = `color-mix(in srgb, ${s.text} 7%, ${s.panel})`
    style['--line'] = s.border
    style['--line-strong'] = `color-mix(in srgb, ${s.text} 24%, ${s.border})`
    style['--ink'] = s.text
    style['--ink-2'] = `color-mix(in srgb, ${s.text} 70%, ${s.surface})`
    style['--ink-3'] = `color-mix(in srgb, ${s.text} 45%, ${s.surface})`
    style.background = s.surface
    style.color = s.text
  }
  if (d?.font && d.font !== 'Inter') style.fontFamily = `'${d.font}', Inter, system-ui, sans-serif`
  if (config.scaling && config.scaling !== '100%') style['--scaling'] = config.scaling
  return style as CSSProperties
}

/**
 * The studio chrome inside a project follows the project's theme: the ink
 * tokens the chrome is built from (`bg-panel`, `text-ink`, `bg-accent`,
 * `ring-focus`, …) are re-pointed at the project's Radix accent and, when the
 * Theme page's design surfaces are set, at those surfaces — so the component
 * palette, the top bar and the inspector take a chosen palette the way the
 * canvas frame does. The portal and the template editor keep the neutral
 * tokens. Only the active appearance's surfaces apply; `.dark` still flips.
 */
export function chromeThemeStyle(config: StudioThemeConfig): CSSProperties {
  return {
    ...(designThemeStyle(config) ?? {}),
    // Radix's accent vars resolve here: the whole studio sits inside the library ThemeProvider.
    '--accent': 'var(--accent-9)',
    '--accent-ink': 'var(--accent-contrast)',
    '--focus': 'var(--accent-8)',
  } as CSSProperties
}

/** Ink to put on a given accent hex. */
export function accentInk(hex: string): string {
  return hexLuminance(hex) > 0.55 ? '#14161a' : '#ffffff'
}
