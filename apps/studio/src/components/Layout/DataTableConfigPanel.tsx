import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { IconButton, Input, Select } from '../common'
import { useGridStore } from './gridStore'
import type { DataTableColumnConfig, DataTableConfig } from './types'

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
 * table, so cards reorder with up/down arrows (dnd inside the 288px sidebar is
 * overkill). Every mutation commits a fresh array through `onChange`, driving the
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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const patch = (index: number, p: Partial<DataTableColumnConfig>) =>
    onChange(columns.map((c, i) => (i === index ? { ...c, ...p } : c)))
  const remove = (index: number) => {
    onChange(columns.filter((_, i) => i !== index))
    setExpandedIndex((e) => (e === null ? null : e === index ? null : e > index ? e - 1 : e))
  }
  const add = () => onChange([...columns, newColumn(columns.length + 1)])
  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir
    if (to < 0 || to >= columns.length) return
    const next = columns.slice()
    ;[next[index], next[to]] = [next[to], next[index]]
    onChange(next)
    // The expanded card follows its column when either side of the swap moves.
    setExpandedIndex((e) => (e === index ? to : e === to ? index : e))
  }

  return (
    <Field label="Columns">
      <div className="space-y-2">
        {columns.map((column, index) => {
          const expanded = expandedIndex === index
          return (
            <div
              key={index}
              className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-2"
            >
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
                <button
                  type="button"
                  onClick={() => setExpandedIndex(expanded ? null : index)}
                  className="flex items-center gap-0.5 text-xs font-medium text-zinc-500 transition-colors hover:text-teal-600"
                >
                  {expanded ? (
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {expanded ? 'Less' : 'More'}
                </button>
                <div className="flex items-center gap-1">
                  <IconButton
                    label={`Move column ${index + 1} up`}
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="h-6! w-6! text-zinc-400 hover:text-teal-600 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Move column ${index + 1} down`}
                    onClick={() => move(index, 1)}
                    disabled={index === columns.length - 1}
                    className="h-6! w-6! text-zinc-400 hover:text-teal-600 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Remove column ${index + 1}`}
                    onClick={() => remove(index)}
                    className="h-6! w-6! text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                </div>
              </div>
            </div>
          )
        })}
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
 * JSON. The API endpoint / modal container halves of `DataTableElement` aren't
 * authorable here (see `DataTableConfig`), and "Search all columns" only affects
 * the preview — the engine renders search unconditionally.
 */
export function DataTableConfigPanel({ itemId, config }: DataTableConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof DataTableConfig>(key: K, value: DataTableConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<DataTableConfig>)

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

      <ColumnsEditor
        columns={config.columns}
        onChange={(columns) => set('columns', columns)}
      />

      <Toggle
        label="Edit action"
        checked={config.canEdit}
        onChange={(v) => set('canEdit', v)}
      />
      <Toggle
        label="Delete action"
        checked={config.canDelete}
        onChange={(v) => set('canDelete', v)}
      />
      <Toggle
        label="Search all columns (preview only)"
        checked={config.canSearchAllColumns}
        onChange={(v) => set('canSearchAllColumns', v)}
      />
    </div>
  )
}
