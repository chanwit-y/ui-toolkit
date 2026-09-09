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

/** Radix `scaling` — the mockup's density: Compact / Cozy / Comfortable. */
export type ThemeScaling = '90%' | '100%' | '110%'
export const DENSITY_OPTIONS: { value: ThemeScaling; label: string }[] = [
  { value: '90%', label: 'Compact' },
  { value: '100%', label: 'Cozy' },
  { value: '110%', label: 'Comfortable' },
]

/** Surface colours of one mode ('' = the library default for that mode). */
export type DesignSurfaces = { surface: string; panel: string; text: string; border: string }

/**
 * The mockup's design-only theme values (see the grilled design): per-mode
 * surfaces and a font have no ThemeProvider equivalent, so they paint the
 * canvas frame and the Live Preview wrapper, ship in project.json, and stay
 * out of theme.ts.
 */
export type DesignTheme = {
  font: string
  light: DesignSurfaces
  dark: DesignSurfaces
}

export const FONT_OPTIONS = ['Inter', 'IBM Plex Sans', 'Noto Sans Thai', 'Sarabun']

export function createDefaultDesignTheme(): DesignTheme {
  return {
    font: 'Inter',
    light: { surface: '', panel: '', text: '', border: '' },
    dark: { surface: '', panel: '', text: '', border: '' },
  }
}

/** What an unset surface resolves to — the studio's own ink tokens per mode. */
export const SURFACE_DEFAULTS: Record<ThemeAppearance, DesignSurfaces> = {
  light: { surface: '#ffffff', panel: '#fbfbfc', text: '#14161a', border: '#e2e4e7' },
  dark: { surface: '#0c0d0f', panel: '#111316', text: '#f0f1f2', border: '#24272c' },
}

export type StudioThemeConfig = {
  appearance: ThemeAppearance
  accentColor: AccentColor
  radius: ThemeRadius
  panelBackground: ThemePanelBackground
  /** Radix `scaling`; absent = 100%. Exported in theme.ts. */
  scaling?: ThemeScaling
  /** `ThemeComponents.button.color`; `''` = no button override. */
  buttonColor: string
  dataTable: DataTableThemeConfig
  /** Design-only surfaces + font; absent on configs saved before it existed. */
  design?: DesignTheme
}

/** A palette preset (the mockup's PALETTES): five swatches, one marked accent. */
export type ThemePalette = { name: string; accent: number; colors: string[] }

export const PALETTES: ThemePalette[] = [
  { name: 'Clinic red', accent: 0, colors: ['#e63946', '#f1faee', '#a8dadc', '#457b9d', '#1d3557'] },
  { name: 'Teal ward', accent: 1, colors: ['#005f73', '#0a9396', '#94d2bd', '#e9d8a6', '#ee9b00'] },
  { name: 'Blue chart', accent: 1, colors: ['#03045e', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8'] },
  { name: 'Mint care', accent: 4, colors: ['#f6fff8', '#eaf4f4', '#cce3de', '#a4c3b2', '#6b9080'] },
  { name: 'Forest data', accent: 2, colors: ['#081c15', '#1b4332', '#2d6a4f', '#74c69d', '#d8f3dc'] },
  { name: 'Indigo ink', accent: 3, colors: ['#eef2ff', '#c7d2fe', '#818cf8', '#4338ca', '#1e1b4b'] },
  { name: 'Violet lab', accent: 2, colors: ['#10002b', '#5a189a', '#9d4edd', '#e0aaff', '#f8f7ff'] },
  { name: 'Rose soft', accent: 3, colors: ['#fff1f3', '#ffccd5', '#ff8fa3', '#c9184a', '#590d22'] },
  { name: 'Amber alert', accent: 1, colors: ['#fff3b0', '#e09f3e', '#9e2a2b', '#540b0e', '#335c67'] },
  { name: 'Sunset ops', accent: 2, colors: ['#003049', '#d62828', '#f77f00', '#fcbf49', '#eae2b7'] },
  { name: 'Slate calm', accent: 4, colors: ['#f8f9fa', '#e9ecef', '#dee2e6', '#adb5bd', '#495057'] },
  { name: 'Graphite', accent: 4, colors: ['#ffffff', '#f4f5f6', '#c9ccd1', '#4b5158', '#14161a'] },
]

/** Representative step-9 hex per Radix accent, for nearest-colour matching. */
const ACCENT_HEX: Record<AccentColor, string> = {
  gray: '#8d8d8d',
  gold: '#978365',
  bronze: '#a18072',
  brown: '#ad7f58',
  yellow: '#ffe629',
  amber: '#ffc53d',
  orange: '#f76b15',
  tomato: '#e54d2e',
  red: '#e5484d',
  ruby: '#e54666',
  crimson: '#e93d82',
  pink: '#d6409f',
  plum: '#ab4aba',
  purple: '#8e4ec6',
  violet: '#6e56cf',
  iris: '#5b5bd6',
  indigo: '#3e63dd',
  blue: '#0090ff',
  cyan: '#00a2c7',
  teal: '#12a594',
  jade: '#29a383',
  green: '#30a46c',
  grass: '#46a758',
  lime: '#bdee63',
  mint: '#86ead4',
  sky: '#7ce2fe',
}

function rgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return [128, 128, 128]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Relative luminance 0–1 of a hex colour. */
export function hexLuminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => c / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** The Radix accent closest to a hex colour (the palette's marked swatch). */
export function nearestAccent(hex: string): AccentColor {
  const [r, g, b] = rgb(hex)
  let best: AccentColor = 'blue'
  let bestD = Infinity
  for (const name of ACCENT_COLORS) {
    const [r2, g2, b2] = rgb(ACCENT_HEX[name])
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2
    if (d < bestD) {
      bestD = d
      best = name
    }
  }
  return best
}

/** The mockup's `paletteTheme`: lightest swatches become the light surfaces,
 * darkest the dark ones, text the opposite end. */
export function paletteSurfaces(p: ThemePalette): { light: DesignSurfaces; dark: DesignSurfaces } {
  const byLight = p.colors.slice().sort((a, b) => hexLuminance(b) - hexLuminance(a))
  const last = byLight.length - 1
  return {
    light: { surface: byLight[0], panel: byLight[1], text: byLight[last], border: '' },
    dark: { surface: byLight[last], panel: byLight[last - 1], text: byLight[0], border: '' },
  }
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
