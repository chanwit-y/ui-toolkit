import type { NavigateTarget } from '@gummy-ui/ui'
import { urlParams } from '../Api/warnings'
import { MAX_GRID_COLUMNS } from './breakpoints'
import { MISSING_OBSERVE_TARGET, observeContext, type ObserveContext } from './observe'
import {
  collectButtonTargets,
  createChildCanvas,
  DEFAULT_ADD_BUTTON,
  DEFAULT_CARD_MEDIA_HEIGHT,
  DEFAULT_CELL_LINES,
  DEFAULT_FILTER_BUTTON,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTIONS,
  uploadAccept,
} from './types'
import type {
  AvatarConfig,
  ButtonActionKey,
  ButtonConfig,
  ButtonItemConfig,
  CheckboxConfig,
  ChildCanvas,
  DataTableConfig,
  DataTablePaginationConfig,
  ColumnSizingConfig,
  DataTableSortConfig,
  RequestMapRow,
  RequestSource,
  DataTableEditableColumnConfig,
  DataTableEditableConfig,
  DateConfig,
  DividerConfig,
  FormListConfig,
  FormListCrudRef,
  ItemBinding,
  RepeaterConfig,
  GridContainerSettings,
  GridItemData,
  HiddenConfig,
  ModalConfig,
  MultiAutocompleteConfig,
  NavParamSource,
  PaperConfig,
  CardConfig,
  CardActionConfig,
  HtmlContentConfig,
  PopoverConfig,
  RadioConfig,
  SelectFieldConfig,
  StudioNavigate,
  TabConfig,
  TextareaConfig,
  TextConfig,
  TextFieldConfig,
  TypographyConfig,
  UploadApiSettings,
  UploadFileConfig,
  UploadImageConfig,
} from './types'
import { hasElementStyle, isDesignOnly } from './designTypes'

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
 * `divider`, `button` — standalone buttons emit their authored behavior
 * (actions/confirmBox/api/reloadDataTable/modalId/snackbars) with stable refs
 * resolved id → current name; trigger buttons stay a visual `actions: []`
 * slice), and `hidden`, and omitted for every other type. The multi
 * field's `maxSelections`/`showSelectedCount` are studio-preview-only and not emitted
 * (the engine's `AutocompleteElement` has no home for them). The studio `xs`
 * breakpoint is dropped (the engine starts at `sm`) and `xl` mirrors `lg`.
 */

/**
 * Emitted for an endpoint ref whose endpoint was deleted on the API page (or
 * renamed to empty). The name can't exist in the exported `api`, so the pasted
 * config fails loudly instead of silently fetching nothing. Mirrors the API
 * page's MISSING_MODEL.
 */
export const MISSING_ENDPOINT = 'MISSING_ENDPOINT'

/** The slice of an API page endpoint the serializer needs (id → name, plus the
 * URL so the datatable delete export can prune `params` to the placeholders the
 * endpoint actually has). Both callers pass the full `EndpointDef[]`. */
export type EndpointRef = { id: string; name: string; url?: string }

/** The slice of a project page the serializer needs: stable id → exported
 * `key` (the engine `NavigateTarget.page`). `PageDef` satisfies it. */
export type PageRef = { id: string; key: string }

/** Emitted for a navigation whose page was deleted: `PageRouter` warns on it
 * at mount instead of the config silently pointing nowhere. */
export const MISSING_PAGE = 'MISSING_PAGE'

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

/**
 * Button stable refs (grid-item ids) → current engine names, built once from
 * the ROOT items and threaded through the recursion — a Save button inside a
 * modal's child canvas references the modal item on the root canvas, so
 * canvas-local lookups can't resolve it. A dangling ref (target item deleted)
 * resolves to `undefined` and the key is omitted (emit authored, omit empty —
 * the button renders and the engine skips the missing wiring silently).
 */
type ButtonRefMaps = {
  /** Modal grid-item id → current `ModalConfig.id` (the engine registry key). */
  modalIdByItem: Map<string, string>
  /** Table grid-item id → current binding `name` (the `fnCtxs` refetch key). */
  tableNameByItem: Map<string, string>
  /** Page id → current `key` (the engine `NavigateTarget.page`). */
  pageKeyById: Map<string, string>
}

function makeButtonRefMaps(rootItems: GridItemData[], pages: PageRef[]): ButtonRefMaps {
  const targets = collectButtonTargets(rootItems)
  return {
    modalIdByItem: new Map(targets.modals.map((m) => [m.itemId, m.modalId])),
    tableNameByItem: new Map(targets.tables.map((t) => [t.itemId, t.name])),
    pageKeyById: new Map(pages.map((p) => [p.id, p.key])),
  }
}

/** One studio param source → the engine `DataValue` it stands for, or
 * `undefined` when it names nothing (dropped: emit authored, omit empty). */
export function navParamValue(src: NavParamSource): Record<string, unknown> | undefined {
  switch (src.type) {
    case 'value':
      return src.value === '' ? undefined : { type: 'value', key: 'none', value: src.value }
    case 'url':
      return src.key ? { type: 'url', key: src.key, source: src.source } : undefined
    case 'state':
      return src.key ? { type: 'state', key: src.key, ...(src.path ? { path: src.path } : {}) } : undefined
    case 'row':
      return src.key ? { type: 'row', key: src.key } : undefined
    default:
      return undefined
  }
}

/** A studio request source → the engine `DataValue` (a filter carries its fallback as `value`). */
export function requestSourceValue(src: RequestSource): Record<string, unknown> | undefined {
  if (src.type !== 'filter') return navParamValue(src)
  if (!src.key) return undefined
  return { type: 'filter', key: src.key, ...(src.fallback !== '' ? { value: parseLoose(src.fallback) } : {}) }
}

/** Text authored in a panel → the JSON value it spells (number / boolean / array / object), else the text. */
function parseLoose(text: string): unknown {
  const trimmed = text.trim()
  if (!/^(-?\d|true$|false$|null$|\[|\{)/.test(trimmed)) return text
  try {
    return JSON.parse(trimmed)
  } catch {
    return text
  }
}

/** The request mapping rows → engine `params` / `query` / `body` DataValue maps (empty rows and maps dropped). */
function requestMaps(rows: RequestMapRow[]): Record<string, unknown> {
  const maps: Record<'params' | 'query' | 'body', Record<string, unknown>> = { params: {}, query: {}, body: {} }
  for (const row of rows) {
    const value = row.key ? requestSourceValue(row.source) : undefined
    if (value) maps[row.slot][row.key] = value
  }
  return Object.fromEntries(Object.entries(maps).filter(([, map]) => Object.keys(map).length > 0))
}

/** Engine `api.sort`, or `undefined` until both keys are set. */
function dataTableSort(c: DataTableSortConfig): Record<string, unknown> | undefined {
  if (!c.enabled || !c.sortKey || !c.orderKey) return undefined
  const custom = c.ascValue !== 'asc' || c.descValue !== 'desc'
  return {
    ...(c.placement !== 'auto' ? { placement: c.placement } : {}),
    sortKey: c.sortKey,
    orderKey: c.orderKey,
    ...(custom ? { orderValues: { asc: parseLoose(c.ascValue), desc: parseLoose(c.descValue) } } : {}),
    ...(c.defaultField ? { default: { field: c.defaultField, order: c.defaultOrder } } : {}),
  }
}

/**
 * A studio navigation → the engine `NavigateTarget`: the page id resolves to
 * its current key (loud `MISSING_PAGE` when the page is gone), each authored
 * param to a `DataValue`. `undefined` when no page was picked.
 */
export function toNavigateTarget(
  nav: StudioNavigate,
  pageKeyById: Map<string, string>,
): NavigateTarget | undefined {
  if (!nav.pageId) return undefined
  const params = Object.fromEntries(
    Object.entries(nav.params)
      .map(([k, src]) => [k, navParamValue(src)] as const)
      .filter((e): e is readonly [string, Record<string, unknown>] => e[1] !== undefined),
  )
  return {
    page: pageKeyById.get(nav.pageId) ?? MISSING_PAGE,
    ...(Object.keys(params).length ? { params: params as NavigateTarget['params'] } : {}),
    ...(nav.replace ? { replace: true } : {}),
  }
}

function navigateTarget(nav: StudioNavigate, refs: ButtonRefMaps): Record<string, unknown> | undefined {
  return toNavigateTarget(nav, refs.pageKeyById) as Record<string, unknown> | undefined
}

/** The engine root `Container` for a page: the authored (lg) grid settings —
 * the engine Container isn't responsive for these, one value each, mirroring
 * how the export collapses xl onto lg. Shared by the Live Preview and the
 * hand-off `pages.ts`. */
export function rootContainer(
  name: string,
  settings: GridContainerSettings,
  bins: unknown[],
): Record<string, unknown> {
  return {
    id: name,
    name,
    isArray: false,
    bins,
    ...(settings.gap.lg !== '' ? { gap: settings.gap.lg } : {}),
    ...(settings.justifyItems.lg !== '' ? { justifyItems: settings.justifyItems.lg } : {}),
    ...(settings.alignItems.lg !== '' ? { alignItems: settings.alignItems.lg } : {}),
    ...(settings.justifyContent.lg !== '' ? { justifyContent: settings.justifyContent.lg } : {}),
    ...(settings.alignContent.lg !== '' ? { alignContent: settings.alignContent.lg } : {}),
    ...(settings.gridAutoFlow.lg !== '' ? { gridAutoFlow: settings.gridAutoFlow.lg } : {}),
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
  /** Set for `multiAutocomplete` — the config is then the multi superset. */
  isMulti = false,
): Record<string, unknown> {
  const multi = isMulti ? (c as MultiAutocompleteConfig) : null
  return {
    name: c.name,
    // A multi's form value is the list of picked ids — the engine schema must be
    // an array whatever the (single-value) data type select says.
    dataType: multi ? 'array' : normalizeDataType(c.dataType),
    label: c.label,
    isRequired: c.isRequired,
    errorMessage: c.errorMessage,
    canObserve: observe.isObserved,
    observeTo: observe.observedName ?? (observe.isDangling ? MISSING_OBSERVE_TARGET : ''),
    isSingleLoad: false,
    keys: { id: c.idKey, search: c.searchKey, display: c.displayKey },
    defaultData: {},
    // A source-driven field starts empty — the static starter records stay in the
    // studio config (so switching back loses nothing) but never reach the runtime.
    options: c.mode === 'source' ? [] : c.options,
    ...(c.placeholder ? { placeholder: c.placeholder } : {}),
    ...(c.helperText ? { helperText: c.helperText } : {}),
    // Option display (see the grilled design): engine item props, only when set.
    ...(c.inputIcon ? { inputIcon: c.inputIcon } : {}),
    ...(c.itemIcon ? { itemIcon: c.itemIcon } : {}),
    ...(c.subtitleKey ? { itemSubtitle: c.subtitleKey } : {}),
    ...(c.avatarKey ? { itemAvatar: c.avatarKey } : {}),
    ...(multi
      ? {
          ...(typeof multi.maxSelections === 'number' ? { maxSelections: multi.maxSelections } : {}),
          showSelectedCount: multi.showSelectedCount,
        }
      : {}),
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
 * only emits in multi mode, and empty `accept`/`maxSizeMB`/`helperText` drop.
 * `accept` is the token array of presets + extra types; `preview`/`previewLayout`
 * emit only off their engine defaults (on / list). The
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
    ...(c.preview ? {} : { preview: false }),
    ...(c.preview && c.previewLayout === 'grid' ? { previewLayout: 'grid' } : {}),
    ...omitEmpty({
      helperText: c.helperText,
      accept: uploadAccept(c),
      maxFiles: c.multiple && c.maxFiles !== '' ? c.maxFiles : undefined,
      maxSizeMB: c.maxSizeMB === '' ? undefined : c.maxSizeMB,
    }),
    ...(c.valueFormat === 'api' ? { uploadApi: uploadApiObject(c.api) } : {}),
  }
}

/** The engine's canonical delete sequence — `apiDeleteInfo.confirmBox.True` is
 * not authorable in studio (see the grilled design), so it's a baked constant. */
const DELETE_CONFIRM_TRUE = ['StartLoading', 'SubmitFormToDeleteAPI', 'StopLoading']

/**
 * `datatable` → engine `DataTableElement`. Columns map 1:1 (`align` always emitted
 * so the JSON is self-documenting; empty `useDateFormat` drops). The `api` block
 * emits when an endpoint is picked (resolved id → name, plus the optional
 * response `paths`); unwired tables omit it for the consumer, as before. The
 * `apiDeleteInfo` block emits only when the Delete action is on AND a delete
 * endpoint is picked (a dangling ref emits the loud `MISSING_ENDPOINT` name,
 * like the read api); `canDelete` stays as authored either way. Its `params`
 * prune to the endpoint URL's current `:param` placeholders (dropping stale
 * keys from a URL edited on the API page) minus empty values, and the confirm
 * box carries the baked True/False sequences. The edit modal's content is the
 * item's child canvas: `modalContainer` (+ the `modal*` sizing) emits when the
 * Edit action is on AND the canvas has items, with `contextData` set to the
 * table's binding name so the engine prefills the form from the selected row.
 * `canSearchAllColumns` is the engine's `canSearch`, emitted only when off.
 */
/**
 * Studio pagination → engine `DataTablePagination`: `'auto'` placement and the
 * engine-default page sizes are left implicit, `searchKey` only when set,
 * `totalPath` split into the engine's path segments.
 */
function dataTablePagination(p: DataTablePaginationConfig): Record<string, unknown> {
  const sameOptions =
    p.pageSizeOptions.length === DEFAULT_PAGE_SIZE_OPTIONS.length &&
    p.pageSizeOptions.every((n, i) => n === DEFAULT_PAGE_SIZE_OPTIONS[i])
  return {
    ...(p.placement !== 'auto' ? { placement: p.placement } : {}),
    offsetKey: p.offsetKey,
    limitKey: p.limitKey,
    ...(p.searchKey ? { searchKey: p.searchKey } : {}),
    totalPath: p.totalPath.split('.').map((s) => s.trim()).filter(Boolean),
    ...(p.defaultPageSize !== DEFAULT_PAGE_SIZE ? { defaultPageSize: p.defaultPageSize } : {}),
    ...(sameOptions ? {} : { pageSizeOptions: p.pageSizeOptions }),
  }
}

function dataTableElement(
  c: DataTableConfig,
  item: GridItemData,
  resolveEndpoint: ResolveEndpoint,
  endpoints: EndpointRef[],
  refs: ButtonRefMaps,
): Record<string, unknown> {
  const apiName = resolveEndpoint(c.endpointId)
  const paths = c.apiPaths
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean)
  const deleteApiName = c.canDelete ? resolveEndpoint(c.deleteEndpointId) : undefined
  const deleteUrl = endpoints.find((e) => e.id === c.deleteEndpointId)?.url
  const deleteParams = Object.fromEntries(
    (deleteUrl != null ? urlParams(deleteUrl) : Object.keys(c.deleteParams))
      .filter((p) => c.deleteParams[p])
      .map((p) => [p, c.deleteParams[p]]),
  )
  const editCanvas = childCanvasAt(item, 0)
  // Server filters: the filter form is the second child canvas.
  const filterCanvas = childCanvasAt(item, 1)
  const emitFilters = c.filtersEnabled && filterCanvas.items.length > 0
  const filterButton = omitEmpty({
    label: c.filterButton.label !== DEFAULT_FILTER_BUTTON.label ? c.filterButton.label : '',
    icon: c.filterButton.icon !== DEFAULT_FILTER_BUTTON.icon ? c.filterButton.icon : '',
    variant: c.filterButton.variant !== DEFAULT_FILTER_BUTTON.variant ? c.filterButton.variant : '',
  })
  if (c.filterButton.label === '') filterButton.label = ''
  const filterDefaults = Object.fromEntries(
    c.filterDefaults.filter((d) => d.field && d.value !== '').map((d) => [d.field, parseLoose(d.value)]),
  )
  const sort = dataTableSort(c.sort)
  // Add reuses the edit modal, so either action emits it.
  const emitEditModal = (c.canEdit || c.canAdd) && editCanvas.items.length > 0
  const rowNavigate = c.rowNavigate ? navigateTarget(c.rowNavigate, refs) : undefined
  const pagination = c.pagination.enabled ? dataTablePagination(c.pagination) : undefined
  const addButton = omitEmpty({
    label: c.addButton.label !== DEFAULT_ADD_BUTTON.label ? c.addButton.label : '',
    icon: c.addButton.icon !== DEFAULT_ADD_BUTTON.icon ? c.addButton.icon : '',
    variant: c.addButton.variant !== DEFAULT_ADD_BUTTON.variant ? c.addButton.variant : '',
  })
  // An emptied label is icon-only, not the default — keep it explicit.
  if (c.addButton.label === '') addButton.label = ''
  return {
    name: c.name,
    title: c.title,
    ...(rowNavigate ? { rowNavigate } : {}),
    columns: c.columns.map((col) => ({
      accessor: col.accessor,
      header: col.header,
      enableSorting: col.enableSorting,
      enableColumnFilter: col.enableColumnFilter,
      align: col.align,
      ...(col.useDateFormat ? { useDateFormat: col.useDateFormat } : {}),
      ...(col.pin ? { pin: col.pin } : {}),
      ...(col.html.trim() ? { html: col.html } : {}),
      ...(col.sortField ? { sortField: col.sortField } : {}),
      ...(col.lines !== '' ? { lines: col.lines } : {}),
      // Layout keys (row header, merged cells, group header), only when set.
      ...(col.rowHeader ? { rowHeader: true } : {}),
      ...(col.mergeRows ? { mergeRows: true } : {}),
      ...(col.mergeColumns ? { mergeColumns: true } : {}),
      ...(col.group.trim() ? { group: col.group.trim() } : {}),
      ...columnSizing(col),
    })),
    ...(apiName
      ? {
          api: {
            name: apiName,
            ...(paths.length ? { paths } : {}),
            ...requestMaps(c.requestMapping),
            ...(pagination ? { pagination } : {}),
            ...(sort ? { sort } : {}),
          },
        }
      : {}),
    ...(c.canSearchAllColumns ? {} : { canSearch: false }),
    ...(c.headerGap ? { headerGap: c.headerGap } : {}),
    ...(c.canResizeColumns ? {} : { canResizeColumns: false }),
    // Engine default 2; only a change is written.
    ...(c.cellLines !== DEFAULT_CELL_LINES ? { cellLines: c.cellLines } : {}),
    ...(c.canAdd
      ? { canAdd: true, ...(Object.keys(addButton).length ? { addButton } : {}) }
      : {}),
    ...(emitFilters
      ? {
          filterContainer: toEngineContainer(filterCanvas, childContainerName(item, '-filter'), endpoints, refs),
          ...(Object.keys(filterButton).length ? { filterButton } : {}),
          ...(c.filterDisplay !== 'popover' ? { filterDisplay: c.filterDisplay } : {}),
          ...(Object.keys(filterDefaults).length ? { filterDefaults } : {}),
        }
      : {}),
    ...(emitEditModal
      ? {
          modalContainer: {
            ...toEngineContainer(editCanvas, childContainerName(item), endpoints, refs, {
              tableName: c.name,
            }),
            // Row → form prefill: the engine reads defaults from
            // contextData[<this name>], which DataTable2 writes on Edit click.
            contextData: c.name,
          },
          ...omitEmpty({
            modalMaxWidth: c.modalMaxWidth,
            modalMinWidth: c.modalMinWidth,
            modalMaxHeight: c.modalMaxHeight,
          }),
        }
      : {}),
    ...(deleteApiName
      ? {
          apiDeleteInfo: {
            name: deleteApiName,
            ...(Object.keys(deleteParams).length ? { params: deleteParams } : {}),
            ...(c.deleteConfirmEnabled
              ? {
                  confirmBox: {
                    title: c.deleteConfirmTitle,
                    description: c.deleteConfirmDescription,
                    True: [...DELETE_CONFIRM_TRUE],
                    False: [],
                  },
                }
              : {}),
            isReload: c.deleteIsReload,
            ...(c.deleteSnackbarSuccessEnabled && c.deleteSnackbarSuccessMessage
              ? {
                  snackbarSuccess: {
                    type: c.deleteSnackbarSuccessType,
                    message: c.deleteSnackbarSuccessMessage,
                  },
                }
              : {}),
            ...(c.deleteSnackbarErrorException ? { snackbarError: '$exception' } : {}),
          },
        }
      : {}),
    canEdit: c.canEdit,
    canDelete: c.canDelete,
  }
}

/** Engine column sizing keys — each only when set (`enableResizing` only when locked). */
function columnSizing(col: ColumnSizingConfig): Record<string, unknown> {
  return {
    ...(col.size !== '' ? { size: col.size } : {}),
    ...(col.minSize !== '' ? { minSize: col.minSize } : {}),
    ...(col.maxSize !== '' ? { maxSize: col.maxSize } : {}),
    ...(col.resizable ? {} : { enableResizing: false }),
  }
}

/**
 * One editable-table column → engine `DataTableEditableColumn`. `editor` and
 * `editable` are always explicit (like `align` — the JSON self-documents without
 * knowing the engine defaults). Only editor-relevant extras emit: `options` for
 * `select`, a `validation` block built from `min`/`max` (number),
 * `minLength`/`maxLength`/`pattern`/`patternMessage` (text), and
 * `requiredMessage` (when required) — everything else is carried in studio but
 * dropped here. The `validate` fn and `defaultValue` aren't authorable.
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
    ...(col.rowHeader ? { rowHeader: true } : {}),
    ...(col.group.trim() ? { group: col.group.trim() } : {}),
    ...columnSizing(col),
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
    ...(c.canResizeColumns ? {} : { canResizeColumns: false }),
    columns: c.columns.map(editableTableColumn),
    apiCrud: {
      read: ref(c.readEndpointId),
      ...(c.canCreate ? { create: ref(c.createEndpointId) } : {}),
      ...(c.canUpdate ? { update: ref(c.updateEndpointId) } : {}),
      ...(c.canDelete ? { delete: ref(c.deleteEndpointId) } : {}),
    },
  }
}

/**
 * The engine call config of one form-list CRUD ref: `params` (row-field map)
 * from the `row` sources, `values` (DataValues) from the rest, both pruned to
 * the endpoint URL's current `:param`s; `extra` keys become DataValues too.
 * Empty sources drop (emit authored, omit empty).
 */
function formListCrudCall(
  ref: FormListCrudRef,
  endpoints: EndpointRef[],
): {
  params: Record<string, string>
  values: Record<string, unknown>
  extra: Record<string, unknown>
} {
  const url = endpoints.find((e) => e.id === ref.endpointId)?.url
  const keys = url != null ? urlParams(url) : Object.keys(ref.params)
  const params: Record<string, string> = {}
  const values: Record<string, unknown> = {}
  for (const k of keys) {
    const src = ref.params[k]
    if (!src) continue
    if (src.type === 'row') {
      if (src.key) params[k] = src.key
    } else {
      const dv = navParamValue(src)
      if (dv) values[k] = dv
    }
  }
  const extra = Object.fromEntries(
    Object.entries(ref.extra)
      .filter(([k]) => k.trim() !== '')
      .map(([k, src]) => [k, src.type === 'row' ? undefined : navParamValue(src)] as const)
      .filter((e): e is readonly [string, Record<string, unknown>] => e[1] !== undefined),
  )
  return { params, values, extra }
}

/**
 * `formlist` → engine `FormListElement` (see the grilled design). The row
 * template is the item's child canvas; `apiCrud.read` always emits (resolved
 * name, `paths`, URL-param DataValues, `query` extras) and `create` /
 * `update` / `delete` per their toggles with the row-field `params`,
 * `extraParams` and `extraBody` maps. Empty labels / icons drop so the
 * component's defaults apply, the Add / Remove placement always emits, and
 * the delete confirm box emits when enabled.
 */
function formListElement(
  c: FormListConfig,
  item: GridItemData,
  endpoints: EndpointRef[],
  resolveEndpoint: ResolveEndpoint,
  refs: ButtonRefMaps,
): Record<string, unknown> {
  const nonEmpty = (o: Record<string, unknown>) => Object.keys(o).length > 0
  const paths = c.readPaths
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean)
  const read = formListCrudCall(c.read, endpoints)
  const mutation = (ref: FormListCrudRef) => {
    const call = formListCrudCall(ref, endpoints)
    return {
      name: resolveEndpoint(ref.endpointId) ?? '',
      ...(nonEmpty(call.params) ? { params: call.params } : {}),
      ...(nonEmpty(call.values) ? { extraParams: call.values } : {}),
      ...(nonEmpty(call.extra) ? { extraBody: call.extra } : {}),
    }
  }
  return {
    name: c.name,
    ...omitEmpty({
      title: c.title,
      addLabel: c.addLabel,
      addIcon: c.addIcon,
      saveLabel: c.saveLabel,
      removeLabel: c.removeLabel,
      removeIcon: c.removeIcon,
      emptyText: c.emptyText,
    }),
    // Placement always emits (self-documenting, like `align`); icons only when picked.
    addPosition: c.addPosition,
    addAlign: c.addAlign,
    addDisplay: c.addDisplay,
    removePosition: c.removePosition,
    removeDisplay: c.removeDisplay,
    idKey: c.idKey,
    rowContainer: toEngineContainer(
      childCanvasAt(item, 0),
      childContainerName(item, '-row'),
      endpoints,
      refs,
    ),
    apiCrud: {
      read: {
        name: resolveEndpoint(c.read.endpointId) ?? '',
        ...(paths.length ? { paths } : {}),
        ...(nonEmpty(read.values) ? { params: read.values } : {}),
        ...(nonEmpty(read.extra) ? { query: read.extra } : {}),
      },
      ...(c.canCreate ? { create: mutation(c.create) } : {}),
      ...(c.canUpdate ? { update: mutation(c.update) } : {}),
      ...(c.canDelete
        ? {
            delete: {
              ...mutation(c.delete),
              ...(c.deleteConfirmEnabled
                ? {
                    confirmBox: {
                      title: c.deleteConfirmTitle,
                      description: c.deleteConfirmDescription,
                    },
                  }
                : {}),
            },
          }
        : {}),
    },
  }
}

/**
 * A display prop's item binding → the engine `{ type:'row', key, path? }`
 * DataValue (resolved against the enclosing repeater's item), or `undefined`
 * when static / no field picked (emit authored, omit empty).
 */
function itemBindingValue(binding: ItemBinding | undefined): Record<string, unknown> | undefined {
  if (!binding || !binding.key) return undefined
  return { type: 'row', key: binding.key, ...(binding.path ? { path: binding.path } : {}) }
}

/**
 * `repeater` → engine `RepeaterElement` (see the grilled design). The item
 * template is the item's child canvas. An endpoint source emits `api`
 * (resolved name, `paths`, `:param` DataValues pruned to the URL's current
 * placeholders — a `row` source reads the *enclosing* repeater's item — and
 * `query` extras); a parent source emits `items: { type:'row', key }`. Spans
 * export like a bin's (xs→sm, sm→md, md→lg, lg→lg+xl); empty optionals drop
 * so the component's defaults apply.
 */
function repeaterElement(
  c: RepeaterConfig,
  item: GridItemData,
  endpoints: EndpointRef[],
  resolveEndpoint: ResolveEndpoint,
  refs: ButtonRefMaps,
): Record<string, unknown> {
  const dataValues = (map: Record<string, NavParamSource>, keys: string[]) =>
    Object.fromEntries(
      keys
        .filter((k) => k.trim() !== '' && map[k])
        .map((k) => [k, navParamValue(map[k])] as const)
        .filter((e): e is readonly [string, Record<string, unknown>] => e[1] !== undefined),
    )
  let source: Record<string, unknown>
  if (c.source === 'parent') {
    source = { items: { type: 'row', key: c.parentField || 'none' } }
  } else {
    const url = endpoints.find((e) => e.id === c.read.endpointId)?.url
    const params = dataValues(c.read.params, url != null ? urlParams(url) : Object.keys(c.read.params))
    const query = dataValues(c.read.extra, Object.keys(c.read.extra))
    const paths = c.readPaths
      .split('.')
      .map((s) => s.trim())
      .filter(Boolean)
    source = {
      api: {
        name: resolveEndpoint(c.read.endpointId) ?? '',
        ...(paths.length ? { paths } : {}),
        ...(Object.keys(params).length ? { params } : {}),
        ...(Object.keys(query).length ? { query } : {}),
      },
    }
  }
  const itemNavigate = c.itemNavigate ? navigateTarget(c.itemNavigate, refs) : undefined
  return {
    name: c.name,
    ...omitEmpty({ title: c.title, emptyText: c.emptyText, itemPadding: c.itemPadding }),
    idKey: c.idKey,
    ...source,
    itemContainer: toEngineContainer(
      childCanvasAt(item, 0),
      childContainerName(item, '-item'),
      endpoints,
      refs,
    ),
    itemSpan: {
      sm: String(c.itemSpan.sm),
      md: String(c.itemSpan.md),
      lg: String(c.itemSpan.lg),
      // The engine has no `xs`; `xl` mirrors `lg` (studio's widest breakpoint).
      xl: String(c.itemSpan.lg),
    },
    gap: c.gap === '' ? '4' : c.gap,
    itemSurface: c.itemSurface,
    ...(itemNavigate ? { itemNavigate } : {}),
  }
}

/** `text` → engine `TextElement`. Content plus the label-styling flag. */
function textElement(c: TextConfig): Record<string, unknown> {
  const value = itemBindingValue(c.binding)
  return { text: c.text, isLabel: c.isLabel, ...(value ? { value } : {}) }
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
    ...(itemBindingValue(c.binding) ? { value: itemBindingValue(c.binding) } : {}),
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
    ...(itemBindingValue(c.srcBinding) ? { srcValue: itemBindingValue(c.srcBinding) } : {}),
    ...(itemBindingValue(c.fallbackBinding)
      ? { fallbackValue: itemBindingValue(c.fallbackBinding) }
      : {}),
  }
}

/** `html` → engine `HtmlContentElement`: the template, the binding as a `type:"row"` value, `prose` only when off. */
function htmlContentElement(c: HtmlContentConfig): Record<string, unknown> {
  return {
    name: c.name,
    html: c.html,
    ...(itemBindingValue(c.binding) ? { value: itemBindingValue(c.binding) } : {}),
    ...(c.prose ? {} : { prose: false }),
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
 * Trigger button → engine `ButtonElement` visual slice. Modal/popover triggers
 * stay behavior-less (`actions: []`): the host owns their click (the engine's
 * Modal wraps its trigger in Radix's own open logic).
 */
function buttonElement(c: ButtonConfig): Record<string, unknown> {
  return {
    label: c.label,
    ...(c.icon ? { icon: c.icon } : {}),
    ...(c.variant !== 'contained' ? { variant: c.variant } : {}),
    actions: [],
  }
}

const isSubmitAction = (a: ButtonActionKey) =>
  a === 'SubmitFormToPostAPI' || a === 'SubmitFormToPatchAPI'

/**
 * Standalone `button` item → engine `ButtonElement` with behavior (see the
 * grilled design). Confirm mode exports the engine's only working ConfirmBox
 * shape — `actions: ["ConfirmBox"]` with the real sequences in `True`/`False`.
 * The submit-only fields (`api`, `reloadDataTable`, snackbars) and the
 * CloseModal-only `modalId` are gated on an action that consumes them, so
 * stale panel values from a since-changed action list don't leak into the
 * export. Stable refs resolve id → current name via `refs`.
 */
function buttonItemElement(
  c: ButtonItemConfig,
  refs: ButtonRefMaps,
  resolveEndpoint: ResolveEndpoint,
): Record<string, unknown> {
  const confirm = c.mode === 'confirm'
  const effective = confirm ? [...c.confirmTrue, ...c.confirmFalse] : c.actions
  const usesSubmit = effective.some(isSubmitAction)
  const usesCloseModal = effective.includes('CloseModal')
  const usesNavigate = effective.includes('Navigate')
  const navigate = usesNavigate && c.navigate ? navigateTarget(c.navigate, refs) : undefined

  const apiName = usesSubmit ? resolveEndpoint(c.endpointId) : undefined
  const modalId = usesCloseModal && c.modalItemId
    ? refs.modalIdByItem.get(c.modalItemId)
    : undefined
  const reload = usesSubmit && c.reloadTableItemId
    ? refs.tableNameByItem.get(c.reloadTableItemId)
    : undefined

  return {
    label: c.label,
    ...(c.icon ? { icon: c.icon } : {}),
    ...(c.variant !== 'contained' ? { variant: c.variant } : {}),
    actions: confirm ? ['ConfirmBox'] : [...c.actions],
    ...(confirm
      ? {
          confirmBox: {
            title: c.confirmTitle,
            description: c.confirmDescription,
            True: [...c.confirmTrue],
            False: [...c.confirmFalse],
          },
        }
      : {}),
    ...(apiName ? { api: { name: apiName } } : {}),
    ...(reload ? { reloadDataTable: reload } : {}),
    ...(modalId ? { modalId } : {}),
    ...(usesSubmit && c.snackbarSuccessEnabled && c.snackbarSuccessMessage
      ? {
          snackbarSuccess: {
            type: c.snackbarSuccessType,
            message: c.snackbarSuccessMessage,
          },
        }
      : {}),
    ...(usesSubmit && c.snackbarErrorException ? { snackbarError: '$exception' } : {}),
    ...(navigate ? { navigate } : {}),
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
/**
 * Where a canvas sits: inside a data table's modal, its items' `showWhen`
 * becomes an engine `condition` on `<tableName>._id`.
 */
type CanvasScope = { tableName: string }

function toEngineContainer(
  canvas: ChildCanvas,
  name: string,
  endpoints: EndpointRef[],
  refs: ButtonRefMaps,
  scope?: CanvasScope,
): Record<string, unknown> {
  const s = canvas.settings
  return {
    id: name,
    name,
    isArray: false,
    bins: buildBins(canvas.settings, canvas.items, endpoints, [], refs, scope),
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
  refs: ButtonRefMaps,
): Record<string, unknown> {
  return {
    container: toEngineContainer(
      childCanvasAt(item, 0),
      childContainerName(item),
      endpoints,
      refs,
    ),
    elevation: c.elevation,
    variant: c.variant,
    ...(c.square ? { square: true } : {}),
  }
}

/** A card button: its `ButtonItemConfig` export without the studio-only `id`. */
function cardActionElement(
  c: CardActionConfig,
  refs: ButtonRefMaps,
  resolveEndpoint: ResolveEndpoint,
): Record<string, unknown> {
  const { id: _id, ...button } = c
  return buttonItemElement(button, refs, resolveEndpoint)
}

/**
 * `card` → engine `CardElement`: the header / media slots (bindings as
 * `type:"row"` values, avatar and action through their own exports), `content`
 * from child canvas 0, `collapse` from child canvas 1 while enabled, the footer
 * buttons, the whole-card `navigate`, and the Paper surface off its defaults.
 */
function cardElement(
  c: CardConfig,
  item: GridItemData,
  endpoints: EndpointRef[],
  refs: ButtonRefMaps,
  resolveEndpoint: ResolveEndpoint,
): Record<string, unknown> {
  const h = c.header
  const header = {
    ...omitEmpty({ title: h.title, subheader: h.subheader }),
    ...(itemBindingValue(h.titleBinding) ? { titleValue: itemBindingValue(h.titleBinding) } : {}),
    ...(itemBindingValue(h.subheaderBinding) ? { subheaderValue: itemBindingValue(h.subheaderBinding) } : {}),
    ...(h.avatarEnabled ? { avatar: avatarElement(h.avatar) } : {}),
    ...(h.actionEnabled ? { action: cardActionElement(h.action, refs, resolveEndpoint) } : {}),
  }
  const navigate = c.navigate ? navigateTarget(c.navigate, refs) : undefined
  return {
    name: c.name,
    ...(Object.keys(header).length ? { header } : {}),
    ...(c.media.enabled
      ? {
          media: {
            ...omitEmpty({ src: c.media.src, alt: c.media.alt }),
            ...(itemBindingValue(c.media.srcBinding) ? { srcValue: itemBindingValue(c.media.srcBinding) } : {}),
            ...(c.media.height !== DEFAULT_CARD_MEDIA_HEIGHT ? { height: c.media.height } : {}),
          },
        }
      : {}),
    content: toEngineContainer(childCanvasAt(item, 0), childContainerName(item), endpoints, refs),
    ...(c.actions.length
      ? { actions: c.actions.map((a) => cardActionElement(a, refs, resolveEndpoint)) }
      : {}),
    ...(c.actionsAlign === 'end' ? { actionsAlign: 'end' } : {}),
    ...(c.collapseEnabled
      ? {
          collapse: toEngineContainer(childCanvasAt(item, 1), childContainerName(item, '-collapse'), endpoints, refs),
          ...(c.collapseLabel && c.collapseLabel !== 'Show more' ? { collapseLabel: c.collapseLabel } : {}),
          ...(c.defaultExpanded ? { defaultExpanded: true } : {}),
        }
      : {}),
    ...(navigate ? { navigate } : {}),
    ...(c.variant !== 'elevation' ? { variant: c.variant } : {}),
    ...(c.variant === 'elevation' && c.elevation !== 1 ? { elevation: c.elevation } : {}),
    ...(c.square ? { square: true } : {}),
  }
}

/** `tab` → engine `TabElement`: one `{label, value, container}` per authored
 * tab (child canvases are index-aligned by the store). */
function tabElement(
  c: TabConfig,
  item: GridItemData,
  endpoints: EndpointRef[],
  refs: ButtonRefMaps,
): Record<string, unknown> {
  return {
    tabs: c.tabs.map((tab, i) => ({
      label: tab.label,
      value: tab.value,
      container: toEngineContainer(
        childCanvasAt(item, i),
        childContainerName(item, `-${i}`),
        endpoints,
        refs,
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
  refs: ButtonRefMaps,
): Record<string, unknown> {
  return {
    id: c.id,
    title: c.title,
    container: toEngineContainer(
      childCanvasAt(item, 0),
      childContainerName(item),
      endpoints,
      refs,
    ),
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
  refs: ButtonRefMaps,
): Record<string, unknown> {
  return {
    container: toEngineContainer(
      childCanvasAt(item, 0),
      childContainerName(item),
      endpoints,
      refs,
    ),
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
  refs: ButtonRefMaps,
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
            item.type === 'multiAutocomplete',
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
        ? dataTableElement(item.config as DataTableConfig, item, resolveEndpoint, endpoints, refs)
        : undefined
    case 'datatableeditable':
      return item.config
        ? dataTableEditableElement(item.config as DataTableEditableConfig, resolveEndpoint)
        : undefined
    case 'formlist':
      return item.config
        ? formListElement(item.config as FormListConfig, item, endpoints, resolveEndpoint, refs)
        : undefined
    case 'repeater':
      return item.config
        ? repeaterElement(item.config as RepeaterConfig, item, endpoints, resolveEndpoint, refs)
        : undefined
    case 'text':
      // Config-less fallback keeps the pre-config behavior (label as content).
      return item.config
        ? textElement(item.config as TextConfig)
        : { text: item.label, isLabel: true }
    case 'typography':
      return item.config ? typographyElement(item.config as TypographyConfig) : undefined
    case 'html':
      return item.config ? htmlContentElement(item.config as HtmlContentConfig) : undefined
    case 'avatar':
      return item.config ? avatarElement(item.config as AvatarConfig) : undefined
    case 'divider':
      return item.config ? dividerElement(item.config as DividerConfig) : undefined
    case 'button':
      return item.config
        ? buttonItemElement(item.config as ButtonItemConfig, refs, resolveEndpoint)
        : undefined
    case 'hidden':
      return item.config ? hiddenElement(item.config as HiddenConfig) : undefined
    case 'paper':
      return item.config
        ? paperElement(item.config as PaperConfig, item, endpoints, refs)
        : undefined
    case 'card':
      return item.config
        ? cardElement(item.config as CardConfig, item, endpoints, refs, resolveEndpoint)
        : undefined
    case 'tab':
      return item.config
        ? tabElement(item.config as TabConfig, item, endpoints, refs)
        : undefined
    case 'modal':
      return item.config
        ? modalElement(item.config as ModalConfig, item, endpoints, refs)
        : undefined
    case 'popover':
      return item.config
        ? popoverElement(item.config as PopoverConfig, item, endpoints, refs)
        : undefined
    default:
      return undefined
  }
}

/** Build the `Bin[]` (plain objects) for the whole canvas. `endpoints` is the
 * API page's list, threaded through so refs resolve id → current name.
 * `refs` carries the button targets collected from the ROOT items; omitted at
 * the top-level call, where `items` IS the root and the maps are built here. */
export function buildBins(
  container: GridContainerSettings,
  items: GridItemData[],
  endpoints: EndpointRef[],
  pages: PageRef[] = [],
  refs?: ButtonRefMaps,
  scope?: CanvasScope,
): Record<string, unknown>[] {
  const cols = container.columns
  const resolveEndpoint = makeEndpointResolver(endpoints)
  const buttonRefs = refs ?? makeButtonRefMaps(items, pages)
  return items.map((item) => {
    const span = item.settings.colSpan
    const lg = toBoxRange(span.lg, cols.lg)
    const element = buildElement(item, items, endpoints, resolveEndpoint, buttonRefs)
    // Adding / editing visibility inside a data table's modal: the engine
    // condition the example's country form uses (`<table>._id` undefined ⇒
    // the Add button opened it). `val: undefined` is dropped by JSON, which
    // the engine reads the same way.
    const condition =
      scope && item.showWhen && item.showWhen !== 'always'
        ? {
            right: { key: scope.tableName, path: '_id' },
            operator: item.showWhen === 'adding' ? 'eq' : 'neq',
            left: { val: undefined },
          }
        : undefined
    // A plain `container` Bin nests via the Bin-level `container` key (not an
    // element) — the engine renders it as a nested grid. Style-tab background /
    // border (design-only otherwise) turn on the engine's themed surface.
    const nested =
      item.type === 'container'
        ? {
            ...toEngineContainer(
              childCanvasAt(item, 0),
              childContainerName(item),
              endpoints,
              buttonRefs,
            ),
            ...(hasElementStyle(item.style) && (item.style.bg || item.style.line)
              ? { surface: { background: !!item.style.bg, border: !!item.style.line } }
              : {}),
          }
        : undefined
    // Design-only kinds (see `designTypes.ts`) have no engine element: they
    // export as an `empty` bin carrying their design config under `designOnly`,
    // which the Live Preview turns into a labelled placeholder and a developer
    // can read from project.json.
    const designOnly = isDesignOnly(item.type)
    return {
      sm: toBoxRange(span.sm, cols.sm),
      md: toBoxRange(span.md, cols.md),
      lg,
      // The engine has no `xs`; `xl` mirrors `lg` (studio's widest breakpoint).
      xl: lg,
      // Studio's `select` is the engine's `autocomplete`; everything else passes through.
      type: designOnly ? 'empty' : item.type === 'select' ? 'autocomplete' : item.type,
      justifySelf: item.settings.justifySelf.lg,
      alignSelf: item.settings.alignSelf.lg,
      ...(condition ? { condition } : {}),
      ...(element ? { element } : {}),
      ...(nested ? { container: nested } : {}),
      ...(designOnly
        ? { designOnly: { type: item.type, label: item.label, config: item.config ?? {} } }
        : {}),
      // A button's design-only navigation (link / toast / dialog) rides beside
      // the engine element: read by the Live Preview and project.json. Page
      // navigation is the engine `navigate` on the element itself.
      ...(item.type === 'button' &&
      item.config &&
      (item.config as ButtonItemConfig).navigation &&
      (item.config as ButtonItemConfig).navigation!.kind !== 'none'
        ? {
            designNavigation: {
              label: (item.config as ButtonItemConfig).label,
              ...(item.config as ButtonItemConfig).navigation!,
            },
          }
        : {}),
      ...(hasElementStyle(item.style) ? { style: item.style } : {}),
    }
  })
}

export function gridConfigToJson(
  container: GridContainerSettings,
  items: GridItemData[],
  endpoints: EndpointRef[],
  pages: PageRef[] = [],
): string {
  return JSON.stringify(buildBins(container, items, endpoints, pages), null, 2)
}
