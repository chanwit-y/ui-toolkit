import { useEffect, useState, type ReactNode } from 'react'
import { Input, Select, SegmentedControl } from '../common'
import { useGridStore } from './gridStore'
import type { MultiAutocompleteConfig, SelectFieldConfig, SelectOption } from './types'

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
      <span className="text-xs font-medium text-zinc-600">{label}</span>
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
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-500/30"
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
  'w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-xs text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'

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
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </Field>
  )
}

type SelectFieldConfigPanelProps = {
  itemId: string
  config: SelectFieldConfig
  /** Section heading — defaults to "Select"; the autocomplete reuses this panel. */
  heading?: string
  /**
   * When true, render the multi-only controls (`maxSelections`, `showSelectedCount`).
   * The `config` is then a `MultiAutocompleteConfig` superset; these knobs drive the
   * studio preview only (not the exported Bin). Off for select/autocomplete.
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
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
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
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-1"
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
          <div className="grid grid-cols-3 gap-2">
            <Field label="ID key">
              <Input
                value={config.idKey}
                onChange={(e) => set('idKey', e.target.value)}
                className="font-mono"
              />
            </Field>
            <Field label="Display key">
              <Input
                value={config.displayKey}
                onChange={(e) => set('displayKey', e.target.value)}
                className="font-mono"
              />
            </Field>
            <Field label="Search key">
              <Input
                value={config.searchKey}
                onChange={(e) => set('searchKey', e.target.value)}
                className="font-mono"
              />
            </Field>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Source (endpoint / model)">
            <Input
              value={config.dataSource.source}
              onChange={(e) => setSource({ source: e.target.value })}
              className="font-mono"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Value key">
              <Input
                value={config.dataSource.valueKey}
                onChange={(e) => setSource({ valueKey: e.target.value })}
                className="font-mono"
              />
            </Field>
            <Field label="Label key">
              <Input
                value={config.dataSource.labelKey}
                onChange={(e) => setSource({ labelKey: e.target.value })}
                className="font-mono"
              />
            </Field>
          </div>
        </div>
      )}

      {multi && (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
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
