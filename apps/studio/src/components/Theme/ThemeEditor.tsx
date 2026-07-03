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
      <span className="block text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </div>
  )
}

/** The standard tray the shared SegmentedControl expects callers to own. */
function Tray({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
      {children}
    </div>
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
            'flex h-7 items-center justify-center rounded-md border text-[10px] font-medium transition-shadow',
            value === ''
              ? 'border-teal-500 text-teal-700 ring-2 ring-teal-400/50'
              : 'border-zinc-200 text-zinc-400 hover:border-zinc-300',
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
              ? 'ring-2 ring-zinc-900 ring-offset-1'
              : 'hover:ring-1 hover:ring-zinc-400',
          )}
        >
          <span className="sr-only">{color}</span>
        </button>
      ))}
    </div>
  )
}

const APPEARANCE_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
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
 * Two panes: the token/override form (left) and the live paste-ready
 * `theme.ts` (right). Edits apply immediately: App.tsx derives the live
 * ThemeProvider props from this store, so the canvas previews and the Live
 * Preview re-tint as you pick.
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
    <div className="flex min-h-0 flex-1 bg-zinc-50">
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-zinc-800">Theme</h2>
              <p className="mt-1 text-xs text-zinc-500">
                The app-wide <span className="font-mono">ThemeProvider</span> config.
                Applies live to the canvas and Live Preview; exported as{' '}
                <span className="font-mono">theme.ts</span>.
              </p>
            </div>

            <Field label="Appearance">
              <Tray>
                <SegmentedControl
                  aria-label="Appearance"
                  options={APPEARANCE_OPTIONS}
                  value={config.appearance}
                  onChange={(v) => set('appearance', v as ThemeAppearance)}
                />
              </Tray>
              {config.appearance === 'dark' && (
                <p className="text-[11px] text-zinc-400">
                  Library components render dark; the studio chrome itself stays light.
                </p>
              )}
            </Field>

            <Field label="Accent color">
              <SwatchGrid
                value={config.accentColor}
                onChange={(v) => set('accentColor', v as AccentColor)}
              />
              <p className="text-[11px] text-zinc-400">
                Selected: <span className="font-mono text-zinc-500">{config.accentColor}</span>
              </p>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Radius">
                <Tray>
                  <SegmentedControl
                    aria-label="Radius"
                    options={RADIUS_OPTIONS}
                    value={config.radius}
                    onChange={(v) => set('radius', v as ThemeRadius)}
                  />
                </Tray>
              </Field>
              <Field label="Panel background">
                <Tray>
                  <SegmentedControl
                    aria-label="Panel background"
                    options={PANEL_OPTIONS}
                    value={config.panelBackground}
                    onChange={(v) => set('panelBackground', v as ThemePanelBackground)}
                  />
                </Tray>
              </Field>
            </div>

            <Field label="Button color (component override)">
              <SwatchGrid
                allowNone
                value={config.buttonColor}
                onChange={(v) => set('buttonColor', v)}
              />
              <p className="text-[11px] text-zinc-400">
                {config.buttonColor ? (
                  <>
                    Selected:{' '}
                    <span className="font-mono text-zinc-500">{config.buttonColor}</span>
                  </>
                ) : (
                  'No override — buttons use the component default.'
                )}
              </p>
            </Field>

            <div className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                Data table
              </h3>
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
                <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-relaxed text-amber-700">
                  {pinnedLegacyRoles
                    .map((role) => LEGACY_ROLE_LABELS.get(role) ?? role)
                    .join(', ')}{' '}
                  pin a named color, which uses the legacy light-only style map and
                  won’t flip in dark mode. Leave “— follows accent —” for dark-safe
                  theming.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <aside className="flex w-96 shrink-0 flex-col border-l border-zinc-200 bg-white">
        <div className="shrink-0 border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">Theme config</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <CodeViewer
            maxHeightClassName="max-h-[calc(100vh-12rem)]"
            tabs={[{ id: 'theme', label: 'theme.ts', language: 'text', code: themeTs }]}
          />
        </div>
      </aside>
    </div>
  )
}
