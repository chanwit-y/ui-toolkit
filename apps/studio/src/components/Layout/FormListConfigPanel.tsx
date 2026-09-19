import { useState, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { urlParams } from '../Api/warnings'
import { useProjectEndpoints } from '../Library/scope'
import { IconButton, IconField, Input, Select } from '../common'
import { defaultSource, ParamSourceFields, WiringHint } from './ButtonConfigPanel'
import { EditContentsButton } from './ContainerHostConfigPanel'
import { useGridStore } from './gridStore'
import { EndpointPicker } from './SelectFieldConfigPanel'
import type { FormListConfig, FormListCrudRef, NavParamSource } from './types'

const ADD_POSITION_OPTIONS = [
  { value: 'bottom', label: 'Below the rows' },
  { value: 'top', label: 'Above the rows' },
]
const ALIGN_OPTIONS = [
  { value: 'start', label: 'start' },
  { value: 'center', label: 'center' },
  { value: 'end', label: 'end' },
]
const DISPLAY_OPTIONS = [
  { value: 'both', label: 'Icon + label' },
  { value: 'icon', label: 'Icon only' },
  { value: 'label', label: 'Label only' },
]
const REMOVE_POSITION_OPTIONS = [
  { value: 'end', label: 'End of the row' },
  { value: 'start', label: 'Start of the row' },
  { value: 'below', label: 'Below the fields' },
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

function Heading({ children }: { children: ReactNode }) {
  return (
    <h4 className="pt-1 text-ui-sm font-semibold uppercase tracking-wide text-ink-3">{children}</h4>
  )
}

/**
 * Free-form key → source map (the read call's query, a mutation's extra body
 * fields): one card per key with an editable key beside the source controls.
 * Keys are edited in place — a renamed key keeps its source. Row sources are
 * never offered here (the row's own values already form the body).
 */
function ExtraMapEditor({
  label,
  value,
  onChange,
}: {
  label: string
  value: Record<string, NavParamSource>
  onChange: (next: Record<string, NavParamSource>) => void
}) {
  // Stable card identities so a key edit doesn't remount its inputs.
  const [order, setOrder] = useState<{ id: string; key: string }[]>(() =>
    Object.keys(value).map((key) => ({ id: crypto.randomUUID(), key })),
  )
  // Keys that arrived from outside (undo, hydrate) get cards too.
  const known = new Set(order.map((o) => o.key))
  const cards = [
    ...order.filter((o) => o.key in value),
    ...Object.keys(value)
      .filter((k) => !known.has(k))
      .map((key) => ({ id: key, key })),
  ]
  const rename = (card: { id: string; key: string }, next: string) => {
    if (next === card.key) return
    const entries = Object.entries(value).map(([k, v]) => (k === card.key ? [next, v] : [k, v]))
    onChange(Object.fromEntries(entries))
    setOrder((o) => o.map((c) => (c.id === card.id ? { ...c, key: next } : c)))
  }
  const remove = (card: { id: string; key: string }) => {
    const { [card.key]: _dropped, ...rest } = value
    onChange(rest)
    setOrder((o) => o.filter((c) => c.id !== card.id))
  }
  const add = () => {
    let key = `field${cards.length + 1}`
    while (key in value) key = `${key}_`
    onChange({ ...value, [key]: defaultSource('url', '') })
    setOrder((o) => [...o, { id: crypto.randomUUID(), key }])
  }
  return (
    <Field label={label}>
      <div className="space-y-2">
        {cards.map((card) => (
          <ParamSourceFields
            key={card.id}
            label={
              <span className="flex items-center gap-1">
                <Input
                  value={card.key}
                  onChange={(e) => rename(card, e.target.value)}
                  placeholder="key"
                  className="font-mono"
                  aria-label="Field key"
                />
                <IconButton
                  label={`Remove ${card.key}`}
                  onClick={() => remove(card)}
                  className="h-6! w-6! shrink-0 text-ink-3 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
              </span>
            }
            value={value[card.key]}
            onChange={(src) => onChange({ ...value, [card.key]: src })}
            seedKey={card.key}
          />
        ))}
        <button
          type="button"
          onClick={add}
          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-line-strong py-1.5 text-ui-sm font-medium text-ink-3 transition-colors hover:border-focus hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add field
        </button>
      </div>
    </Field>
  )
}

/**
 * One CRUD call: the endpoint, a source per `:param` of its URL (seeded on
 * pick — a row field for mutations, the URL for the read — and pruned to the
 * current placeholders at export), and the free-form extra map.
 */
export function CrudRefEditor({
  value,
  onChange,
  allowRow,
  extraLabel,
}: {
  value: FormListCrudRef
  onChange: (next: FormListCrudRef) => void
  allowRow: boolean
  extraLabel: string
}) {
  const endpoints = useProjectEndpoints()
  const url = endpoints.find((e) => e.id === value.endpointId)?.url ?? ''
  const keys = value.endpointId != null ? urlParams(url) : []
  const seedType: NavParamSource['type'] = allowRow ? 'row' : 'url'
  const pick = (endpointId: string | null) => {
    const nextUrl = endpoints.find((e) => e.id === endpointId)?.url ?? ''
    const params = Object.fromEntries(
      urlParams(nextUrl).map((k) => [k, value.params[k] ?? defaultSource(seedType, k)]),
    )
    onChange({ ...value, endpointId, params })
  }
  return (
    <div className="space-y-2">
      <Field label="Endpoint (API page)">
        <EndpointPicker value={value.endpointId} onChange={pick} />
      </Field>
      {keys.map((k) => (
        <ParamSourceFields
          key={k}
          label={`:${k}`}
          value={value.params[k] ?? defaultSource(seedType, k)}
          onChange={(src) => onChange({ ...value, params: { ...value.params, [k]: src } })}
          allowRow={allowRow}
          seedKey={k}
        />
      ))}
      {value.endpointId != null && (
        <ExtraMapEditor
          label={extraLabel}
          value={value.extra}
          onChange={(extra) => onChange({ ...value, extra })}
        />
      )}
    </div>
  )
}

type FormListConfigPanelProps = {
  itemId: string
  config: FormListConfig
}

/**
 * Editor for a form list's config (see the grilled design). The row template
 * is the item's child canvas (drill in with "Edit row template"); the three
 * action toggles model `apiCrud.create/update/delete` presence; each CRUD
 * call gets an endpoint plus its `:param` sources — a row field, or the URL /
 * global state / a literal for the parent record's id.
 */
export function FormListConfigPanel({ itemId, config }: FormListConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof FormListConfig>(key: K, value: FormListConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<FormListConfig>)

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">Form List</h3>

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

      <Heading>Row template</Heading>
      <EditContentsButton itemId={itemId}>Edit row template</EditContentsButton>
      <WiringHint>
        Fields only — the list draws Save, Remove and Add around every row itself.
      </WiringHint>

      <Heading>Add button</Heading>
      <Field label="Label">
        <Input value={config.addLabel} onChange={(e) => set('addLabel', e.target.value)} placeholder="Add" />
      </Field>
      <IconField value={config.addIcon} onChange={(v) => set('addIcon', v)} placeholder="Default (plus)" />
      <Field label="Show">
        <Select
          options={DISPLAY_OPTIONS}
          value={config.addDisplay}
          onChange={(v) => set('addDisplay', v as FormListConfig['addDisplay'])}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Position">
          <Select
            options={ADD_POSITION_OPTIONS}
            value={config.addPosition}
            onChange={(v) => set('addPosition', v as FormListConfig['addPosition'])}
          />
        </Field>
        <Field label="Align">
          <Select
            options={ALIGN_OPTIONS}
            value={config.addAlign}
            onChange={(v) => set('addAlign', v as FormListConfig['addAlign'])}
          />
        </Field>
      </div>

      <Heading>Remove button</Heading>
      <Field label="Label">
        <Input value={config.removeLabel} onChange={(e) => set('removeLabel', e.target.value)} placeholder="Remove" />
      </Field>
      <IconField value={config.removeIcon} onChange={(v) => set('removeIcon', v)} placeholder="Default (trash)" />
      <Field label="Show">
        <Select
          options={DISPLAY_OPTIONS}
          value={config.removeDisplay}
          onChange={(v) => set('removeDisplay', v as FormListConfig['removeDisplay'])}
        />
      </Field>
      <Field label="Position (with Save)">
        <Select
          options={REMOVE_POSITION_OPTIONS}
          value={config.removePosition}
          onChange={(v) => set('removePosition', v as FormListConfig['removePosition'])}
        />
      </Field>

      <Heading>Other labels</Heading>
      <Field label="Save (tooltip)">
        <Input value={config.saveLabel} onChange={(e) => set('saveLabel', e.target.value)} placeholder="Save" />
      </Field>
      <Field label="Empty text">
        <Input value={config.emptyText} onChange={(e) => set('emptyText', e.target.value)} placeholder="No items yet" />
      </Field>

      <Heading>Read</Heading>
      <CrudRefEditor
        value={config.read}
        onChange={(read) => set('read', read)}
        allowRow={false}
        extraLabel="Query fields"
      />
      {config.read.endpointId != null && (
        <Field label="Response row path (dot path)">
          <Input
            value={config.readPaths}
            onChange={(e) => set('readPaths', e.target.value)}
            placeholder="data"
            className="font-mono"
          />
        </Field>
      )}
      {config.read.endpointId == null && (
        <WiringHint>Pick a read endpoint — the list has no rows without one.</WiringHint>
      )}

      <Heading>Create</Heading>
      <Toggle label="Add row action" checked={config.canCreate} onChange={(v) => set('canCreate', v)} />
      {config.canCreate && (
        <CrudRefEditor
          value={config.create}
          onChange={(create) => set('create', create)}
          allowRow
          extraLabel="Extra body fields"
        />
      )}

      <Heading>Update</Heading>
      <Toggle label="Save row action" checked={config.canUpdate} onChange={(v) => set('canUpdate', v)} />
      {config.canUpdate && (
        <CrudRefEditor
          value={config.update}
          onChange={(update) => set('update', update)}
          allowRow
          extraLabel="Extra body fields"
        />
      )}

      <Heading>Delete</Heading>
      <Toggle label="Remove row action" checked={config.canDelete} onChange={(v) => set('canDelete', v)} />
      {config.canDelete && (
        <>
          <CrudRefEditor
            value={config.delete}
            onChange={(del) => set('delete', del)}
            allowRow
            extraLabel="Extra body fields"
          />
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
        </>
      )}
    </div>
  )
}
