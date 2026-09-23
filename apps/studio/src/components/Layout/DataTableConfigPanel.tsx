import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import type { EndpointDef } from '../Api/types'
import type { ModelDef } from '../Model/types'
import { FieldPicker, IconButton, IconPicker, Input, SegmentedControl, Select, SortableCardList } from '../common'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import { urlParams } from '../Api/warnings'
import { useActivePages } from '../Workspace/workspaceStore'
import { useGridStore } from './gridStore'
import { EditContentsButton } from './ContainerHostConfigPanel'
import { EndpointPicker } from './SelectFieldConfigPanel'
import { NavigateEditor, SNACKBAR_VARIANT_OPTIONS, WiringHint } from './ButtonConfigPanel'
import { ColumnHtmlField } from './ColumnHtmlField'
import { ColumnSizeFields } from './ColumnSizeFields'
import { RequestMappingSection, seedRequestParams, ServerFiltersSection, ServerSortSection } from './DataTableRequestPanel'
import { buildDataTablePreviewRows } from './dataTablePreview'
import { paginationPlacement, rowModelFields, segmentFields, type RowModel } from './rowFields'
import {
  BUTTON_VARIANT_OPTIONS,
  createDefaultNavigate,
  DEFAULT_COLUMN_SIZING,
  type ButtonConfig,
  type ButtonSnackbarVariant,
  type CellLines,
  type DataTableColumnConfig,
  type DataTableConfig,
  type DataTablePaginationConfig,
} from './types'

const PLACEMENT_OPTIONS = [
  { value: 'auto', label: 'auto (from the endpoint)' },
  { value: 'query', label: 'query string' },
  { value: 'body', label: 'request body' },
]

/** Parse "5, 10, 20" into positive page sizes (junk dropped). */
function parseSizes(text: string): number[] {
  return text
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
}

/**
 * A comma-separated list of numbers. Local text so a trailing comma survives
 * while typing; the parsed list commits on every change and the text
 * normalises on blur.
 */
function NumberListInput({
  value,
  onChange,
}: {
  value: number[]
  onChange: (sizes: number[]) => void
}) {
  const joined = value.join(', ')
  const [text, setText] = useState(joined)
  useEffect(() => {
    setText((t) => (parseSizes(t).join(', ') === joined ? t : joined))
  }, [joined])
  return (
    <Input
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parseSizes(e.target.value))
      }}
      onBlur={() => setText(joined)}
      placeholder="5, 10, 20"
      className="font-mono"
    />
  )
}

/**
 * The pagination keys a freshly picked endpoint suggests: the conventional
 * names present in its request-slot / response models. Keys the models don't
 * have keep whatever was authored.
 */
export function seedPaginationKeys(
  pagination: DataTablePaginationConfig,
  endpoint: EndpointDef | undefined,
  models: ModelDef[],
): DataTablePaginationConfig {
  const slot = segmentFields(endpoint, paginationPlacement(endpoint, pagination.placement), models)
  const response = segmentFields(endpoint, 'response', models)
  const has = (fields: { name: string }[] | null, name: string) => !!fields?.some((f) => f.name === name)
  return {
    ...pagination,
    ...(has(slot.fields, 'offset') ? { offsetKey: 'offset' } : {}),
    ...(has(slot.fields, 'limit') ? { limitKey: 'limit' } : {}),
    ...(has(slot.fields, 'search') ? { searchKey: 'search' } : {}),
    ...(has(response.fields, 'total') ? { totalPath: 'total' } : {}),
  }
}

/**
 * The server-pagination section (engine `api.pagination`). Key pickers read
 * the endpoint's model for the resolved placement slot (query or body) and
 * the response for the total, falling back to free text when a model is not
 * declared — the engine never validates the request, so any key works.
 */
function PaginationSection({
  pagination,
  endpoint,
  onChange,
}: {
  pagination: DataTablePaginationConfig
  endpoint: EndpointDef | undefined
  onChange: (p: DataTablePaginationConfig) => void
}) {
  const models = useProjectModels()
  const patch = (p: Partial<DataTablePaginationConfig>) => onChange({ ...pagination, ...p })
  const placement = paginationPlacement(endpoint, pagination.placement)
  const slot = segmentFields(endpoint, placement, models)
  const response = segmentFields(endpoint, 'response', models)

  return (
    <>
      <Toggle
        label="Server pagination"
        checked={pagination.enabled}
        onChange={(v) => patch({ enabled: v })}
      />
      {pagination.enabled && (
        <div className="space-y-2 rounded-lg border border-line bg-panel p-2">
          <p className="text-ui-sm leading-relaxed text-ink-3">
            Each page sends offset/limit (and the search term) to the endpoint
            and reads the total row count off the response.
          </p>
          <Field label="Send offset/limit in">
            <Select
              options={PLACEMENT_OPTIONS}
              value={pagination.placement}
              onChange={(v) => patch({ placement: v as DataTablePaginationConfig['placement'] })}
            />
          </Field>
          {pagination.placement === 'auto' && (
            <p className="text-ui-xs text-ink-3">
              Resolves to the {placement === 'body' ? 'request body' : 'query string'}
              {endpoint ? ` for ${endpoint.method} ${endpoint.url}` : ''}.
            </p>
          )}
          <Field label="Offset key">
            <FieldPicker
              fields={slot.fields}
              value={pagination.offsetKey}
              onChange={(v) => patch({ offsetKey: v })}
              fallbackHint={slot.reason}
              aria-label="Offset key"
            />
          </Field>
          <Field label="Limit key">
            <FieldPicker
              fields={slot.fields}
              value={pagination.limitKey}
              onChange={(v) => patch({ limitKey: v })}
              fallbackHint={slot.reason}
              aria-label="Limit key"
            />
          </Field>
          <Field label="Search key (server-side search)">
            <FieldPicker
              fields={slot.fields}
              value={pagination.searchKey}
              onChange={(v) => patch({ searchKey: v })}
              allowNone
              fallbackHint={slot.fields === null ? 'Empty = no search box.' : undefined}
              aria-label="Search key"
            />
          </Field>
          <Field label="Total count (response dot path)">
            <FieldPicker
              fields={response.fields}
              value={pagination.totalPath}
              onChange={(v) => patch({ totalPath: v })}
              fallbackHint={response.reason}
              aria-label="Total count path"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Default page size">
              <Input
                value={String(pagination.defaultPageSize)}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isInteger(n) && n > 0) patch({ defaultPageSize: n })
                }}
                inputMode="numeric"
                className="font-mono"
              />
            </Field>
            <Field label="Page size options">
              <NumberListInput
                value={pagination.pageSizeOptions}
                onChange={(sizes) => patch({ pageSizeOptions: sizes })}
              />
            </Field>
          </div>
        </div>
      )}
    </>
  )
}

const ALIGN_OPTIONS = [
  { value: 'start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'end', label: 'end' },
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

/** Seed for "Add column": sorting on / filter off / centered, like the defaults. */
function newColumn(index: number): DataTableColumnConfig {
  return {
    id: crypto.randomUUID(),
    accessor: `column${index}`,
    header: `Column ${index}`,
    enableSorting: true,
    enableColumnFilter: false,
    align: 'center',
    useDateFormat: '',
    pin: '', html: '', sortField: '', lines: '',
    rowHeader: false, mergeRows: false, mergeColumns: false, group: '',
    ...DEFAULT_COLUMN_SIZING,
  }
}

const HEADER_GAP_OPTIONS = [
  { value: '', label: '— default (2) —' },
  ...['0', '1', '2', '3', '4', '6', '8'].map((v) => ({ value: v, label: v })),
]

const PIN_OPTIONS = [
  { value: '', label: 'not pinned' },
  { value: 'left', label: 'left' },
  { value: 'right', label: 'right' },
]

/** Line-clamp choices; the table's select has no blank (its default is the engine's 2). */
const LINE_OPTIONS = [
  ...([1, 2, 3, 4, 5, 6] as CellLines[]).map((n) => ({ value: String(n), label: n === 1 ? '1 line' : ` lines` })),
  { value: '0', label: 'no clamp (wrap freely)' },
]
const COLUMN_LINE_OPTIONS = [{ value: '', label: '— table setting —' }, ...LINE_OPTIONS]
const parseLines = (v: string): CellLines => Number(v) as CellLines

/**
 * The columns editor: one expandable card per column. Collapsed shows the two
 * defining fields (accessor + header); expanding reveals the rest of the engine
 * `ColumnDef` (sorting, filter, align, date format). Column order matters in a
 * table, so cards reorder by dragging their grip (`SortableCardList`); while a
 * drag is in flight every card renders collapsed so the slot preview keeps
 * uniform heights, and the expanded card (tracked by column `id`) restores on
 * drop. Every mutation commits a fresh array through `onChange`, driving the
 * live preview + exported JSON. No validation — like the other option editors,
 * empty/duplicate accessors just show their consequence in the preview.
 */
function ColumnsEditor({
  columns,
  onChange,
  rowModel,
}: {
  columns: DataTableColumnConfig[]
  onChange: (columns: DataTableColumnConfig[]) => void
  /** The table's row fields, offered by each column's HTML editor. */
  rowModel: RowModel
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const pages = useActivePages()
  // The canvas's first mock row, so the HTML preview strip matches the table.
  const previewRow = useMemo(() => buildDataTablePreviewRows(columns)[0] ?? {}, [columns])

  const patch = (index: number, p: Partial<DataTableColumnConfig>) =>
    onChange(columns.map((c, i) => (i === index ? { ...c, ...p } : c)))
  // One row header per table: turning it on here turns it off elsewhere.
  const setRowHeader = (index: number, on: boolean) =>
    onChange(columns.map((c, i) => ({ ...c, rowHeader: i === index ? on : on ? false : c.rowHeader })))
  const remove = (index: number) => {
    const removedId = columns[index]?.id
    onChange(columns.filter((_, i) => i !== index))
    setExpandedId((e) => (e === removedId ? null : e))
  }
  const add = () => onChange([...columns, newColumn(columns.length + 1)])

  return (
    <Field label="Columns">
      <div className="space-y-2">
        <SortableCardList
          items={columns}
          onReorder={onChange}
          cardClassName="space-y-2 rounded-lg border border-line bg-panel p-2"
          gripLabel={(_, index) => `Reorder column ${index + 1}`}
        >
          {(column, index, { grip, dragging }) => {
            const expanded = !dragging && expandedId === column.id
            return (
              <>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={column.accessor}
                  onChange={(e) => patch(index, { accessor: e.target.value })}
                  placeholder="accessor"
                  className="font-mono"
                />
                <Input
                  value={column.header}
                  onChange={(e) => patch(index, { header: e.target.value })}
                  placeholder="header"
                />
              </div>

              {expanded && (
                <div className="space-y-2">
                  <Toggle
                    label="Sortable"
                    checked={column.enableSorting}
                    onChange={(v) => patch(index, { enableSorting: v })}
                  />
                  <Toggle
                    label="Column filter"
                    checked={column.enableColumnFilter}
                    onChange={(v) => patch(index, { enableColumnFilter: v })}
                  />
                  <Field label="Align">
                    <Select
                      options={ALIGN_OPTIONS}
                      value={column.align}
                      onChange={(v) =>
                        patch(index, { align: v as DataTableColumnConfig['align'] })
                      }
                    />
                  </Field>
                  <Field label="Date format (dayjs)">
                    <Input
                      value={column.useDateFormat}
                      onChange={(e) => patch(index, { useDateFormat: e.target.value })}
                      placeholder="DD/MM/YYYY"
                      className="font-mono"
                    />
                  </Field>
                  <Field label="Pin (sticky while scrolling sideways)">
                    <Select
                      options={PIN_OPTIONS}
                      value={column.pin}
                      onChange={(v) => patch(index, { pin: v as DataTableColumnConfig['pin'] })}
                    />
                  </Field>
                  <Toggle
                    label="Row header (the row's label: <th>, pinned left)"
                    checked={column.rowHeader}
                    onChange={(v) => setRowHeader(index, v)}
                  />
                  <Toggle
                    label="Merge equal rows (rowSpan over consecutive equal values)"
                    checked={column.mergeRows}
                    onChange={(v) => patch(index, { mergeRows: v })}
                  />
                  <Toggle
                    label="Merge equal columns (colSpan with a flagged neighbour)"
                    checked={column.mergeColumns}
                    onChange={(v) => patch(index, { mergeColumns: v })}
                  />
                  <Field label="Group header (adjacent columns with the same label share it)">
                    <Input
                      value={column.group}
                      onChange={(e) => patch(index, { group: e.target.value })}
                      placeholder="e.g. People"
                    />
                  </Field>
                  <Field label="Lines (line clamp; cut cells get a tooltip)">
                    <Select
                      options={COLUMN_LINE_OPTIONS}
                      value={column.lines === '' ? '' : String(column.lines)}
                      onChange={(v) => patch(index, { lines: v === '' ? '' : parseLines(v) })}
                    />
                  </Field>
                  <Field label="Sort field (server sort; empty = accessor)">
                    <Input
                      value={column.sortField}
                      onChange={(e) => patch(index, { sortField: e.target.value })}
                      placeholder={column.accessor}
                      className="font-mono"
                    />
                  </Field>
                  <ColumnSizeFields column={column} onChange={(sizing) => patch(index, sizing)} />
                  <Field label="Cell HTML (template)">
                    <ColumnHtmlField
                      column={column}
                      onChange={(html) => patch(index, { html })}
                      rowModel={rowModel}
                      pages={pages}
                      previewRow={previewRow}
                    />
                  </Field>
                </div>
              )}

              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  {grip}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : column.id)}
                    className="flex items-center gap-0.5 text-ui-sm font-medium text-ink-3 transition-colors hover:text-ink"
                  >
                    {expanded ? (
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {expanded ? 'Less' : 'More'}
                  </button>
                </div>
                <IconButton
                  label={`Remove column ${index + 1}`}
                  onClick={() => remove(index)}
                  className="h-6! w-6! text-ink-3 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
              </div>
              </>
            )
          }}
        </SortableCardList>
        <button
          type="button"
          onClick={add}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-line-strong py-1.5 text-ui-sm font-medium text-ink-3 transition-colors hover:border-focus hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add column
        </button>
      </div>
    </Field>
  )
}

type DataTableConfigPanelProps = {
  itemId: string
  config: DataTableConfig
}

/**
 * Editor for a data table's config. Every control writes through
 * `updateItemConfig`, which drives both the live canvas preview and the exported
 * JSON. The modal container half of `DataTableElement` isn't authorable here
 * (see `DataTableConfig`), and "Search all columns" only affects the preview —
 * the engine renders search unconditionally. The delete-API section (engine
 * `apiDeleteInfo`) appears only while the Delete action is on; its param rows
 * derive from the chosen endpoint URL's `:param` placeholders, so switching
 * endpoints reseeds them (keeping values for params both URLs share).
 */
export function DataTableConfigPanel({ itemId, config }: DataTableConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const endpoints = useProjectEndpoints()
  const models = useProjectModels()
  const set = <K extends keyof DataTableConfig>(key: K, value: DataTableConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<DataTableConfig>)

  const dataEndpoint = endpoints.find((e) => e.id === config.endpointId)
  // Picking an endpoint also suggests the pagination keys its models carry.
  const setDataEndpoint = (endpointId: string | null) => {
    const endpoint = endpoints.find((e) => e.id === endpointId)
    updateItemConfig(itemId, {
      endpointId,
      pagination: seedPaginationKeys(config.pagination, endpoint, models),
      requestMapping: seedRequestParams(config.requestMapping, endpoint),
    })
  }

  const deleteEndpoint = endpoints.find((e) => e.id === config.deleteEndpointId)
  const deleteParamKeys = deleteEndpoint ? urlParams(deleteEndpoint.url) : []
  const setDeleteEndpoint = (deleteEndpointId: string | null) => {
    const url = endpoints.find((e) => e.id === deleteEndpointId)?.url ?? ''
    const deleteParams = Object.fromEntries(
      urlParams(url).map((p) => [p, config.deleteParams[p] ?? '']),
    )
    updateItemConfig(itemId, { deleteEndpointId, deleteParams })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">
        Data Table
      </h3>

      <Field label="Name (binding key)">
        <Input
          value={config.name}
          onChange={(e) => set('name', e.target.value)}
          className="font-mono"
        />
      </Field>

      <Field label="Title">
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} />
      </Field>

      <Field label="Data endpoint (API page)">
        <EndpointPicker value={config.endpointId} onChange={setDataEndpoint} />
      </Field>

      {config.endpointId != null && (
        <>
          <Field label="Response row path (dot path)">
            <Input
              value={config.apiPaths}
              onChange={(e) => set('apiPaths', e.target.value)}
              placeholder="data"
              className="font-mono"
            />
          </Field>
          <PaginationSection
            pagination={config.pagination}
            endpoint={dataEndpoint}
            onChange={(pagination) => set('pagination', pagination)}
          />
          <ServerSortSection config={config} set={set} endpoint={dataEndpoint} models={models} />
          <ServerFiltersSection itemId={itemId} config={config} set={set} />
          <RequestMappingSection itemId={itemId} config={config} set={set} endpoint={dataEndpoint} models={models} />
        </>
      )}

      <ColumnsEditor
        columns={config.columns}
        onChange={(columns) => set('columns', columns)}
        rowModel={rowModelFields(config.endpointId, config.apiPaths, endpoints, models)}
      />

      <Toggle
        label="Row click opens a page"
        checked={!!config.rowNavigate}
        onChange={(v) => set('rowNavigate', v ? createDefaultNavigate() : undefined)}
      />
      {config.rowNavigate && (
        <NavigateEditor
          value={config.rowNavigate}
          onChange={(v) => set('rowNavigate', v)}
          allowRow
        />
      )}

      <Toggle
        label="Add action"
        checked={config.canAdd}
        onChange={(v) => set('canAdd', v)}
      />
      {config.canAdd && (
        <div className="space-y-2 rounded-lg border border-line bg-panel p-2">
          <p className="text-ui-sm leading-relaxed text-ink-3">
            An Add button in the table header opens the same modal contents as
            Edit over an empty row. Inside, set each item's “Show when” to
            Adding or Editing (e.g. a Create and an Update button).
          </p>
          <Field label="Label (empty = icon only)">
            <Input
              value={config.addButton.label}
              onChange={(e) => set('addButton', { ...config.addButton, label: e.target.value })}
              placeholder="Add"
            />
          </Field>
          <Field label="Icon">
            <IconPicker
              value={config.addButton.icon}
              onChange={(v) => set('addButton', { ...config.addButton, icon: v })}
            />
          </Field>
          <Field label="Variant">
            <SegmentedControl
              options={BUTTON_VARIANT_OPTIONS}
              value={config.addButton.variant}
              onChange={(v) =>
                set('addButton', { ...config.addButton, variant: v as ButtonConfig['variant'] })
              }
              aria-label="Add button variant"
            />
          </Field>
        </div>
      )}
      <Toggle
        label="Edit action"
        checked={config.canEdit}
        onChange={(v) => set('canEdit', v)}
      />
      {(config.canEdit || config.canAdd) && (
        <>
          <EditContentsButton itemId={itemId}>
            {config.canEdit ? 'Edit modal contents' : 'Add modal contents'}
          </EditContentsButton>
          <p className="text-ui-sm leading-relaxed text-ink-3">
            The edit button opens a modal with these contents; the selected row
            prefills fields whose names match its columns.
          </p>
          <Field label="Modal max width (CSS)">
            <Input
              value={config.modalMaxWidth}
              onChange={(e) => set('modalMaxWidth', e.target.value)}
              placeholder="800px"
              className="font-mono"
            />
          </Field>
          <Field label="Modal min width (CSS)">
            <Input
              value={config.modalMinWidth}
              onChange={(e) => set('modalMinWidth', e.target.value)}
              placeholder="700px"
              className="font-mono"
            />
          </Field>
          <Field label="Modal max height (CSS)">
            <Input
              value={config.modalMaxHeight}
              onChange={(e) => set('modalMaxHeight', e.target.value)}
              placeholder="80vh"
              className="font-mono"
            />
          </Field>
        </>
      )}
      <Toggle
        label="Delete action"
        checked={config.canDelete}
        onChange={(v) => set('canDelete', v)}
      />
      {config.canDelete && (
        <>
          <Field label="Delete endpoint (API page)">
            <EndpointPicker
              value={config.deleteEndpointId}
              onChange={setDeleteEndpoint}
            />
          </Field>
          {config.deleteEndpointId == null && (
            <WiringHint>
              Pick an endpoint — without one, Delete shows nothing to call.
            </WiringHint>
          )}
          {deleteEndpoint && deleteEndpoint.method !== 'DELETE' && (
            <WiringHint>
              “{deleteEndpoint.name || '(unnamed)'}” is {deleteEndpoint.method}, not
              DELETE — fine for soft deletes, just checking it’s intentional.
            </WiringHint>
          )}
          {deleteParamKeys.map((param) => (
            <Field key={param} label={`URL param :${param} → row field`}>
              <Input
                value={config.deleteParams[param] ?? ''}
                onChange={(e) =>
                  set('deleteParams', { ...config.deleteParams, [param]: e.target.value })
                }
                placeholder="_id"
                className="font-mono"
              />
            </Field>
          ))}
          <Toggle
            label="Confirm before delete"
            checked={config.deleteConfirmEnabled}
            onChange={(v) => set('deleteConfirmEnabled', v)}
          />
          {config.deleteConfirmEnabled && (
            <>
              <Field label="Confirm title">
                <Input
                  value={config.deleteConfirmTitle}
                  onChange={(e) => set('deleteConfirmTitle', e.target.value)}
                />
              </Field>
              <Field label="Confirm description">
                <Input
                  value={config.deleteConfirmDescription}
                  onChange={(e) => set('deleteConfirmDescription', e.target.value)}
                />
              </Field>
            </>
          )}
          <Toggle
            label="Reload table after delete"
            checked={config.deleteIsReload}
            onChange={(v) => set('deleteIsReload', v)}
          />
          <Toggle
            label="Success snackbar"
            checked={config.deleteSnackbarSuccessEnabled}
            onChange={(v) => set('deleteSnackbarSuccessEnabled', v)}
          />
          {config.deleteSnackbarSuccessEnabled && (
            <>
              <Field label="Snackbar variant">
                <Select
                  options={SNACKBAR_VARIANT_OPTIONS}
                  value={config.deleteSnackbarSuccessType}
                  onChange={(v) =>
                    set('deleteSnackbarSuccessType', v as ButtonSnackbarVariant)
                  }
                />
              </Field>
              <Field label="Snackbar message">
                <Input
                  value={config.deleteSnackbarSuccessMessage}
                  onChange={(e) => set('deleteSnackbarSuccessMessage', e.target.value)}
                  placeholder="Deleted successfully"
                />
              </Field>
            </>
          )}
          <Toggle
            label="Show API error as snackbar"
            checked={config.deleteSnackbarErrorException}
            onChange={(v) => set('deleteSnackbarErrorException', v)}
          />
        </>
      )}
      <Toggle
        label="Search box"
        checked={config.canSearchAllColumns}
        onChange={(v) => set('canSearchAllColumns', v)}
      />
      <Toggle
        label="Resizable columns (drag header edges)"
        checked={config.canResizeColumns}
        onChange={(v) => set('canResizeColumns', v)}
      />
      <Field label="Header gap (title · Add · search)">
        <Select
          options={HEADER_GAP_OPTIONS}
          value={config.headerGap}
          onChange={(v) => set('headerGap', v as DataTableConfig['headerGap'])}
        />
      </Field>
      <Field label="Cell lines (a cut cell shows its whole text in a tooltip)">
        <Select
          options={LINE_OPTIONS}
          value={String(config.cellLines)}
          onChange={(v) => set('cellLines', parseLines(v))}
        />
      </Field>
      {config.canSearchAllColumns && config.pagination.enabled && !config.pagination.searchKey && (
        <WiringHint>
          With server pagination the box only appears once a search key is set
          above — the API has to take the term.
        </WiringHint>
      )}
    </div>
  )
}
