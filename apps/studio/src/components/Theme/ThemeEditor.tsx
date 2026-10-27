import { SurfaceBackdrop } from '@gummy-ui/ui'
import { Upload, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Button, CodeViewer, IconButton, Input, Popover, Select, SegmentedControl, cn } from '../common'
import { ColorInput } from '../Menu/MenuEditor'
import { useWorkspaceStore } from '../Workspace/workspaceStore'
import { accentInk, resolvedSurfaces } from './designTheme'
import { useThemeStore } from './themeStore'
import { toThemeObjects } from './serialize'
import {
  ACCENT_COLORS,
  backdropToCss,
  createDefaultBackdrop,
  createDefaultDesignTheme,
  DENSITY_OPTIONS,
  FONT_OPTIONS,
  LEGACY_MAP_ROLES,
  nearestAccent,
  PALETTES,
  RADIUS_VALUES,
  SURFACE_DEFAULTS,
  SURFACE_OPTIONS,
  type AccentColor,
  type BackdropConfig,
  type BackdropKind,
  type DataTableThemeConfig,
  type DesignSurfaces,
  type StudioThemeConfig,
  type ThemeAppearance,
  type ThemePalette,
  type ThemePanelBackground,
  type ThemeRadius,
  type ThemeScaling,
  type ThemeSurface,
} from './types'

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return 0.5
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** One labelled row in the form. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="block text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
    </div>
  )
}

/** A boxed section with the mockup's uppercase section label. */
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="box mb-4 space-y-3">
      <span className="sec-label block">{label}</span>
      {children}
    </section>
  )
}

/**
 * Visual picker over the Radix palette (the icon-picker precedent: pick a
 * color you can see, not a name). Swatches are tinted by the palette's own
 * `--{color}-9` var — defined for every palette on the app's `.radix-themes`
 * wrapper, independent of the active accent. `allowNone` prepends an "unset"
 * swatch for optional colors (button override).
 */
function SwatchGrid({
  value,
  onChange,
  allowNone = false,
  noneTitle = 'No override',
}: {
  value: string
  onChange: (color: string) => void
  allowNone?: boolean
  /** Tooltip of the "off" swatch — what unset resolves to. */
  noneTitle?: string
}) {
  return (
    <div className="grid grid-cols-9 gap-1">
      {allowNone && (
        <button
          type="button"
          title={noneTitle}
          onClick={() => onChange('')}
          className={cn(
            'flex h-7 items-center justify-center rounded-md border text-ui-xs font-medium transition-shadow',
            value === ''
              ? 'border-focus text-ink ring-1 ring-focus'
              : 'border-line text-ink-3 hover:border-line-strong',
          )}
        >
          off
        </button>
      )}
      {ACCENT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          title={color}
          onClick={() => onChange(color)}
          style={{ backgroundColor: `var(--${color}-9)` }}
          className={cn(
            'h-7 rounded-md transition-shadow',
            value === color
              ? 'ring-2 ring-focus ring-offset-1 ring-offset-panel'
              : 'hover:ring-1 hover:ring-line-strong',
          )}
        >
          <span className="sr-only">{color}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * A colour role as a compact field: a swatch dot + the colour name (or what
 * "unset" resolves to), opening the `SwatchGrid` in the studio popover — the
 * `IconField` precedent: pick a colour you can see, not a name from a list.
 */
export function ColorField({
  label,
  value,
  onChange,
  unsetLabel,
}: {
  label: string
  value: string
  onChange: (color: string) => void
  unsetLabel: string
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const close = useCallback(() => setAnchor(null), [])
  // "Header" → "header color"; a label that already says colour isn't doubled ("Color" → "color").
  const role = label.replace(/\s*colou?r$/i, '').trim().toLowerCase()
  const what = role ? `${role} color` : 'color'
  // The popover closes itself on any outside pointerdown — including one on
  // this trigger — so the click that follows must not reopen it.
  const wasOpen = useRef(false)
  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`Choose ${what}`}
          aria-haspopup="dialog"
          aria-expanded={anchor !== null}
          onPointerDown={() => {
            wasOpen.current = anchor !== null
          }}
          onClick={(e) => {
            if (!wasOpen.current) setAnchor(e.currentTarget.getBoundingClientRect())
          }}
          className="field flex min-w-0 flex-1 items-center gap-2 text-left hover:bg-panel-2"
        >
          <span
            aria-hidden="true"
            style={value ? { backgroundColor: `var(--${value}-9)` } : undefined}
            className={cn(
              'h-4 w-4 shrink-0 rounded-full',
              !value && 'border border-dashed border-line-strong',
            )}
          />
          {value ? (
            <span className="truncate font-mono text-ink">{value}</span>
          ) : (
            <span className="truncate text-ink-3">{unsetLabel}</span>
          )}
        </button>
        {value && (
          <IconButton label={`Clear ${what}`} className="btn-icon-sm" onClick={() => onChange('')}>
            <X size={13} aria-hidden="true" />
          </IconButton>
        )}
      </div>
      <Popover anchor={anchor} title={label} onClose={close}>
        <SwatchGrid
          allowNone
          noneTitle={unsetLabel}
          value={value}
          onChange={(color) => {
            onChange(color)
            close()
          }}
        />
        <p className="mt-2 text-ui-sm text-ink-3">
          {value ? (
            <>
              Selected: <span className="font-mono text-ink-2">{value}</span>
            </>
          ) : (
            unsetLabel
          )}
        </p>
      </Popover>
    </Field>
  )
}

const APPEARANCE_OPTIONS = [
  { value: 'light', label: 'Light mode' },
  { value: 'dark', label: 'Dark mode' },
]
const PANEL_OPTIONS = [
  { value: 'solid', label: 'Solid' },
  { value: 'translucent', label: 'Translucent' },
]
const RADIUS_OPTIONS = RADIUS_VALUES.map((v) => ({ value: v, label: v }))

/** What an unset dataTable colour role resolves to (the `ColorField` placeholder). */
function unsetRoleLabel(key: keyof DataTableThemeConfig, legacy: boolean): string {
  if (legacy) return 'follows accent'
  // The action buttons are Radix buttons, so a pinned color stays dark-safe.
  if (key === 'editButtonColor') return 'same as buttons'
  if (key === 'deleteButtonColor') return 'default (red)'
  return 'default'
}
const FONT_SIZE_OPTIONS = [
  { value: '', label: '— default (xs) —' },
  ...['xs', 'sm', 'base', 'lg', 'xl'].map((v) => ({ value: v, label: v })),
]
const FONT_WEIGHT_OPTIONS = [
  { value: '', label: '— default (bold) —' },
  ...['normal', 'medium', 'semibold', 'bold'].map((v) => ({ value: v, label: v })),
]

/** The dataTable color-role rows: [config key, label, legacy-map member]. */
const DATA_TABLE_COLOR_ROLES: [keyof DataTableThemeConfig, string, boolean][] = [
  ['headerColor', 'Header background', true],
  ['headerTextColor', 'Header text', false],
  ['headerHoverColor', 'Header hover', true],
  ['paginationButtonColor', 'Pagination buttons', true],
  ['paginationButtonHoverColor', 'Pagination hover', true],
  ['rowHoverColor', 'Row hover', true],
  ['editButtonColor', 'Edit button', false],
  ['deleteButtonColor', 'Delete button', false],
]

const LEGACY_ROLE_LABELS = new Map(
  DATA_TABLE_COLOR_ROLES.filter(([, , legacy]) => legacy).map(([key, label]) => [
    key,
    label,
  ]),
)

/**
 * The Theme page — the app-wide ThemeProvider config (see the grilled design).
 * One centered column (the mockup's detail page): the token/override form in
 * boxed sections, then the live paste-ready `theme.ts` below. Edits apply
 * immediately: App.tsx derives the live ThemeProvider props from this store,
 * so the canvas previews and the Live Preview re-tint as you pick — and the
 * appearance flips the studio chrome too (one toggle, see the redesign).
 */
const SURFACE_ROLES: [keyof DesignSurfaces, string, string][] = [
  ['surface', 'Background', 'page background'],
  ['panel', 'Panel', 'cards, headers'],
  ['text', 'Text', 'headings and body'],
  ['border', 'Border', 'dividers, outlines'],
]

/** A design-only colour row: swatch picker + hex + reset to the recommended value. */
function SurfaceRow({
  label,
  hint,
  value,
  fallback,
  onChange,
}: {
  label: string
  hint: string
  value: string
  fallback: string
  onChange: (v: string) => void
}) {
  const shown = value || fallback
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-ui-sm font-medium text-ink-2">{label}</span>
      <label
        className="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-md border border-line"
        style={{ background: shown }}
        title="Pick a colour"
      >
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(shown) ? shown : '#888888'}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} colour`}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={fallback}
        className="w-28! font-mono"
      />
      {value ? (
        <IconButton label={`Reset ${label.toLowerCase()}`} className="btn-icon-sm h-6!" onClick={() => onChange('')}>
          <X size={12} aria-hidden="true" />
        </IconButton>
      ) : (
        <span className="text-ui-xs text-ink-3">{hint}</span>
      )}
    </div>
  )
}

const BACKDROP_KIND_OPTIONS: { value: BackdropKind; label: string }[] = [
  { value: 'default', label: 'Accent gradient (default)' },
  { value: 'color', label: 'Colour' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'image', label: 'Image' },
]

/** Backdrop images bigger than this are refused: the data URL lives in the project JSON (the app-bar logo's rule). */
const MAX_BACKDROP_BYTES = 300 * 1024

/** The backdrop image: a URL, or a file read into a `data:` URL so the exported project is self-contained. */
function BackdropImageField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const pick = (file: File | undefined) => {
    setError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Pick an image file (PNG, JPEG, WebP, SVG …).')
    if (file.size > MAX_BACKDROP_BYTES)
      return setError(`That image is ${Math.round(file.size / 1024)} KB — keep the backdrop under ${MAX_BACKDROP_BYTES / 1024} KB, or link it by URL.`)
    const reader = new FileReader()
    reader.onload = () => onChange(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => setError('Could not read that file.')
    reader.readAsDataURL(file)
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          value={value.startsWith('data:') ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={value.startsWith('data:') ? 'Uploaded image' : 'https://… or /backdrop.jpg'}
          className="font-mono"
        />
        <Button size="sm" onClick={() => fileRef.current?.click()}>
          <Upload size={13} aria-hidden="true" />
          Upload
        </Button>
        {value && (
          <IconButton label="Clear backdrop image" className="btn-icon-sm" onClick={() => onChange('')}>
            <X size={13} aria-hidden="true" />
          </IconButton>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      {error && <p className="text-ui-sm text-danger">{error}</p>}
    </div>
  )
}

/**
 * The glass look, for real: a `data-surface="glass"` box painting the
 * configured backdrop with the library's own classes — what the canvas frame
 * and the Live Preview will show.
 */
function GlassPreview({ background, accent }: { background: BackdropConfig; accent: AccentColor }) {
  const css = backdropToCss(background)
  const style = { ...(css ? { '--gummy-backdrop': css } : {}) } as CSSProperties
  return (
    <div
      data-surface="glass"
      className="relative isolate overflow-hidden rounded-[10px] border border-line p-4"
      style={style}
      aria-label="Glass preview"
    >
      <SurfaceBackdrop />
      <div className="gummy-surface rounded-lg border border-line p-3 text-ui text-[var(--gray-12)]">
        <div className="flex items-center justify-between gap-2">
          <b className="font-semibold">A glass card</b>
          <span
            className="inline-flex h-6 items-center rounded-md px-2 text-ui-xs font-semibold"
            style={{ background: `var(--${accent}-9)`, color: 'var(--accent-contrast)' }}
          >
            Action
          </span>
        </div>
        <p className="mb-2 mt-1 text-[var(--gray-11)]">Panels blur the backdrop behind them; buttons stay solid.</p>
        <div className="gummy-surface-input rounded-md border border-line px-2 py-1.5 text-[var(--gray-10)]">Search…</div>
      </div>
    </div>
  )
}

export function ThemeEditor() {
  const config = useThemeStore((s) => s.config)
  const update = useThemeStore((s) => s.update)
  const updateDataTable = useThemeStore((s) => s.updateDataTable)
  const updateBackground = useThemeStore((s) => s.updateBackground)
  const updateSurfaces = useThemeStore((s) => s.updateSurfaces)
  const setFont = useThemeStore((s) => s.setFont)
  const applyPalette = useThemeStore((s) => s.applyPalette)
  const logActivity = useWorkspaceStore((s) => s.logActivity)

  // Palette preview (the mockup's "try it, then Apply"): nothing changes in
  // the project until Apply — the sample block below paints the candidate.
  const [preview, setPreview] = useState<{ palette: ThemePalette; surfaces: boolean } | null>(null)

  const themeJson = useMemo(() => JSON.stringify(toThemeObjects(config), null, 2), [config])
  const mode = config.appearance
  const design = config.design ?? createDefaultDesignTheme()
  const backdrop = config.background ?? createDefaultBackdrop()
  const glass = config.surface === 'glass'
  const surfaces = resolvedSurfaces(config, mode)
  const sampleAccentName = preview
    ? nearestAccent(preview.palette.colors[preview.palette.accent])
    : config.accentColor
  const sampleSurfaces: DesignSurfaces = preview?.surfaces
    ? (() => {
        const byLight = preview.palette.colors.slice().sort((a, b) => luminance(b) - luminance(a))
        const last = byLight.length - 1
        return mode === 'light'
          ? { surface: byLight[0], panel: byLight[1], text: byLight[last], border: surfaces.border }
          : { surface: byLight[last], panel: byLight[last - 1], text: byLight[0], border: surfaces.border }
      })()
    : surfaces
  const sampleAccentHex = preview ? preview.palette.colors[preview.palette.accent] : ''

  const pinnedLegacyRoles = LEGACY_MAP_ROLES.filter(
    (role) => config.dataTable[role] !== '',
  )

  const set = <K extends keyof Omit<StudioThemeConfig, 'dataTable'>>(
    key: K,
    value: StudioThemeConfig[K],
  ) => update({ [key]: value } as Partial<Omit<StudioThemeConfig, 'dataTable'>>)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto max-w-[760px] px-6 pb-16 pt-6">
        <h2 className="text-base font-[650] tracking-[-0.01em] text-ink">Theme</h2>
        <p className="mb-4 mt-1 text-ui text-ink-2">
          The app-wide <span className="font-mono">ThemeProvider</span> config. Applies
          live to the canvas and Live Preview; exported as{' '}
          <span className="font-mono">theme.ts</span>.
        </p>

        <div className="mb-4 flex items-center gap-2.5">
          <SegmentedControl
            aria-label="Appearance"
            options={APPEARANCE_OPTIONS}
            value={config.appearance}
            onChange={(v) => set('appearance', v as ThemeAppearance)}
          />
          <span className="text-ui-sm text-ink-3">
            Editing the {mode} set · the {mode === 'light' ? 'dark' : 'light'} set keeps its own
            surfaces.
          </span>
        </div>

        {preview && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[10px] border border-line-strong bg-panel px-3.5 py-2.5 text-ui text-ink">
            <b className="font-semibold">Previewing “{preview.palette.name}”</b>
            <label className="flex cursor-pointer items-center gap-2 text-ink-2">
              <input
                type="checkbox"
                checked={preview.surfaces}
                onChange={(e) => setPreview({ ...preview, surfaces: e.target.checked })}
                className="h-3.5 w-3.5 accent-accent"
              />
              Take the surfaces too, not just the accent
            </label>
            <span className="flex-1" />
            <Button size="sm" onClick={() => setPreview(null)}>
              Discard
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                applyPalette(preview.palette, preview.surfaces)
                logActivity(
                  'applied',
                  'theme',
                  preview.palette.name,
                  preview.surfaces ? 'accent and surfaces' : 'accent only',
                )
                setPreview(null)
              }}
            >
              Apply to project
            </Button>
          </div>
        )}

        <Section label="Palettes — a starting point">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
            {PALETTES.map((pl) => {
              const on = preview?.palette.name === pl.name
              return (
                <button
                  key={pl.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPreview({ palette: pl, surfaces: preview?.surfaces ?? false })}
                  className={cn(
                    'overflow-hidden rounded-md border text-left transition-colors hover:border-line-strong',
                    on ? 'border-focus ring-1 ring-focus' : 'border-line',
                  )}
                >
                  <span className="flex h-7">
                    {pl.colors.map((c) => (
                      <i key={c} className="block flex-1" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="flex items-center gap-1.5 px-2 py-1.5 text-ui-sm">
                    <b className="min-w-0 flex-1 truncate font-semibold text-ink">{pl.name}</b>
                    <i
                      className="block h-2.5 w-2.5 rounded-full border border-line"
                      style={{ background: pl.colors[pl.accent] }}
                      title={`accent → ${nearestAccent(pl.colors[pl.accent])}`}
                    />
                  </span>
                </button>
              )
            })}
          </div>
          <p className="text-ui-sm text-ink-3">
            Click one to try it. The accent snaps to the nearest Radix colour; nothing changes in
            the project until you press Apply.
          </p>
        </Section>

        {/* Sample screen: painted with the previewed (or current) mode colours. */}
        <div
          className="mb-4 rounded-[10px] border p-4"
          style={{
            background: sampleSurfaces.surface,
            color: sampleSurfaces.text,
            borderColor: sampleSurfaces.border,
          }}
        >
          <h4 className="m-0 text-[14px] font-semibold">Sample screen</h4>
          <p className="mb-3 mt-0.5 text-ui" style={{ opacity: 0.75 }}>
            This block is painted with the {preview ? 'previewed' : 'current'} {mode} colours.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-7 items-center rounded-md px-3 text-ui font-semibold"
              style={
                sampleAccentHex
                  ? { background: sampleAccentHex, color: accentInk(sampleAccentHex) }
                  : { background: `var(--${sampleAccentName}-9)`, color: 'var(--accent-contrast)' }
              }
            >
              Primary action
            </span>
            <span
              className="inline-flex h-7 items-center rounded-md border px-3 text-ui font-semibold"
              style={{ borderColor: sampleSurfaces.border }}
            >
              Secondary
            </span>
            <span
              className="inline-flex h-[18px] items-center rounded px-1.5 font-mono text-ui-xs"
              style={{ background: sampleSurfaces.panel, border: `1px solid ${sampleSurfaces.border}` }}
            >
              badge
            </span>
            <span
              className="inline-flex h-7 flex-1 items-center rounded-md border px-2 text-ui"
              style={{ borderColor: sampleSurfaces.border, background: sampleSurfaces.panel, opacity: 0.8 }}
            >
              Search…
            </span>
          </div>
          <div
            className="mt-3 overflow-hidden rounded-md border text-ui"
            style={{ borderColor: sampleSurfaces.border }}
          >
            <div
              className="px-2.5 py-1.5 font-mono text-ui-xs font-semibold uppercase tracking-wide"
              style={{ background: sampleSurfaces.panel }}
            >
              table header
            </div>
            <div className="border-t px-2.5 py-1.5" style={{ borderColor: sampleSurfaces.border }}>
              Row of data
            </div>
            <div className="border-t px-2.5 py-1.5" style={{ borderColor: sampleSurfaces.border }}>
              Row of data
            </div>
          </div>
        </div>

        <Section label="Accent — shared by both modes">
          <SwatchGrid
            value={config.accentColor}
            onChange={(v) => set('accentColor', v as AccentColor)}
          />
          <p className="text-ui-sm text-ink-3">
            Selected: <span className="font-mono text-ink-2">{config.accentColor}</span>.
            One accent runs through buttons, badges and tables in light and dark alike.
          </p>
        </Section>

        <Section label={`Surfaces — ${mode} mode only · design annotation`}>
          <p className="text-ui-sm text-ink-3">
            Painted on the canvas frame and the Live Preview wrapper and exported in project.json.
            Library components keep following the Radix accent, so theme.ts does not carry these.
          </p>
          <div className="space-y-2">
            {SURFACE_ROLES.map(([key, label, hint]) => (
              <SurfaceRow
                key={key}
                label={label}
                hint={hint}
                value={design[mode][key]}
                fallback={SURFACE_DEFAULTS[mode][key]}
                onChange={(v) => updateSurfaces(mode, { [key]: v })}
              />
            ))}
          </div>
          <p className="text-ui-sm text-ink-3">
            Muted text and hover shades are mixed from these four, so a lighter background lifts
            the whole {mode} set with it.
          </p>
        </Section>

        <Section label="Shape and type — shared">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Radius">
              <SegmentedControl
                aria-label="Radius"
                options={RADIUS_OPTIONS}
                value={config.radius}
                onChange={(v) => set('radius', v as ThemeRadius)}
              />
            </Field>
            <Field label="Panel background">
              <SegmentedControl
                aria-label="Panel background"
                options={PANEL_OPTIONS}
                value={config.panelBackground}
                onChange={(v) => set('panelBackground', v as ThemePanelBackground)}
              />
            </Field>
            <Field label="Surface">
              <SegmentedControl
                aria-label="Surface"
                options={SURFACE_OPTIONS}
                value={config.surface ?? 'flat'}
                onChange={(v) => set('surface', v as ThemeSurface)}
              />
            </Field>
            <Field label="Density (Radix scaling)">
              <SegmentedControl
                aria-label="Density"
                options={DENSITY_OPTIONS}
                value={config.scaling ?? '100%'}
                onChange={(v) => set('scaling', v as ThemeScaling)}
              />
            </Field>
            <Field label="Font (design annotation)">
              <Select
                options={FONT_OPTIONS.map((f) => ({ value: f, label: f }))}
                value={design.font}
                onChange={setFont}
              />
            </Field>
          </div>
          <Field label="Button color (component override)">
            <SwatchGrid
              allowNone
              value={config.buttonColor}
              onChange={(v) => set('buttonColor', v)}
            />
            <p className="text-ui-sm text-ink-3">
              {config.buttonColor ? (
                <>
                  Selected:{' '}
                  <span className="font-mono text-ink-2">{config.buttonColor}</span>
                </>
              ) : (
                'No override — buttons follow the accent colour (a button can still pick its own colour in its Props).'
              )}
            </p>
          </Field>
        </Section>

        {glass && (
          <Section label="Backdrop — glass only">
            <p className="text-ui-sm text-ink-3">
              Glass turns every panel — cards, tables, dropdowns, dialogs, the app bar and sidebar, the fields —
              into a translucent blurred surface over this backdrop, in light and dark alike. Sticky and pinned
              table cells stay near-opaque, and the OS “reduce transparency” setting falls back to that look.
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Backdrop">
                <Select
                  options={BACKDROP_KIND_OPTIONS}
                  value={backdrop.kind}
                  onChange={(v) => updateBackground({ kind: v as BackdropKind })}
                />
              </Field>
              {backdrop.kind === 'color' && (
                <Field label="Colour">
                  <ColorInput
                    value={backdrop.color}
                    onChange={(color) => updateBackground({ color })}
                    placeholder="#e0e7ff · rgb(…) · var(--indigo-3)"
                  />
                </Field>
              )}
            </div>
            {backdrop.kind === 'gradient' && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="From">
                  <ColorInput
                    value={backdrop.gradient.from}
                    onChange={(from) => updateBackground({ gradient: { ...backdrop.gradient, from } })}
                    placeholder="#c7d2fe"
                  />
                </Field>
                <Field label="To">
                  <ColorInput
                    value={backdrop.gradient.to}
                    onChange={(to) => updateBackground({ gradient: { ...backdrop.gradient, to } })}
                    placeholder="#fbcfe8"
                  />
                </Field>
                <Field label="Angle (deg)">
                  <Input
                    type="number"
                    min={0}
                    max={360}
                    step={1}
                    value={backdrop.gradient.angle}
                    onChange={(e) => updateBackground({ gradient: { ...backdrop.gradient, angle: Number(e.target.value) || 0 } })}
                  />
                </Field>
              </div>
            )}
            {backdrop.kind === 'image' && (
              <Field label="Image">
                <BackdropImageField value={backdrop.image} onChange={(image) => updateBackground({ image })} />
              </Field>
            )}
            <GlassPreview background={backdrop} accent={config.accentColor} />
            <p className="text-ui-sm text-ink-3">
              {backdropToCss(backdrop)
                ? 'Exported as theme.background, a CSS background value.'
                : backdrop.kind === 'default'
                  ? 'The engine draws an accent-tinted gradient — nothing is exported.'
                  : 'Incomplete — the engine falls back to its accent gradient until it is filled in.'}
            </p>
          </Section>
        )}

        <Section label="Data table">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Header font size">
              <Select
                options={FONT_SIZE_OPTIONS}
                value={config.dataTable.headerFontSize}
                onChange={(v) =>
                  updateDataTable({
                    headerFontSize: v as DataTableThemeConfig['headerFontSize'],
                  })
                }
              />
            </Field>
            <Field label="Header font weight">
              <Select
                options={FONT_WEIGHT_OPTIONS}
                value={config.dataTable.headerFontWeight}
                onChange={(v) =>
                  updateDataTable({
                    headerFontWeight: v as DataTableThemeConfig['headerFontWeight'],
                  })
                }
              />
            </Field>
            {DATA_TABLE_COLOR_ROLES.map(([key, label, legacy]) => (
              <ColorField
                key={key}
                label={label}
                value={config.dataTable[key]}
                onChange={(v) => updateDataTable({ [key]: v })}
                unsetLabel={unsetRoleLabel(key, legacy)}
              />
            ))}
          </div>
          {pinnedLegacyRoles.length > 0 && (
            <p className="border-l-2 border-warn py-1 pl-2.5 text-ui-sm leading-relaxed text-ink-2">
              {pinnedLegacyRoles
                .map((role) => LEGACY_ROLE_LABELS.get(role) ?? role)
                .join(', ')}{' '}
              pin a named color, which uses the legacy light-only style map and won’t
              flip in dark mode. Leave them unset (“follows accent”) for dark-safe theming.
            </p>
          )}
        </Section>

        <span className="sec-label mb-2 block">In the project JSON</span>
        <CodeViewer
          maxHeightClassName="max-h-[60vh]"
          tabs={[
            { id: 'theme', label: 'theme', language: 'json', code: themeJson },
            {
              id: 'design',
              label: 'design (project.json)',
              language: 'json',
              code: JSON.stringify(
                { scaling: config.scaling ?? '100%', font: design.font, light: design.light, dark: design.dark },
                null,
                2,
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
