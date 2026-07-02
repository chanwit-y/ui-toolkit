import { MAX_GRID_COLUMNS } from './breakpoints'
import { MISSING_OBSERVE_TARGET, observeContext, type ObserveContext } from './observe'
import { createChildCanvas } from './types'
import type {
  AvatarConfig,
  ButtonConfig,
  CheckboxConfig,
  ChildCanvas,
  DataTableConfig,
  DataTableEditableColumnConfig,
  DataTableEditableConfig,
  DateConfig,
  DividerConfig,
  GridContainerSettings,
  GridItemData,
  HiddenConfig,
  ModalConfig,
  PaperConfig,
  PopoverConfig,
  RadioConfig,
  SelectFieldConfig,
  TabConfig,
  TextareaConfig,
  TextConfig,
  TextFieldConfig,
  TypographyConfig,
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
 * share one kind-discriminated `DateConfig`), `uploadimage`, `uploadfile`,
 * `datatable`, `datatableeditable`, the display types (`typography`, `avatar`,
 * `divider`, `button` — the button emits a skeleton `actions: []`), and `hidden`,
 * and omitted for every other type. The multi
 * field's `maxSelections`/`showSelectedCount` are studio-preview-only and not emitted
 * (the engine's `AutocompleteElement` has no home for them), as is the datatable's
 * `canSearchAllColumns` (the engine hardcodes search on). The studio `xs`
 * breakpoint is dropped (the engine starts at `sm`) and `xl` mirrors `lg`.
 */

/**
 * Emitted for an endpoint ref whose endpoint was deleted on the API page (or
 * renamed to empty). The name can't exist in the exported `api`, so the pasted
 * config fails loudly instead of silently fetching nothing. Mirrors the API
 * page's MISSING_MODEL.
 */
export const MISSING_ENDPOINT = 'MISSING_ENDPOINT'

/** The slice of an API page endpoint the serializer needs (id → name). */
export type EndpointRef = { id: string; name: string }

/** id → current endpoint name; `undefined` for an unset (null) ref, loud
 * `MISSING_ENDPOINT` for a dangling one. */
export type ResolveEndpoint = (id: string | null) => string | undefined

function makeEndpointResolver(endpoints: EndpointRef[]): ResolveEndpoint {
  const byId = new Map(endpoints.map((e) => [e.id, e.name.trim()]))
  return (id) => {
    if (id == null) return undefined
    return byId.get(id) || MISSING_ENDPOINT
  }
}

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
 *
 * The observe trio is derived from `observeContext`, never authored piecemeal:
 * an observer emits `observeTo` plus the `api.params` entry that injects the
 * observed value into its refetch, and any item someone observes publishes via
 * `canObserve: true` (without it the engine's Subject is never created and the
 * cascade fails silently).
 */
function autocompleteElement(
  c: SelectFieldConfig,
  observe: ObserveContext,
  resolveEndpoint: ResolveEndpoint,
): Record<string, unknown> {
  return {
    name: c.name,
    dataType: normalizeDataType(c.dataType),
    label: c.label,
    isRequired: c.isRequired,
    errorMessage: c.errorMessage,
    canObserve: observe.isObserved,
    observeTo: observe.observedName ?? (observe.isDangling ? MISSING_OBSERVE_TARGET : ''),
    isSingleLoad: false,
    keys: { id: c.idKey, search: c.searchKey, display: c.displayKey },
    defaultData: {},
    options: c.options,
    ...(c.mode === 'source'
      ? {
          api: {
            // Endpoint ref resolved id → current name ('' when never picked).
            name: resolveEndpoint(c.dataSource.endpointId) ?? '',
            ...(() => {
              const paths = c.dataSource.paths
                .split('.')
                .map((s) => s.trim())
                .filter(Boolean)
              return paths.length ? { paths } : {}
            })(),
            // Param key = observed element's name, matching the example config:
            // params: { regionId: { type: "observe", key: "regionId" } }
            ...(observe.observedName
              ? {
                  params: {
                    [observe.observedName]: { type: 'observe', key: observe.observedName },
                  },
                }
              : {}),
          },
        }
      : {}),
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
 * so the JSON is self-documenting; empty `useDateFormat` drops). The `api` block
 * emits when an endpoint is picked (resolved id → name, plus the optional
 * response `paths`); unwired tables omit it for the consumer, as before. The
 * `modalContainer`/sizing block is never emitted — studio can't author it.
 * `canSearchAllColumns` is studio-preview-only (the engine hardcodes search on)
 * and isn't emitted either.
 */
function dataTableElement(
  c: DataTableConfig,
  resolveEndpoint: ResolveEndpoint,
): Record<string, unknown> {
  const apiName = resolveEndpoint(c.endpointId)
  const paths = c.apiPaths
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean)
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
    ...(apiName ? { api: { name: apiName, ...(paths.length ? { paths } : {}) } } : {}),
    canEdit: c.canEdit,
    canDelete: c.canDelete,
  }
}

/**
 * One editable-table column → engine `DataTableEditableColumn`. `editor` and
 * `editable` are always explicit (like `align` — the JSON self-documents without
 * knowing the engine defaults). Only editor-relevant extras emit: `options` for
 * `select`, a `validation` block built from `min`/`max` (number),
 * `minLength`/`maxLength`/`pattern`/`patternMessage` (text), and
 * `requiredMessage` (when required) — everything else is carried in studio but
 * dropped here. The `validate` fn, `size`, and `defaultValue` aren't authorable.
 */
function editableTableColumn(col: DataTableEditableColumnConfig): Record<string, unknown> {
  const validation: Record<string, unknown> = {}
  if (col.isRequired && col.requiredMessage) validation.requiredMessage = col.requiredMessage
  if (col.editor === 'number') {
    if (col.min !== '') validation.min = col.min
    if (col.max !== '') validation.max = col.max
  }
  if (col.editor === 'text') {
    if (col.minLength !== '') validation.minLength = col.minLength
    if (col.maxLength !== '') validation.maxLength = col.maxLength
    if (col.pattern) {
      validation.pattern = col.pattern
      if (col.patternMessage) validation.patternMessage = col.patternMessage
    }
  }
  return {
    accessorKey: col.accessorKey,
    header: col.header,
    editable: col.editable,
    editor: col.editor,
    ...(col.editor === 'select' && col.options.length > 0 ? { options: col.options } : {}),
    isRequired: col.isRequired,
    enableSorting: col.enableSorting,
    enableColumnFilter: col.enableColumnFilter,
    align: col.align,
    ...(Object.keys(validation).length > 0 ? { validation } : {}),
  }
}

/**
 * `datatableeditable` → engine `DataTableEditableElement`. `apiCrud` refs emit
 * the picked endpoint's resolved name; an unset ref keeps the empty-name
 * skeleton — `read` always exists (it's required and the engine throws until it
 * resolves, so the stub fails loudly rather than looking wired), and
 * `create`/`update`/`delete` per their action toggles, since the component
 * shows an action only when its API is set. The consumer fills in any unset
 * names (and params/snackbar/confirmBox chrome) when wiring the Bin.
 */
function dataTableEditableElement(
  c: DataTableEditableConfig,
  resolveEndpoint: ResolveEndpoint,
): Record<string, unknown> {
  const ref = (id: string | null) => ({ name: resolveEndpoint(id) ?? '' })
  return {
    name: c.name,
    title: c.title,
    idKey: c.idKey,
    columns: c.columns.map(editableTableColumn),
    apiCrud: {
      read: ref(c.readEndpointId),
      ...(c.canCreate ? { create: ref(c.createEndpointId) } : {}),
      ...(c.canUpdate ? { update: ref(c.updateEndpointId) } : {}),
      ...(c.canDelete ? { delete: ref(c.deleteEndpointId) } : {}),
    },
  }
}

/** `text` → engine `TextElement`. Content plus the label-styling flag. */
function textElement(c: TextConfig): Record<string, unknown> {
  return { text: c.text, isLabel: c.isLabel }
}

/**
 * `typography` → engine `TypographyElement` — the curated authorable slice
 * (see the grilled design). `variant` always emits; the `''` overrides
 * (`weight`/`color`/`align`/`href`) drop so the variant's own styling rules, and
 * `truncate` emits only when on. The unauthored props (component/transform/
 * decoration/noWrap/tooltip trio) stay hand-editable in the exported JSON.
 */
function typographyElement(c: TypographyConfig): Record<string, unknown> {
  return {
    text: c.text,
    variant: c.variant,
    ...(c.truncate ? { truncate: true } : {}),
    ...omitEmpty({ weight: c.weight, color: c.color, align: c.align, href: c.href }),
  }
}

/** `avatar` → engine `AvatarElement`. `size` always emits (self-documenting like
 * `align`); empty `src`/`alt`/`fallback` drop — an src-less avatar renders its
 * fallback at runtime exactly as in the preview. */
function avatarElement(c: AvatarConfig): Record<string, unknown> {
  return {
    name: c.name,
    size: c.size,
    ...omitEmpty({ src: c.src, alt: c.alt, fallback: c.fallback }),
  }
}

/** `divider` → engine `DividerElement`. `variant` always emits; `spacing` drops
 * when unset (component default 8px). */
function dividerElement(c: DividerConfig): Record<string, unknown> {
  return {
    variant: c.variant,
    ...(c.spacing === '' ? {} : { spacing: c.spacing }),
  }
}

/**
 * `button` → engine `ButtonElement`. Only the visual slice is authorable; the
 * required `actions` emits as an empty skeleton the consumer fills in (mirroring
 * the editable table's empty-name `apiCrud` stubs — a bare button does nothing,
 * so the stub can't silently look wired). `api`/`confirmBox`/snackbars/`modalId`
 * are likewise consumer-side.
 */
function buttonElement(c: ButtonConfig): Record<string, unknown> {
  return {
    label: c.label,
    ...(c.icon ? { icon: c.icon } : {}),
    actions: [],
  }
}

/** `hidden` → engine `HiddenElement` — just the form binding. */
function hiddenElement(c: HiddenConfig): Record<string, unknown> {
  return { name: c.name, dataType: c.dataType }
}

/**
 * A child canvas → engine `Container`. The nested bins recurse through
 * `buildBins`; the canvas's own lg grid settings map onto the Container's
 * single-value grid props (the engine Container isn't responsive for these,
 * mirroring how the live-preview wrapper collapses onto lg). `name` doubles as
 * `id` — derived from the host item so it's stable and unique.
 */
function toEngineContainer(
  canvas: ChildCanvas,
  name: string,
  endpoints: EndpointRef[],
): Record<string, unknown> {
  const s = canvas.settings
  return {
    id: name,
    name,
    isArray: false,
    bins: buildBins(canvas.settings, canvas.items, endpoints),
    ...(s.gap.lg !== '' ? { gap: s.gap.lg } : {}),
    ...(s.justifyItems.lg !== '' ? { justifyItems: s.justifyItems.lg } : {}),
    ...(s.alignItems.lg !== '' ? { alignItems: s.alignItems.lg } : {}),
    ...(s.justifyContent.lg !== '' ? { justifyContent: s.justifyContent.lg } : {}),
    ...(s.alignContent.lg !== '' ? { alignContent: s.alignContent.lg } : {}),
    ...(s.gridAutoFlow.lg !== '' ? { gridAutoFlow: s.gridAutoFlow.lg } : {}),
  }
}

/** Stable, readable name for a nested container, derived from its host item. */
function childContainerName(item: GridItemData, suffix = ''): string {
  return `${item.type}-${item.id.slice(0, 8)}${suffix}`
}

/** A host item's child canvas at `index`, or an empty stand-in (a tab header
 * without its canvas — shouldn't happen, but the export must stay total). */
function childCanvasAt(item: GridItemData, index: number): ChildCanvas {
  return item.childCanvases?.[index] ?? createChildCanvas()
}

/** `paper` → engine `PaperElement`: surface styling + the nested container. */
function paperElement(
  c: PaperConfig,
  item: GridItemData,
  endpoints: EndpointRef[],
): Record<string, unknown> {
  return {
    container: toEngineContainer(childCanvasAt(item, 0), childContainerName(item), endpoints),
    elevation: c.elevation,
    variant: c.variant,
    ...(c.square ? { square: true } : {}),
  }
}

/** `tab` → engine `TabElement`: one `{label, value, container}` per authored
 * tab (child canvases are index-aligned by the store). */
function tabElement(
  c: TabConfig,
  item: GridItemData,
  endpoints: EndpointRef[],
): Record<string, unknown> {
  return {
    tabs: c.tabs.map((tab, i) => ({
      label: tab.label,
      value: tab.value,
      container: toEngineContainer(
        childCanvasAt(item, i),
        childContainerName(item, `-${i}`),
        endpoints,
      ),
    })),
    ...(c.defaultValue ? { defaultValue: c.defaultValue } : {}),
  }
}

/**
 * `modal` → engine `ModalElement`. The trigger is a `ButtonElement` with the
 * authored visuals and an empty `actions` skeleton — the engine's Modal wraps
 * the trigger in its own open logic, so no action wiring is needed to open it.
 */
function modalElement(
  c: ModalConfig,
  item: GridItemData,
  endpoints: EndpointRef[],
): Record<string, unknown> {
  return {
    id: c.id,
    title: c.title,
    container: toEngineContainer(childCanvasAt(item, 0), childContainerName(item), endpoints),
    trigger: buttonElement(c.trigger),
    ...omitEmpty({
      description: c.description,
      maxWidth: c.maxWidth,
      minWidth: c.minWidth,
      maxHeight: c.maxHeight,
    }),
  }
}

/**
 * `popover` → engine `PopoverElement`. The trigger is the engine's mini-Bin
 * (`{type, element}`) — studio authors the button | text subset.
 */
function popoverElement(
  c: PopoverConfig,
  item: GridItemData,
  endpoints: EndpointRef[],
): Record<string, unknown> {
  return {
    container: toEngineContainer(childCanvasAt(item, 0), childContainerName(item), endpoints),
    trigger:
      c.triggerKind === 'button'
        ? { type: 'button', element: buttonElement(c.triggerButton) }
        : { type: 'text', element: textElement(c.triggerText) },
    placement: c.placement,
    triggerMode: c.triggerMode,
    ...(c.offset === '' ? {} : { offset: c.offset }),
  }
}

/** The element for a Bin, or undefined for types without a mapped element.
 * `items` supplies the cross-item context the observe wiring resolves against;
 * `endpoints`/`resolveEndpoint` resolve API page refs (id → current name). */
function buildElement(
  item: GridItemData,
  items: GridItemData[],
  endpoints: EndpointRef[],
  resolveEndpoint: ResolveEndpoint,
): Record<string, unknown> | undefined {
  switch (item.type) {
    case 'textfield':
      return item.config ? textFieldElement(item.config as TextFieldConfig) : undefined
    case 'textarea':
      return item.config ? textareaElement(item.config as TextareaConfig) : undefined
    case 'select':
    case 'autocomplete':
    case 'multiAutocomplete':
      return item.config
        ? autocompleteElement(
            item.config as SelectFieldConfig,
            observeContext(item, items),
            resolveEndpoint,
          )
        : undefined
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
      return item.config
        ? dataTableElement(item.config as DataTableConfig, resolveEndpoint)
        : undefined
    case 'datatableeditable':
      return item.config
        ? dataTableEditableElement(item.config as DataTableEditableConfig, resolveEndpoint)
        : undefined
    case 'text':
      // Config-less fallback keeps the pre-config behavior (label as content).
      return item.config
        ? textElement(item.config as TextConfig)
        : { text: item.label, isLabel: true }
    case 'typography':
      return item.config ? typographyElement(item.config as TypographyConfig) : undefined
    case 'avatar':
      return item.config ? avatarElement(item.config as AvatarConfig) : undefined
    case 'divider':
      return item.config ? dividerElement(item.config as DividerConfig) : undefined
    case 'button':
      return item.config ? buttonElement(item.config as ButtonConfig) : undefined
    case 'hidden':
      return item.config ? hiddenElement(item.config as HiddenConfig) : undefined
    case 'paper':
      return item.config
        ? paperElement(item.config as PaperConfig, item, endpoints)
        : undefined
    case 'tab':
      return item.config ? tabElement(item.config as TabConfig, item, endpoints) : undefined
    case 'modal':
      return item.config
        ? modalElement(item.config as ModalConfig, item, endpoints)
        : undefined
    case 'popover':
      return item.config
        ? popoverElement(item.config as PopoverConfig, item, endpoints)
        : undefined
    default:
      return undefined
  }
}

/** Build the `Bin[]` (plain objects) for the whole canvas. `endpoints` is the
 * API page's list, threaded through so refs resolve id → current name. */
export function buildBins(
  container: GridContainerSettings,
  items: GridItemData[],
  endpoints: EndpointRef[],
): Record<string, unknown>[] {
  const cols = container.columns
  const resolveEndpoint = makeEndpointResolver(endpoints)
  return items.map((item) => {
    const span = item.settings.colSpan
    const lg = toBoxRange(span.lg, cols.lg)
    const element = buildElement(item, items, endpoints, resolveEndpoint)
    // A plain `container` Bin nests via the Bin-level `container` key (not an
    // element) — the engine renders it as a nested grid.
    const nested =
      item.type === 'container'
        ? toEngineContainer(childCanvasAt(item, 0), childContainerName(item), endpoints)
        : undefined
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
      ...(nested ? { container: nested } : {}),
    }
  })
}

export function gridConfigToJson(
  container: GridContainerSettings,
  items: GridItemData[],
  endpoints: EndpointRef[],
): string {
  return JSON.stringify(buildBins(container, items, endpoints), null, 2)
}
