import { AlertTriangle } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { OptionRow } from '@gummy-ui/ui'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import { FieldPicker, IconField, Input, Select, SegmentedControl } from '../common'
import { useActiveItems, useGridStore } from './gridStore'
import { isSelectFamily, observeWarnings } from './observe'
import { IMAGE_KINDS, rowFieldsFor, TEXT_KINDS } from './rowFields'
import type { MultiAutocompleteConfig, SelectFieldConfig, SelectOption } from './types'

/**
 * Endpoint picker over the API page's endpoints, stored by `EndpointDef.id`
 * (rename-safe — see the grilled Env design). A dangling ref (endpoint deleted)
 * surfaces as an explicit "missing" option so the stale pick stays visible
 * instead of silently snapping to none.
 */
export function EndpointPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (id: string | null) => void
}) {
  const endpoints = useProjectEndpoints()
  const isDangling = value != null && !endpoints.some((e) => e.id === value)
  const options = [
    { value: '', label: '— none —' },
    ...(isDangling ? [{ value, label: '⚠ missing endpoint' }] : []),
    ...endpoints.map((e) => ({ value: e.id, label: e.name.trim() || '(unnamed)' })),
  ]
  return (
    <Select
      options={options}
      value={value ?? ''}
      onChange={(v) => onChange(v === '' ? null : v)}
    />
  )
}

const DATA_TYPE_OPTIONS = [
  'text',
  'number',
  'email',
  'password',
  'tel',
  'url',
  'search',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
  'hidden',
].map((v) => ({ value: v, label: v }))

const VARIANT_OPTIONS = ['classic', 'surface', 'soft'].map((v) => ({ value: v, label: v }))
const SIZE_OPTIONS = ['1', '2', '3'].map((v) => ({ value: v, label: v }))
const RADIUS_OPTIONS = ['none', 'small', 'medium', 'large', 'full'].map((v) => ({
  value: v,
  label: v,
}))
const MODE_OPTIONS = [
  { value: 'static', label: 'Static' },
  { value: 'source', label: 'Source' },
]

/** One labelled row in the config form. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  )
}

/** Inline checkbox row for boolean config. */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-line-strong text-ink focus:ring-focus/30"
      />
    </label>
  )
}

/**
 * Parse the options textarea into a validated `SelectOption[]` (array of plain
 * record objects — Autocomplete2 reads `idKey`/`displayKey`/`searchKey` off each
 * at runtime, so no fixed shape is required). Returns null when the text isn't a
 * JSON array of objects, so the caller can hold the broken text locally and leave
 * the committed (last-valid) array intact.
 */
function parseOptions(text: string): SelectOption[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null
  const out: SelectOption[] = []
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return null
    out.push(item as SelectOption)
  }
  return out
}

const TEXTAREA_CLASS =
  'w-full rounded-md border border-line-strong bg-surface px-2.5 py-1.5 font-mono text-ui-sm text-ink outline-none focus:border-focus focus:ring-2 focus:ring-focus/20'

/**
 * The static-options editor: a raw-JSON textarea backed by local string state so
 * a half-typed/invalid edit is preserved (the store always holds a valid array).
 * Each keystroke parses; a valid parse commits to the store and drives the live
 * preview, an invalid one leaves the committed array as-is and shows an inline
 * error. Resets to the committed options whenever the selected item changes.
 */
function OptionsEditor({
  itemId,
  options,
  onCommit,
}: {
  itemId: string
  options: SelectOption[]
  onCommit: (options: SelectOption[]) => void
}) {
  const [text, setText] = useState(() => JSON.stringify(options, null, 2))
  const [error, setError] = useState<string | null>(null)

  // Re-seed from the committed options when switching items (the panel instance
  // is reused across selections). Intentionally keyed on itemId only — we don't
  // want to clobber in-progress typing when our own commit updates `options`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setText(JSON.stringify(options, null, 2))
    setError(null)
  }, [itemId])

  const onChange = (next: string) => {
    setText(next)
    const parsed = parseOptions(next)
    if (parsed) {
      setError(null)
      onCommit(parsed)
    } else {
      setError('Expected a JSON array of objects.')
    }
  }

  return (
    <Field label="Options (JSON)">
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        spellCheck={false}
        className={TEXTAREA_CLASS}
      />
      {error && <span className="mt-1 block text-ui-sm text-danger">{error}</span>}
    </Field>
  )
}

/**
 * The `observeTo` dropdown — makes this field a cascading child of another
 * select-family item (the engine clears + refetches it whenever the observed
 * field's value changes). Targets are every other select/autocomplete/multi
 * on the same canvas (the one being edited — a filter form or modal is its own
 * canvas, and the export resolves the trio per canvas), listed by binding name (the engine-level contract) with the
 * canvas label for recognition. Stored by item id; the export derives the
 * name-based trio (`observeTo`, `api.params`, target `canObserve`) from it.
 * All checks surface as non-blocking amber warnings.
 */
function ObserveToField({
  itemId,
  value,
  onChange,
}: {
  itemId: string
  value: string
  onChange: (value: string) => void
}) {
  const items = useActiveItems()
  const item = items.find((i) => i.id === itemId)

  const options = [
    { value: '', label: '(none)' },
    ...items
      .filter((t) => t.id !== itemId && isSelectFamily(t))
      .map((t) => {
        const name = (t.config as SelectFieldConfig | undefined)?.name.trim() ?? ''
        return { value: t.id, label: name ? `${name} (${t.label})` : `(unnamed) — ${t.label}` }
      }),
  ]
  // A dangling ref (item deleted) still needs a visible <option> to keep the
  // select controlled; the warning below explains it.
  if (value && !options.some((o) => o.value === value)) {
    options.push({ value, label: '(missing item)' })
  }

  const warnings = item ? observeWarnings(item, items) : []

  return (
    <div className="space-y-1">
      <Field label="Observe (parent field)">
        <Select options={options} value={value} onChange={onChange} />
      </Field>
      {warnings.map((message) => (
        <p key={message} className="flex items-start gap-1 text-ui-sm text-warn">
          <AlertTriangle size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
          {message}
        </p>
      ))}
    </div>
  )
}

/** Reads an option record's image value the way the engine's `itemAvatar` does. */
function previewAvatar(value: unknown, alt: string) {
  if (typeof value === 'string') return value ? { src: value, alt } : null
  if (value && typeof value === 'object' && 'src' in value) {
    const v = value as { src: string; alt?: string; fallback?: string }
    return { src: v.src, alt: v.alt || alt, fallback: v.fallback }
  }
  return null
}

/**
 * One option as the dropdown will draw it — the library's own `OptionRow`, so the
 * strip can't drift from the runtime. Static mode shows the first record; source
 * mode has no rows on the canvas, so it shows the picked field names in ‹guillemets›.
 */
function OptionPreview({ config }: { config: SelectFieldConfig }) {
  const first = config.mode === 'static' ? config.options[0] : undefined
  const text = (key: string) =>
    !key ? '' : first ? String(first[key] ?? '') : `‹${key}›`
  const title = text(config.displayKey) || '(no title field)'
  const avatar = !config.avatarKey
    ? null
    : first
      ? previewAvatar(first[config.avatarKey], title)
      : // No rows on the canvas: the runtime's own fallback, the title's initial.
        { src: '', alt: config.displayKey || '?' }
  return (
    <div className="pointer-events-none rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink">
      <OptionRow
        title={title}
        subtitle={text(config.subtitleKey) || null}
        icon={(config.itemIcon || null) as never}
        avatar={avatar}
      />
    </div>
  )
}

/**
 * How one option reads: its id/title/search/subtitle/image fields and the two
 * icons. One flat key set for both modes (see the grilled option-display design)
 * — the pickers list the static records' keys or the source endpoint's response
 * row fields, and fall back to free text when neither resolves.
 */
function OptionDisplaySection({
  config,
  set,
}: {
  config: SelectFieldConfig
  set: <K extends keyof SelectFieldConfig>(key: K, value: SelectFieldConfig[K]) => void
}) {
  const endpoints = useProjectEndpoints()
  const models = useProjectModels()
  const row = rowFieldsFor(config, endpoints, models)
  const picker = (
    key: 'idKey' | 'displayKey' | 'searchKey' | 'subtitleKey' | 'avatarKey',
    label: string,
    opts: { kinds: readonly string[]; allowNone?: boolean },
  ) => (
    <Field label={label}>
      <FieldPicker
        fields={row.fields}
        value={config[key] ?? ''}
        onChange={(v) => set(key, v)}
        kinds={opts.kinds}
        allowNone={opts.allowNone}
        aria-label={label}
      />
    </Field>
  )
  return (
    <div className="space-y-3 rounded-lg border border-line bg-panel p-3">
      <h4 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">
        Option display
      </h4>
      {row.fields === null && <p className="text-ui-xs text-ink-3">{row.reason}</p>}
      <div className="grid grid-cols-2 gap-2">
        {picker('idKey', 'ID field', { kinds: TEXT_KINDS })}
        {picker('searchKey', 'Search field', { kinds: TEXT_KINDS })}
      </div>
      {picker('displayKey', 'Title field', { kinds: TEXT_KINDS })}
      <div className="space-y-1">
        {picker('subtitleKey', 'Subtitle field', { kinds: TEXT_KINDS, allowNone: true })}
        {config.subtitleKey && <p className="text-ui-xs text-ink-3">Also matched when searching.</p>}
      </div>
      <div className="space-y-1">
        {picker('avatarKey', 'Image field', { kinds: IMAGE_KINDS, allowNone: true })}
        {config.avatarKey && config.itemIcon && (
          <p className="text-ui-xs text-ink-3">The image replaces the option icon on each row.</p>
        )}
      </div>
      <IconField
        label="Option icon"
        value={config.itemIcon ?? ''}
        onChange={(v) => set('itemIcon', v)}
      />
      <IconField
        label="Input icon"
        placeholder="Default (search) — click to choose"
        value={config.inputIcon ?? ''}
        onChange={(v) => set('inputIcon', v)}
      />
      <div className="space-y-1">
        <span className="text-ui-sm font-medium text-ink-2">Option preview</span>
        <OptionPreview config={config} />
      </div>
    </div>
  )
}

type SelectFieldConfigPanelProps = {
  itemId: string
  config: SelectFieldConfig
  /** Section heading — defaults to "Select"; the autocomplete reuses this panel. */
  heading?: string
  /**
   * When true, render the multi-only controls (`maxSelections`, `showSelectedCount`).
   * The `config` is then a `MultiAutocompleteConfig` superset. Off for select/autocomplete.
   */
  multi?: boolean
}

/**
 * Editor for a select's config. Every control writes through `updateItemConfig`,
 * which drives both the live canvas preview and the exported JSON. The
 * textfield-parity controls (full width, fixed height, width, data type, regex)
 * are inert — `SelectField` has no matching prop — but kept so the panel and the
 * exported config stay uniform with the textfield. `mode` swaps the static
 * options editor for the data-source inputs.
 */
export function SelectFieldConfigPanel({
  itemId,
  config,
  heading = 'Select',
  multi = false,
}: SelectFieldConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof SelectFieldConfig>(key: K, value: SelectFieldConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<SelectFieldConfig>)
  const setSource = (patch: Partial<SelectFieldConfig['dataSource']>) =>
    set('dataSource', { ...config.dataSource, ...patch })
  // Multi-only writes go through the same store action; `config` is a
  // MultiAutocompleteConfig superset when `multi` is set.
  const multiConfig = config as MultiAutocompleteConfig
  const setMulti = <K extends keyof MultiAutocompleteConfig>(
    key: K,
    value: MultiAutocompleteConfig[K],
  ) => updateItemConfig(itemId, { [key]: value } as Partial<MultiAutocompleteConfig>)

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">
        {heading}
      </h3>

      <Field label="Name (binding key)">
        <Input
          value={config.name}
          onChange={(e) => set('name', e.target.value)}
          className="font-mono"
        />
      </Field>

      <Field label="Data type">
        <Select
          options={DATA_TYPE_OPTIONS}
          value={config.dataType}
          onChange={(v) => set('dataType', v as SelectFieldConfig['dataType'])}
        />
      </Field>

      <Field label="Label">
        <Input value={config.label} onChange={(e) => set('label', e.target.value)} />
      </Field>

      <Field label="Placeholder">
        <Input
          value={config.placeholder}
          onChange={(e) => set('placeholder', e.target.value)}
        />
      </Field>

      <Field label="Helper text">
        <Input
          value={config.helperText}
          onChange={(e) => set('helperText', e.target.value)}
        />
      </Field>

      <Toggle
        label="Required"
        checked={config.isRequired}
        onChange={(v) => set('isRequired', v)}
      />

      <Field label="Error message">
        <Input
          value={config.errorMessage}
          onChange={(e) => set('errorMessage', e.target.value)}
        />
      </Field>

      <Field label="Options source">
        <SegmentedControl
          options={MODE_OPTIONS}
          value={config.mode}
          onChange={(v) => set('mode', v as SelectFieldConfig['mode'])}
          aria-label="Options source"
        />
      </Field>

      {config.mode === 'static' ? (
        <div className="space-y-3">
          <OptionsEditor
            itemId={itemId}
            options={config.options}
            onCommit={(options) => set('options', options)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Source endpoint (API page)">
            <EndpointPicker
              value={config.dataSource.endpointId}
              onChange={(endpointId) => setSource({ endpointId })}
            />
          </Field>
          {config.dataSource.endpointId != null && (
            <Field label="Response row path (dot path)">
              <Input
                value={config.dataSource.paths}
                onChange={(e) => setSource({ paths: e.target.value })}
                placeholder="data"
                className="font-mono"
              />
            </Field>
          )}
          <ObserveToField
            itemId={itemId}
            value={config.observeToItemId ?? ''}
            onChange={(v) => set('observeToItemId', v)}
          />
        </div>
      )}

      <OptionDisplaySection config={config} set={set} />

      {multi && (
        <div className="space-y-3 rounded-lg border border-line bg-panel p-3">
          <h4 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">
            Multi options
          </h4>
          <Field label="Max selections">
            <Input
              type="number"
              min={1}
              value={multiConfig.maxSelections}
              placeholder="unlimited"
              onChange={(e) =>
                setMulti('maxSelections', e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          </Field>
          <Toggle
            label="Show selected count"
            checked={multiConfig.showSelectedCount}
            onChange={(v) => setMulti('showSelectedCount', v)}
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Field label="Variant">
          <Select
            options={VARIANT_OPTIONS}
            value={config.variant}
            onChange={(v) => set('variant', v as SelectFieldConfig['variant'])}
          />
        </Field>
        <Field label="Size">
          <Select
            options={SIZE_OPTIONS}
            value={config.size}
            onChange={(v) => set('size', v as SelectFieldConfig['size'])}
          />
        </Field>
        <Field label="Radius">
          <Select
            options={RADIUS_OPTIONS}
            value={config.radius}
            onChange={(v) => set('radius', v as SelectFieldConfig['radius'])}
          />
        </Field>
      </div>

      <Toggle
        label="Full width"
        checked={config.isFullWidth}
        onChange={(v) => set('isFullWidth', v)}
      />
      <Toggle
        label="Fixed height"
        checked={config.isFixedHeight}
        onChange={(v) => set('isFixedHeight', v)}
      />

      <Field label="Width (px)">
        <Input
          type="number"
          value={config.width}
          placeholder="auto"
          onChange={(e) =>
            set('width', e.target.value === '' ? '' : Number(e.target.value))
          }
        />
      </Field>

      <Field label="Regex">
        <Input
          value={config.regex}
          onChange={(e) => set('regex', e.target.value)}
          className="font-mono"
          placeholder="^[A-Za-z]*$"
        />
      </Field>

      <Field label="Regex error message">
        <Input
          value={config.regexErrorMessage}
          onChange={(e) => set('regexErrorMessage', e.target.value)}
        />
      </Field>
    </div>
  )
}
