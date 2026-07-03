import type { ThemeComponents, ThemeProps } from '@gummy-ui/ui'
import { THEME_DEFAULTS, type StudioThemeConfig } from './types'

/**
 * Lowers the Theme page's config onto its two artifacts: the live
 * `{theme, components}` objects App.tsx feeds ThemeProvider, and the
 * paste-ready `theme.ts` module the code pane shows (mirroring
 * `apps/example/src/config/theme.ts`). The snippet emits only non-default /
 * set keys so it stays as small as what a consumer would write by hand.
 */

/** The dataTable overrides with unset (`''`) roles dropped. */
function dataTableOverrides(c: StudioThemeConfig): Record<string, string> {
  return Object.fromEntries(
    Object.entries(c.dataTable).filter(([, value]) => value !== ''),
  )
}

/** The live objects for `<ThemeProvider theme components>`. */
export function toThemeObjects(c: StudioThemeConfig): {
  theme: ThemeProps
  components: ThemeComponents
} {
  const dataTable = dataTableOverrides(c)
  return {
    theme: {
      appearance: c.appearance,
      accentColor: c.accentColor,
      radius: c.radius,
      panelBackground: c.panelBackground,
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

/** `key: "value",` lines with two-space indent per level. */
function entryLines(obj: Record<string, string>, indent: string): string {
  return Object.entries(obj)
    .map(([k, v]) => `${indent}${k}: "${v}",`)
    .join('\n')
}

/** The paste-ready `theme.ts` module. */
export function toThemeTs(c: StudioThemeConfig): string {
  const themeEntries: Record<string, string> = {}
  if (c.appearance !== THEME_DEFAULTS.appearance) themeEntries.appearance = c.appearance
  if (c.accentColor !== THEME_DEFAULTS.accentColor) themeEntries.accentColor = c.accentColor
  if (c.radius !== THEME_DEFAULTS.radius) themeEntries.radius = c.radius
  if (c.panelBackground !== THEME_DEFAULTS.panelBackground)
    themeEntries.panelBackground = c.panelBackground

  const dataTable = dataTableOverrides(c)

  const themeBody =
    Object.keys(themeEntries).length > 0 ? `{\n${entryLines(themeEntries, '  ')}\n}` : '{}'

  const componentParts: string[] = []
  if (c.buttonColor) componentParts.push(`  button: { color: "${c.buttonColor}" },`)
  if (Object.keys(dataTable).length > 0) {
    componentParts.push(`  dataTable: {\n${entryLines(dataTable, '    ')}\n  },`)
  }
  const componentsBody =
    componentParts.length > 0 ? `{\n${componentParts.join('\n')}\n}` : '{}'

  return `import type { ThemeComponents, ThemeProps } from "@gummy-ui/ui";

/**
 * App-wide theme config — pass to the provider wrapping your app:
 *   <ThemeProvider theme={theme} components={components}>
 * Omitted keys fall back to ThemeProvider defaults. Unset dataTable roles
 * follow the accent (--accent-*) and flip with dark mode.
 */
export const theme: ThemeProps = ${themeBody};

export const components: ThemeComponents = ${componentsBody};
`
}
