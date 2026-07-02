import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { IconButton, Input, Select } from '../common'
import { useGridStore } from './gridStore'
import { EndpointPicker } from './SelectFieldConfigPanel'
import {
  createEditableTableColumn,
  type DataTableEditableColumnConfig,
  type DataTableEditableConfig,
  type EditableTableOption,
} from './types'

const EDITOR_OPTIONS = ['text', 'number', 'date', 'select', 'checkbox'].map((v) => ({
  value: v,
  label: v,
}))
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

/**
 * Structured editor for the `select` editor's options — one row per
 * `{value, label}` with add/remove, like the radio/checkbox option editors
 * (the shape is fixed, so no raw-JSON textarea).
 */
function SelectOptionsEditor({
  options,
  onChange,
}: {
  options: EditableTableOption[]
  onChange: (options: EditableTableOption[]) => void
}) {
  const patch = (index: number, p: Partial<EditableTableOption>) =>
    onChange(options.map((o, i) => (i === index ? { ...o, ...p } : o)))
  const remove = (index: number) => onChange(options.filter((_, i) => i !== index))
  const add = () =>
    onChange([
      ...options,
      { value: `option_${options.length + 1}`, label: `Option ${options.length + 1}` },
    ])

  return (
    <Field label="Select options">
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={option.value}
              onChange={(e) => patch(index, { value: e.target.value })}
              placeholder="value"
              className="font-mono"
            />
            <Input
              value={option.label}
              onChange={(e) => patch(index, { label: e.target.value })}
              placeholder="label"
            />
            <IconButton
              label={`Remove option ${index + 1}`}
              onClick={() => remove(index)}
              className="h-6! w-6! shrink-0 text-zinc-400 hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-zinc-300 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-teal-400 hover:text-teal-600"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add option
        </button>
      </div>
    </Field>
  )
}

/** Numeric input committed as `number | ''` (empty = unset), like width/maxLength. */
function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | ''
  onChange: (value: number | '') => void
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value}
        placeholder="unset"
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
    </Field>
  )
}

/**
 * The columns editor: expandable cards like the data table's, but each expanded
 * card also carries the editable-only knobs — the `editor` kind, its
 * editor-specific section (select options, number bounds, text constraints),
 * and the `editable`/`isRequired` toggles. Everything is carried across editor
 * switches (lossless); only the relevant section is *shown*, and only the
 * relevant fields are exported. No validation of accessors — like the other
 * option editors, the preview shows the consequence.
 */
function ColumnsEditor({
  columns,
  onChange,
}: {
  columns: DataTableEditableColumnConfig[]
  onChange: (columns: DataTableEditableColumnConfig[]) => void
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const patch = (index: number, p: Partial<DataTableEditableColumnConfig>) =>
    onChange(columns.map((c, i) => (i === index ? { ...c, ...p } : c)))
  const remove = (index: number) => {
    onChange(columns.filter((_, i) => i !== index))
    setExpandedIndex((e) => (e === null ? null : e === index ? null : e > index ? e - 1 : e))
  }
  const add = () =>
    onChange([
      ...columns,
      createEditableTableColumn(`column${columns.length + 1}`, `Column ${columns.length + 1}`),
    ])
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
                  value={column.accessorKey}
                  onChange={(e) => patch(index, { accessorKey: e.target.value })}
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
                  <Field label="Editor">
                    <Select
                      options={EDITOR_OPTIONS}
                      value={column.editor}
                      onChange={(v) =>
                        patch(index, { editor: v as DataTableEditableColumnConfig['editor'] })
                      }
                    />
                  </Field>

                  {column.editor === 'select' && (
                    <SelectOptionsEditor
                      options={column.options}
                      onChange={(options) => patch(index, { options })}
                    />
                  )}
                  {column.editor === 'number' && (
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField
                        label="Min"
                        value={column.min}
                        onChange={(min) => patch(index, { min })}
                      />
                      <NumberField
                        label="Max"
                        value={column.max}
                        onChange={(max) => patch(index, { max })}
                      />
                    </div>
                  )}
                  {column.editor === 'text' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <NumberField
                          label="Min length"
                          value={column.minLength}
                          onChange={(minLength) => patch(index, { minLength })}
                        />
                        <NumberField
                          label="Max length"
                          value={column.maxLength}
                          onChange={(maxLength) => patch(index, { maxLength })}
                        />
                      </div>
                      <Field label="Pattern (regex)">
                        <Input
                          value={column.pattern}
                          onChange={(e) => patch(index, { pattern: e.target.value })}
                          placeholder="^[A-Za-z]*$"
                          className="font-mono"
                        />
                      </Field>
                      {column.pattern !== '' && (
                        <Field label="Pattern error message">
                          <Input
                            value={column.patternMessage}
                            onChange={(e) => patch(index, { patternMessage: e.target.value })}
                          />
                        </Field>
                      )}
                    </div>
                  )}

                  <Toggle
                    label="Editable"
                    checked={column.editable}
                    onChange={(v) => patch(index, { editable: v })}
                  />
                  <Toggle
                    label="Required"
                    checked={column.isRequired}
                    onChange={(v) => patch(index, { isRequired: v })}
                  />
                  {column.isRequired && (
                    <Field label="Required message">
                      <Input
                        value={column.requiredMessage}
                        onChange={(e) => patch(index, { requiredMessage: e.target.value })}
                      />
                    </Field>
                  )}
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
                        patch(index, { align: v as DataTableEditableColumnConfig['align'] })
                      }
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

type DataTableEditableConfigPanelProps = {
  itemId: string
  config: DataTableEditableConfig
}

/**
 * Editor for an editable table's config. Every control writes through
 * `updateItemConfig`, driving the live canvas preview and the exported JSON.
 * The three action toggles model `apiCrud.create/update/delete` presence (the
 * component shows an action only when its API is set); the export emits
 * skeleton API refs with empty names for the consumer to wire.
 */
export function DataTableEditableConfigPanel({
  itemId,
  config,
}: DataTableEditableConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof DataTableEditableConfig>(
    key: K,
    value: DataTableEditableConfig[K],
  ) => updateItemConfig(itemId, { [key]: value } as Partial<DataTableEditableConfig>)

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Editable Table
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

      <Field label="Row id key">
        <Input
          value={config.idKey}
          onChange={(e) => set('idKey', e.target.value)}
          className="font-mono"
        />
      </Field>

      <ColumnsEditor
        columns={config.columns}
        onChange={(columns) => set('columns', columns)}
      />

      <Toggle
        label="Add row action"
        checked={config.canCreate}
        onChange={(v) => set('canCreate', v)}
      />
      <Toggle
        label="Edit row action"
        checked={config.canUpdate}
        onChange={(v) => set('canUpdate', v)}
      />
      <Toggle
        label="Delete row action"
        checked={config.canDelete}
        onChange={(v) => set('canDelete', v)}
      />

      {/* Optional CRUD endpoint refs (API page). A set ref exports its
          endpoint's current name (and read fetches live in the preview);
          unset refs keep the empty-name skeleton the consumer wires. The
          mutation pickers only show while their action toggle is on. */}
      <h4 className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        API endpoints (optional)
      </h4>
      <Field label="Read">
        <EndpointPicker
          value={config.readEndpointId}
          onChange={(id) => set('readEndpointId', id)}
        />
      </Field>
      {config.canCreate && (
        <Field label="Create">
          <EndpointPicker
            value={config.createEndpointId}
            onChange={(id) => set('createEndpointId', id)}
          />
        </Field>
      )}
      {config.canUpdate && (
        <Field label="Update">
          <EndpointPicker
            value={config.updateEndpointId}
            onChange={(id) => set('updateEndpointId', id)}
          />
        </Field>
      )}
      {config.canDelete && (
        <Field label="Delete">
          <EndpointPicker
            value={config.deleteEndpointId}
            onChange={(id) => set('deleteEndpointId', id)}
          />
        </Field>
      )}
    </div>
  )
}
