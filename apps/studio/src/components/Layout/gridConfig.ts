import { MAX_GRID_COLUMNS } from './breakpoints'
import type {
  CheckboxConfig,
  DataTableConfig,
  DateConfig,
  GridContainerSettings,
  GridItemData,
  RadioConfig,
  SelectFieldConfig,
  TextareaConfig,
  TextFieldConfig,
  UploadApiSettings,
  UploadFileConfig,
  UploadImageConfig,
} from './types'

/**
 * Serializes the studio canvas into the declarative engine's `Bin[]` shape — the
 * same structure as `apps/example/src/config/country/container.ts`. This is the
 * canonical export shown in the sidebar's code tab.
 *
 * Mapping rules (see the grilled design): every item becomes a Bin frame
 * (`sm/md/lg/xl` 12-col strings, `type`, `justifySelf/alignSelf`); `element` is
 * populated for `textfield`, `text`, `textarea`, `select` (emitted as engine type
 * `autocomplete`), `autocomplete`, `multiAutocomplete` (both keep their type and
 * share the autocomplete element shape), `checkbox`, `radio`, and the three date
 * pickers (`datepicker`/`daterangepicker`/`datetimepicker`, which keep their type and
 * share one kind-discriminated `DateConfig`), `uploadimage`, `uploadfile`, and
 * `datatable`, and omitted for every other type. The multi
 * field's `maxSelections`/`showSelectedCount` are studio-preview-only and not emitted
 * (the engine's `AutocompleteElement` has no home for them), as is the datatable's
 * `canSearchAllColumns` (the engine hardcodes search on). The studio `xs`
 * breakpoint is dropped (the engine starts at `sm`) and `xl` mirrors `lg`.
 */

/** Engine dataType convention: studio's `'text'` is the engine's `'string'`. */
function normalizeDataType(dataType: string): string {
  return dataType === 'text' ? 'string' : dataType
}

/**
 * Convert a studio column span (a count relative to that breakpoint's column
 * total) into the engine's out-of-12 string. e.g. span 3 of 6 columns → "6".
 */
function toBoxRange(span: number, columns: number): string {
  const cols = columns > 0 ? columns : MAX_GRID_COLUMNS
  const scaled = Math.round((span / cols) * MAX_GRID_COLUMNS)
  return String(Math.min(MAX_GRID_COLUMNS, Math.max(1, scaled)))
}

/** Drop empty-string / unset optionals so the emitted element stays readable. */
function omitEmpty<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as Record<string, unknown>
  for (const [k, v] of Object.entries(obj)) {
    if (v !== '' && v !== undefined) out[k] = v
  }
  return out as T
}

/** `textfield` → engine `TextFieldElement`. The required engine fields (name,
 * dataType, isRequired, errorMessage) are always emitted; empty optionals are
 * dropped. */
function textFieldElement(c: TextFieldConfig): Record<string, unknown> {
  return {
    name: c.name,
    dataType: normalizeDataType(c.dataType),
    label: c.label,
    isRequired: c.isRequired,
    errorMessage: c.errorMessage,
    variant: c.variant,
    size: c.size,
    radius: c.radius,
    isFullWidth: c.isFullWidth,
    isFixedHeight: c.isFixedHeight,
    ...omitEmpty({
      placeholder: c.placeholder,
      helperText: c.helperText,
      width: c.width === '' ? undefined : c.width,
      regex: c.regex,
      regexErrorMessage: c.regexErrorMessage,
    }),
  }
}

/** `textarea` → engine `TextareaElement`. Required engine fields always emitted;
 * empty optionals dropped. */
function textareaElement(c: TextareaConfig): Record<string, unknown> {
  return {
    name: c.name,
    dataType: normalizeDataType(c.dataType),
    label: c.label,
    isRequired: c.isRequired,
    errorMessage: c.errorMessage,
    rows: c.rows,
    resize: c.resize,
    autoResize: c.autoResize,
    showCharCount: c.showCharCount,
    ...omitEmpty({
      placeholder: c.placeholder,
      helperText: c.helperText,
      maxLength: c.maxLength === '' ? undefined : c.maxLength,
    }),
  }
}

/**
 * `select` → engine `AutocompleteElement` (the studio select previews with
 * Autocomplete2). `idKey/searchKey/displayKey` map onto `keys.{id,search,display}`;
 * in `source` mode the data source becomes a minimal `api: { name }`.
 */
function autocompleteElement(c: SelectFieldConfig): Record<string, unknown> {
  return {
    name: c.name,
    dataType: normalizeDataType(c.dataType),
    label: c.label,
    isRequired: c.isRequired,
    errorMessage: c.errorMessage,
    canObserve: false,
    observeTo: '',
    isSingleLoad: false,
    keys: { id: c.idKey, search: c.searchKey, display: c.displayKey },
    defaultData: {},
    options: c.options,
    ...(c.mode === 'source' ? { api: { name: c.dataSource.source } } : {}),
  }
}

/**
 * `checkbox` → engine `CheckboxElement`. `dataType` is mode-derived: a single
 * boolean toggle stores `boolean`, a group stores an array of selected values so
 * it's the engine's `any`. Single mode emits the authored `checked` default (and no
 * `options`/`orientation`); group mode emits `options`/`orientation` (no initial
 * selection). `indeterminate` is studio-preview-only and never emitted.
 */
function checkboxElement(c: CheckboxConfig): Record<string, unknown> {
  const isGroup = c.mode === 'group'
  return {
    name: c.name,
    dataType: isGroup ? 'any' : 'boolean',
    label: c.label,
    isRequired: c.isRequired,
    errorMessage: c.errorMessage,
    variant: c.variant,
    size: c.size,
    ...(isGroup
      ? {
          orientation: c.orientation,
          options: c.options.map((o) => ({
            value: o.value,
            label: o.label,
            ...(o.disabled ? { disabled: true } : {}),
          })),
        }
      : { checked: c.defaultChecked }),
    ...omitEmpty({ helperText: c.helperText }),
  }
}

/**
 * `radio` → engine `RadioElement`. `dataType` is fixed `string` (a radio stores one
 * scalar value). Always emits the static `options` (`value`/`label`, plus `disabled`
 * only when true) and `orientation`; `defaultValue` and `helperText` are dropped when
 * empty. Static-only — no API `source` mode is emitted.
 */
function radioElement(c: RadioConfig): Record<string, unknown> {
  return {
    name: c.name,
    dataType: 'string',
    label: c.label,
    isRequired: c.isRequired,
    errorMessage: c.errorMessage,
    variant: c.variant,
    size: c.size,
    orientation: c.orientation,
    options: c.options.map((o) => ({
      value: o.value,
      label: o.label,
      ...(o.disabled ? { disabled: true } : {}),
    })),
    ...omitEmpty({ helperText: c.helperText, defaultValue: c.defaultValue }),
  }
}

/**
 * `datepicker`/`daterangepicker`/`datetimepicker` → engine `DatePickerElement` /
 * `DateRangePickerElement` / `DateTimePickerElement`, switched on `c.kind`. `dataType`
 * is kind-derived: date/datetime store an ISO `string`, a range stores a `{start,end}`
 * object so it's the engine's `any`. The shared `min`/`max` map to `minDate`/`maxDate`
 * (date, range) or `minDateTime`/`maxDateTime` (datetime), and are dropped when empty.
 * `weekStartsOn` is emitted for date+datetime, `minuteStep` for datetime only; a range
 * emits neither. `displayFormat`, `variant`, `size`, `radius`, and `clearable` always
 * emit; empty `placeholder`/`helperText` are dropped.
 */
function dateElement(c: DateConfig): Record<string, unknown> {
  const base = {
    name: c.name,
    dataType: c.kind === 'range' ? 'any' : 'string',
    label: c.label,
    isRequired: c.isRequired,
    errorMessage: c.errorMessage,
    variant: c.variant,
    size: c.size,
    radius: c.radius,
    clearable: c.clearable,
    displayFormat: c.displayFormat,
    ...omitEmpty({ placeholder: c.placeholder, helperText: c.helperText }),
  }
  if (c.kind === 'datetime') {
    return {
      ...base,
      weekStartsOn: c.weekStartsOn,
      minuteStep: c.minuteStep,
      ...omitEmpty({ minDateTime: c.min, maxDateTime: c.max }),
    }
  }
  if (c.kind === 'range') {
    return {
      ...base,
      ...omitEmpty({ minDate: c.min, maxDate: c.max }),
    }
  }
  return {
    ...base,
    weekStartsOn: c.weekStartsOn,
    ...omitEmpty({ minDate: c.min, maxDate: c.max }),
  }
}

/** Shared `uploadApi` block (emitted only in `'api'` valueFormat). `uploadUrl` is
 * always present; the optional bits drop when empty. */
function uploadApiObject(api: UploadApiSettings): Record<string, unknown> {
  return {
    uploadUrl: api.uploadUrl,
    ...omitEmpty({
      deleteUrl: api.deleteUrl,
      fieldName: api.fieldName,
      responsePath: api.responsePath,
    }),
  }
}

/**
 * `uploadimage` → engine `UploadImageElement`. `dataType` is valueFormat-derived:
 * raw `bytes` is an array so it's the engine's `any`, everything else stores a URL
 * /data-URL `string`. `accept`/`shape`/`previewHeight`/`valueFormat` always emit;
 * empty `helperText`/`maxSizeMB` drop. The `uploadApi` block is emitted only in
 * `'api'` mode.
 */
function uploadImageElement(c: UploadImageConfig): Record<string, unknown> {
  return {
    name: c.name,
    dataType: c.valueFormat === 'bytes' ? 'any' : 'string',
    label: c.label,
    isRequired: c.isRequired,
    errorMessage: c.errorMessage,
    accept: c.accept,
    shape: c.shape,
    previewHeight: c.previewHeight,
    valueFormat: c.valueFormat,
    ...omitEmpty({
      helperText: c.helperText,
      maxSizeMB: c.maxSizeMB === '' ? undefined : c.maxSizeMB,
    }),
    ...(c.valueFormat === 'api' ? { uploadApi: uploadApiObject(c.api) } : {}),
  }
}

/**
 * `uploadfile` → engine `UploadFileElement`. `dataType` is fixed `any` (a file
 * upload stores an array of files). `multiple`/`valueFormat` always emit; `maxFiles`
 * only emits in multi mode, and empty `accept`/`maxSizeMB`/`helperText` drop. The
 * `uploadApi` block is emitted only in `'api'` mode.
 */
function uploadFileElement(c: UploadFileConfig): Record<string, unknown> {
  return {
    name: c.name,
    dataType: 'any',
    label: c.label,
    isRequired: c.isRequired,
    errorMessage: c.errorMessage,
    multiple: c.multiple,
    valueFormat: c.valueFormat,
    ...omitEmpty({
      helperText: c.helperText,
      accept: c.accept,
      maxFiles: c.multiple && c.maxFiles !== '' ? c.maxFiles : undefined,
      maxSizeMB: c.maxSizeMB === '' ? undefined : c.maxSizeMB,
    }),
    ...(c.valueFormat === 'api' ? { uploadApi: uploadApiObject(c.api) } : {}),
  }
}

/**
 * `datatable` → engine `DataTableElement`. Columns map 1:1 (`align` always emitted
 * so the JSON is self-documenting; empty `useDateFormat` drops). The required
 * `api` endpoint reference and the `modalContainer`/sizing block are **not**
 * emitted — studio can't author them, so the consumer wires them when pasting the
 * Bin into a real app. `canSearchAllColumns` is studio-preview-only (the engine
 * hardcodes search on) and isn't emitted either.
 */
function dataTableElement(c: DataTableConfig): Record<string, unknown> {
  return {
    name: c.name,
    title: c.title,
    columns: c.columns.map((col) => ({
      accessor: col.accessor,
      header: col.header,
      enableSorting: col.enableSorting,
      enableColumnFilter: col.enableColumnFilter,
      align: col.align,
      ...(col.useDateFormat ? { useDateFormat: col.useDateFormat } : {}),
    })),
    canEdit: c.canEdit,
    canDelete: c.canDelete,
  }
}

/** The element for a Bin, or undefined for types without a mapped element. */
function buildElement(item: GridItemData): Record<string, unknown> | undefined {
  switch (item.type) {
    case 'textfield':
      return item.config ? textFieldElement(item.config as TextFieldConfig) : undefined
    case 'textarea':
      return item.config ? textareaElement(item.config as TextareaConfig) : undefined
    case 'select':
    case 'autocomplete':
    case 'multiAutocomplete':
      return item.config ? autocompleteElement(item.config as SelectFieldConfig) : undefined
    case 'checkbox':
      return item.config ? checkboxElement(item.config as CheckboxConfig) : undefined
    case 'radio':
      return item.config ? radioElement(item.config as RadioConfig) : undefined
    case 'datepicker':
    case 'daterangepicker':
    case 'datetimepicker':
      return item.config ? dateElement(item.config as DateConfig) : undefined
    case 'uploadimage':
      return item.config ? uploadImageElement(item.config as UploadImageConfig) : undefined
    case 'uploadfile':
      return item.config ? uploadFileElement(item.config as UploadFileConfig) : undefined
    case 'datatable':
      return item.config ? dataTableElement(item.config as DataTableConfig) : undefined
    case 'text':
      return { text: item.label, isLabel: true }
    default:
      return undefined
  }
}

/** Build the `Bin[]` (plain objects) for the whole canvas. */
export function buildBins(
  container: GridContainerSettings,
  items: GridItemData[],
): Record<string, unknown>[] {
  const cols = container.columns
  return items.map((item) => {
    const span = item.settings.colSpan
    const lg = toBoxRange(span.lg, cols.lg)
    const element = buildElement(item)
    return {
      sm: toBoxRange(span.sm, cols.sm),
      md: toBoxRange(span.md, cols.md),
      lg,
      // The engine has no `xs`; `xl` mirrors `lg` (studio's widest breakpoint).
      xl: lg,
      // Studio's `select` is the engine's `autocomplete`; everything else passes through.
      type: item.type === 'select' ? 'autocomplete' : item.type,
      justifySelf: item.settings.justifySelf.lg,
      alignSelf: item.settings.alignSelf.lg,
      ...(element ? { element } : {}),
    }
  })
}

export function gridConfigToJson(
  container: GridContainerSettings,
  items: GridItemData[],
): string {
  return JSON.stringify(buildBins(container, items), null, 2)
}
