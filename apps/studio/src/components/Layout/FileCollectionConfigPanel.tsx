import { useState, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { urlParams } from '../Api/warnings'
import { useProjectEndpoints } from '../Library/scope'
import { IconButton, IconField, Input, Select, SortableCardList } from '../common'
import { createDefaultNavigate, type ButtonSnackbarVariant } from './types'
import { defaultSource, NavigateEditor, ParamSourceFields, WiringHint } from './ButtonConfigPanel'
import { CrudRefEditor } from './FormListConfigPanel'
import { useGridStore } from './gridStore'
import { EndpointPicker } from './SelectFieldConfigPanel'
import {
  FILE_COLLECTION_BODY_SLOTS,
  FILE_COLLECTION_MUTATION_SLOTS,
  FILE_COLLECTION_NODE_FIELDS,
  type FileCollectionConfig,
  type FileCollectionDeleteSlot,
  type FileCollectionMutationSlot,
  type FileCollectionNewItemConfig,
  type FormListCrudRef,
  type NavParamSource,
} from './types'

const SNACKBAR_VARIANT_OPTIONS = [
  { value: 'success', label: 'success' },
  { value: 'error', label: 'error' },
  { value: 'info', label: 'info' },
  { value: 'warning', label: 'warning' },
  { value: 'neutral', label: 'neutral' },
]
const NODE_TYPE_OPTIONS = [
  { value: 'folder', label: 'Folder' },
  { value: 'file', label: 'File' },
]

const SLOT_LABELS: Record<FileCollectionMutationSlot, { label: string; hint: string; body?: string }> = {
  createCollection: { label: 'Create collection', hint: 'the header + and the empty state’s Add collection', body: '{ name }' },
  renameCollection: { label: 'Rename collection', hint: 'double-click / F2 / the … menu on a collection', body: '{ name }' },
  deleteCollection: { label: 'Delete collection', hint: 'the … menu entry on a collection (non-empty allowed)' },
  createItem: { label: 'Create item', hint: 'the New menu on collections and folders', body: '{ collectionId, parentId, name, type, kind }' },
  renameItem: { label: 'Rename item', hint: 'double-click / F2 / the … menu on a node', body: '{ name }' },
  deleteItem: { label: 'Delete item', hint: 'the … menu entry on a node (a non-empty folder is blocked)' },
  moveItem: { label: 'Move item', hint: 'drag-and-drop and the Move to picker', body: '{ collectionId, parentId }' },
  duplicateItem: { label: 'Duplicate item', hint: 'the … menu entry on a file' },
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
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
  return <h4 className="pt-1 text-ui-sm font-semibold uppercase tracking-wide text-ink-3">{children}</h4>
}

/**
 * One mutation slot: the endpoint and a source per `:param` of its URL,
 * seeded as a `row` source named like the param (`id` → the node's `id`).
 * No extra map — the bodies are fixed by the engine (amendment 1); a
 * body-bearing slot warns when the picked endpoint declares no body model
 * (amendment 5).
 */
function SlotEditor({
  slot,
  value,
  onChange,
}: {
  slot: FileCollectionMutationSlot
  value: FormListCrudRef
  onChange: (next: FormListCrudRef) => void
}) {
  const endpoints = useProjectEndpoints()
  const endpoint = endpoints.find((e) => e.id === value.endpointId)
  const keys = value.endpointId != null ? urlParams(endpoint?.url ?? '') : []
  const meta = SLOT_LABELS[slot]
  const pick = (endpointId: string | null) => {
    const nextUrl = endpoints.find((e) => e.id === endpointId)?.url ?? ''
    const params = Object.fromEntries(urlParams(nextUrl).map((k) => [k, value.params[k] ?? defaultSource('row', k)]))
    onChange({ ...value, endpointId, params })
  }
  const needsBody = FILE_COLLECTION_BODY_SLOTS.has(slot)
  return (
    <div className="space-y-2">
      <Field label={`${meta.label} endpoint`}>
        <EndpointPicker value={value.endpointId} onChange={pick} />
      </Field>
      {value.endpointId == null && <p className="text-ui-xs text-ink-3">Unwired — hides {meta.hint}.</p>}
      {keys.map((k) => (
        <ParamSourceFields
          key={k}
          label={`:${k} (node field: ${FILE_COLLECTION_NODE_FIELDS.join(' | ')})`}
          value={value.params[k] ?? defaultSource('row', k)}
          onChange={(src: NavParamSource) => onChange({ ...value, params: { ...value.params, [k]: src } })}
          allowRow
          seedKey={k}
        />
      ))}
      {needsBody && endpoint && endpoint.body == null && (
        <WiringHint>
          This endpoint declares no body model, so the engine sends no body — it posts <code>{meta.body}</code>. Give the endpoint a body model.
        </WiringHint>
      )}
    </div>
  )
}

/** The confirm + snackbar fields of a delete slot. */
function DeleteFields({ value, onChange }: { value: FileCollectionDeleteSlot; onChange: (next: FileCollectionDeleteSlot) => void }) {
  const set = <K extends keyof FileCollectionDeleteSlot>(key: K, v: FileCollectionDeleteSlot[K]) => onChange({ ...value, [key]: v })
  return (
    <>
      <Toggle label="Confirm before delete" checked={value.confirmEnabled} onChange={(v) => set('confirmEnabled', v)} />
      {value.confirmEnabled && (
        <>
          <Field label="Confirm title">
            <Input value={value.confirmTitle} onChange={(e) => set('confirmTitle', e.target.value)} />
          </Field>
          <Field label="Confirm description ({{name}}, {{count}})">
            <Input value={value.confirmDescription} onChange={(e) => set('confirmDescription', e.target.value)} />
          </Field>
        </>
      )}
      <Toggle label="Success snackbar" checked={value.snackbarSuccessEnabled} onChange={(v) => set('snackbarSuccessEnabled', v)} />
      {value.snackbarSuccessEnabled && (
        <>
          <Field label="Snackbar variant">
            <Select
              options={SNACKBAR_VARIANT_OPTIONS}
              value={value.snackbarSuccessType}
              onChange={(v) => set('snackbarSuccessType', v as ButtonSnackbarVariant)}
            />
          </Field>
          <Field label="Snackbar message">
            <Input value={value.snackbarSuccessMessage} onChange={(e) => set('snackbarSuccessMessage', e.target.value)} placeholder="Deleted" />
          </Field>
        </>
      )}
      <Toggle label="Show API error as snackbar" checked={value.snackbarErrorException} onChange={(v) => set('snackbarErrorException', v)} />
    </>
  )
}

/** `kind` → icon rows. */
function KindIconsEditor({ value, onChange }: { value: Record<string, string>; onChange: (next: Record<string, string>) => void }) {
  const [order, setOrder] = useState<{ id: string; key: string }[]>(() => Object.keys(value).map((key) => ({ id: crypto.randomUUID(), key })))
  const known = new Set(order.map((o) => o.key))
  const cards = [...order.filter((o) => o.key in value), ...Object.keys(value).filter((k) => !known.has(k)).map((key) => ({ id: key, key }))]
  const rename = (card: { id: string; key: string }, next: string) => {
    if (next === card.key) return
    onChange(Object.fromEntries(Object.entries(value).map(([k, v]) => (k === card.key ? [next, v] : [k, v]))))
    setOrder((o) => o.map((c) => (c.id === card.id ? { ...c, key: next } : c)))
  }
  const remove = (card: { id: string; key: string }) => {
    const { [card.key]: _dropped, ...rest } = value
    onChange(rest)
    setOrder((o) => o.filter((c) => c.id !== card.id))
  }
  const add = () => {
    let key = `kind${cards.length + 1}`
    while (key in value) key = `${key}_`
    onChange({ ...value, [key]: 'file' })
    setOrder((o) => [...o, { id: crypto.randomUUID(), key }])
  }
  return (
    <div className="space-y-2">
      {cards.map((card) => (
        <div key={card.id} className="space-y-1 rounded-md border border-line bg-panel-2 p-2">
          <span className="flex items-center gap-1">
            <Input value={card.key} onChange={(e) => rename(card, e.target.value)} placeholder="kind" className="font-mono" aria-label="Kind" />
            <IconButton label={`Remove ${card.key}`} onClick={() => remove(card)} className="h-6! w-6! shrink-0 text-ink-3 hover:text-danger">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
          </span>
          <IconField value={value[card.key]} onChange={(v) => onChange({ ...value, [card.key]: v })} placeholder="file" />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-line-strong py-1.5 text-ui-sm font-medium text-ink-3 transition-colors hover:border-focus hover:text-ink"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add kind
      </button>
    </div>
  )
}

type FileCollectionConfigPanelProps = { itemId: string; config: FileCollectionConfig }

/**
 * Editor for a file collection (see `spec/gummy-file-collection-spec.md`
 * §3.4): General · Data (the nine slots) · New menu · Icons · Selection.
 */
export function FileCollectionConfigPanel({ itemId, config }: FileCollectionConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof FileCollectionConfig>(key: K, value: FileCollectionConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<FileCollectionConfig>)
  const setSlot = <K extends keyof FileCollectionConfig['endpoints']>(slot: K, value: FileCollectionConfig['endpoints'][K]) =>
    set('endpoints', { ...config.endpoints, [slot]: value })
  const list = config.endpoints.list

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">File Collection</h3>

      <Field label="Name (binding key)">
        <Input value={config.name} onChange={(e) => set('name', e.target.value)} className="font-mono" />
      </Field>
      <Field label="Title">
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} placeholder="No header text" />
      </Field>
      <Toggle label="Collapsible (48px rail)" checked={config.collapsible} onChange={(v) => set('collapsible', v)} />
      <Toggle label="Read-only" checked={config.readOnly} onChange={(v) => set('readOnly', v)} />
      <Field label="Height (CSS)">
        <Input value={config.height} onChange={(e) => set('height', e.target.value)} placeholder="Fills the cell" className="font-mono" />
      </Field>

      <Heading>Data</Heading>
      <CrudRefEditor
        value={list}
        onChange={(next) => setSlot('list', { ...next, apiPaths: list.apiPaths })}
        allowRow={false}
        extraLabel="Query fields"
      />
      {list.endpointId != null && (
        <Field label="Collections path (dot path)">
          <Input
            value={list.apiPaths}
            onChange={(e) => setSlot('list', { ...list, apiPaths: e.target.value })}
            placeholder="the response itself"
            className="font-mono"
          />
        </Field>
      )}
      {list.endpointId == null && <WiringHint>Pick a list endpoint — the tree has nothing to show without one.</WiringHint>}

      {FILE_COLLECTION_MUTATION_SLOTS.map((slot) => (
        <div key={slot} className="space-y-2 border-t border-line pt-2">
          <SlotEditor slot={slot} value={config.endpoints[slot]} onChange={(next) => setSlot(slot, { ...config.endpoints[slot], ...next })} />
          {(slot === 'deleteCollection' || slot === 'deleteItem') && config.endpoints[slot].endpointId != null && (
            <DeleteFields value={config.endpoints[slot]} onChange={(next) => setSlot(slot, next)} />
          )}
        </div>
      ))}

      <Heading>New menu</Heading>
      <SortableCardList
        items={config.newItems}
        onReorder={(next) => set('newItems', next)}
        cardClassName="space-y-1 rounded-md border border-line bg-panel-2 p-2"
        gripLabel={(entry) => `Reorder ${entry.label || 'entry'}`}
      >
        {(entry) => {
          const patch = (p: Partial<FileCollectionNewItemConfig>) => set('newItems', config.newItems.map((e) => (e.id === entry.id ? { ...e, ...p } : e)))
          return (
            <>
              <span className="flex items-center gap-1">
                <Input value={entry.label} onChange={(e) => patch({ label: e.target.value })} placeholder="New folder" aria-label="Label" />
                <IconButton
                  label={`Remove ${entry.label || 'entry'}`}
                  onClick={() => set('newItems', config.newItems.filter((e) => e.id !== entry.id))}
                  className="h-6! w-6! shrink-0 text-ink-3 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Type">
                  <Select options={NODE_TYPE_OPTIONS} value={entry.type} onChange={(v) => patch({ type: v as 'folder' | 'file' })} />
                </Field>
                <Field label="Kind">
                  <Input value={entry.kind} onChange={(e) => patch({ kind: e.target.value })} placeholder="none" className="font-mono" />
                </Field>
              </div>
              <IconField value={entry.icon} onChange={(v) => patch({ icon: v })} placeholder={entry.type === 'folder' ? 'folder' : 'file'} />
            </>
          )
        }}
      </SortableCardList>
      <button
        type="button"
        onClick={() => set('newItems', [...config.newItems, { id: crypto.randomUUID(), label: 'New file', icon: '', type: 'file', kind: '' }])}
        className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-line-strong py-1.5 text-ui-sm font-medium text-ink-3 transition-colors hover:border-focus hover:text-ink"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add entry
      </button>
      {config.endpoints.createItem.endpointId == null && <WiringHint>The New menu shows only while Create item is wired.</WiringHint>}

      <Heading>Icons</Heading>
      <p className="text-ui-xs text-ink-3">A node’s own icon wins, then its kind, then folder / file.</p>
      <KindIconsEditor value={config.kindIcons} onChange={(v) => set('kindIcons', v)} />

      <Heading>Selection</Heading>
      <Field label="State key">
        <Input
          value={config.selection.stateKey}
          onChange={(e) => set('selection', { stateKey: e.target.value })}
          placeholder={`${config.name || 'fileCollection'}Selected`}
          className="font-mono"
        />
      </Field>
      <p className="text-ui-xs text-ink-3">The selected node — id, collectionId, parentId, name, type, kind, path — as page data.</p>
      <Toggle label="Navigate on file click" checked={!!config.selectNavigate} onChange={(v) => set('selectNavigate', v ? createDefaultNavigate() : undefined)} />
      {config.selectNavigate && <NavigateEditor value={config.selectNavigate} onChange={(v) => set('selectNavigate', v)} allowRow />}
    </div>
  )
}
