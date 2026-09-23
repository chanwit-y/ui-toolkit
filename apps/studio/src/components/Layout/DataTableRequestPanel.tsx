import type { ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { EndpointDef } from '../Api/types'
import { urlParams } from '../Api/warnings'
import type { ModelDef } from '../Model/types'
import { FieldPicker, IconButton, IconPicker, Input, SegmentedControl, Select } from '../common'
import { EditContentsButton } from './ContainerHostConfigPanel'
import { useActiveItems } from './gridStore'
import { paginationPlacement, segmentFields, type RowFields } from './rowFields'
import {
  BUTTON_VARIANT_OPTIONS,
  type ButtonConfig,
  type DataTableConfig,
  type DataTableSortConfig,
  type GridItemData,
  type RequestMapRow,
  type RequestSource,
} from './types'

type SetConfig = <K extends keyof DataTableConfig>(key: K, value: DataTableConfig[K]) => void

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
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

/** The field names of a filter form: every named item of the canvas, nested containers included. */
export function filterFieldNames(items: GridItemData[]): string[] {
  const names: string[] = []
  const walk = (list: GridItemData[]) => {
    for (const item of list) {
      const name = (item.config as { name?: unknown } | undefined)?.name
      if (item.type !== 'datatable' && item.type !== 'modal' && typeof name === 'string' && name) names.push(name)
      for (const canvas of item.childCanvases ?? []) walk(canvas.items)
    }
  }
  walk(items)
  return [...new Set(names)]
}

/** The filter form's field names of the table being inspected (its second child canvas). */
function useFilterFields(itemId: string): string[] {
  const item = useActiveItems().find((i) => i.id === itemId)
  return filterFieldNames(item?.childCanvases?.[1]?.items ?? [])
}

const DISPLAY_OPTIONS = [
  { value: 'popover', label: 'Popover' },
  { value: 'inline', label: 'Inline bar' },
]

/**
 * "Server filters": the engine's `filterContainer`. The filter form is the
 * table's second child canvas (drill in to build it from ordinary inputs); the
 * Request mapping section below then sends its fields with the read call.
 */
export function ServerFiltersSection({
  itemId,
  config,
  set,
}: {
  itemId: string
  config: DataTableConfig
  set: SetConfig
}) {
  const fields = useFilterFields(itemId)
  const fieldOptions: RowFields = { fields: fields.map((name) => ({ name, kind: 'string' })) }
  const button = (patch: Partial<ButtonConfig>) => set('filterButton', { ...config.filterButton, ...patch })
  const defaults = config.filterDefaults
  return (
    <>
      <Toggle
        label="Server filters (filter form → API)"
        checked={config.filtersEnabled}
        onChange={(v) => set('filtersEnabled', v)}
      />
      {config.filtersEnabled && (
        <div className="space-y-2 rounded-lg border border-line bg-panel p-2">
          <EditContentsButton itemId={itemId} canvasIndex={1}>
            Edit filter form
          </EditContentsButton>
          <p className="text-ui-sm leading-relaxed text-ink-3">
            {fields.length > 0
              ? `Fields: ${fields.join(', ')}. Map them into the request below; the table adds Apply / Clear and calls the API on Apply.`
              : 'Drop inputs into the filter form, then map them into the request below. The table adds Apply / Clear.'}
          </p>
          <Field label="Display">
            <SegmentedControl
              options={DISPLAY_OPTIONS}
              value={config.filterDisplay}
              onChange={(v) => set('filterDisplay', v as DataTableConfig['filterDisplay'])}
              aria-label="Filter display"
            />
          </Field>
          {config.filterDisplay === 'popover' && (
            <>
              <Field label="Button label (empty = icon only)">
                <Input value={config.filterButton.label} onChange={(e) => button({ label: e.target.value })} placeholder="Filter" />
              </Field>
              <Field label="Button icon">
                <IconPicker value={config.filterButton.icon} onChange={(icon) => button({ icon })} />
              </Field>
              <Field label="Button variant">
                <SegmentedControl
                  options={BUTTON_VARIANT_OPTIONS}
                  value={config.filterButton.variant}
                  onChange={(v) => button({ variant: v as ButtonConfig['variant'] })}
                  aria-label="Filter button variant"
                />
              </Field>
            </>
          )}
          <div className="space-y-1.5">
            <span className="text-ui-sm font-medium text-ink-2">Opening values (Clear returns to them)</span>
            {defaults.map((row, index) => (
              <div key={row.id} className="flex items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <FieldPicker
                    fields={fieldOptions.fields}
                    value={row.field}
                    onChange={(field) => set('filterDefaults', defaults.map((d, i) => (i === index ? { ...d, field } : d)))}
                    aria-label="Filter field"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Input
                    value={row.value}
                    onChange={(e) =>
                      set('filterDefaults', defaults.map((d, i) => (i === index ? { ...d, value: e.target.value } : d)))
                    }
                    placeholder="value"
                    className="font-mono"
                  />
                </div>
                <IconButton
                  label="Remove opening value"
                  onClick={() => set('filterDefaults', defaults.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
              </div>
            ))}
            <AddRow onClick={() => set('filterDefaults', [...defaults, { id: crypto.randomUUID(), field: '', value: '' }])}>
              Add opening value
            </AddRow>
          </div>
        </div>
      )}
    </>
  )
}

function AddRow({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-line-strong py-1 text-ui-sm font-medium text-ink-3 transition-colors hover:text-ink"
    >
      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </button>
  )
}

const SLOT_OPTIONS = [
  { value: 'query', label: 'query' },
  { value: 'body', label: 'body' },
  { value: 'params', label: 'URL :param' },
]

const SOURCE_OPTIONS = [
  { value: 'filter', label: 'Filter field' },
  { value: 'value', label: 'Fixed value' },
  { value: 'url', label: 'Current URL' },
  { value: 'state', label: 'Global state' },
]

const URL_PART_OPTIONS = [
  { value: 'param', label: 'param' },
  { value: 'query', label: 'query' },
]

function defaultRequestSource(type: string, seedKey: string): RequestSource {
  if (type === 'filter') return { type: 'filter', key: '', fallback: '' }
  if (type === 'url') return { type: 'url', key: seedKey, source: 'param' }
  if (type === 'state') return { type: 'state', key: '', path: '' }
  return { type: 'value', value: '' }
}

/** Seed one mapping row per `:param` of the endpoint URL (kept rows untouched). */
export function seedRequestParams(rows: RequestMapRow[], endpoint: EndpointDef | undefined): RequestMapRow[] {
  const wanted = endpoint ? urlParams(endpoint.url) : []
  const kept = rows.filter((row) => row.slot !== 'params' || wanted.includes(row.key))
  const missing = wanted.filter((key) => !kept.some((row) => row.slot === 'params' && row.key === key))
  return [
    ...kept,
    ...missing.map<RequestMapRow>((key) => ({
      id: crypto.randomUUID(),
      slot: 'params',
      key,
      source: { type: 'filter', key: '', fallback: '' },
    })),
  ]
}

/**
 * "Request mapping": the engine's `api.params` / `api.query` / `api.body` —
 * one row per request key, each from a filter field (with the fallback sent
 * while it is blank), a fixed value, the current URL or global state.
 */
export function RequestMappingSection({
  itemId,
  config,
  set,
  endpoint,
  models,
}: {
  itemId: string
  config: DataTableConfig
  set: SetConfig
  endpoint: EndpointDef | undefined
  models: ModelDef[]
}) {
  const filterFields = useFilterFields(itemId)
  const rows = config.requestMapping
  const patch = (index: number, next: Partial<RequestMapRow>) =>
    set('requestMapping', rows.map((row, i) => (i === index ? { ...row, ...next } : row)))
  const keyFields = (slot: RequestMapRow['slot']): RowFields =>
    slot === 'params'
      ? endpoint
        ? { fields: urlParams(endpoint.url).map((name) => ({ name, kind: 'string' })) }
        : { fields: null, reason: 'Pick the data endpoint to list its URL :params.' }
      : segmentFields(endpoint, slot, models)
  const defaultSlot: RequestMapRow['slot'] = paginationPlacement(endpoint, 'auto')

  return (
    <div className="space-y-1.5">
      <span className="text-ui-sm font-semibold text-ink-2">Request mapping</span>
      <p className="text-ui-xs leading-relaxed text-ink-3">
        What the read call sends besides paging and sort. A blank filter leaves its key out — give it a fallback when it
        feeds a URL :param.
      </p>
      {rows.map((row, index) => {
        const keys = keyFields(row.slot)
        const src = row.source
        return (
          <div key={row.id} className="space-y-1.5 rounded-md border border-line bg-panel p-2">
            <div className="flex items-center gap-1.5">
              <div className="w-28 shrink-0">
                <Select
                  aria-label="Request part"
                  options={SLOT_OPTIONS}
                  value={row.slot}
                  onChange={(slot) => patch(index, { slot: slot as RequestMapRow['slot'] })}
                />
              </div>
              <div className="min-w-0 flex-1">
                <FieldPicker
                  fields={keys.fields}
                  value={row.key}
                  onChange={(key) => patch(index, { key })}
                  aria-label="Request key"
                />
              </div>
              <IconButton label="Remove mapping" onClick={() => set('requestMapping', rows.filter((_, i) => i !== index))}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </IconButton>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-28 shrink-0">
                <Select
                  aria-label="Value source"
                  options={SOURCE_OPTIONS}
                  value={src.type}
                  onChange={(type) => patch(index, { source: defaultRequestSource(type, row.key) })}
                />
              </div>
              {src.type === 'filter' && (
                <>
                  <div className="min-w-0 flex-1">
                    <FieldPicker
                      fields={filterFields.length > 0 ? filterFields.map((name) => ({ name, kind: 'string' })) : null}
                      value={src.key}
                      onChange={(key) => patch(index, { source: { ...src, key } })}
                      aria-label="Filter field"
                    />
                  </div>
                  <div className="w-20 shrink-0">
                    <Input
                      value={src.fallback}
                      onChange={(e) => patch(index, { source: { ...src, fallback: e.target.value } })}
                      placeholder="fallback"
                      className="font-mono"
                      aria-label="Fallback while blank"
                    />
                  </div>
                </>
              )}
              {src.type === 'value' && (
                <div className="min-w-0 flex-1">
                  <Input
                    value={src.value}
                    onChange={(e) => patch(index, { source: { ...src, value: e.target.value } })}
                    placeholder="fixed value"
                    className="font-mono"
                  />
                </div>
              )}
              {src.type === 'url' && (
                <>
                  <div className="min-w-0 flex-1">
                    <Input
                      value={src.key}
                      onChange={(e) => patch(index, { source: { ...src, key: e.target.value } })}
                      placeholder="param / query name"
                      className="font-mono"
                    />
                  </div>
                  <div className="w-20 shrink-0">
                    <Select
                      aria-label="URL part"
                      options={URL_PART_OPTIONS}
                      value={src.source}
                      onChange={(part) => patch(index, { source: { ...src, source: part as 'param' | 'query' } })}
                    />
                  </div>
                </>
              )}
              {src.type === 'state' && (
                <>
                  <div className="min-w-0 flex-1">
                    <Input
                      value={src.key}
                      onChange={(e) => patch(index, { source: { ...src, key: e.target.value } })}
                      placeholder="state key"
                      className="font-mono"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Input
                      value={src.path}
                      onChange={(e) => patch(index, { source: { ...src, path: e.target.value } })}
                      placeholder="path (optional)"
                      className="font-mono"
                    />
                  </div>
                </>
              )}
            </div>
            {row.slot === 'params' && src.type === 'filter' && src.fallback === '' && (
              <p className="text-ui-xs text-warn">No fallback: the call is held until this filter is set.</p>
            )}
            {keys.fields === null && keys.reason && <p className="text-ui-xs text-ink-3">{keys.reason}</p>}
          </div>
        )
      })}
      <AddRow
        onClick={() =>
          set('requestMapping', [
            ...rows,
            { id: crypto.randomUUID(), slot: defaultSlot, key: '', source: { type: 'filter', key: '', fallback: '' } },
          ])
        }
      >
        Add request key
      </AddRow>
    </div>
  )
}

const PLACEMENT_OPTIONS = [
  { value: 'auto', label: 'auto (from the endpoint)' },
  { value: 'query', label: 'query string' },
  { value: 'body', label: 'request body' },
]

const ORDER_OPTIONS = [
  { value: 'asc', label: 'asc' },
  { value: 'desc', label: 'desc' },
]

/**
 * "Server sort": the engine's `api.sort`. The header sort icons then send the
 * clicked column's field (its Sort field, else the accessor) and direction to
 * the API instead of sorting the fetched rows.
 */
export function ServerSortSection({
  config,
  set,
  endpoint,
  models,
}: {
  config: DataTableConfig
  set: SetConfig
  endpoint: EndpointDef | undefined
  models: ModelDef[]
}) {
  const sort = config.sort
  const patch = (next: Partial<DataTableSortConfig>) => set('sort', { ...sort, ...next })
  const keys = segmentFields(endpoint, paginationPlacement(endpoint, sort.placement), models)
  const sortable = config.columns.filter((c) => c.enableSorting && c.accessor)
  return (
    <>
      <Toggle label="Server sort (sort icons → API)" checked={sort.enabled} onChange={(enabled) => patch({ enabled })} />
      {sort.enabled && (
        <div className="space-y-2 rounded-lg border border-line bg-panel p-2">
          <Field label="Placement">
            <Select
              options={PLACEMENT_OPTIONS}
              value={sort.placement}
              onChange={(v) => patch({ placement: v as DataTableSortConfig['placement'] })}
            />
          </Field>
          <Field label="Sort key (receives the field)">
            <FieldPicker fields={keys.fields} value={sort.sortKey} onChange={(sortKey) => patch({ sortKey })} aria-label="Sort key" />
          </Field>
          <Field label="Order key (receives the direction)">
            <FieldPicker fields={keys.fields} value={sort.orderKey} onChange={(orderKey) => patch({ orderKey })} aria-label="Order key" />
          </Field>
          {keys.fields === null && keys.reason && <p className="text-ui-xs text-ink-3">{keys.reason}</p>}
          <div className="flex gap-1.5">
            <Field label="Ascending sends">
              <Input value={sort.ascValue} onChange={(e) => patch({ ascValue: e.target.value })} placeholder="asc" className="font-mono" />
            </Field>
            <Field label="Descending sends">
              <Input value={sort.descValue} onChange={(e) => patch({ descValue: e.target.value })} placeholder="desc" className="font-mono" />
            </Field>
          </div>
          <div className="flex gap-1.5">
            <div className="min-w-0 flex-1">
              <Field label="Opening sort">
                <Select
                  options={[
                    { value: '', label: '— none —' },
                    ...sortable.map((c) => ({ value: c.sortField || c.accessor, label: c.header || c.accessor })),
                  ]}
                  value={sort.defaultField}
                  onChange={(defaultField) => patch({ defaultField })}
                />
              </Field>
            </div>
            <div className="w-24 shrink-0">
              <Field label="Order">
                <Select
                  options={ORDER_OPTIONS}
                  value={sort.defaultOrder}
                  onChange={(v) => patch({ defaultOrder: v as 'asc' | 'desc' })}
                />
              </Field>
            </div>
          </div>
          {(!sort.sortKey || !sort.orderKey) && (
            <p className="text-ui-xs text-warn">Set both keys — until then the sort isn&rsquo;t exported.</p>
          )}
          <p className="text-ui-xs leading-relaxed text-ink-3">
            A column sends its accessor; set a column&rsquo;s Sort field (More) when the API names it differently.
          </p>
        </div>
      )}
    </>
  )
}
