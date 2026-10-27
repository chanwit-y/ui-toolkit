import type { CellFormat, DataTableAggregate, DataTableStyleRule, DataType } from '@gummy-ui/ui'
import type { Breakpoint } from './breakpoints'
import type { ComponentType } from './componentCatalog'

export type { Breakpoint } from './breakpoints'
export { MAX_GRID_COLUMNS } from './breakpoints'

export type Responsive<T> = Record<Breakpoint, T>

/**
 * Editable config for a textfield component. Maps 1:1 onto the library's
 * `TextFieldElement` / `TextFieldProps` so the exported JSON can drive the
 * declarative engine. `width` is `''` when unset (otherwise a pixel number).
 */
export type TextFieldConfig = {
  name: string
  dataType: DataType
  label: string
  placeholder: string
  helperText: string
  isRequired: boolean
  errorMessage: string
  variant: 'classic' | 'surface' | 'soft'
  size: '1' | '2' | '3'
  radius: 'none' | 'small' | 'medium' | 'large' | 'full'
  isFullWidth: boolean
  isFixedHeight: boolean
  width: number | ''
  regex: string
  regexErrorMessage: string
}

/**
 * Editable config for a textarea component. Maps onto the library's
 * `TextareaElement` / `TextareaProps`. `dataType` is fixed to `'text'` (the base
 * component ignores it) but kept so the exported `TextareaElement` stays
 * contract-valid. `maxLength` is `''` when unset (mirrors `TextFieldConfig.width`).
 */
export type TextareaConfig = {
  name: string
  dataType: DataType
  label: string
  placeholder: string
  helperText: string
  isRequired: boolean
  errorMessage: string
  rows: number
  resize: 'none' | 'both' | 'horizontal' | 'vertical'
  autoResize: boolean
  maxLength: number | ''
  showCharCount: boolean
}

/** Defaults for a freshly dropped textarea. Mirrors TextareaBase's own defaults. */
export function createDefaultTextareaConfig(name: string): TextareaConfig {
  return {
    name,
    dataType: 'text',
    label: 'Textarea',
    placeholder: '',
    helperText: '',
    isRequired: false,
    errorMessage: '',
    rows: 4,
    resize: 'vertical',
    autoResize: false,
    maxLength: '',
    showCharCount: false,
  }
}

/** Defaults for a freshly dropped textfield. Mirrors TextFieldBase's own defaults. */
export function createDefaultTextFieldConfig(name: string): TextFieldConfig {
  return {
    name,
    dataType: 'text',
    label: 'Text Field',
    placeholder: '',
    helperText: '',
    isRequired: false,
    errorMessage: '',
    variant: 'surface',
    size: '3',
    radius: 'medium',
    isFullWidth: true,
    isFixedHeight: true,
    width: '',
    regex: '',
    regexErrorMessage: '',
  }
}

/**
 * A single static option for the select. The select's live preview renders the
 * library's `Autocomplete2`, whose options are arbitrary records keyed by
 * `idKey`/`displayKey`/`searchKey` (not a fixed `{ value, label }`), so an option
 * is an open record. The author picks which keys carry the id/label via the
 * config's `idKey`/`displayKey`/`searchKey`.
 */
export type SelectOption = Record<string, unknown>

/**
 * Editable config for a select component. The select previews with the library's
 * `Autocomplete2`; `options`/`idKey`/`displayKey`/`searchKey` map onto its
 * record-array option model. The presentational fields (`variant`, `size`,
 * `radius`) and the textfield-parity fields (`dataType`, `isFullWidth`,
 * `isFixedHeight`, `width`, `regex`, `regexErrorMessage`) are kept for a uniform
 * panel + exported JSON — `Autocomplete2` ignores them. `mode` discriminates a
 * hand-authored static `options` array from a `dataSource` the declarative engine
 * resolves at runtime; both halves are always carried (and exported) regardless
 * of the active mode.
 */
export type SelectFieldConfig = {
  name: string
  dataType: DataType
  label: string
  placeholder: string
  helperText: string
  isRequired: boolean
  errorMessage: string
  variant: 'classic' | 'surface' | 'soft'
  size: '1' | '2' | '3'
  radius: 'none' | 'small' | 'medium' | 'large' | 'full'
  isFullWidth: boolean
  isFixedHeight: boolean
  width: number | ''
  regex: string
  regexErrorMessage: string
  mode: 'static' | 'source'
  options: SelectOption[]
  /**
   * Options from a page load instead (`source: 'state'` — engine
   * `optionsValue`): wins over both modes while set, which keep their config
   * so switching back loses nothing. Rows are read with the same keys.
   */
  optionsBinding?: ItemBinding
  /**
   * The option-display keys below are one flat set shared by both modes: they
   * name fields of an option row, whether that row is a static record or a row of
   * the `dataSource` response. `''` = unset for the optional ones.
   */
  /** Which option-record key holds the stored value (Autocomplete2 `idKey`). */
  idKey: string
  /** The option's title — shown in the list and the trigger (`displayKey`). */
  displayKey: string
  /** Which option-record key the type-ahead filters on (`searchKey`). */
  searchKey: string
  /** Second line under the title (engine `itemSubtitle`); also matched by search. */
  subtitleKey: string
  /**
   * Field holding an image URL or `{ src, alt, fallback }` (engine `itemAvatar`).
   * Wins over `itemIcon` — a row has one leading visual.
   */
  avatarKey: string
  /** `IconData` key shown in the trigger (engine `inputIcon`); `''` = the default search glyph. */
  inputIcon: string
  /** `IconData` key shown on every option row (engine `itemIcon`). */
  itemIcon: string
  /**
   * Runtime data source (`source` mode): the API page endpoint, referenced by
   * `EndpointDef.id` (rename-safe like model refs; `null` = none picked) and
   * resolved to the endpoint's current name at export. `paths` is the dot-path
   * into the response to the option array (engine `api.paths`; `''` = the
   * response is the array itself).
   */
  dataSource: {
    endpointId: string | null
    paths: string
  }
  /**
   * `GridItemData.id` of another select-family item this one observes for a
   * cascading refetch (engine `observeTo`); `''` = none. Stored by id so
   * renaming the target's binding key can't break the link — `gridConfig`
   * resolves it to the target's current name at export (see `observe.ts`).
   * Only meaningful in `source` mode.
   */
  observeToItemId: string
}

/**
 * Editable config for a multi-select autocomplete. A superset of `SelectFieldConfig`
 * (it previews with the library's `MultiAutocompleteBase`, which shares the
 * record-array option model) plus the two multi-only knobs the base component adds:
 * `maxSelections` caps how many items can be chosen (`''` = unlimited, mirroring
 * `width`/`maxLength`), and `showSelectedCount` toggles the `(n/max)` label + chip
 * overflow. Both are exported on the `multiAutocomplete` element
 * (`maxSelections` only when it is a number).
 */
export type MultiAutocompleteConfig = SelectFieldConfig & {
  /** Max selectable items; `''` means unlimited. */
  maxSelections: number | ''
  /** Show the `(n/max)` count label and chip-overflow summary. */
  showSelectedCount: boolean
}

/**
 * Defaults for a freshly dropped multi autocomplete. Like the single autocomplete it
 * starts in `source` mode (type-ahead intent), but keeps the starter static records so
 * the canvas preview can render a seeded chip in either mode. `maxSelections` starts
 * unlimited and the count label is shown.
 */
export function createDefaultMultiAutocompleteConfig(name: string): MultiAutocompleteConfig {
  return {
    ...createDefaultSelectFieldConfig(name),
    label: 'Multi Autocomplete',
    placeholder: 'Select items…',
    mode: 'source',
    maxSelections: '',
    showSelectedCount: true,
  }
}

/**
 * Defaults for a freshly dropped autocomplete. Shares `SelectFieldConfig` with the
 * select (studio's select also previews with `Autocomplete2`), but the two palette
 * items differ by intent: a select picks from a hand-authored static list, an
 * autocomplete is a type-ahead backed by a runtime `dataSource` — so this starts in
 * `source` mode. The static `options`/keys are still carried (and editable) so an
 * author can switch back without losing the starter records.
 */
export function createDefaultAutocompleteConfig(name: string): SelectFieldConfig {
  return {
    ...createDefaultSelectFieldConfig(name),
    label: 'Autocomplete',
    placeholder: 'Search…',
    mode: 'source',
  }
}

/** Defaults for a freshly dropped select. `mode` starts static with a couple of
 * starter records keyed `id`/`name`. */
export function createDefaultSelectFieldConfig(name: string): SelectFieldConfig {
  return {
    name,
    dataType: 'text',
    label: 'Select',
    placeholder: 'Select an option',
    helperText: '',
    isRequired: false,
    errorMessage: '',
    variant: 'surface',
    size: '2',
    radius: 'medium',
    isFullWidth: true,
    isFixedHeight: true,
    width: '',
    regex: '',
    regexErrorMessage: '',
    mode: 'static',
    options: [
      { id: '1', name: 'Option 1' },
      { id: '2', name: 'Option 2' },
    ],
    idKey: 'id',
    displayKey: 'name',
    searchKey: 'name',
    subtitleKey: '',
    avatarKey: '',
    inputIcon: '',
    itemIcon: '',
    dataSource: { endpointId: null, paths: '' },
    observeToItemId: '',
  }
}

/**
 * A single option in a checkbox group. Maps onto the library `CheckboxProps`
 * option shape (`value`/`label`/`disabled`) minus `helperText` — per-option
 * sub-labels are out of studio's scope. Carried even in `single` mode so toggling
 * to `group` doesn't start empty.
 */
export type CheckboxOption = {
  value: string
  label: string
  disabled: boolean
}

/**
 * Editable config for a checkbox component. The checkbox is dual-natured, so
 * `mode` discriminates a single boolean toggle from a multi-option group
 * (mirroring how `SelectFieldConfig.mode` forks static/source). Both halves are
 * always carried so switching modes loses nothing: `defaultChecked` drives the
 * single toggle's initial state, `options`/`orientation` drive the group. Maps
 * onto the library's `CheckboxBase` / engine `CheckboxElement`; `dataType` is
 * derived on export (single→`boolean`, group→`any`), not edited here.
 */
export type CheckboxConfig = {
  name: string
  label: string
  helperText: string
  isRequired: boolean
  errorMessage: string
  variant: 'classic' | 'surface' | 'soft'
  size: '1' | '2' | '3'
  mode: 'single' | 'group'
  /** Single-mode initial checked state (emitted as the element's `checked`). */
  defaultChecked: boolean
  /** Group-mode options. Carried in single mode too (so a mode switch is lossless). */
  options: CheckboxOption[]
  /** Group-mode layout direction. */
  orientation: 'horizontal' | 'vertical'
}

/**
 * Defaults for a freshly dropped checkbox. Starts as a single boolean toggle
 * (the common case) but carries a couple of starter group options so switching
 * to `group` mode isn't empty.
 */
export function createDefaultCheckboxConfig(name: string): CheckboxConfig {
  return {
    name,
    label: 'Checkbox',
    helperText: '',
    isRequired: false,
    errorMessage: '',
    variant: 'surface',
    size: '3',
    mode: 'single',
    defaultChecked: false,
    options: [
      { value: 'option_1', label: 'Option 1', disabled: false },
      { value: 'option_2', label: 'Option 2', disabled: false },
    ],
    orientation: 'vertical',
  }
}

/** Which value of the gating switch enables this one. */
export type SwitchEnabledWhen = { itemId: string; when: 'on' | 'off' } | null

/**
 * Editable config for a `switch` item — the engine `SwitchElement`: one boolean
 * field drawn as an on / off toggle. `isRequired` means it must be on.
 * `enabledWhen` names another switch on the same canvas (by item id, so a
 * rename is safe); export turns it into the engine `enabledWhen` condition on
 * this item and `canObserve: true` on the gating one.
 */
export type SwitchConfig = {
  name: string
  label: string
  labelPosition: 'start' | 'end'
  helperText: string
  isRequired: boolean
  errorMessage: string
  variant: 'classic' | 'surface' | 'soft'
  size: '1' | '2' | '3'
  defaultChecked: boolean
  disabled: boolean
  enabledWhen: SwitchEnabledWhen
}

export function createDefaultSwitchConfig(name: string): SwitchConfig {
  return {
    name,
    label: 'Switch',
    labelPosition: 'end',
    helperText: '',
    isRequired: false,
    errorMessage: '',
    variant: 'surface',
    size: '2',
    defaultChecked: false,
    disabled: false,
    enabledWhen: null,
  }
}

/**
 * A single radio option. Maps onto the library `RadioButtonProps` option shape
 * (`value`/`label`/`disabled`) minus `helperText` — per-option sub-labels are out
 * of studio's scope, matching the checkbox option editor.
 */
export type RadioOption = {
  value: string
  label: string
  disabled: boolean
}

/**
 * Editable config for a radio component. Unlike the checkbox there is no
 * single/group fork — a radio is always a single-select group of `options`.
 * Static-only for now (no API/source mode); the engine `RadioElement` supports
 * API-driven options, but studio defers that. `defaultValue` preselects one option
 * (`''` = none). Maps onto the library's `RadioButtonBase` / engine `RadioElement`;
 * `dataType` is fixed to `string` on export (a radio stores one scalar value) and
 * so isn't edited here.
 */
export type RadioConfig = {
  name: string
  label: string
  helperText: string
  isRequired: boolean
  errorMessage: string
  variant: 'classic' | 'surface' | 'soft'
  size: '1' | '2' | '3'
  orientation: 'horizontal' | 'vertical'
  options: RadioOption[]
  /** Preselected option value; `''` means nothing is selected. */
  defaultValue: string
}

/**
 * Defaults for a freshly dropped radio. A couple of starter options keyed
 * `option_n`, vertical, nothing preselected. `size: '2'` mirrors RadioButtonBase's
 * own default.
 */
export function createDefaultRadioConfig(name: string): RadioConfig {
  return {
    name,
    label: 'Radio',
    helperText: '',
    isRequired: false,
    errorMessage: '',
    variant: 'surface',
    size: '2',
    orientation: 'vertical',
    options: [
      { value: 'option_1', label: 'Option 1', disabled: false },
      { value: 'option_2', label: 'Option 2', disabled: false },
    ],
    defaultValue: '',
  }
}

/**
 * Editable config for the three date pickers, discriminated by `kind`:
 * `'date'` → `DatePickerBase`/`DatePickerElement`, `'datetime'` →
 * `DateTimePickerBase`/`DateTimePickerElement`, `'range'` →
 * `DateRangePickerBase`/`DateRangePickerElement`. One shared config (mirroring how
 * `SelectFieldConfig` is shared across select/autocomplete) carries every field;
 * the panel and the exporter switch on `kind` to show/emit only the relevant ones:
 * `weekStartsOn` is date+datetime only, `minuteStep` is datetime only, and `range`
 * uses a fixed `displayFormat` enum. `min`/`max` are ISO strings (`''` = unset);
 * the exporter maps them to `minDate`/`maxDate` (date, range) or
 * `minDateTime`/`maxDateTime` (datetime). `dataType` is derived on export
 * (date/datetime→`string`, range→`any`) so isn't edited here.
 */
export type DateConfig = {
  kind: 'date' | 'datetime' | 'range'
  name: string
  label: string
  placeholder: string
  helperText: string
  isRequired: boolean
  errorMessage: string
  variant: 'classic' | 'surface' | 'soft'
  size: '1' | '2' | '3'
  radius: 'none' | 'small' | 'medium' | 'large' | 'full'
  clearable: boolean
  /** dayjs tokens for date/datetime; one of the 3 range enums for `kind: 'range'`. */
  displayFormat: string
  /** Earliest selectable value as an ISO string; `''` = unset. */
  min: string
  /** Latest selectable value as an ISO string; `''` = unset. */
  max: string
  /** First day of week (date/datetime only): 0 = Sunday, 1 = Monday. */
  weekStartsOn: 0 | 1
  /** Time step in minutes (datetime only). */
  minuteStep: number
}

/**
 * Defaults for a freshly dropped date picker. `kind` selects the per-type display
 * format default (matching each library component's own default) and seeds the
 * shared shape; the other fields are common. Pickers start empty (no default value
 * — see the grilled design).
 */
export function createDefaultDateConfig(
  kind: DateConfig['kind'],
  name: string,
): DateConfig {
  const label = kind === 'range' ? 'Date Range' : kind === 'datetime' ? 'Date Time' : 'Date'
  const displayFormat =
    kind === 'datetime' ? 'DD/MM/YYYY HH:mm' : kind === 'range' ? 'yyyy-MM-dd' : 'DD/MM/YYYY'
  return {
    kind,
    name,
    label,
    placeholder: '',
    helperText: '',
    isRequired: false,
    errorMessage: '',
    variant: 'surface',
    size: '2',
    radius: 'medium',
    clearable: true,
    displayFormat,
    min: '',
    max: '',
    weekStartsOn: 0,
    minuteStep: 1,
  }
}

/** How an upload stores its value. Mirrors the library's `UploadValueFormat`. */
export type UploadValueFormat = 'dataUrl' | 'base64' | 'bytes' | 'api'

/**
 * API-upload wiring, used only when `valueFormat` is `'api'`. Mirrors the
 * library's `UploadApiConfig`: the file is POSTed to `uploadUrl`, optionally
 * DELETEd from `deleteUrl` (carrying a `:filename` placeholder), sent under
 * `fieldName`, and the stored URL is read from `responsePath` in the response.
 * Always carried (so toggling `valueFormat` away from `'api'` and back is
 * lossless) but only emitted in `'api'` mode.
 */
export type UploadApiSettings = {
  uploadUrl: string
  deleteUrl: string
  fieldName: string
  responsePath: string
}

/**
 * Editable config for an image upload. Maps onto the library's `UploadImageBase`
 * / engine `UploadImageElement`. `accept` defaults to `image/*`; `maxSizeMB` is
 * `''` when unset (mirroring `width`/`maxLength`). `valueFormat` chooses how the
 * value is stored, and when it is `'api'` the `api` wiring is emitted too. Unlike
 * the input components, `UploadImageBase` has its own `isRequired` prop, so the
 * marker isn't baked into the label. `dataType` is derived on export
 * (bytes→`any`, else `string`) so isn't edited here.
 */
export type UploadImageConfig = {
  name: string
  label: string
  helperText: string
  isRequired: boolean
  errorMessage: string
  accept: string
  maxSizeMB: number | ''
  shape: 'square' | 'circle'
  previewHeight: number
  valueFormat: UploadValueFormat
  api: UploadApiSettings
}

/** Accept presets offered as chips. Mirrors the library's `AcceptPreset`. */
export type UploadAcceptPreset =
  | 'image'
  | 'pdf'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'text'
  | 'archive'
  | 'audio'
  | 'video'

/**
 * Editable config for a file upload. Maps onto the library's `UploadFileBase` /
 * engine `UploadFileElement`. The engine `accept` is authored in two parts:
 * `acceptPresets` (chips) plus `accept`, a comma list of extra raw types
 * (e.g. `.dwg,.psd`) — see `uploadAccept`. `preview`/`previewLayout` drive the
 * thumbnails + viewer. `multiple` enables multi-file selection with an optional `maxFiles` cap (`''` =
 * unset). `valueFormat`/`api` behave as in the image upload. `dataType` is fixed
 * to the engine's `any` on export (a file upload stores an array of files), so
 * isn't edited here.
 */
export type UploadFileConfig = {
  name: string
  label: string
  helperText: string
  isRequired: boolean
  errorMessage: string
  acceptPresets: UploadAcceptPreset[]
  accept: string
  multiple: boolean
  maxFiles: number | ''
  maxSizeMB: number | ''
  preview: boolean
  previewLayout: 'list' | 'grid'
  valueFormat: UploadValueFormat
  api: UploadApiSettings
}

/** The engine `accept` of a file upload: presets first, then the extra raw
 * types. `undefined` when nothing is set (every file is accepted). */
export function uploadAccept(
  c: Pick<UploadFileConfig, 'acceptPresets' | 'accept'>,
): string[] | undefined {
  const extra = c.accept.split(',').map((t) => t.trim()).filter(Boolean)
  const tokens = [...c.acceptPresets, ...extra]
  return tokens.length > 0 ? tokens : undefined
}

/** Empty API wiring — surfaced only when `valueFormat` is `'api'`. */
function createDefaultUploadApiSettings(): UploadApiSettings {
  return { uploadUrl: '', deleteUrl: '', fieldName: '', responsePath: '' }
}

/** Defaults for a freshly dropped image upload. Mirrors UploadImageBase's own
 * defaults (`accept: 'image/*'`, square, 160px, dataUrl). */
export function createDefaultUploadImageConfig(name: string): UploadImageConfig {
  return {
    name,
    label: 'Upload Image',
    helperText: '',
    isRequired: false,
    errorMessage: '',
    accept: 'image/*',
    maxSizeMB: '',
    shape: 'square',
    previewHeight: 160,
    valueFormat: 'dataUrl',
    api: createDefaultUploadApiSettings(),
  }
}

/** Defaults for a freshly dropped file upload. Single-file, no accept filter,
 * list preview, dataUrl — matching UploadFileBase's own defaults. */
export function createDefaultUploadFileConfig(name: string): UploadFileConfig {
  return {
    name,
    label: 'Upload File',
    helperText: '',
    isRequired: false,
    errorMessage: '',
    acceptPresets: [],
    accept: '',
    multiple: false,
    maxFiles: '',
    maxSizeMB: '',
    preview: true,
    previewLayout: 'list',
    valueFormat: 'dataUrl',
    api: createDefaultUploadApiSettings(),
  }
}

/**
 * Column width config shared by both tables' columns: the engine's `size` /
 * `minSize` / `maxSize` in px (`''` = unset — engine defaults: share the
 * container, min 60, no max) and `resizable` = the engine's `enableResizing`
 * (exported only when off).
 */
export type ColumnSizingConfig = {
  size: number | ''
  minSize: number | ''
  maxSize: number | ''
  resizable: boolean
}

export const DEFAULT_COLUMN_SIZING: ColumnSizingConfig = { size: '', minSize: '', maxSize: '', resizable: true }

/** `ColumnFormatConfig.type`: `''` = the raw value as is. */
export type ColumnFormatType = '' | 'number' | 'currency' | 'percent' | 'date' | 'datetime' | 'boolean' | 'text'

/**
 * How a column shows its value — the engine's `ColumnDef.format` (see the
 * grilled design `datatable-ag-grid-features`), kept flat so every knob has a
 * field whatever the type: `decimals` (`''` = the type's default), `grouping`
 * (number), `currency` (an ISO code), `percentOf` (`'1'` = the value is a
 * ratio, `'100'` = whole points), `pattern` / `timeZone` (dates: dayjs tokens,
 * blank = the locale's medium style; an IANA zone), `trueLabel` /
 * `falseLabel` (boolean). Workspace v56 (`migrateV55`) replaced the old
 * `useDateFormat` string with it.
 */
export type ColumnFormatConfig = {
  type: ColumnFormatType
  decimals: number | ''
  grouping: boolean
  currency: string
  percentOf: '1' | '100'
  pattern: string
  timeZone: string
  trueLabel: string
  falseLabel: string
}

export function defaultColumnFormat(): ColumnFormatConfig {
  return { type: '', decimals: '', grouping: true, currency: '', percentOf: '1', pattern: '', timeZone: '', trueLabel: '', falseLabel: '' }
}

/** The pre-v56 `useDateFormat` string as a format config (blank = as is). */
export function formatFromUseDateFormat(pattern: string | undefined): ColumnFormatConfig {
  return pattern ? { ...defaultColumnFormat(), type: 'date', pattern } : defaultColumnFormat()
}

/** The engine `ColumnDef.format` for a config — only the keys that are set; `undefined` for "as is". */
export function columnFormatToEngine(f: ColumnFormatConfig | undefined): CellFormat | undefined {
  if (!f || !f.type) return undefined
  const decimals = f.decimals === '' ? {} : { decimals: f.decimals }
  switch (f.type) {
    case 'number':
      return { type: 'number', ...decimals, ...(f.grouping ? {} : { grouping: false }) }
    case 'currency':
      return { type: 'currency', currency: f.currency.trim() || 'USD', ...decimals }
    case 'percent':
      return { type: 'percent', ...decimals, ...(f.percentOf === '100' ? { of: 100 } : {}) }
    case 'date':
    case 'datetime':
      return {
        type: f.type,
        ...(f.pattern.trim() ? { pattern: f.pattern.trim() } : {}),
        ...(f.timeZone.trim() ? { timeZone: f.timeZone.trim() } : {}),
      }
    case 'boolean':
      return {
        type: 'boolean',
        ...(f.trueLabel.trim() ? { trueLabel: f.trueLabel.trim() } : {}),
        ...(f.falseLabel.trim() ? { falseLabel: f.falseLabel.trim() } : {}),
      }
    case 'text':
      return { type: 'text' }
  }
}

/**
 * A conditional style rule as the studio edits it — the engine's
 * `DataTableStyleRule` (see the grilled design `datatable-ag-grid-features`).
 * `field: 'value'` reads the cell's own value, `'row'` a field of the row
 * (`path`); a row rule always reads the row. `value` is typed text, parsed at
 * export (a number, `true` / `false`, else a string). `tone` is a Radix
 * colour name (`''` = none).
 */
export type StyleRuleConfig = {
  id: string
  field: 'value' | 'row'
  path: string
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'set' | 'unset'
  value: string
  tone: string
  fill: boolean
  bold: boolean
  italic: boolean
  strike: boolean
}

export function createStyleRule(field: StyleRuleConfig['field'] = 'value'): StyleRuleConfig {
  return { id: crypto.randomUUID(), field, path: '', op: 'lt', value: '0', tone: 'red', fill: false, bold: false, italic: false, strike: false }
}

/** Typed rule text → the comparison's value: a number, a boolean, else the text. */
export function ruleValue(text: string): string | number | boolean {
  const t = text.trim()
  if (t === 'true') return true
  if (t === 'false') return false
  if (t !== '' && Number.isFinite(Number(t))) return Number(t)
  return text
}

/** The engine rules (`cellStyles` / `rowStyles`); `undefined` when there are none. */
export function styleRulesToEngine(rules: StyleRuleConfig[] | undefined): DataTableStyleRule[] | undefined {
  const out = (rules ?? [])
    .filter((r) => r.tone || r.bold || r.italic || r.strike)
    .map((r): DataTableStyleRule => {
      const left = r.field === 'row' ? { key: 'row', path: r.path.trim() } : { key: 'value' }
      const presence = r.op === 'set' || r.op === 'unset'
      return {
        when: {
          left,
          operator: presence ? (r.op === 'set' ? 'neq' : 'eq') : (r.op as Exclude<StyleRuleConfig['op'], 'set' | 'unset'>),
          right: presence ? {} : { val: ruleValue(r.value) },
        },
        ...(r.tone ? { tone: r.tone as DataTableStyleRule['tone'] } : {}),
        ...(r.tone && r.fill ? { fill: true } : {}),
        ...(r.bold ? { weight: 'bold' as const } : {}),
        ...(r.italic ? { italic: true } : {}),
        ...(r.strike ? { strike: true } : {}),
      }
    })
  return out.length ? out : undefined
}

/** Row selection (engine `DataTableElement.selection`), exported while `enabled`. */
export type DataTableSelectionConfig = {
  enabled: boolean
  mode: 'single' | 'multi'
  /** The row's id field; `''` = `_id`, else `id`. */
  idKey: string
  /** The state slice; `''` = `<name>Selected`. */
  stateKey: string
  headerCheckbox: 'page' | 'all' | 'none'
  keepAcrossPages: boolean
}

export function createDefaultSelection(): DataTableSelectionConfig {
  return { enabled: false, mode: 'multi', idKey: '', stateKey: '', headerCheckbox: 'page', keepAcrossPages: true }
}

/** The slice a table's selection is published as. */
export function selectionStateKey(tableName: string, selection: DataTableSelectionConfig | undefined): string {
  return selection?.stateKey.trim() || `${tableName}Selected`
}

/** Client-side grouping (engine `DataTableElement.grouping`), exported while `enabled`. `by` holds accessors. */
export type DataTableGroupingConfig = {
  enabled: boolean
  by: string[]
  expanded: '0' | '1' | '2' | '3' | 'all'
  userCanGroup: boolean
  showCount: boolean
  totalRow: 'none' | 'top' | 'bottom'
}

export function createDefaultGrouping(): DataTableGroupingConfig {
  return { enabled: false, by: [], expanded: '0', userCanGroup: true, showCount: true, totalRow: 'none' }
}

/** What the Export button writes (engine `exportOptions`); every value is the engine default here. */
export type DataTableExportConfig = {
  fileName: string
  columns: 'visible' | 'all'
  values: 'formatted' | 'raw'
  rows: 'all' | 'page'
}

export function createDefaultExportOptions(): DataTableExportConfig {
  return { fileName: '', columns: 'visible', values: 'formatted', rows: 'all' }
}

export const DEFAULT_COLUMNS_BUTTON: ButtonConfig = { label: 'Columns', icon: 'columns', variant: 'outlined' }
export const DEFAULT_EXPORT_BUTTON: ButtonConfig = { label: 'Export', icon: 'download', variant: 'outlined' }

/** A column's group-row / total-row summary; `''` = none. */
export type ColumnAggregate = '' | DataTableAggregate

/** `{ format }` for the export when the column has one, else nothing. */
export function columnFormatExport(f: ColumnFormatConfig | undefined): { format: CellFormat } | Record<never, never> {
  const format = columnFormatToEngine(f)
  return format ? { format } : {}
}

/** Line-clamp choices for a data table cell / column: `0` = wrap freely. */
export type CellLines = 0 | 1 | 2 | 3 | 4 | 5 | 6
/** The engine's default `cellLines`. */
export const DEFAULT_CELL_LINES: CellLines = 2

/**
 * One column of a data table. Maps 1:1 onto the engine's `ColumnDef`
 * (`accessor`/`header`/`enableSorting`/`enableColumnFilter`/`align`/`format`)
 * so the exported JSON is lossless. `format` is the cell's display formatting
 * (`type: ''` = the raw value, dropped on export). `id` is a
 * studio-only stable identity for the sortable column cards (dnd-kit keys) —
 * every export path maps fields explicitly, so it never reaches engine JSON.
 */
export type DataTableColumnConfig = ColumnSizingConfig & {
  /** Studio-only stable card identity; never exported. */
  id: string
  accessor: string
  header: string
  enableSorting: boolean
  enableColumnFilter: boolean
  align: 'start' | 'center' | 'end'
  /** Engine `ColumnDef.format` — how the cell shows its value (`type: ''` = as is). */
  format: ColumnFormatConfig
  /** Engine `ColumnDef.pin` — sticky while the table scrolls sideways; `''` = not pinned. */
  pin: '' | 'left' | 'right'
  /** Engine `ColumnDef.html` — the cell's HTML template (`{{field}}` placeholders); `''` = plain value. */
  html: string
  /** Engine `ColumnDef.sortField` — the field `api.sort` sends; `''` = the accessor. */
  sortField: string
  /** Engine `ColumnDef.lines` — this column's line clamp (`0` = none); `''` = the table's `cellLines`. */
  lines: CellLines | ''
  /** Engine `ColumnDef.rowHeader` — the row's label column (`<th scope="row">`, pinned left); one per table. */
  rowHeader: boolean
  /** Engine `ColumnDef.mergeRows` — consecutive equal values share one cell. */
  mergeRows: boolean
  /** Engine `ColumnDef.mergeColumns` — adjacent equal values (both flagged) share one cell. */
  mergeColumns: boolean
  /** Engine `ColumnDef.group` — adjacent columns with the same label share a group header; `''` = none. */
  group: string
  /** Engine `ColumnDef.hide` — starts hidden (the Columns menu can show it). Optional: absent = shown. */
  hide?: boolean
  /** Engine `ColumnDef.lockVisible` — the Columns menu can't hide it. Optional. */
  lockVisible?: boolean
  /** Engine `ColumnDef.cellStyles` — conditional tones. Optional: absent = none. */
  cellStyles?: StyleRuleConfig[]
  /** Engine `ColumnDef.aggregate` — the group / total row summary. Optional: absent / `''` = none. */
  aggregate?: ColumnAggregate
}

/**
 * Editable config for a data table. Maps onto the engine's `DataTableElement`
 * minus the pieces studio can't author yet: the `modalContainer`/sizing block is
 * omitted on export (the consumer wires it). `canSearchAllColumns` is the
 * engine's `canSearch` (emitted only when off). The `delete*` group authors the engine's
 * `apiDeleteInfo` (`APIDelete`) and exports only when `canDelete` and an
 * endpoint are set; the confirmBox True/False action arrays are baked export
 * constants (see the grilled design), and the snackbar fields mirror
 * `ButtonItemConfig`'s.
 */
export type DataTableConfig = {
  name: string
  title: string
  canEdit: boolean
  canDelete: boolean
  /** The header's "Search all columns" box (engine `canSearch`; exported only when off). */
  canSearchAllColumns: boolean
  columns: DataTableColumnConfig[]
  /**
   * The API page endpoint feeding the table, by `EndpointDef.id` (`null` =
   * unwired — the export omits `api` and the consumer wires it). Resolved to
   * the endpoint's current name at export; also what the Live Preview fetches.
   */
  endpointId: string | null
  /**
   * Rows from a page load instead of the endpoint (engine `items`, in-memory
   * only): while set the export drops the read `api` — pagination, server
   * sort and filters with it. `null` / absent = the endpoint.
   */
  rowsBinding?: ItemBinding
  /** Dot-path into the response to the row array (engine `api.paths`, e.g.
   * `data`); `''` = the response is the array itself. */
  apiPaths: string
  /**
   * Edit-modal sizing (engine `modalMaxWidth`/`modalMinWidth`/`modalMaxHeight`,
   * CSS lengths; `''` = unset, dropped on export). The modal's *content* is the
   * item's child canvas (drill-in), exported as `modalContainer` with
   * `contextData` set to the table's binding name so the selected row prefills
   * the form.
   */
  modalMaxWidth: string
  modalMinWidth: string
  modalMaxHeight: string
  /** The row-delete endpoint, by `EndpointDef.id` (`null` = unwired — the
   * export omits `apiDeleteInfo` and `canDelete` stays as authored). */
  deleteEndpointId: string | null
  /** URL `:param` → row-field accessor (engine `apiDeleteInfo.params`, e.g.
   * `{ id: "_id" }`). Keys derive from the endpoint URL's placeholders — the
   * panel prunes on endpoint change and the export drops empty values. */
  deleteParams: Record<string, string>
  deleteConfirmEnabled: boolean
  deleteConfirmTitle: string
  deleteConfirmDescription: string
  /** Engine `apiDeleteInfo.isReload`: refetch the table after a delete. */
  deleteIsReload: boolean
  deleteSnackbarSuccessEnabled: boolean
  deleteSnackbarSuccessType: ButtonSnackbarVariant
  deleteSnackbarSuccessMessage: string
  /** Exports `snackbarError: "$exception"` — the only form the engine reads
   * (shows the API error message). */
  deleteSnackbarErrorException: boolean
  /** Row click → page (engine `DataTableElement.rowNavigate`); absent = off. */
  rowNavigate?: StudioNavigate
  /** Server-side paging (engine `api.pagination`, emitted only while `enabled`). */
  pagination: DataTablePaginationConfig
  /**
   * Engine `canAdd` / `addButton`: an Add button in the table header opening
   * the edit modal canvas over an empty row. Items in that canvas pick which
   * mode shows them with `GridItemData.showWhen`. `addButton` is exported
   * only off its defaults.
   */
  canAdd: boolean
  addButton: ButtonConfig
  /** Engine `headerGap` — spacing between title, Add button and search box; `''` = default (2). */
  headerGap: '' | '0' | '1' | '2' | '3' | '4' | '6' | '8'
  /** Engine `canResizeColumns` — drag a header edge to resize; exported only when off. */
  canResizeColumns: boolean
  /** Engine `actionSize` — row-action button size (Edit / Delete …); `''` / absent = default (2). Optional, no migration. */
  actionSize?: ActionSize
  /** Engine `cellLines` — lines a plain cell shows before it is cut (a cut cell gets a tooltip); `0` = no clamp. Engine default 2. */
  cellLines: CellLines
  /**
   * Server-side custom filters (engine `filterContainer`): the filter form is
   * the item's **second** child canvas (index 1), emitted while enabled and
   * non-empty. `filterButton` / `filterDisplay` / `filterDefaults` export only
   * off the engine defaults.
   */
  filtersEnabled: boolean
  filterButton: ButtonConfig
  filterDisplay: 'popover' | 'inline'
  filterDefaults: FilterDefaultRow[]
  /** Engine `api.params` / `api.query` / `api.body` — one row per request key. */
  requestMapping: RequestMapRow[]
  sort: DataTableSortConfig
  /*
   * The AG Grid-style features (see the grilled design
   * `datatable-ag-grid-features`). All optional: absent = the engine default,
   * so tables saved before them need no migration.
   */
  /** Engine `canChooseColumns` — the Columns menu; absent = on. */
  canChooseColumns?: boolean
  columnsButton?: ButtonConfig
  /** Engine `columnState.persist`; absent = `local`. */
  columnPersist?: 'local' | 'session' | 'none'
  selection?: DataTableSelectionConfig
  /** Engine `rowStyles` (rules read the row). */
  rowStyles?: StyleRuleConfig[]
  grouping?: DataTableGroupingConfig
  /** Engine `canExport` — the Export (CSV) button; absent = off. */
  canExport?: boolean
  exportButton?: ButtonConfig
  exportOptions?: DataTableExportConfig
  /** Engine `paging`; absent = `pages`. */
  paging?: 'pages' | 'scroll'
}

/**
 * Where one request key of a data table's read call comes from: any
 * {@link NavParamSource} (literal / URL / global state — `row` has no meaning
 * here), or a **filter field** of the table's filter form, with the fallback
 * sent while that filter is blank (required when it feeds a URL `:param`).
 */
export type RequestSource = NavParamSource | { type: 'filter'; key: string; fallback: string }

/** One row of a data table's request mapping → a key of engine `api.params` / `api.query` / `api.body`. */
export type RequestMapRow = {
  /** Studio-only stable row identity; never exported. */
  id: string
  slot: 'params' | 'query' | 'body'
  key: string
  source: RequestSource
}

/** A filter's opening value (engine `filterDefaults`); `value` is text, parsed as JSON when it is a number / boolean / array. */
export type FilterDefaultRow = { id: string; field: string; value: string }

/**
 * Engine `api.sort`. Exported only while `enabled` with both keys set;
 * `placement: 'auto'` leaves the engine to infer it, `ascValue` / `descValue`
 * export as `orderValues` only off `asc` / `desc` (numeric text → numbers),
 * `defaultField` (`''` = none) as `default`.
 */
export type DataTableSortConfig = {
  enabled: boolean
  placement: 'auto' | 'query' | 'body'
  sortKey: string
  orderKey: string
  ascValue: string
  descValue: string
  defaultField: string
  defaultOrder: 'asc' | 'desc'
}

export function createDefaultSortConfig(): DataTableSortConfig {
  return {
    enabled: false,
    placement: 'auto',
    sortKey: '',
    orderKey: '',
    ascValue: 'asc',
    descValue: 'desc',
    defaultField: '',
    defaultOrder: 'asc',
  }
}

/** Engine defaults of the table's Filter button (exported only when changed). */
export const DEFAULT_FILTER_BUTTON: ButtonConfig = { label: 'Filter', icon: 'filter', variant: 'outlined' }

/** The engine's Add button defaults ("Add", the plus glyph, contained). */
export const DEFAULT_ADD_BUTTON: ButtonConfig = { label: 'Add', icon: 'puls', variant: 'contained' }

/**
 * When an item inside a data table's modal canvas is shown: always, only
 * while adding (no row selected) or only while editing. Exported as the
 * engine `condition` on `<table name>._id`; absent = always.
 */
export type ShowWhen = 'always' | 'adding' | 'editing'

/**
 * Show an item only while a page load is in a state, or while one of its
 * fields compares to a value (see the grilled page-data design) — exported
 * as a `source: "state"` engine condition. `set` / `unset` compare against
 * `undefined`; the other operators against `value` (JSON-parsed when it
 * spells a number / boolean / null, else the text).
 */
export type DataCondition = {
  loadId: string
  test: 'loaded' | 'loading' | 'failed' | 'compare'
  path: string
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'set' | 'unset'
  value: string
}

/**
 * `DataCondition.loadId` for a condition on the **enclosing repeater's item**
 * instead of a page load (`compare` only): exported as the engine's bin
 * condition over `{ key: "row", path }`, which a repeater's template sees
 * (`ctx = { row, index }`). Offered by the Show when panel inside a template.
 */
export const ITEM_CONDITION_SOURCE = '$item'

export function createDataCondition(loadId: string): DataCondition {
  return { loadId, test: 'loaded', path: '', op: 'eq', value: '' }
}

/**
 * Server pagination authoring — the engine `DataTablePagination` with the
 * studio's `''` / `'auto'` "unset" idioms. `placement: 'auto'` follows the
 * engine's inference (the endpoint declares a body model ⇒ body, else query)
 * and is dropped from the export; `searchKey: ''` = no server search;
 * `totalPath` is a dot path split at export.
 */
export type DataTablePaginationConfig = {
  enabled: boolean
  placement: 'auto' | 'query' | 'body'
  offsetKey: string
  limitKey: string
  searchKey: string
  totalPath: string
  defaultPageSize: number
  pageSizeOptions: number[]
}

/** Engine defaults for the page-size controls (exported only when changed). */
export const DEFAULT_PAGE_SIZE = 10
export const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 40, 50]

/** Off, with the conventional key names ready for when it's switched on. */
export function createDefaultPaginationConfig(): DataTablePaginationConfig {
  return {
    enabled: false,
    placement: 'auto',
    offsetKey: 'offset',
    limitKey: 'limit',
    searchKey: '',
    totalPath: 'total',
    defaultPageSize: DEFAULT_PAGE_SIZE,
    pageSizeOptions: [...DEFAULT_PAGE_SIZE_OPTIONS],
  }
}

/**
 * Defaults for a freshly dropped data table: the same realistic id/name/email/
 * status set the canned preview used to show, so the drop moment looks identical
 * and the preview is instantly populated. Sorting on / filter off / centered is
 * the seeded per-column baseline (also what "Add column" seeds).
 */
export function createDefaultDataTableConfig(name: string): DataTableConfig {
  const column = (accessor: string, header: string): DataTableColumnConfig => ({
    ...DEFAULT_COLUMN_SIZING,
    id: crypto.randomUUID(),
    accessor,
    header,
    enableSorting: true,
    enableColumnFilter: false,
    align: 'center',
    format: defaultColumnFormat(),
    pin: '',
    html: '',
    sortField: '',
    lines: '',
    rowHeader: false,
    mergeRows: false,
    mergeColumns: false,
    group: '',
  })
  return {
    name,
    title: 'Data Table',
    canEdit: true,
    canDelete: true,
    canSearchAllColumns: true,
    columns: [
      column('id', 'ID'),
      column('name', 'Name'),
      column('email', 'Email'),
      column('status', 'Status'),
    ],
    endpointId: null,
    apiPaths: '',
    modalMaxWidth: '',
    modalMinWidth: '',
    modalMaxHeight: '',
    deleteEndpointId: null,
    deleteParams: {},
    deleteConfirmEnabled: true,
    deleteConfirmTitle: 'Delete record',
    deleteConfirmDescription: 'Are you sure you want to delete this record?',
    deleteIsReload: true,
    pagination: createDefaultPaginationConfig(),
    canAdd: false,
    addButton: { ...DEFAULT_ADD_BUTTON },
    headerGap: '',
    canResizeColumns: true,
    cellLines: DEFAULT_CELL_LINES,
    filtersEnabled: false,
    filterButton: { ...DEFAULT_FILTER_BUTTON },
    filterDisplay: 'popover',
    filterDefaults: [],
    requestMapping: [],
    sort: createDefaultSortConfig(),
    deleteSnackbarSuccessEnabled: false,
    deleteSnackbarSuccessType: 'success',
    deleteSnackbarSuccessMessage: '',
    deleteSnackbarErrorException: false,
  }
}

/**
 * One CRUD call of a form list (see the grilled design). `endpointId` is the
 * API page ref (`null` = unwired). `params` holds one source per `:param` of
 * the endpoint URL (seeded on pick, pruned at export): a `row` source maps the
 * param to a row field (engine `params`), any other source resolves from the
 * route / state / a literal (engine `extraParams`, or `params` on the read
 * call — `row` isn't offered there). `extra` is a free-form key → source map:
 * the read call's `query`, a mutation's `extraBody`.
 */
export type FormListCrudRef = {
  endpointId: string | null
  params: Record<string, NavParamSource>
  extra: Record<string, NavParamSource>
}

export function createFormListCrudRef(): FormListCrudRef {
  return { endpointId: null, params: {}, extra: {} }
}

/**
 * Editable config for a form list. Maps onto the engine's `FormListElement`;
 * the row template is the item's single child canvas (drill-in like a
 * container). The three action toggles model `apiCrud.create/update/delete`
 * presence — Add / Save / Remove exist only when their API is set — and the
 * read call is always emitted (the engine throws loudly until it resolves).
 * Empty labels fall back to the component's defaults at export.
 */
export type FormListConfig = {
  name: string
  title: string
  idKey: string
  addLabel: string
  /** `IconData` key; `''` = the component's default glyph. */
  addIcon: string
  addPosition: 'top' | 'bottom'
  addAlign: 'start' | 'center' | 'end'
  /** What the Add button shows: icon + label, icon only, or label only. */
  addDisplay: 'both' | 'icon' | 'label'
  saveLabel: string
  removeLabel: string
  /** `IconData` key; `''` = the component's default glyph. */
  removeIcon: string
  /** Where a row's Save / Remove controls sit relative to its fields. */
  removePosition: 'start' | 'end' | 'below'
  removeDisplay: 'both' | 'icon' | 'label'
  emptyText: string
  /** Dot path into the read response to the row array (`data`). */
  readPaths: string
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  read: FormListCrudRef
  create: FormListCrudRef
  update: FormListCrudRef
  delete: FormListCrudRef
  deleteConfirmEnabled: boolean
  deleteConfirmTitle: string
  deleteConfirmDescription: string
}

/** Defaults for a freshly dropped form list: all three actions on, nothing wired. */
export function createDefaultFormListConfig(name: string): FormListConfig {
  return {
    name,
    title: 'Form List',
    idKey: 'id',
    addLabel: 'Add',
    addIcon: '',
    addPosition: 'bottom',
    addAlign: 'start',
    addDisplay: 'both',
    saveLabel: '',
    removeLabel: '',
    removeIcon: '',
    removePosition: 'end',
    removeDisplay: 'both',
    emptyText: '',
    readPaths: 'data',
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    read: createFormListCrudRef(),
    create: createFormListCrudRef(),
    update: createFormListCrudRef(),
    delete: createFormListCrudRef(),
    deleteConfirmEnabled: true,
    deleteConfirmTitle: 'Delete item',
    deleteConfirmDescription: 'This action cannot be undone. Are you sure you want to continue?',
  }
}

/**
 * A display prop bound to the item of the enclosing repeater (see the grilled
 * repeater design): the item field `key` plus an optional lodash `path` into
 * it (`flag` + `png`). `null` = static. Exported as the engine
 * `{ type:'row', key, path? }` DataValue; the static prop stays as the
 * fallback shown when the value resolves empty.
 */
/**
 * A bound display value. `source` absent / `'row'`: `key` is a field of the
 * enclosing repeater's item (`'none'` = the item itself). `'state'`: `key` is
 * a page load's id (resolved to its key at export), `path` drills its data or
 * reads `$status`.
 */
export type ItemBinding = { key: string; path: string; source?: 'row' | 'state' } | null

/**
 * Editable config for a repeater. Maps onto the engine's `RepeaterElement`;
 * the item template is the item's single child canvas (drill-in like a
 * container). The array comes from an endpoint (`read` — endpoint, `:param`
 * sources, query extras — drilled by `readPaths`) or, inside another
 * repeater's template, from an array field of the parent item
 * (`parentField` → engine `items: { type:'row', key }`). `itemSpan` is out of
 * 12 per studio breakpoint (exported like a bin: xs→sm, sm→md, md→lg, lg→lg+xl).
 */
export type RepeaterConfig = {
  name: string
  title: string
  idKey: string
  source: 'endpoint' | 'parent' | 'state'
  read: FormListCrudRef
  /** The page load (array) the items come from (source `state`). */
  stateBinding?: ItemBinding
  /** Dot path into the read response to the item array (`data`). */
  readPaths: string
  /** Array field of the enclosing repeater's item (source `parent`). */
  parentField: string
  itemSpan: Responsive<number>
  /** Tailwind spacing scale key (`'4'`) or a CSS length. */
  gap: string
  itemSurface: 'none' | 'outlined' | 'elevation'
  /** `''` = the component default (4 with a surface, else 0). */
  itemPadding: string
  emptyText: string
  /** Whole-item link; `null` = items aren't clickable. */
  itemNavigate: StudioNavigate | null
}

/** Defaults for a freshly dropped repeater: a full-width list, nothing wired. */
export function createDefaultRepeaterConfig(name: string): RepeaterConfig {
  return {
    name,
    title: '',
    idKey: 'id',
    source: 'endpoint',
    read: createFormListCrudRef(),
    readPaths: 'data',
    parentField: '',
    itemSpan: { xs: 12, sm: 12, md: 12, lg: 12 },
    gap: '4',
    itemSurface: 'none',
    itemPadding: '',
    emptyText: '',
    itemNavigate: null,
  }
}

/** Inline editor kinds for an editable-table column. Mirrors the library's
 * `DataTableEditableEditor`. */
export type EditableTableEditor = 'text' | 'number' | 'date' | 'select' | 'checkbox'

/** One option for the `select` editor — fixed `{value, label}` shape (unlike the
 * select field's open records), so it gets a structured row editor. */
export type EditableTableOption = {
  value: string
  label: string
}

/**
 * One column of an editable table. Maps onto the library's
 * `DataTableEditableColumn` minus `size`, `defaultValue`, and the `validate` fn
 * (not JSON-authorable) — see the grilled design. Every field is always carried
 * so switching `editor` is lossless; the panel shows and the export emits only
 * the fields relevant to the current editor: `options` for `select`, `min`/`max`
 * for `number`, `minLength`/`maxLength`/`pattern`/`patternMessage` for `text`,
 * and `requiredMessage` when `isRequired`. Numeric bounds are `''` when unset
 * (mirroring `width`/`maxLength` elsewhere). `id` is a studio-only stable
 * identity for the sortable column cards (dnd-kit keys); never exported.
 */
export type DataTableEditableColumnConfig = ColumnSizingConfig & {
  /** Studio-only stable card identity; never exported. */
  id: string
  accessorKey: string
  header: string
  editable: boolean
  editor: EditableTableEditor
  options: EditableTableOption[]
  isRequired: boolean
  requiredMessage: string
  min: number | ''
  max: number | ''
  minLength: number | ''
  maxLength: number | ''
  pattern: string
  patternMessage: string
  enableSorting: boolean
  enableColumnFilter: boolean
  align: 'start' | 'center' | 'end'
  /** Engine `format` — display formatting of the cell in read mode (`type: ''` = as is). */
  format: ColumnFormatConfig
  /** Engine `rowHeader` — the row's label column. */
  rowHeader: boolean
  /** Engine `group` — group header label; `''` = none. */
  group: string
  /** Engine `cellStyles` — conditional tones in read mode. Optional: absent = none. */
  cellStyles?: StyleRuleConfig[]
}

/**
 * Editable config for an editable table. Maps onto the engine's
 * `DataTableEditableElement`. The three action toggles model `apiCrud`
 * presence — in this component the Add/Edit/Delete actions exist only when
 * their CRUD API is set — and export as skeleton refs with empty `name`s the
 * consumer fills in (the engine throws loudly until the read API resolves, so
 * a skeleton can't silently look wired). `idKey` is the row field used as the
 * record id for update/delete calls.
 */
/** Row-action button steps of both tables (engine `DataTableActionSize`); `''` = the engine default. */
export type ActionSize = '' | '1' | '2' | '3'

export const ACTION_SIZE_OPTIONS: { value: ActionSize; label: string }[] = [
  { value: '', label: '— default (medium) —' },
  { value: '1', label: 'Small (24px)' },
  { value: '2', label: 'Medium (32px)' },
  { value: '3', label: 'Large (40px)' },
]

export type DataTableEditableConfig = {
  name: string
  title: string
  idKey: string
  /** Engine `canResizeColumns` — drag a header edge to resize; exported only when off. */
  canResizeColumns: boolean
  /** Engine `actionSize` — row-action button size (Edit / Delete …); `''` / absent = default (2). Optional, no migration. */
  actionSize?: ActionSize
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  columns: DataTableEditableColumnConfig[]
  /**
   * Optional API page endpoint refs for the CRUD calls, by `EndpointDef.id`
   * (`null` = unwired). A set ref exports its endpoint's current name (and the
   * Live Preview fetches `read` live); an unset one keeps the empty-name
   * skeleton the consumer fills in. The action toggles above stay authoritative
   * for which actions exist.
   */
  readEndpointId: string | null
  createEndpointId: string | null
  updateEndpointId: string | null
  deleteEndpointId: string | null
}

/** A column with everything off/empty except the identity fields — the base for
 * seeds and the panel's "Add column". */
export function createEditableTableColumn(
  accessorKey: string,
  header: string,
  overrides?: Partial<DataTableEditableColumnConfig>,
): DataTableEditableColumnConfig {
  return {
    ...DEFAULT_COLUMN_SIZING,
    id: crypto.randomUUID(),
    accessorKey,
    header,
    editable: true,
    editor: 'text',
    options: [],
    isRequired: false,
    requiredMessage: '',
    min: '',
    max: '',
    minLength: '',
    maxLength: '',
    pattern: '',
    patternMessage: '',
    enableSorting: true,
    enableColumnFilter: false,
    align: 'center',
    format: defaultColumnFormat(),
    rowHeader: false,
    group: '',
    ...overrides,
  }
}

/**
 * Defaults for a freshly dropped editable table: an editor showcase — a locked
 * id, a text name, a select status (with working starter options), and a
 * checkbox — demoing the editor variety the component exists for. All three
 * row actions start on.
 */
export function createDefaultDataTableEditableConfig(name: string): DataTableEditableConfig {
  return {
    name,
    title: 'Editable Table',
    idKey: 'id',
    canResizeColumns: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    columns: [
      createEditableTableColumn('id', 'ID', { editable: false }),
      createEditableTableColumn('name', 'Name'),
      createEditableTableColumn('status', 'Status', {
        editor: 'select',
        options: [
          { value: 'Active', label: 'Active' },
          { value: 'Pending', label: 'Pending' },
          { value: 'Inactive', label: 'Inactive' },
        ],
      }),
      createEditableTableColumn('active', 'Active', { editor: 'checkbox' }),
    ],
    readEndpointId: null,
    createEndpointId: null,
    updateEndpointId: null,
    deleteEndpointId: null,
  }
}

/**
 * Editable config for a text component. Maps onto the library's `Text` / engine
 * `TextElement`: `text` is the content and `isLabel` renders it as a form-label
 * (block, small, medium-weight) instead of inline text. No binding `name` —
 * TextElement carries none.
 */
export type TextConfig = {
  text: string
  isLabel: boolean
  /** Inside a repeater: show this item field instead (`text` = fallback). */
  binding: ItemBinding
}

/** Defaults for a freshly dropped text: label styling on (the common use — a
 * field caption), mirroring what the serializer emitted before text had a config. */
export function createDefaultTextConfig(): TextConfig {
  return { text: 'Text', isLabel: true, binding: null }
}

/**
 * Editable config for a typography component — the curated slice of the engine's
 * `TypographyElement` (see the grilled design): the props that visibly change a
 * static preview (`variant`/`weight`/`color`/`align`/`truncate`) plus `href`.
 * The rest (component/transform/decoration/noWrap/tooltip trio/rel/target) stays
 * hand-editable in the exported JSON. `''` means "component default" for
 * `weight`/`color`/`align` (Typography derives them from `variant`), and no link
 * for `href`.
 */
export type TypographyConfig = {
  text: string
  variant:
    | 'display1'
    | 'display2'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'subtitle1'
    | 'subtitle2'
    | 'body1'
    | 'body2'
    | 'caption'
    | 'overline'
    | 'button'
  weight: '' | 'light' | 'regular' | 'medium' | 'bold'
  color: string
  align: '' | 'left' | 'center' | 'right' | 'justify'
  truncate: boolean
  href: string
  /** Inside a repeater: show this item field instead (`text` = fallback). */
  binding: ItemBinding
}

/** Defaults for a freshly dropped typography: a body-copy paragraph with every
 * override unset so the variant's own styling shows through. */
export function createDefaultTypographyConfig(): TypographyConfig {
  return {
    text: 'Typography',
    variant: 'body1',
    weight: '',
    color: '',
    align: '',
    truncate: false,
    href: '',
    binding: null,
  }
}

/**
 * Editable config for an avatar. Maps onto the library's `Avatar` / engine
 * `AvatarElement` (`name` is the element's optional binding key). `src` empty
 * shows the `fallback` text (or the first letter of `alt`); `size` sticks to the
 * named steps — the numeric form stays hand-editable in the exported JSON.
 */
export type AvatarConfig = {
  name: string
  src: string
  alt: string
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fallback: string
  /** Inside a repeater: image URL from this item field (`src` = fallback). */
  srcBinding: ItemBinding
  /** Inside a repeater: initials from this item field (`fallback` = fallback). */
  fallbackBinding: ItemBinding
}

/** Defaults for a freshly dropped avatar: no image, initials fallback, medium. */
export function createDefaultAvatarConfig(name: string): AvatarConfig {
  return { name, src: '', alt: '', size: 'md', fallback: 'AB', srcBinding: null, fallbackBinding: null }
}

/**
 * Editable config for a divider. Maps onto the library's `Divider` / engine
 * `DividerElement`. `spacing` is the vertical margin in px (`''` = the
 * component's 8px default).
 */
export type DividerConfig = {
  variant: 'fullWidth' | 'inset' | 'middle'
  spacing: number | ''
}

/** Defaults for a freshly dropped divider. Mirrors Divider's own defaults. */
export function createDefaultDividerConfig(): DividerConfig {
  return { variant: 'fullWidth', spacing: '' }
}

/** A button's visual weight. Mirrors the library's `ButtonVariant`. */
export type ButtonVariant = 'contained' | 'outlined' | 'text'

export const BUTTON_VARIANT_OPTIONS: { value: ButtonVariant; label: string }[] = [
  { value: 'contained', label: 'Contained' },
  { value: 'outlined', label: 'Outlined' },
  { value: 'text', label: 'Text' },
]

/**
 * Editable config for a button's visual slice: `label`, its `variant` + an optional `icon` key
 * into the library's `IconData` glyph map (`''` = no icon). Modal/popover
 * trigger buttons carry exactly this (their behavior is owned by the host);
 * standalone button items extend it with behavior via `ButtonItemConfig`.
 * Color comes from the theme.
 */
export type ButtonConfig = {
  label: string
  /** `IconData` key; `''` = no icon. */
  icon: string
  /** Exported only off the engine default (`contained`). */
  variant: ButtonVariant
  /**
   * A Radix colour name (`red`, `iris`, …) for this button; `''` / absent =
   * the theme (its button colour, else the accent). Optional, so configs saved
   * before it existed need no migration. Exported only when set.
   */
  color?: string
}

/** Defaults for a freshly dropped button. */
export function createDefaultButtonConfig(): ButtonConfig {
  return { label: 'Button', icon: '', variant: 'contained' }
}

/**
 * The engine `ButtonAction`s studio offers in ordered lists. `ConfirmBox` is
 * modelled as the panel's mode (not a list entry — the engine only honors it
 * as `actions[0]`, and everything after it is dead), and `OpenModal` /
 * `SubmitFormToDeleteAPI` are silent no-ops in the engine's `Button` switch,
 * so they aren't offered (see the grilled design).
 */
export type BuiltinButtonActionKey =
  | 'StartLoading'
  | 'StopLoading'
  | 'SubmitFormToPostAPI'
  | 'SubmitFormToPatchAPI'
  | 'ClearCurrentFormSelected'
  | 'CloseModal'
  | 'Navigate'
  /** Refetch `reloadTableItemId`: a table / form list / repeater, or a page load. */
  | 'ReloadDataTable'
  /** Download `exportTableItemId` (a data table) as CSV. */
  | 'ExportTable'
  /** Azure SSO (the project's auth entry): start the sign-in / sign out. */
  | 'SignIn'
  | 'SignOut'

/**
 * A built-in engine action, or a project custom action by its declaration
 * **id** (`"fn:action-…"`, see `Workspace/customActions.ts`) — resolved to
 * the engine's `"fn:<name>"` at export.
 */
export type ButtonActionKey = BuiltinButtonActionKey | `fn:${string}`

/** Mirrors the library's `SnackbarVariant`. */

/**
 * Where one `:param` (or query key) of a navigation target gets its value —
 * the studio-side mirror of the engine `DataValue` sources `NavigateTarget`
 * accepts. `row` is only offered on a data table's row navigation.
 */
export type NavParamSource =
  | { type: 'value'; value: string }
  | { type: 'url'; key: string; source: 'param' | 'query' }
  | { type: 'state'; key: string; path: string }
  | { type: 'row'; key: string }

/**
 * A config-driven page change (see the grilled page-router design): the
 * target page by stable id (resolved to its `key` at export — the engine
 * `NavigateTarget.page`), one source per `:param` of the target's route, and
 * whether to replace the history entry. Authored on a button (played by the
 * `Navigate` action) or on a data table's row click.
 */
export type StudioNavigate = {
  pageId: string
  params: Record<string, NavParamSource>
  replace: boolean
}

export function createDefaultNavigate(): StudioNavigate {
  return { pageId: '', params: {}, replace: false }
}
export type ButtonSnackbarVariant = 'success' | 'error' | 'info' | 'warning' | 'neutral'


/**
 * Full editable config for a *standalone* button item — the visual slice plus
 * the engine `ButtonElement` behavior (see the grilled design). References are
 * stored by stable id (grid-item id / `EndpointDef.id`) and resolved to current
 * names at export, so renames can't strand the button.
 */
export type ButtonItemConfig = ButtonConfig & {
  /** `direct` runs `actions` on click; `confirm` opens a ConfirmBox and runs
   * `confirmTrue`/`confirmFalse` (exports `actions: ["ConfirmBox"]`). */
  mode: 'direct' | 'confirm'
  /** Direct-mode ordered action list. */
  actions: ButtonActionKey[]
  confirmTitle: string
  confirmDescription: string
  /** Ordered actions run when the ConfirmBox is accepted / dismissed. */
  confirmTrue: ButtonActionKey[]
  confirmFalse: ButtonActionKey[]
  /** Grid-item id of the modal `CloseModal` targets (`''` = none); exports as
   * the modal's current `ModalConfig.id`. */
  modalItemId: string
  /** Grid-item id of the (editable) data table to reload after a submit
   * (`''` = none); exports as the table's current `name`. */
  reloadTableItemId: string
  /** Grid-item id of the data table the `ExportTable` action downloads; exports as its `name`. Optional. */
  exportTableItemId?: string
  /** API page endpoint the submit actions call, by `EndpointDef.id`
   * (`null` = unwired — the export omits `api`). */
  endpointId: string | null
  snackbarSuccessEnabled: boolean
  snackbarSuccessType: ButtonSnackbarVariant
  snackbarSuccessMessage: string
  /** Exports `snackbarError: "$exception"` — the only form the engine reads
   * (it shows the thrown API error's message). */
  snackbarErrorException: boolean
  /** Target of the `Navigate` action (engine `ButtonElement.navigate`);
   * absent until the action is added. */
  navigate?: StudioNavigate
}

/** Defaults for a freshly dropped standalone button: direct mode, nothing wired. */
export function createDefaultButtonItemConfig(): ButtonItemConfig {
  return {
    ...createDefaultButtonConfig(),
    mode: 'direct',
    actions: [],
    confirmTitle: '',
    confirmDescription: '',
    confirmTrue: [],
    confirmFalse: [],
    modalItemId: '',
    reloadTableItemId: '',
    endpointId: null,
    snackbarSuccessEnabled: false,
    snackbarSuccessType: 'success',
    snackbarSuccessMessage: '',
    snackbarErrorException: false,
  }
}

/**
 * Editable config for a hidden field. Maps 1:1 onto the engine's `HiddenElement`
 * (`name` + `dataType`) — it renders nothing at runtime, so the canvas always
 * shows its chip and the only authoring is the binding.
 */
export type HiddenConfig = {
  name: string
  dataType: 'string' | 'number' | 'boolean' | 'any'
}

/** Defaults for a freshly dropped hidden field. */
export function createDefaultHiddenConfig(name: string): HiddenConfig {
  return { name, dataType: 'string' }
}

/**
 * Editable config for a paper. Maps onto the library's `Paper` / engine
 * `PaperElement` minus the nested `container` (that lives in the item's child
 * canvas — see `ChildCanvas`). `elevation` is ignored by the component when
 * `variant` is `'outlined'`.
 */
/** A plain nested container: the engine `Container.surface` flags — a themed panel background and / or a border. */
export type ContainerConfig = {
  background: boolean
  border: boolean
}

export function createDefaultContainerConfig(): ContainerConfig {
  return { background: false, border: false }
}

export type PaperConfig = {
  elevation: number
  variant: 'elevation' | 'outlined'
  square: boolean
}

/** Defaults for a freshly dropped paper. Mirrors Paper's own defaults. */
export function createDefaultPaperConfig(): PaperConfig {
  return { elevation: 1, variant: 'elevation', square: false }
}

/**
 * The card's header slot (MUI `CardHeader`): title / subheader (static or bound
 * to the enclosing repeater item), an optional avatar and an optional action
 * button at the end (icon-only by default — MUI's ⋮).
 */
export type CardHeaderConfig = {
  title: string
  titleBinding: ItemBinding
  subheader: string
  subheaderBinding: ItemBinding
  avatarEnabled: boolean
  avatar: AvatarConfig
  actionEnabled: boolean
  action: CardActionConfig
}

/** The card's image band (MUI `CardMedia`). */
export type CardMediaConfig = {
  enabled: boolean
  src: string
  srcBinding: ItemBinding
  alt: string
  height: number
}

/**
 * One footer button (or the header action). A `ButtonItemConfig` so the full
 * button editor could take it over later; the card panel edits its label /
 * icon / variant and a `Navigate` target (`actions` is `['Navigate']` while a
 * target is set, else `[]`). `id` keys the sortable list.
 */
export type CardActionConfig = ButtonItemConfig & { id: string }

export function createDefaultCardActionConfig(label: string, icon = ''): CardActionConfig {
  return { ...createDefaultButtonItemConfig(), id: crypto.randomUUID(), label, icon, variant: 'text' }
}

/**
 * Editable config for a card. Maps onto the engine `CardElement` minus the two
 * nested containers — `content` is child canvas 0 and the expandable section
 * child canvas 1 (exported only while `collapseEnabled`).
 */
export type CardConfig = {
  name: string
  header: CardHeaderConfig
  media: CardMediaConfig
  actions: CardActionConfig[]
  actionsAlign: 'start' | 'end'
  collapseEnabled: boolean
  collapseLabel: string
  defaultExpanded: boolean
  /** Whole-card link (MUI `CardActionArea`). */
  navigate: StudioNavigate | null
  variant: 'elevation' | 'outlined'
  elevation: number
  square: boolean
}

export const DEFAULT_CARD_MEDIA_HEIGHT = 180

export function createDefaultCardHeaderConfig(): CardHeaderConfig {
  return {
    title: '',
    titleBinding: null,
    subheader: '',
    subheaderBinding: null,
    avatarEnabled: false,
    avatar: createDefaultAvatarConfig(''),
    actionEnabled: false,
    action: createDefaultCardActionConfig('', 'moreVertical'),
  }
}

/** Defaults for a freshly dropped card: a title, no media, no actions. */
export function createDefaultCardConfig(name: string): CardConfig {
  return {
    name,
    header: { ...createDefaultCardHeaderConfig(), title: 'Card title' },
    media: { enabled: false, src: '', srcBinding: null, alt: '', height: DEFAULT_CARD_MEDIA_HEIGHT },
    actions: [],
    actionsAlign: 'start',
    collapseEnabled: false,
    collapseLabel: 'Show more',
    defaultExpanded: false,
    navigate: null,
    variant: 'elevation',
    elevation: 1,
    square: false,
  }
}

/**
 * Editable config for an HTML content block. Maps onto the engine
 * `HtmlContentElement`: `html` is the `{{path}}` template, `binding` (inside a
 * repeater's template) what the placeholders read — `key: 'none'` is the item
 * itself — and `prose` the typographic defaults.
 */
export type HtmlContentConfig = {
  name: string
  html: string
  binding: ItemBinding
  prose: boolean
}

export function createDefaultHtmlContentConfig(name: string): HtmlContentConfig {
  return {
    name,
    html: '<h3>Heading</h3>\n<p>Some <strong>rich</strong> text with a <a href="https://example.com" target="_blank">link</a>.</p>',
    binding: null,
    prose: true,
  }
}

/**
 * Editable config for a custom component (see the grilled design). Maps onto
 * the engine `CustomComponentElement`: `componentId` is the project
 * declaration (`Workspace/customComponents.ts`) resolved to its `name` at
 * export, `props` the authored text per declared prop key (parsed to the
 * prop's kind at export), `binding` the one bound `value`.
 */
export type CustomComponentConfig = {
  name: string
  componentId: string
  props: Record<string, string>
  binding: ItemBinding
}

export function createDefaultCustomComponentConfig(name: string): CustomComponentConfig {
  return { name, componentId: '', props: {}, binding: null }
}

/** One key of an approval line's row mapping: paths tried in order (see the engine `ApprovalKeyPath`). */
export type ApprovalLineKeyConfig = {
  name: string[]
  status: string[]
  jobTitle: string[]
  personId: string[]
  avatar: string[]
  role: string[]
  remark: string[]
  date: string[]
  sequence: string[]
}

export type ApprovalRoleRuleConfig = { id: string; path: string; sequence: string; role: string }

export type ApprovalStepStateConfig = 'done' | 'current' | 'pending' | 'rejected' | 'revised' | 'skipped'

/** One row of the status map: a backend code, its step state and its tooltip label. */
export type ApprovalStatusConfig = { code: string; state: ApprovalStepStateConfig; label: string }

/** The user's document statuses — the engine's default map, shown pre-filled. */
export const DEFAULT_APPROVAL_STATUSES: ApprovalStatusConfig[] = [
  { code: '0', state: 'pending', label: 'Draft' },
  { code: '1', state: 'current', label: 'Reviewing' },
  { code: '2', state: 'current', label: 'Approving' },
  { code: '3', state: 'rejected', label: 'Rejected' },
  { code: '4', state: 'revised', label: 'Revised' },
  { code: '5', state: 'done', label: 'Approved' },
  { code: '6', state: 'done', label: 'Completed' },
  { code: '7', state: 'skipped', label: 'Canceled' },
  { code: '8', state: 'skipped', label: 'Expired' },
  { code: '9', state: 'done', label: 'Renewed' },
]

/**
 * Editable config for an approval line (see the grilled design). Maps onto
 * the engine `ApprovalLineElement`: the raw step rows come from `items` (a
 * page load or the enclosing repeater's item), read through `keys` — each a
 * list of fallback paths, typed one per line — labelled by `roleRules`, and
 * mapped by `statuses` (the defaults are the engine's; exported only when
 * changed). The requester is a fixed first step with its own bindings.
 */
export type ApprovalLineConfig = {
  name: string
  /** `binding`: the rows are `items` (a page load / the repeater item); `endpoint`: the line fetches `read` itself. */
  source: 'binding' | 'endpoint'
  items: ItemBinding
  read: FormListCrudRef
  /** Dot path from the response to the request record (engine `api.paths`). */
  recordPath: string
  /** Dot path from the record to the step rows (engine `stepsPath`); empty = the record is the list. */
  stepsPath: string
  keys: ApprovalLineKeyConfig
  roleRules: ApprovalRoleRuleConfig[]
  statuses: ApprovalStatusConfig[]
  requesterEnabled: boolean
  requesterName: string
  requesterNameBinding: ItemBinding
  requesterJobTitle: string
  requesterJobTitleBinding: ItemBinding
  requesterRole: string
  /** Endpoint mode: paths into the fetched record (fallbacks, like the keys). */
  requesterNamePath: string[]
  requesterJobTitlePath: string[]
  requesterPersonIdPath: string[]
  requesterAvatarPath: string[]
  /** `{{personId}}` template; `''` = initials only. */
  avatarUrl: string
  orientation: 'horizontal' | 'vertical'
  size: 'sm' | 'md' | 'lg'
  showJobTitle: boolean
  showIndex: boolean
  stepMinWidth: number | ''
  verticalBelow: '' | 'sm' | 'md'
  emptyText: string
}

/** The user's row shape — the defaults so a dropped line already reads the document system's rows. */
export function createDefaultApprovalLineConfig(name: string): ApprovalLineConfig {
  return {
    name,
    source: 'binding',
    items: null,
    read: createFormListCrudRef(),
    recordPath: 'data',
    stepsPath: 'steps',
    keys: {
      name: ['ApproverUser.FullNameEN', 'ReviewerUser.FullNameEN'],
      status: ['Status'],
      jobTitle: ['ApproverUser.JobTitle', 'ReviewerUser.JobTitle'],
      personId: ['ApproverUser.PersonId', 'ReviewerUser.PersonId'],
      avatar: [],
      role: [],
      remark: ['Remark'],
      date: ['Model.UpdatedAt'],
      sequence: ['Sequence'],
    },
    roleRules: [
      { id: 'rule-reviewer', path: 'ReviewerUser', sequence: '', role: 'Reviewer' },
      { id: 'rule-acknowledge', path: 'ApproverUser', sequence: '1', role: 'Acknowledge' },
      { id: 'rule-approver', path: 'ApproverUser', sequence: '', role: 'Approver' },
    ],
    statuses: DEFAULT_APPROVAL_STATUSES.map((s) => ({ ...s })),
    requesterEnabled: true,
    requesterName: 'Requester',
    requesterNameBinding: null,
    requesterJobTitle: '',
    requesterJobTitleBinding: null,
    requesterRole: 'Requester',
    requesterNamePath: ['requester.FullNameEN'],
    requesterJobTitlePath: ['requester.JobTitle'],
    requesterPersonIdPath: ['requester.PersonId'],
    requesterAvatarPath: [],
    avatarUrl: '',
    orientation: 'horizontal',
    size: 'md',
    showJobTitle: false,
    showIndex: true,
    stepMinWidth: '',
    verticalBelow: '',
    emptyText: '',
  }
}

/** One role of a workflow editor (engine `WorkflowRole`; `max` / `position` as studio "unset" idioms). */
export type WorkflowRoleConfig = { id: string; value: string; label: string; max: number | ''; position: '' | 'first' | 'last' }

/** The dialog's user list: an endpoint walked along `paths` to the user rows, read with these keys. */
export type WorkflowUsersConfig = {
  endpointId: string | null
  paths: string
  idKey: string
  displayKey: string
  subtitleKey: string
  avatarKey: string
  searchKey: string
}

/**
 * Editable config for a workflow editor (see the grilled design). Maps onto
 * the engine `WorkflowEditorElement`: the field (`name`, required ⇒ at least
 * one step), the roles with their rules, the dialog's user source, the saved
 * step field names (`stepKeys`, the engine defaults pre-filled) and the
 * dialog labels (exported only when changed).
 */
export type WorkflowEditorConfig = {
  name: string
  label: string
  helperText: string
  isRequired: boolean
  errorMessage: string
  roles: WorkflowRoleConfig[]
  users: WorkflowUsersConfig
  stepKeys: { role: string; sequence: string; incharge: string; cc: string }
  minInchargeUsers: number | ''
  allowDuplicateUsers: boolean
  labels: { add: string; dialogTitle: string; editTitle: string; roleField: string; incharge: string; cc: string; userPlaceholder: string }
  disabled: boolean
}

export const DEFAULT_WORKFLOW_LABELS: WorkflowEditorConfig['labels'] = {
  add: 'Add Line Approval',
  dialogTitle: 'Add Line Approval',
  editTitle: 'Edit Line Approval',
  roleField: 'Action Type',
  incharge: 'Incharge Person',
  cc: 'CC Person',
  userPlaceholder: 'Add User',
}

/** The user's e-memo roles — Inputter once and first, then approvers and acknowledgers. */
export function createDefaultWorkflowEditorConfig(name: string): WorkflowEditorConfig {
  return {
    name,
    label: 'Line Approval',
    helperText: '',
    isRequired: true,
    errorMessage: 'Add at least one step',
    roles: [
      { id: 'role-inputter', value: 'inputter', label: 'Inputter', max: 1, position: 'first' },
      { id: 'role-approver', value: 'approver', label: 'Approver', max: '', position: '' },
      { id: 'role-acknowledger', value: 'acknowledger', label: 'Acknowledger', max: '', position: '' },
    ],
    users: { endpointId: null, paths: 'data', idKey: '', displayKey: '', subtitleKey: '', avatarKey: '', searchKey: '' },
    stepKeys: { role: 'actionType', sequence: 'sequence', incharge: 'inchargeUsers', cc: 'ccUsers' },
    minInchargeUsers: '',
    allowDuplicateUsers: false,
    labels: { ...DEFAULT_WORKFLOW_LABELS },
    disabled: false,
  }
}

/** One tab header. The tab's content is the child canvas at the same index in
 * the item's `childCanvases` (kept aligned by the store's tab actions). */
export type TabItemConfig = {
  label: string
  value: string
}

/**
 * Editable config for a tab widget. The inspector manages the header list
 * (add/remove — see the grilled design); each tab's content is authored by
 * drilling into its child canvas. `defaultValue` picks the initially active tab
 * (`''` = the first).
 */
export type TabConfig = {
  tabs: TabItemConfig[]
  defaultValue: string
}

/** Defaults for a freshly dropped tab: two starter tabs. The store seeds one
 * child canvas per entry. */
export function createDefaultTabConfig(): TabConfig {
  return {
    tabs: [
      { label: 'Tab 1', value: 'tab_1' },
      { label: 'Tab 2', value: 'tab_2' },
    ],
    defaultValue: '',
  }
}

/**
 * Editable config for a modal. Maps onto the engine's `ModalElement` minus the
 * nested `container` (the item's child canvas). The trigger is a full
 * `ButtonConfig` (a modal's trigger is a `ButtonElement`); on export it gets
 * `actions: ["OpenModal"]` wired for it. Sizing strings are any CSS length
 * (`''` = unset).
 */
export type ModalConfig = {
  id: string
  title: string
  description: string
  maxWidth: string
  minWidth: string
  maxHeight: string
  trigger: ButtonConfig
}

/** Defaults for a freshly dropped modal. `id` doubles as the engine's modal
 * registry key, so it gets the unique seq name. */
export function createDefaultModalConfig(id: string): ModalConfig {
  return {
    id,
    title: 'Modal',
    description: '',
    maxWidth: '',
    minWidth: '',
    maxHeight: '',
    trigger: { label: 'Open', icon: '', variant: 'contained' },
  }
}

export type DrawerAnchor = 'left' | 'right' | 'top' | 'bottom'

/**
 * Editable config for a drawer (MUI's temporary drawer). Maps onto the
 * engine's `DrawerElement` minus the nested `container` (the item's child
 * canvas). Like the modal, the trigger is a `ButtonConfig` (the engine takes
 * any element; studio authors a button) and `id` is the engine registry key
 * a `CloseModal` button inside it targets. `size` is any CSS length (`''` =
 * the engine default: 360px for left / right, 50vh for top / bottom).
 */
export type DrawerConfig = {
  id: string
  title: string
  description: string
  anchor: DrawerAnchor
  size: string
  hideHeader: boolean
  trigger: ButtonConfig
}

/** Defaults for a freshly dropped drawer; `id` gets the unique seq name. */
export function createDefaultDrawerConfig(id: string): DrawerConfig {
  return {
    id,
    title: 'Drawer',
    description: '',
    anchor: 'right',
    size: '',
    hideHeader: false,
    trigger: { label: 'Open', icon: 'panelRight', variant: 'contained' },
  }
}

/**
 * Editable config for a popover. Maps onto the engine's `PopoverElement` minus
 * the nested `container` (the item's child canvas). The trigger is a mini-Bin;
 * studio restricts it to `button` | `text` (see the grilled design) and carries
 * both configs so switching kinds is lossless. `offset` is the px gap (`''` =
 * the component's 8px default).
 */
export type PopoverConfig = {
  placement:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-start'
    | 'top-end'
    | 'bottom-start'
    | 'bottom-end'
  triggerMode: 'click' | 'hover'
  offset: number | ''
  triggerKind: 'button' | 'text'
  triggerButton: ButtonConfig
  triggerText: TextConfig
}

/** Defaults for a freshly dropped popover. */
export function createDefaultPopoverConfig(): PopoverConfig {
  return {
    placement: 'bottom',
    triggerMode: 'click',
    offset: '',
    triggerKind: 'button',
    triggerButton: { label: 'Open popover', icon: '', variant: 'contained' },
    triggerText: { text: 'Open popover', isLabel: false, binding: null },
  }
}

export type GridContainerSettings = {
  columns: Responsive<number>
  gap: Responsive<string>
  rowGap: Responsive<string>
  columnGap: Responsive<string>
  justifyItems: Responsive<string>
  alignItems: Responsive<string>
  justifyContent: Responsive<string>
  alignContent: Responsive<string>
  gridAutoRows: Responsive<string>
  gridAutoFlow: Responsive<string>
}

export type GridItemSettings = {
  colSpan: Responsive<number>
  colStart: Responsive<number>
  rowSpan: Responsive<number>
  gridArea: Responsive<string>
  justifySelf: Responsive<string>
  alignSelf: Responsive<string>
  order: Responsive<string>
}

export type GridItemData = {
  id: string
  label: string
  /** Which palette component this cell represents (set on drop). */
  type: ComponentType
  settings: GridItemSettings
  /** Inside a data table's modal canvas only: adding / editing visibility (see `ShowWhen`). */
  showWhen?: ShowWhen
  /** Show only while a page-data condition holds (any canvas); `null` / absent = always. */
  dataWhen?: DataCondition | null
  /** Form-bound types: the field's initial value from a page load (`source: 'state'`). */
  initialValue?: ItemBinding
  /**
   * Component-specific config, discriminated by `type`: a textfield carries a
   * `TextFieldConfig`, a textarea a `TextareaConfig`, a select or autocomplete a
   * `SelectFieldConfig` (both preview with `Autocomplete2`), a multiAutocomplete
   * a `MultiAutocompleteConfig` (previews with `MultiAutocompleteBase`), a
   * checkbox a `CheckboxConfig` (previews with `CheckboxBase`), a radio a
   * `RadioConfig` (previews with `RadioButtonBase`), and a datepicker/
   * daterangepicker/datetimepicker a `DateConfig` discriminated by `kind` (previews
   * with `DatePickerBase`/`DateRangePickerBase`/`DateTimePickerBase`), an uploadimage
   * an `UploadImageConfig` (previews with `UploadImageBase`), and an uploadfile an
   * `UploadFileConfig` (previews with `UploadFileBase`), a datatable a
   * `DataTableConfig` (previews with `DataTable2`), and a datatableeditable a
   * `DataTableEditableConfig` (previews with `DataTableEditable`). The display
   * types carry a `TextConfig` / `TypographyConfig` / `AvatarConfig` /
   * `DividerConfig` / `ButtonConfig` (previewing with `Text` / `Typography` /
   * `Avatar` / `Divider` / `ButtonBase`, always live — no width gate), and a
   * hidden a `HiddenConfig` (chip-only; it renders nothing at runtime). Other
   * types are config-less.
   */
  config?:
    | TextFieldConfig
    | TextareaConfig
    | SelectFieldConfig
    | MultiAutocompleteConfig
    | CheckboxConfig
    | SwitchConfig
    | RadioConfig
    | DateConfig
    | UploadImageConfig
    | UploadFileConfig
    | DataTableConfig
    | DataTableEditableConfig
    | FormListConfig
    | RepeaterConfig
    | TextConfig
    | TypographyConfig
    | AvatarConfig
    | DividerConfig
    | ButtonItemConfig
    | HiddenConfig
    | PaperConfig
    | CardConfig
    | HtmlContentConfig
    | CustomComponentConfig
    | ApprovalLineConfig
    | SwitchProfileConfig
    | ReplaceProfileConfig
    | WorkflowEditorConfig
    | ApprovalLineConfig
    | TabConfig
    | ModalConfig
    | DrawerConfig
    | PopoverConfig
    | ContainerConfig
  /**
   * Child canvases for the container-hosting types (see the grilled design:
   * drill-in editing, arbitrary depth). `container`/`paper`/`modal`/`popover`
   * carry exactly one; `tab` carries one per `TabConfig.tabs` entry
   * (index-aligned — the store's tab actions keep them in sync). Absent on every
   * other type.
   */
  childCanvases?: ChildCanvas[]
}

/** One nested canvas: its own items and its own grid settings, mirroring the
 * engine where every `Container` owns its grid config. Recursive — child items
 * can carry canvases of their own. */
export type ChildCanvas = {
  items: GridItemData[]
  settings: GridContainerSettings
}

/** A fresh, empty child canvas with the default grid settings. */
export function createChildCanvas(): ChildCanvas {
  return { items: [], settings: defaultContainerSettings }
}

/**
 * Give every data table (at any depth) its two child canvases — [0] the edit
 * modal, [1] the filter form. Seeds and older workspaces carry tables with
 * none or one; drill-in silently no-ops on a canvas that isn't there.
 * Mutates `items` (callers own a fresh or persisted tree).
 */
export function ensureDataTableCanvases(items: GridItemData[]): void {
  for (const item of items) {
    if (item.type === 'datatable') {
      const canvases = item.childCanvases ?? []
      item.childCanvases = [canvases[0] ?? createChildCanvas(), canvases[1] ?? createChildCanvas()]
    }
    for (const canvas of item.childCanvases ?? []) ensureDataTableCanvases(canvas.items)
  }
}

/** Which palette types host child canvases, and how many they start with. */
export function childCanvasCount(type: ComponentType, config?: GridItemData['config']): number {
  if (type === 'container' || type === 'paper' || type === 'modal' || type === 'drawer' || type === 'popover') return 1
  // Content + the expandable section (the second is exported only while enabled).
  if (type === 'card') return 2
  // A data table's canvases: [0] its edit modal's content (engine
  // `modalContainer`), [1] its filter form (engine `filterContainer`).
  if (type === 'datatable') return 2
  // A form list's canvas is its row template (engine `rowContainer`).
  if (type === 'formlist') return 1
  // A repeater's canvas is its item template (engine `itemContainer`).
  if (type === 'repeater') return 1
  if (type === 'tab') return (config as TabConfig | undefined)?.tabs.length ?? 0
  return 0
}

/** What a button's stable refs can point at, gathered across the whole tree. */
export type ButtonRefTargets = {
  /** Modal and drawer items: grid-item id → the authored engine registry key (`ModalConfig.id` / `DrawerConfig.id`). */
  modals: { itemId: string; modalId: string }[]
  /** (Editable) data tables and form lists: grid-item id → the authored
   * binding `name` (the `fnCtxs` key they register their refetch under). */
  tables: { itemId: string; name: string }[]
  /** Data tables only (what `ExportTable` can download). Optional for callers that build targets by hand. */
  dataTables?: { itemId: string; name: string }[]
}

/**
 * Walk the ROOT items (recursing through `childCanvases`) collecting the
 * modal / table targets a button can reference — a Save button lives *inside*
 * its modal's child canvas, so enumeration must be cross-canvas. Used by the
 * button inspector's dropdowns and by the export's id → name resolution.
 */
export function collectButtonTargets(items: GridItemData[]): ButtonRefTargets {
  const modals: ButtonRefTargets['modals'] = []
  const tables: ButtonRefTargets['tables'] = []
  const dataTables: NonNullable<ButtonRefTargets['dataTables']> = []
  const walk = (list: GridItemData[]) => {
    for (const item of list) {
      if ((item.type === 'modal' || item.type === 'drawer') && item.config) {
        modals.push({ itemId: item.id, modalId: (item.config as ModalConfig | DrawerConfig).id })
      } else if (
        (item.type === 'datatable' ||
          item.type === 'datatableeditable' ||
          item.type === 'formlist' ||
          (item.type === 'repeater' &&
            (item.config as RepeaterConfig | undefined)?.source === 'endpoint')) &&
        item.config
      ) {
        tables.push({ itemId: item.id, name: (item.config as { name: string }).name })
        if (item.type === 'datatable') dataTables.push({ itemId: item.id, name: (item.config as { name: string }).name })
      }
      item.childCanvases?.forEach((canvas) => walk(canvas.items))
    }
  }
  walk(items)
  return { modals, tables, dataTables }
}

function responsive<T>(value: T): Responsive<T> {
  return { xs: value, sm: value, md: value, lg: value }
}

function responsiveNumbers(values: Partial<Responsive<number>> & { xs: number }): Responsive<number> {
  return {
    xs: values.xs,
    sm: values.sm ?? values.xs,
    md: values.md ?? values.sm ?? values.xs,
    lg: values.lg ?? values.md ?? values.sm ?? values.xs,
  }
}

export const defaultContainerSettings: GridContainerSettings = {
  columns: responsiveNumbers({ xs: 4, sm: 6, md: 8, lg: 12 }),
  gap: responsive('16px'),
  rowGap: responsive(''),
  columnGap: responsive(''),
  justifyItems: responsive('stretch'),
  alignItems: responsive('stretch'),
  justifyContent: responsive('start'),
  alignContent: responsive('start'),
  gridAutoRows: responsive('minmax(56px, auto)'),
  gridAutoFlow: responsive('row'),
}

export const defaultItemSettings: GridItemSettings = {
  colSpan: responsiveNumbers({ xs: 4, sm: 3, md: 2, lg: 2 }),
  colStart: responsiveNumbers({ xs: 0, sm: 0, md: 0, lg: 0 }),
  rowSpan: responsiveNumbers({ xs: 1, sm: 1, md: 1, lg: 1 }),
  gridArea: responsive(''),
  justifySelf: responsive('stretch'),
  alignSelf: responsive('stretch'),
  order: responsive('0'),
}

export function createDefaultItemSettings(
  overrides?: Partial<GridItemSettings>,
): GridItemSettings {
  return {
    ...defaultItemSettings,
    ...overrides,
    colSpan: { ...defaultItemSettings.colSpan, ...overrides?.colSpan },
    colStart: { ...defaultItemSettings.colStart, ...overrides?.colStart },
    rowSpan: { ...defaultItemSettings.rowSpan, ...overrides?.rowSpan },
    gridArea: { ...defaultItemSettings.gridArea, ...overrides?.gridArea },
    justifySelf: { ...defaultItemSettings.justifySelf, ...overrides?.justifySelf },
    alignSelf: { ...defaultItemSettings.alignSelf, ...overrides?.alignSelf },
    order: { ...defaultItemSettings.order, ...overrides?.order },
  }
}

/* ------------------------------------------------------ profile elements */

/**
 * Paths into one profile record — a fallback list per key, tried top to
 * bottom (the engine `ProfileKeys`); an empty list keeps the engine default,
 * which fits the default user-profile shape.
 */
export type ProfileKeysConfig = {
  personId: string[]
  /** Unique per profile (one person holds several). */
  userId: string[]
  name: string[]
  /** `{{path}}` template for the display name; `''` = the engine default (`{{firstNameEn}} {{lastNameEN}}`). */
  nameTemplate: string
  jobTitle: string[]
  company: string[]
  department: string[]
  email: string[]
  avatar: string[]
  /** The primary-assignment flag (`Y` / `true` / `1`): the profile picked when nobody chose one. */
  primary: string[]
}

export const PROFILE_KEY_ROWS: { key: Exclude<keyof ProfileKeysConfig, 'nameTemplate'>; label: string }[] = [
  { key: 'personId', label: 'Person id' },
  { key: 'userId', label: 'Profile id (unique per profile)' },
  { key: 'name', label: 'Name (when no template)' },
  { key: 'jobTitle', label: 'Job title' },
  { key: 'company', label: 'Company' },
  { key: 'department', label: 'Department / unit' },
  { key: 'email', label: 'Email' },
  { key: 'avatar', label: 'Avatar URL' },
  { key: 'primary', label: 'Primary assignment flag' },
]

export function createDefaultProfileKeysConfig(): ProfileKeysConfig {
  return {
    personId: ['personId'],
    userId: ['userId'],
    name: [],
    nameTemplate: '',
    jobTitle: ['jobTitle'],
    company: ['companyModel.name'],
    department: ['businessUnitModel.name'],
    email: ['email'],
    avatar: [],
    primary: ['isPrimaryAssignment'],
  }
}

/** What the two profile elements share (the engine `ProfileSessionElement`). */
export type ProfileSessionConfig = {
  name: string
  /** The global-state slice holding the active profile; `''` = the engine default `profile`. */
  stateKey: string
  /** The logged-in profile (a page load), seeding the slice while it is empty. */
  initial: ItemBinding
  keys: ProfileKeysConfig
  /** Remember the choice (a switch in localStorage, a replacement in sessionStorage). */
  persist: boolean
  /** Names registered for reload (tables, lists, page loads) refetched after the profile changes. */
  reload: string[]
  /** Where to go after the profile changes; null = stay. */
  navigate: StudioNavigate | null
}

/**
 * Editable config for a Switch Profile list: the active person's profiles
 * from `read` (drilled by `readPaths`; the person id fills `personParam`),
 * the active one checked.
 */
export type SwitchProfileConfig = ProfileSessionConfig & {
  read: FormListCrudRef
  readPaths: string
  /** The URL `:param` the element fills with the active person's id; `''` = the endpoint's only one. */
  personParam: string
  title: string
  emptyText: string
  hideWhenSingle: boolean
  /** A list with the active row checked, or a dropdown (value = userId, label = job title). */
  display: SwitchProfileDisplay
  /** Show "company · department" after the job title. */
  showSubtitle: boolean
}

export type SwitchProfileDisplay = 'list' | 'dropdown'

/**
 * Editable config for a Replace Profile trigger + dialog: people `search`
 * (the typed text in `searchParam`), the picked person's profiles from
 * `read`, who may replace (a page-data condition), the trigger button and
 * the dialog's texts.
 */
export type ReplaceProfileConfig = ProfileSessionConfig & {
  search: FormListCrudRef
  searchPaths: string
  /** The query key receiving the typed text; `''` = `search`. */
  searchParam: string
  /** `''` = 300. */
  debounceMs: number | ''
  read: FormListCrudRef
  readPaths: string
  personParam: string
  /** Who may replace, over the page's loads; null = everyone. */
  canReplace: DataCondition | null
  trigger: ButtonConfig
  title: string
  description: string
  placeholder: string
  confirmLabel: string
  cancelLabel: string
  returnLabel: string
  emptyText: string
  showBanner: boolean
}

export const DEFAULT_REPLACE_TRIGGER: ButtonConfig = { label: 'Replace profile', icon: 'userCog', variant: 'contained' }

function createDefaultProfileSessionConfig(name: string): ProfileSessionConfig {
  return { name, stateKey: '', initial: null, keys: createDefaultProfileKeysConfig(), persist: true, reload: [], navigate: null }
}

export function createDefaultSwitchProfileConfig(name: string): SwitchProfileConfig {
  return {
    ...createDefaultProfileSessionConfig(name),
    read: createFormListCrudRef(),
    readPaths: 'data',
    personParam: '',
    title: '',
    emptyText: '',
    hideWhenSingle: true,
    display: 'list',
    showSubtitle: true,
  }
}

export function createDefaultReplaceProfileConfig(name: string): ReplaceProfileConfig {
  return {
    ...createDefaultProfileSessionConfig(name),
    search: createFormListCrudRef(),
    searchPaths: 'data',
    searchParam: '',
    debounceMs: '',
    read: createFormListCrudRef(),
    readPaths: 'data',
    personParam: '',
    canReplace: null,
    trigger: { ...DEFAULT_REPLACE_TRIGGER },
    title: '',
    description: '',
    placeholder: '',
    confirmLabel: '',
    cancelLabel: '',
    returnLabel: '',
    emptyText: '',
    showBanner: true,
  }
}
