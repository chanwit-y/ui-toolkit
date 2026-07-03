import type { ThemeProps } from '@gummy-ui/ui'

/**
 * The Theme page's editable state — the app-wide ThemeProvider config a
 * consumer keeps as `config/theme.ts` (see the grilled design). Color roles
 * use `''` for "unset": unset dataTable roles follow the accent (dark-safe),
 * an unset buttonColor omits the `button` override entirely, and unset keys
 * are dropped from the export so the snippet stays minimal.
 */

export type ThemeAppearance = 'light' | 'dark'
export type ThemeRadius = 'none' | 'small' | 'medium' | 'large' | 'full'
export type ThemePanelBackground = 'solid' | 'translucent'
export type AccentColor = NonNullable<ThemeProps['accentColor']>

/** The Radix palette — every name `ThemeProps['accentColor']` accepts. */
export const ACCENT_COLORS: AccentColor[] = [
  'gray',
  'gold',
  'bronze',
  'brown',
  'yellow',
  'amber',
  'orange',
  'tomato',
  'red',
  'ruby',
  'crimson',
  'pink',
  'plum',
  'purple',
  'violet',
  'iris',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'jade',
  'green',
  'grass',
  'lime',
  'mint',
  'sky',
]

export const RADIUS_VALUES: ThemeRadius[] = ['none', 'small', 'medium', 'large', 'full']

export type HeaderFontSize = '' | 'xs' | 'sm' | 'base' | 'lg' | 'xl'
export type HeaderFontWeight = '' | 'normal' | 'medium' | 'semibold' | 'bold'

/** Per-role DataTable overrides — mirrors `ThemeComponents['dataTable']` with
 * `''` = unset (follows accent / component default). */
export type DataTableThemeConfig = {
  headerColor: string
  headerTextColor: string
  headerFontSize: HeaderFontSize
  headerFontWeight: HeaderFontWeight
  headerHoverColor: string
  paginationButtonColor: string
  paginationButtonHoverColor: string
  rowHoverColor: string
  editButtonColor: string
  deleteButtonColor: string
}

export type StudioThemeConfig = {
  appearance: ThemeAppearance
  accentColor: AccentColor
  radius: ThemeRadius
  panelBackground: ThemePanelBackground
  /** `ThemeComponents.button.color`; `''` = no button override. */
  buttonColor: string
  dataTable: DataTableThemeConfig
}

/** ThemeProvider's own defaults — keys matching these are omitted on export. */
export const THEME_DEFAULTS = {
  appearance: 'light',
  accentColor: 'blue',
  radius: 'small',
  panelBackground: 'translucent',
} as const

/**
 * DataTable roles where a pinned named color routes into the legacy
 * light-only static map (no dark variant) — the panel warns when these are
 * set. Unset, they follow `--accent-*` and flip with dark mode. The edit /
 * delete button colors resolve through accent tokens and are exempt.
 */
export const LEGACY_MAP_ROLES = [
  'headerColor',
  'headerHoverColor',
  'paginationButtonColor',
  'paginationButtonHoverColor',
  'rowHoverColor',
] as const satisfies readonly (keyof DataTableThemeConfig)[]
