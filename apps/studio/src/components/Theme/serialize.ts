import type { GummyThemeProps, ThemeComponents } from '@gummy-ui/ui'
import { backdropToCss, type StudioThemeConfig } from './types'

/**
 * Lowers the Theme page's config onto the `{ theme, components }` objects
 * App.tsx feeds ThemeProvider — the `theme` slice of the runtime project
 * JSON, which the Theme page's code pane shows.
 */

/** The dataTable overrides with unset (`''`) roles dropped. */
function dataTableOverrides(c: StudioThemeConfig): Record<string, string> {
  return Object.fromEntries(
    Object.entries(c.dataTable).filter(([, value]) => value !== ''),
  )
}

/** The live objects for `<ThemeProvider theme components>`. */
export function toThemeObjects(c: StudioThemeConfig): {
  theme: GummyThemeProps
  components: ThemeComponents
} {
  const dataTable = dataTableOverrides(c)
  // Glass only when set; its backdrop only when it is not the engine default.
  const glass = c.surface === 'glass'
  const background = glass && c.background ? backdropToCss(c.background) : undefined
  return {
    theme: {
      appearance: c.appearance,
      accentColor: c.accentColor,
      radius: c.radius,
      panelBackground: c.panelBackground,
      ...(c.scaling && c.scaling !== '100%' ? { scaling: c.scaling } : {}),
      ...(glass ? { surface: 'glass' as const } : {}),
      ...(background ? { background } : {}),
    },
    components: {
      ...(c.buttonColor
        ? { button: { color: c.buttonColor as NonNullable<ThemeComponents['button']>['color'] } }
        : {}),
      ...(Object.keys(dataTable).length > 0
        ? { dataTable: dataTable as ThemeComponents['dataTable'] }
        : {}),
    },
  }
}

