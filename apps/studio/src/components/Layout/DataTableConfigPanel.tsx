import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { IconButton, Input, Select, SortableCardList } from '../common'
import { useApiStore } from '../Api/apiStore'
import { urlParams } from '../Api/warnings'
import { useGridStore } from './gridStore'
import { EditContentsButton } from './ContainerHostConfigPanel'
import { EndpointPicker } from './SelectFieldConfigPanel'
import { SNACKBAR_VARIANT_OPTIONS, WiringHint } from './ButtonConfigPanel'
import type { ButtonSnackbarVariant, DataTableColumnConfig, DataTableConfig } from './types'

const ALIGN_OPTIONS = [
  { value: 'start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'end', label: 'end' },
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
        className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500/30"
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
  }
}

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
}: {
  columns: DataTableColumnConfig[]
  onChange: (columns: DataTableColumnConfig[]) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const patch = (index: number, p: Partial<DataTableColumnConfig>) =>
    onChange(columns.map((c, i) => (i === index ? { ...c, ...p } : c)))
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
          cardClassName="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-2"
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
                </div>
              )}

              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  {grip}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : column.id)}
                    className="flex items-center gap-0.5 text-xs font-medium text-zinc-500 transition-colors hover:text-teal-600"
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
                  className="h-6! w-6! text-zinc-400 hover:text-red-500"
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
          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-zinc-300 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-teal-400 hover:text-teal-600"
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
  const endpoints = useApiStore((s) => s.endpoints)
  const set = <K extends keyof DataTableConfig>(key: K, value: DataTableConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<DataTableConfig>)

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
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
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
        <EndpointPicker
          value={config.endpointId}
          onChange={(endpointId) => set('endpointId', endpointId)}
        />
      </Field>

      {config.endpointId != null && (
        <Field label="Response row path (dot path)">
          <Input
            value={config.apiPaths}
            onChange={(e) => set('apiPaths', e.target.value)}
            placeholder="data"
            className="font-mono"
          />
        </Field>
      )}

      <ColumnsEditor
        columns={config.columns}
        onChange={(columns) => set('columns', columns)}
      />

      <Toggle
        label="Edit action"
        checked={config.canEdit}
        onChange={(v) => set('canEdit', v)}
      />
      {config.canEdit && (
        <>
          <EditContentsButton itemId={itemId}>Edit modal contents</EditContentsButton>
          <p className="text-[11px] leading-relaxed text-zinc-400">
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
        label="Search all columns (preview only)"
        checked={config.canSearchAllColumns}
        onChange={(v) => set('canSearchAllColumns', v)}
      />
    </div>
  )
}
