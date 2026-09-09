import { useMemo, type ReactNode } from 'react'
import { CodeViewer, Select, SegmentedControl, cn } from '../common'
import { useThemeStore } from './themeStore'
import { toThemeTs } from './serialize'
import {
  ACCENT_COLORS,
  LEGACY_MAP_ROLES,
  RADIUS_VALUES,
  type AccentColor,
  type DataTableThemeConfig,
  type StudioThemeConfig,
  type ThemeAppearance,
  type ThemePanelBackground,
  type ThemeRadius,
} from './types'

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
}: {
  value: string
  onChange: (color: string) => void
  allowNone?: boolean
}) {
  return (
    <div className="grid grid-cols-9 gap-1">
      {allowNone && (
        <button
          type="button"
          title="No override"
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

const APPEARANCE_OPTIONS = [
  { value: 'light', label: 'Light mode' },
  { value: 'dark', label: 'Dark mode' },
]
const PANEL_OPTIONS = [
  { value: 'solid', label: 'Solid' },
  { value: 'translucent', label: 'Translucent' },
]
const RADIUS_OPTIONS = RADIUS_VALUES.map((v) => ({ value: v, label: v }))

const FOLLOWS_ACCENT = { value: '', label: '— follows accent —' }
const COLOR_ROLE_OPTIONS = [
  FOLLOWS_ACCENT,
  ...ACCENT_COLORS.map((c) => ({ value: c, label: c })),
]
const DEFAULT_ROLE_OPTIONS = [
  { value: '', label: '— default —' },
  ...ACCENT_COLORS.map((c) => ({ value: c, label: c })),
]
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
export function ThemeEditor() {
  const config = useThemeStore((s) => s.config)
  const update = useThemeStore((s) => s.update)
  const updateDataTable = useThemeStore((s) => s.updateDataTable)

  const themeTs = useMemo(() => toThemeTs(config), [config])

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
            The studio and the canvas both show the {config.appearance} set.
          </span>
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

        <Section label="Shape and surfaces">
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
                'No override — buttons use the component default.'
              )}
            </p>
          </Field>
        </Section>

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
              <Field key={key} label={label}>
                <Select
                  options={legacy ? COLOR_ROLE_OPTIONS : DEFAULT_ROLE_OPTIONS}
                  value={config.dataTable[key]}
                  onChange={(v) => updateDataTable({ [key]: v })}
                />
              </Field>
            ))}
          </div>
          {pinnedLegacyRoles.length > 0 && (
            <p className="border-l-2 border-warn py-1 pl-2.5 text-ui-sm leading-relaxed text-ink-2">
              {pinnedLegacyRoles
                .map((role) => LEGACY_ROLE_LABELS.get(role) ?? role)
                .join(', ')}{' '}
              pin a named color, which uses the legacy light-only style map and won’t
              flip in dark mode. Leave “— follows accent —” for dark-safe theming.
            </p>
          )}
        </Section>

        <span className="sec-label mb-2 block">theme.ts</span>
        <CodeViewer
          maxHeightClassName="max-h-[60vh]"
          tabs={[{ id: 'theme', label: 'theme.ts', language: 'text', code: themeTs }]}
        />
      </div>
    </div>
  )
}
