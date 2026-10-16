import { useMemo, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { IconPicker, Input, SegmentedControl, Select } from '../common'
import { pathParams } from '../Workspace/snapshots'
import { LOAD_ID_PREFIX } from '../Workspace/pageLoads'
import { LoadFieldPicker, usePageLoads } from './pageData'
import { useActivePages, useActiveProject, useWorkspaceStore } from '../Workspace/workspaceStore'
import { customActionIdOf, customActionKey, isCustomActionKey, type CustomActionDef } from '../Workspace/customActions'
import { useGridStore } from './gridStore'
import { useRepeaterScope } from './repeaterScope'
import { EndpointPicker } from './SelectFieldConfigPanel'
import {
  BUTTON_VARIANT_OPTIONS,
  collectButtonTargets,
  collectOverlayTargets,
  createDefaultNavigate,
  NO_NAVIGATION,
  type BuiltinButtonActionKey,
  type ButtonActionKey,
  type ButtonItemConfig,
  type ButtonSnackbarVariant,
  type ButtonVariant,
  type DesignNavigation,
  type NavParamSource,
  type StudioNavigate,
} from './types'

/** One labelled row in the config form. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  )
}

/** Human labels for the offered actions (see the grilled design: only the
 * engine-implemented ones — no OpenModal / SubmitFormToDeleteAPI). */
const ACTION_LABELS: Record<BuiltinButtonActionKey, string> = {
  StartLoading: 'Start loading',
  SubmitFormToPostAPI: 'Submit form (POST)',
  SubmitFormToPatchAPI: 'Submit form (PATCH)',
  StopLoading: 'Stop loading',
  ClearCurrentFormSelected: 'Clear form selection',
  CloseModal: 'Close modal',
  Navigate: 'Go to page',
  ReloadDataTable: 'Reload data',
}
const ALL_ACTIONS = Object.keys(ACTION_LABELS) as BuiltinButtonActionKey[]
const NO_CUSTOM_ACTIONS: CustomActionDef[] = []

/** The canonical submit sequence every example-app button uses. */
const SUBMIT_SEQUENCE: ButtonActionKey[] = [
  'StartLoading',
  'SubmitFormToPostAPI',
  'StopLoading',
  'CloseModal',
]

const MODE_OPTIONS = [
  { value: 'direct', label: 'Run directly' },
  { value: 'confirm', label: 'Confirm first' },
]

export const SNACKBAR_VARIANT_OPTIONS = (
  ['success', 'error', 'info', 'warning', 'neutral'] as ButtonSnackbarVariant[]
).map((v) => ({ value: v, label: v }))

const isSubmit = (a: ButtonActionKey) =>
  a === 'SubmitFormToPostAPI' || a === 'SubmitFormToPatchAPI'

/**
 * One chip of an action list: sortable by its grip (pointer drag, or focus
 * the grip and Space / arrows / Space), removable by its ×. The drag
 * listeners live only on the grip so the × stays a plain click. Keys are
 * unique within a list, so the action key is the sortable id.
 */
function ActionChip({
  action,
  label,
  custom,
  missing,
  onRemove,
}: {
  action: ButtonActionKey
  label: string
  custom: boolean
  missing: boolean
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: action })
  return (
    <span
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 1 : undefined }}
      className={`inline-flex items-center gap-0.5 rounded-full border py-0.5 pl-1 pr-1 text-ui-sm font-medium ${
        missing
          ? 'border-warn/60 bg-warn/8 text-warn'
          : custom
            ? 'border-accent/50 bg-panel-2 text-ink'
            : 'border-line-strong bg-panel-2 text-ink'
      } ${isDragging ? 'relative opacity-40' : ''}`}
      title={custom ? 'Custom action — coded in the app, named here' : undefined}
    >
      <button
        type="button"
        aria-label={`Reorder ${label}`}
        title="Drag to reorder (or Space, arrows, Space)"
        {...attributes}
        {...listeners}
        className="flex h-4 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded-full text-ink-3 transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 active:cursor-grabbing"
      >
        <GripVertical className="h-3 w-3" aria-hidden="true" />
      </button>
      {custom && <span aria-hidden="true" className="font-mono text-ui-xs text-ink-3">ƒ</span>}
      {label}
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
        className="rounded-full p-0.5 text-ink transition-colors hover:bg-panel-2 hover:text-ink"
      >
        <X size={11} aria-hidden="true" />
      </button>
    </span>
  )
}

/**
 * One ordered action list as chips: an add-dropdown appends, × removes, and
 * the chips reorder by drag and drop (pointer or keyboard through the grip —
 * the engine runs the chain in this order). No duplicates: picked actions
 * leave the dropdown. Own `DndContext` like `SortableCardList` (the inspector
 * sits outside the canvas's context), `rectSortingStrategy` because the
 * chips wrap onto several lines.
 */
function ActionChipList({
  value,
  onChange,
}: {
  value: ButtonActionKey[]
  onChange: (next: ButtonActionKey[]) => void
}) {
  // The project's declared custom actions (Env page): offered under the
  // built-ins, stored by id (`fn:<id>`), shown by name — a deleted one stays
  // in the list, flagged, and exports as `fn:MISSING_ACTION`.
  const customActions = useActiveProject()?.snapshot.customActions ?? NO_CUSTOM_ACTIONS
  const customById = useMemo(() => new Map(customActions.map((d) => [d.id, d])), [customActions])
  const customLabel = (key: string) => {
    const def = customById.get(customActionIdOf(key))
    if (!def) return 'fn: (deleted action)'
    return `fn: ${def.name.trim() || '(unnamed action)'}`
  }
  const label = (a: ButtonActionKey) => (isCustomActionKey(a) ? customLabel(a) : ACTION_LABELS[a as BuiltinButtonActionKey])
  const available = ALL_ACTIONS.filter((a) => !value.includes(a))
  const availableCustom = customActions.filter((d) => !value.includes(customActionKey(d.id)))
  const dangling = value.filter((a) => isCustomActionKey(a) && !customById.has(customActionIdOf(a)))
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = value.indexOf(active.id as ButtonActionKey)
    const to = value.indexOf(over.id as ButtonActionKey)
    if (from < 0 || to < 0) return
    onChange(arrayMove(value, from, to))
  }
  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={value} strategy={rectSortingStrategy}>
            <div className="flex flex-wrap gap-1">
              {value.map((action) => {
                const custom = isCustomActionKey(action)
                return (
                  <ActionChip
                    key={action}
                    action={action}
                    label={label(action)}
                    custom={custom}
                    missing={custom && !customById.has(customActionIdOf(action))}
                    onRemove={() => onChange(value.filter((a) => a !== action))}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {(available.length > 0 || availableCustom.length > 0) && (
        <Select
          aria-label="Add action"
          options={[
            { value: '', label: '+ Add action…' },
            ...available.map((a) => ({ value: a, label: ACTION_LABELS[a] })),
            ...availableCustom.map((d) => ({
              value: customActionKey(d.id),
              label: `Custom: ${d.name.trim() || '(unnamed action)'}`,
            })),
          ]}
          value=""
          onChange={(v) => {
            if (v) onChange([...value, v as ButtonActionKey])
          }}
        />
      )}
      {dangling.length > 0 && (
        <WiringHint>
          {dangling.length === 1 ? 'A custom action' : `${dangling.length} custom actions`} in this list{' '}
          {dangling.length === 1 ? 'was' : 'were'} deleted on the Env page — the export marks{' '}
          {dangling.length === 1 ? 'it' : 'them'} fn:MISSING_ACTION and the app skips{' '}
          {dangling.length === 1 ? 'it' : 'them'} with a warning.
        </WiringHint>
      )}
    </div>
  )
}

/** Inline checkbox row for boolean config. */
function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-ui-sm font-medium text-ink-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-line-strong accent-accent"
      />
      {label}
    </label>
  )
}

/** Amber inline hint for incomplete wiring (the export still emits — see the
 * grilled design: emit authored, omit empty; never block). */
export function WiringHint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-warn/40 bg-warn/8 px-2 py-1.5 text-ui-sm leading-relaxed text-warn">
      {children}
    </p>
  )
}

/**
 * Editor for a standalone button item — the visual slice plus the engine
 * `ButtonElement` behavior (see the grilled design). The mode switch mirrors
 * the engine's semantics (`ConfirmBox` only works as `actions[0]`, and then
 * only the True/False lists run), and each behavior section appears only when
 * an action that consumes it is selected: endpoint/reload/snackbars for the
 * submit actions, the modal target for CloseModal.
 */
export function ButtonConfigPanel({
  itemId,
  config,
}: {
  itemId: string
  config: ButtonItemConfig
}) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const rootItems = useGridStore((s) => s.items)
  const set = <K extends keyof ButtonItemConfig>(key: K, value: ButtonItemConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<ButtonItemConfig>)

  const targets = useMemo(() => collectButtonTargets(rootItems), [rootItems])
  const pageLoads = usePageLoads()

  const confirm = config.mode === 'confirm'
  const effectiveActions = confirm
    ? [...config.confirmTrue, ...config.confirmFalse]
    : config.actions
  const usesSubmit = effectiveActions.some(isSubmit)
  const usesCloseModal = effectiveActions.includes('CloseModal')
  const usesReload = effectiveActions.includes('ReloadDataTable')

  const modalDangling =
    config.modalItemId !== '' && !targets.modals.some((m) => m.itemId === config.modalItemId)
  const tableDangling =
    config.reloadTableItemId !== '' &&
    !targets.tables.some((t) => t.itemId === config.reloadTableItemId) &&
    !pageLoads.some((l) => l.id === config.reloadTableItemId)
  // What a reload can target: the refetchable components, and the page's loads.
  const reloadField = (label: string) => (
    <Field label={label}>
      <Select
        options={[
          { value: '', label: '— none —' },
          ...(tableDangling ? [{ value: config.reloadTableItemId, label: '⚠ missing target' }] : []),
          ...targets.tables.map((t) => ({
            value: t.itemId,
            label: t.name || '(unnamed table)',
          })),
          ...pageLoads.map((l) => ({ value: l.id, label: `${l.key || '(unnamed)'} · page data` })),
        ]}
        value={config.reloadTableItemId}
        onChange={(v) => set('reloadTableItemId', v)}
      />
    </Field>
  )

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">
        Button
      </h3>
      <Field label="Label">
        <Input value={config.label} onChange={(e) => set('label', e.target.value)} />
      </Field>
      <Field label="Icon">
        <IconPicker value={config.icon} onChange={(v) => set('icon', v)} />
      </Field>
      <Field label="Variant">
        <SegmentedControl
          options={BUTTON_VARIANT_OPTIONS}
          value={config.variant}
          onChange={(v) => set('variant', v as ButtonVariant)}
          aria-label="Variant"
        />
      </Field>

      <h3 className="pt-1 text-ui-sm font-semibold uppercase tracking-wide text-ink-3">
        On click
      </h3>
      <div>
        <SegmentedControl
          aria-label="Click behavior"
          options={MODE_OPTIONS}
          value={config.mode}
          onChange={(v) => set('mode', v as ButtonItemConfig['mode'])}
        />
      </div>

      {confirm ? (
        <>
          <Field label="Confirm title">
            <Input
              value={config.confirmTitle}
              onChange={(e) => set('confirmTitle', e.target.value)}
            />
          </Field>
          <Field label="Confirm description">
            <Input
              value={config.confirmDescription}
              onChange={(e) => set('confirmDescription', e.target.value)}
            />
          </Field>
          <Field label="When confirmed">
            <ActionChipList
              value={config.confirmTrue}
              onChange={(v) => set('confirmTrue', v)}
            />
          </Field>
          {config.confirmTrue.length === 0 && (
            <button
              type="button"
              onClick={() => set('confirmTrue', SUBMIT_SEQUENCE)}
              className="text-ui-sm font-medium text-ink underline-offset-2 hover:underline"
            >
              Use submit sequence (loading → POST → close)
            </button>
          )}
          <Field label="When cancelled">
            <ActionChipList
              value={config.confirmFalse}
              onChange={(v) => set('confirmFalse', v)}
            />
          </Field>
        </>
      ) : (
        <Field label="Actions (run in order)">
          <ActionChipList value={config.actions} onChange={(v) => set('actions', v)} />
        </Field>
      )}

      {usesCloseModal && (
        <Field label="Close modal target">
          <Select
            options={[
              { value: '', label: '— none —' },
              ...(modalDangling
                ? [{ value: config.modalItemId, label: '⚠ missing modal' }]
                : []),
              ...targets.modals.map((m) => ({
                value: m.itemId,
                label: m.modalId || '(unnamed modal)',
              })),
            ]}
            value={config.modalItemId}
            onChange={(v) => set('modalItemId', v)}
          />
        </Field>
      )}
      {usesCloseModal && !config.modalItemId && !modalDangling && (
        <WiringHint>
          Pick a modal — without a target, Close modal won’t close anything.
        </WiringHint>
      )}

      {usesReload && !usesSubmit && (
        <>
          {reloadField('Reload')}
          {config.reloadTableItemId === '' && (
            <WiringHint>Pick what to reload — a table, list or repeater, or one of the page’s loads.</WiringHint>
          )}
        </>
      )}

      {usesSubmit && (
        <>
          <Field label="Submit endpoint (API page)">
            <EndpointPicker
              value={config.endpointId}
              onChange={(endpointId) => set('endpointId', endpointId)}
            />
          </Field>
          {config.endpointId == null && (
            <WiringHint>
              Pick an endpoint — without one, Submit form calls nothing.
            </WiringHint>
          )}
          {reloadField(usesReload ? 'Reload (after submit, and the Reload action)' : 'Reload data after submit')}
          <CheckboxRow
            label="Success snackbar"
            checked={config.snackbarSuccessEnabled}
            onChange={(v) => set('snackbarSuccessEnabled', v)}
          />
          {config.snackbarSuccessEnabled && (
            <>
              <Field label="Snackbar variant">
                <Select
                  options={SNACKBAR_VARIANT_OPTIONS}
                  value={config.snackbarSuccessType}
                  onChange={(v) => set('snackbarSuccessType', v as ButtonSnackbarVariant)}
                />
              </Field>
              <Field label="Snackbar message">
                <Input
                  value={config.snackbarSuccessMessage}
                  onChange={(e) => set('snackbarSuccessMessage', e.target.value)}
                  placeholder="Saved successfully"
                />
              </Field>
            </>
          )}
          <CheckboxRow
            label="Show API error as snackbar"
            checked={config.snackbarErrorException}
            onChange={(v) => set('snackbarErrorException', v)}
          />
        </>
      )}

      <NavigationSection
        config={config}
        update={(patch) => updateItemConfig(itemId, patch)}
        rootItems={rootItems}
      />
    </div>
  )
}

const SOURCE_OPTIONS_BASE: { value: NavParamSource['type']; label: string }[] = [
  { value: 'value', label: 'Fixed value' },
  { value: 'url', label: 'From the current URL' },
  { value: 'state', label: 'From page data' },
]
const ROW_SOURCE_OPTION: { value: NavParamSource['type']; label: string } = {
  value: 'row',
  label: 'From the row / item',
}
const URL_SOURCE_OPTIONS = [
  { value: 'param', label: ':param' },
  { value: 'query', label: '?query' },
]

/** A fresh source of the given type for the `:param` named `key`. */
export function defaultSource(type: NavParamSource['type'], key: string): NavParamSource {
  switch (type) {
    case 'url':
      return { type: 'url', key, source: 'param' }
    case 'state':
      return { type: 'state', key: '', path: '' }
    case 'row':
      return { type: 'row', key }
    default:
      return { type: 'value', value: '' }
  }
}

/**
 * The source controls of one value: its kind (a literal, the current URL's
 * param / query, a global-state slice, or — when `allowRow` — a field of the
 * row at hand) and the kind's inputs. Shared by {@link NavigateEditor} and the
 * form-list panel's CRUD param maps.
 */
export function ParamSourceFields({
  label,
  value: src,
  onChange,
  allowRow = false,
  seedKey,
}: {
  label: ReactNode
  value: NavParamSource
  onChange: (next: NavParamSource) => void
  allowRow?: boolean
  /** The `:param` name a freshly picked kind is seeded with. */
  seedKey: string
}) {
  const sourceOptions = allowRow ? [ROW_SOURCE_OPTION, ...SOURCE_OPTIONS_BASE] : SOURCE_OPTIONS_BASE
  // With page loads, a state source picks a load + field (stored by load id);
  // a raw slice key authored before stays editable as text.
  const pageLoads = usePageLoads()
  return (
    <div className="space-y-1.5 rounded-md border border-line bg-panel p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 truncate font-mono text-ui-sm font-medium text-ink-2">{label}</span>
        <div className="min-w-0 max-w-44 flex-1">
          <Select
            aria-label={`Source of ${typeof label === 'string' ? label : seedKey}`}
            options={sourceOptions}
            value={src.type}
            onChange={(t) => onChange(defaultSource(t as NavParamSource['type'], seedKey))}
          />
        </div>
      </div>
      {src.type === 'value' && (
        <Input
          value={src.value}
          onChange={(e) => onChange({ ...src, value: e.target.value })}
          placeholder="fixed value"
          className="font-mono"
        />
      )}
      {src.type === 'url' && (
        <div className="flex gap-1.5">
          <div className="flex-1">
            <Input
              value={src.key}
              onChange={(e) => onChange({ ...src, key: e.target.value })}
              placeholder="param / query name"
              className="font-mono"
            />
          </div>
          <div className="w-24">
            <Select
              aria-label="URL part"
              options={URL_SOURCE_OPTIONS}
              value={src.source}
              onChange={(s) => onChange({ ...src, source: s as 'param' | 'query' })}
            />
          </div>
        </div>
      )}
      {src.type === 'state' && pageLoads.length > 0 && (src.key === '' || src.key.startsWith(LOAD_ID_PREFIX)) && (
        <LoadFieldPicker
          label={typeof label === 'string' ? label : seedKey}
          loadId={src.key}
          path={src.path}
          onChange={({ loadId, path }) => onChange({ ...src, key: loadId, path })}
        />
      )}
      {src.type === 'state' && !(pageLoads.length > 0 && (src.key === '' || src.key.startsWith(LOAD_ID_PREFIX))) && (
        <div className="flex gap-1.5">
          <div className="flex-1">
            <Input
              value={src.key}
              onChange={(e) => onChange({ ...src, key: e.target.value })}
              placeholder="state key"
              className="font-mono"
            />
          </div>
          <div className="flex-1">
            <Input
              value={src.path}
              onChange={(e) => onChange({ ...src, path: e.target.value })}
              placeholder="path (optional)"
              className="font-mono"
            />
          </div>
        </div>
      )}
      {src.type === 'row' && (
        <Input
          value={src.key}
          onChange={(e) => onChange({ ...src, key: e.target.value })}
          placeholder="row field, e.g. _id"
          className="font-mono"
        />
      )}
    </div>
  )
}

/**
 * Editor for a {@link StudioNavigate} (see the grilled page-router design):
 * the target page, one value source per `:param` of its route (a literal,
 * the current URL's param / query, a global-state slice, or — on a table's
 * row click — a field of the clicked row), and the history `replace` flag.
 * Shared by the button panel (the `Navigate` action) and the data table
 * panel (row click).
 */
export function NavigateEditor({
  value,
  onChange,
  allowRow = false,
}: {
  value: StudioNavigate
  onChange: (next: StudioNavigate) => void
  /** Offer the "clicked row" source (data tables only). */
  allowRow?: boolean
}) {
  const pages = useActivePages()
  const projectId = useWorkspaceStore((s) => s.activeProjectId)
  const navigate = useNavigate()
  const target = pages.find((p) => p.id === value.pageId)
  const params = target ? pathParams(target.path) : []
  const dangling = value.pageId !== '' && !target
  const seedType: NavParamSource['type'] = allowRow ? 'row' : 'value'
  const setParam = (key: string, src: NavParamSource) =>
    onChange({ ...value, params: { ...value.params, [key]: src } })

  return (
    <div className="space-y-3">
      <Field label="Which page">
        <Select
          options={[
            { value: '', label: '— pick one —' },
            ...(dangling ? [{ value: value.pageId, label: '⚠ missing page' }] : []),
            ...pages.map((p) => ({ value: p.id, label: `${p.name}  ${p.path}` })),
          ]}
          value={value.pageId}
          onChange={(pageId) => {
            const t = pages.find((p) => p.id === pageId)
            const keys = t ? pathParams(t.path) : []
            onChange({
              ...value,
              pageId,
              params: Object.fromEntries(
                keys.map((k) => [k, value.params[k] ?? defaultSource(seedType, k)]),
              ),
            })
          }}
        />
      </Field>
      {params.map((key) => (
        <ParamSourceFields
          key={key}
          label={`:${key}`}
          value={value.params[key] ?? defaultSource(seedType, key)}
          onChange={(src) => setParam(key, src)}
          allowRow={allowRow}
          seedKey={key}
        />
      ))}
      <CheckboxRow
        label="Replace the history entry (Back skips this page)"
        checked={value.replace}
        onChange={(replace) => onChange({ ...value, replace })}
      />
      {target && projectId && (
        <button
          type="button"
          onClick={() => navigate(`/p/${projectId}/pages/${target.id}`)}
          className="text-ui-sm font-medium text-ink underline-offset-2 hover:underline"
        >
          Lay out “{target.name}” →
        </button>
      )}
      {value.pageId === '' && (
        <WiringHint>Pick a page — without one, Go to page does nothing.</WiringHint>
      )}
      {dangling && (
        <WiringHint>That page was deleted — the export marks it MISSING_PAGE.</WiringHint>
      )}
    </div>
  )
}

/** The Navigation dropdown: the engine page change plus the design-only kinds. */
type NavKind = 'none' | 'page' | DesignNavigation['kind']

const NAV_OPTIONS: { value: NavKind; label: string }[] = [
  { value: 'none', label: 'Nothing (engine actions only)' },
  { value: 'page', label: 'Go to another page' },
  { value: 'toast', label: 'Show a toast (design only)' },
  { value: 'dialog', label: 'Show a dialog (design only)' },
  { value: 'link', label: 'Open a link (design only)' },
]

/**
 * What the button does besides its actions. "Go to another page" is the
 * engine `Navigate` action (see the grilled page-router design): picking it
 * appends `Navigate` to the button's effective action list — the end of the
 * direct list, or of the confirm-true list — and edits its `navigate` target
 * here; the action chip above stays in sync, so a sequence like submit →
 * navigate can be reordered there. The other kinds are design-only: a link,
 * or a toast / dialog on this page, played by the Live Preview but never
 * exported into the engine `ButtonElement`.
 */
function NavigationSection({
  config,
  update,
  rootItems,
}: {
  config: ButtonItemConfig
  update: (patch: Partial<ButtonItemConfig>) => void
  rootItems: ReturnType<typeof useGridStore.getState>['items']
}) {
  const overlays = useMemo(() => collectOverlayTargets(rootItems), [rootItems])
  const inRepeater = useRepeaterScope() !== null
  const navigation = config.navigation ?? NO_NAVIGATION
  const confirm = config.mode === 'confirm'
  const usesNavigate = (confirm ? [...config.confirmTrue, ...config.confirmFalse] : config.actions)
    .includes('Navigate')
  const kind: NavKind = usesNavigate ? 'page' : navigation.kind

  const withoutNavigate = (list: ButtonActionKey[]) => list.filter((a) => a !== 'Navigate')

  const setKind = (next: NavKind) => {
    if (next === kind) return
    if (next === 'page') {
      // Engine navigation: add the action where the click will run it.
      update({
        navigation: NO_NAVIGATION,
        navigate: config.navigate ?? createDefaultNavigate(),
        ...(confirm
          ? { confirmTrue: [...withoutNavigate(config.confirmTrue), 'Navigate'] }
          : { actions: [...withoutNavigate(config.actions), 'Navigate'] }),
      })
      return
    }
    const cleared = {
      actions: withoutNavigate(config.actions),
      confirmTrue: withoutNavigate(config.confirmTrue),
      confirmFalse: withoutNavigate(config.confirmFalse),
    }
    if (next === 'none') update({ ...cleared, navigation: NO_NAVIGATION })
    else if (next === 'link') update({ ...cleared, navigation: { kind: 'link', href: '', newTab: true } })
    else update({ ...cleared, navigation: { kind: next, targetItemId: '' } })
  }
  const onChange = (nextNav: DesignNavigation) => update({ navigation: nextNav })

  return (
    <div className="space-y-3 border-t border-line pt-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">
        Navigation
      </h3>
      <Field label="When this button is clicked, also">
        <Select options={NAV_OPTIONS} value={kind} onChange={(v) => setKind(v as NavKind)} />
      </Field>

      {kind === 'page' && (
        <NavigateEditor
          value={config.navigate ?? createDefaultNavigate()}
          onChange={(v) => update({ navigate: v })}
          // Inside a repeater's item template the params can read the item.
          allowRow={inRepeater}
        />
      )}

      {(navigation.kind === 'toast' || navigation.kind === 'dialog') && (
        <>
          <Field label={navigation.kind === 'toast' ? 'Which toast' : 'Which dialog'}>
            <Select
              options={[
                { value: '', label: '— pick one —' },
                ...overlays
                  .filter((o) => o.type === navigation.kind)
                  .map((o) => ({ value: o.itemId, label: o.title })),
              ]}
              value={navigation.targetItemId}
              onChange={(targetItemId) => onChange({ ...navigation, targetItemId })}
            />
          </Field>
          {overlays.filter((o) => o.type === navigation.kind).length === 0 && (
            <WiringHint>
              Drop a {navigation.kind} from the Feedback palette onto this page first, then pick it here.
            </WiringHint>
          )}
        </>
      )}

      {navigation.kind === 'link' && (
        <>
          <Field label="URL">
            <Input
              value={navigation.href}
              onChange={(e) => onChange({ ...navigation, href: e.target.value })}
              placeholder="https://…"
              className="font-mono"
            />
          </Field>
          <CheckboxRow
            label="Open in a new tab"
            checked={navigation.newTab}
            onChange={(newTab) => onChange({ ...navigation, newTab })}
          />
        </>
      )}
    </div>
  )
}
