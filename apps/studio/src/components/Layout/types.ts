import type { DataType } from '@gummy-ui/ui'
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
  /** Which option-record key holds the stored value (Autocomplete2 `idKey`). */
  idKey: string
  /** Which option-record key is shown in the list/trigger (`displayKey`). */
  displayKey: string
  /** Which option-record key the type-ahead filters on (`searchKey`). */
  searchKey: string
  dataSource: { source: string; valueKey: string; labelKey: string }
}

/**
 * Editable config for a multi-select autocomplete. A superset of `SelectFieldConfig`
 * (it previews with the library's `MultiAutocompleteBase`, which shares the
 * record-array option model) plus the two multi-only knobs the base component adds:
 * `maxSelections` caps how many items can be chosen (`''` = unlimited, mirroring
 * `width`/`maxLength`), and `showSelectedCount` toggles the `(n/max)` label + chip
 * overflow. These two are honored in the studio preview only — the engine's
 * `AutocompleteElement` has no home for them, so they are not emitted to the Bin JSON.
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
    dataSource: { source: '', valueKey: '', labelKey: '' },
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

/**
 * Editable config for a file upload. Maps onto the library's `UploadFileBase` /
 * engine `UploadFileElement`. `accept` is a comma list (e.g. `.pdf,.docx`);
 * `multiple` enables multi-file selection with an optional `maxFiles` cap (`''` =
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
  accept: string
  multiple: boolean
  maxFiles: number | ''
  maxSizeMB: number | ''
  valueFormat: UploadValueFormat
  api: UploadApiSettings
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
 * dataUrl — matching UploadFileBase's own defaults. */
export function createDefaultUploadFileConfig(name: string): UploadFileConfig {
  return {
    name,
    label: 'Upload File',
    helperText: '',
    isRequired: false,
    errorMessage: '',
    accept: '',
    multiple: false,
    maxFiles: '',
    maxSizeMB: '',
    valueFormat: 'dataUrl',
    api: createDefaultUploadApiSettings(),
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
   * `UploadFileConfig` (previews with `UploadFileBase`). Other types are config-less.
   */
  config?:
    | TextFieldConfig
    | TextareaConfig
    | SelectFieldConfig
    | MultiAutocompleteConfig
    | CheckboxConfig
    | RadioConfig
    | DateConfig
    | UploadImageConfig
    | UploadFileConfig
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
