/**
 * Design-only component types (see the grilled design). These exist in the
 * mockup but have no @gummy-ui/ui counterpart yet: they render a design on the
 * canvas, carry their own props, serialize into project.json, and appear in
 * the Live Preview as a labelled placeholder. Each one is promotable later by
 * adding a real component and swapping the placeholder in `renderLive`.
 */

export type DesignOnlyType =
  | 'hero'
  | 'image'
  | 'gallery'
  | 'video'
  | 'linkcard'
  | 'quicklinks'
  | 'spacer'
  | 'barchart'
  | 'linechart'
  | 'piechart'
  | 'people'
  | 'orgchart'
  | 'stat'
  | 'alert'
  | 'banner'
  | 'progress'
  | 'toast'
  | 'dialog'

export const DESIGN_ONLY_TYPES: ReadonlySet<string> = new Set<DesignOnlyType>([
  'hero',
  'image',
  'gallery',
  'video',
  'linkcard',
  'quicklinks',
  'spacer',
  'barchart',
  'linechart',
  'piechart',
  'people',
  'orgchart',
  'stat',
  'alert',
  'banner',
  'progress',
  'toast',
  'dialog',
])

export function isDesignOnly(type: string): type is DesignOnlyType {
  return DESIGN_ONLY_TYPES.has(type)
}

export type MediaRatio = '16:9' | '4:3' | '3:2' | '1:1' | '21:9'
export const MEDIA_RATIOS: MediaRatio[] = ['16:9', '4:3', '3:2', '1:1', '21:9']

/** `padding-top` percentage that reserves a media box of the given ratio. */
export function ratioPadding(ratio: MediaRatio): string {
  switch (ratio) {
    case '1:1':
      return '100%'
    case '4:3':
      return '75%'
    case '3:2':
      return '66.7%'
    case '21:9':
      return '42.8%'
    default:
      return '56.25%'
  }
}

export type HeroConfig = {
  title: string
  subtitle: string
  /** Call-to-action label; '' hides the button. */
  cta: string
  bgImage: string
  align: 'left' | 'center'
  /** Minimum height in px. */
  height: number
  /** Darkening overlay over the background image, 0–100. */
  overlay: number
}

export type ImageConfig = {
  url: string
  alt: string
  caption: string
  ratio: MediaRatio
  fit: 'cover' | 'contain'
}

export type GalleryConfig = {
  /** Image URLs, one per line (or comma separated). */
  images: string
  caption: string
  ratio: MediaRatio
  thumbs: boolean
}

export type VideoConfig = {
  url: string
  caption: string
  ratio: MediaRatio
}

export type LinkCardConfig = {
  title: string
  url: string
  description: string
  newTab: boolean
}

export type QuickLinksConfig = {
  title: string
  /** `Label | https://…` per line. */
  items: string
}

export type SpacerConfig = {
  /** Height in px. */
  height: number
}

export type ChartKind = 'bar' | 'line' | 'pie'
export type ChartShape = 'Column' | 'Bar' | 'Line' | 'Area' | 'Pie' | 'Donut'
export const CHART_SHAPES: ChartShape[] = ['Column', 'Bar', 'Line', 'Area', 'Pie', 'Donut']

export type ChartConfig = {
  kind: ChartKind
  title: string
  chartType: ChartShape
  /** Library endpoint the chart would read, by `EndpointDef.id` (null = sample data). */
  endpointId: string | null
  mode: 'Count' | 'Sum'
  labelField: string
  valueField: string
  /** Comma-separated labels plotted before an API is bound. */
  sample: string
  /** Comma-separated colours; '' shades the accent. */
  palette: string
}

export type PeopleConfig = {
  title: string
  endpointId: string | null
  nameField: string
  roleField: string
  avatarField: string
  /** `Name | Role` per line — shown until an API is bound. */
  items: string
}

export type OrgChartConfig = {
  title: string
  /** `Name | Role` per line; prefix a line with `- ` for a direct report. */
  items: string
}

export type StatConfig = {
  label: string
  value: string
  endpointId: string | null
}

export type AlertConfig = {
  title: string
  body: string
  /** Inline action label; '' hides it. */
  action: string
}

export type BannerConfig = {
  text: string
  action: string
}

export type ProgressConfig = {
  label: string
  /** 0–100. */
  value: number
}

/** Where an overlay (toast / dialog) sits over the page in the Live Preview. */
export type OverlayAxis = 'start' | 'center' | 'end'
export type FeedbackVariant = 'Success' | 'Warning' | 'Error' | 'Info'
export const FEEDBACK_VARIANTS: FeedbackVariant[] = ['Success', 'Warning', 'Error', 'Info']

/**
 * A toast the page can show (see the grilled design: toasts and dialogs are
 * actions on a page, wired from a button's design-only navigation). `trigger`
 * decides whether it also sits on the page as a block or only appears when a
 * button shows it.
 */
export type ToastConfig = {
  style: 'Solid bar' | 'Card with actions'
  variant: FeedbackVariant
  title: string
  body: string
  /** Primary / secondary action labels ('' hides); both dismiss in the preview. */
  primary: string
  secondary: string
  closable: boolean
  trigger: 'always' | 'button'
  posX: OverlayAxis
  posY: OverlayAxis
  /** Seconds before it auto-dismisses; 0 keeps it until closed. */
  duration: number
}

export type DialogVariant = FeedbackVariant | 'Progress' | 'Person'
export const DIALOG_VARIANTS: DialogVariant[] = [
  'Success',
  'Warning',
  'Error',
  'Info',
  'Progress',
  'Person',
]

export type DialogConfig = {
  variant: DialogVariant
  layout: 'Icon beside' | 'Icon above'
  title: string
  body: string
  primary: string
  secondary: string
  closable: boolean
  /** Progress variant only, 0–100. */
  progress: number
  /** Person variant only. */
  person: string
  time: string
  trigger: 'always' | 'button'
  posX: OverlayAxis
  posY: OverlayAxis
  duration: number
  backdrop: 'None' | 'Dim the page'
  backdropColor: string
  /** 0–90. */
  backdropOpacity: number
  backdropClose: boolean
}

export type DesignConfig =
  | HeroConfig
  | ImageConfig
  | GalleryConfig
  | VideoConfig
  | LinkCardConfig
  | QuickLinksConfig
  | SpacerConfig
  | ChartConfig
  | PeopleConfig
  | OrgChartConfig
  | StatConfig
  | AlertConfig
  | BannerConfig
  | ProgressConfig
  | ToastConfig
  | DialogConfig

/** The mockup's defaults for a freshly dropped design-only component. */
export function createDefaultDesignConfig(type: DesignOnlyType): DesignConfig {
  switch (type) {
    case 'hero':
      return {
        title: 'Welcome to the portal',
        subtitle: 'Everything your team needs, in one place.',
        cta: 'Get started',
        bgImage: '',
        align: 'left',
        height: 200,
        overlay: 35,
      }
    case 'image':
      return { url: '', alt: '', caption: '', ratio: '16:9', fit: 'cover' }
    case 'gallery':
      return { images: '', caption: '', ratio: '16:9', thumbs: true }
    case 'video':
      return { url: '', caption: '', ratio: '16:9' }
    case 'linkcard':
      return {
        title: 'Reference document',
        url: 'https://example.com/doc',
        description: '',
        newTab: true,
      }
    case 'quicklinks':
      return {
        title: 'Quick links',
        items:
          'Handbook | https://example.com/handbook\nIT support | https://example.com/it\nLeave request | https://example.com/leave',
      }
    case 'spacer':
      return { height: 32 }
    case 'barchart':
      return {
        kind: 'bar',
        title: 'By category',
        chartType: 'Column',
        endpointId: null,
        mode: 'Count',
        labelField: '',
        valueField: '',
        sample: 'Bangkok, Chiang Mai, Phuket, Khon Kaen',
        palette: '',
      }
    case 'linechart':
      return {
        kind: 'line',
        title: 'Over time',
        chartType: 'Line',
        endpointId: null,
        mode: 'Count',
        labelField: '',
        valueField: '',
        sample: 'Jan, Feb, Mar, Apr, May, Jun',
        palette: '',
      }
    case 'piechart':
      return {
        kind: 'pie',
        title: 'Share',
        chartType: 'Donut',
        endpointId: null,
        mode: 'Count',
        labelField: '',
        valueField: '',
        sample: 'Active, Pending, Closed',
        palette: '',
      }
    case 'people':
      return {
        title: 'Team',
        endpointId: null,
        nameField: '',
        roleField: '',
        avatarField: '',
        items: 'Sarawut K. | Product designer\nPimchanok S. | Backend engineer\nThanapat R. | QA',
      }
    case 'orgchart':
      return {
        title: 'Reporting line',
        items:
          'Nattapong V. | Head of Digital\n- Sarawut K. | Product design\n- Pimchanok S. | Engineering\n- Thanapat R. | QA',
      }
    case 'stat':
      return { label: 'Total records', value: '1,284', endpointId: null }
    case 'alert':
      return {
        title: 'Check the highlighted fields',
        body: 'Three required fields are still empty.',
        action: '',
      }
    case 'banner':
      return { text: 'Sync runs every 15 minutes.', action: 'View log' }
    case 'progress':
      return { label: 'Import progress', value: 64 }
    case 'toast':
      return {
        style: 'Solid bar',
        variant: 'Success',
        title: 'New location created successfully!',
        body: 'Includes the all new dashboard view. Pages and exports will now load faster.',
        primary: 'Install now',
        secondary: 'Later',
        closable: true,
        trigger: 'always',
        posX: 'end',
        posY: 'start',
        duration: 4,
      }
    case 'dialog':
      return {
        variant: 'Success',
        layout: 'Icon beside',
        title: 'Successfully posted',
        body: 'Lorem ipsum dolor sit amet consectetur adipisicing elit.',
        primary: 'View changes',
        secondary: 'Dismiss',
        closable: true,
        progress: 75,
        person: 'Jake Smith',
        time: '11 min ago',
        trigger: 'always',
        posX: 'end',
        posY: 'start',
        duration: 5,
        backdrop: 'None',
        backdropColor: '#14161a',
        backdropOpacity: 20,
        backdropClose: true,
      }
  }
}

/** Default lg span (of 12) per design-only kind — the mockup's `span.lg`. */
export function designDefaultSpan(type: DesignOnlyType): number {
  switch (type) {
    case 'hero':
    case 'spacer':
    case 'orgchart':
    case 'banner':
      return 12
    case 'gallery':
    case 'video':
    case 'barchart':
    case 'linechart':
    case 'piechart':
    case 'alert':
      return 6
    case 'image':
    case 'linkcard':
    case 'quicklinks':
    case 'people':
    case 'toast':
    case 'dialog':
      return 4
    case 'progress':
      return 3
    case 'stat':
      return 2
  }
}

/** True for a toast/dialog that only appears when a button shows it. */
export function isClickOnlyOverlay(type: string, config: unknown): boolean {
  if (type !== 'toast' && type !== 'dialog') return false
  return (config as { trigger?: string } | undefined)?.trigger === 'button'
}

/* -------------------------------------------------------------- parsing */

export type LineItem = { depth: 0 | 1; a: string; b: string }

/** `Name | Role` lines; a leading `- ` marks depth 1 (org chart reports). */
export function lineItems(value: string): LineItem[] {
  return String(value ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const dash = /^-\s*/.test(l)
      const parts = l.replace(/^-\s*/, '').split('|')
      return { depth: dash ? 1 : 0, a: (parts[0] ?? '').trim(), b: (parts[1] ?? '').trim() }
    })
}

/** URL list split on newlines or commas. */
export function imageList(value: string): string[] {
  return String(value ?? '')
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

/** Comma-separated list. */
export function commaList(value: string): string[] {
  return String(value ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

/** Two-letter initials for an avatar fallback. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

/* --------------------------------------------------------------- style */

/**
 * Per-element colours (the inspector's Style tab) — a design-only annotation
 * (see the grilled design): painted on the canvas through CSS variables,
 * exported in project.json, ignored by the engine. Containers additionally
 * derive the engine's `ContainerSurface` background/border flags from it.
 * Every field is '' when unset.
 */
export type ElementStyle = {
  bg: string
  fg: string
  line: string
  accent: string
  /** Corner radius in px ('' = theme default). */
  radius: string
  /** Data tables only. */
  thBg: string
  thFg: string
  zebra: boolean
}

export function createDefaultElementStyle(): ElementStyle {
  return { bg: '', fg: '', line: '', accent: '', radius: '', thBg: '', thFg: '', zebra: false }
}

/** True when any style value is set (so the canvas / export can skip the rest). */
export function hasElementStyle(style: ElementStyle | undefined): style is ElementStyle {
  if (!style) return false
  return (
    !!style.bg ||
    !!style.fg ||
    !!style.line ||
    !!style.accent ||
    !!style.radius ||
    !!style.thBg ||
    !!style.thFg ||
    style.zebra
  )
}

/** Relative luminance of a hex colour (0 dark … 1 light); 0.5 when unparseable. */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{3,8})$/i.exec(hex.trim())
  if (!m) return 0.5
  let h = m[1]
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * The CSS custom properties a styled cell sets so its content (chrome tokens
 * and the design-only renders) re-tints — the mockup's `styleVars`. Inline
 * styles are the right tool here: the values are author-chosen colours that
 * cannot be classes.
 */
export function elementStyleVars(style: ElementStyle): Record<string, string> {
  const out: Record<string, string> = {}
  const base = style.bg
  const fg = style.fg || (base ? (luminance(base) > 0.55 ? '#14161a' : '#ffffff') : '')
  if (base) {
    out.background = base
    out['--bg'] = base
    out['--panel'] = base
    out['--panel-2'] = `color-mix(in srgb, ${fg} 8%, ${base})`
  }
  if (fg) {
    out['--ink'] = fg
    out.color = fg
    if (base) {
      out['--ink-2'] = `color-mix(in srgb, ${fg} 72%, ${base})`
      out['--ink-3'] = `color-mix(in srgb, ${fg} 48%, ${base})`
    }
  }
  if (style.line) {
    out['--line'] = style.line
    out['--line-strong'] = style.line
    out.borderColor = style.line
  } else if (base && fg) {
    out['--line'] = `color-mix(in srgb, ${fg} 18%, ${base})`
  }
  if (style.accent) {
    out['--accent'] = style.accent
    out['--accent-ink'] = luminance(style.accent) > 0.55 ? '#14161a' : '#ffffff'
  }
  if (style.radius !== '') {
    const r = parseInt(style.radius, 10)
    if (!Number.isNaN(r)) {
      out['--r'] = `${r}px`
      out.borderRadius = `${r}px`
    }
  }
  return out
}
