import { useMemo, useState, type ReactNode } from 'react'
import { IconData } from '@gummy-ui/ui'
import { Ban, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn, Input, SegmentedControl, Select } from '../common'
import { pathParams } from '../Workspace/snapshots'
import { useActivePages, useWorkspaceStore } from '../Workspace/workspaceStore'
import { useGridStore } from './gridStore'
import { EndpointPicker } from './SelectFieldConfigPanel'
import {
  collectButtonTargets,
  collectOverlayTargets,
  createDefaultNavigate,
  NO_NAVIGATION,
  type ButtonActionKey,
  type ButtonItemConfig,
  type ButtonSnackbarVariant,
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

const ICON_KEYS = Object.keys(IconData) as (keyof typeof IconData)[]

/**
 * Searchable glyph-grid picker over the library's `IconData` map (the keys the
 * engine `ButtonElement.icon` accepts — see the grilled design: picking a glyph
 * you can see beats typing a key). A filter box narrows the ~110 keys, the grid
 * scrolls, and the leading slot clears the selection. Storing the key (not the
 * component) keeps the config JSON-serializable.
 */
export function IconPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (key: string) => void
}) {
  const [filter, setFilter] = useState('')
  const keys = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? ICON_KEYS.filter((k) => k.toLowerCase().includes(q)) : ICON_KEYS
  }, [filter])

  return (
    <div className="space-y-2">
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter icons…"
      />
      <div className="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto rounded-lg border border-line bg-panel p-1.5">
        <button
          type="button"
          title="No icon"
          onClick={() => onChange('')}
          className={cn(
            'flex h-8 items-center justify-center rounded-md transition-colors',
            value === ''
              ? 'bg-panel-2 text-ink ring-1 ring-focus/30'
              : 'text-ink-3 hover:bg-panel-2 hover:text-ink-2',
          )}
        >
          <Ban className="h-4 w-4" aria-hidden="true" />
        </button>
        {keys.map((key) => {
          const Glyph = IconData[key]
          return (
            <button
              key={key}
              type="button"
              title={key}
              onClick={() => onChange(key)}
              className={cn(
                'flex h-8 items-center justify-center rounded-md transition-colors',
                value === key
                  ? 'bg-panel-2 text-ink ring-1 ring-focus/30'
                  : 'text-ink-3 hover:bg-panel-2 hover:text-ink-2',
              )}
            >
              <Glyph size={16} aria-hidden="true" />
            </button>
          )
        })}
        {keys.length === 0 && (
          <p className="col-span-6 py-2 text-center text-ui-sm text-ink-3">
            No icons match “{filter}”
          </p>
        )}
      </div>
      <p className="text-ui-sm text-ink-3">
        {value ? (
          <>
            Selected: <span className="font-mono text-ink-3">{value}</span>
          </>
        ) : (
          'No icon'
        )}
      </p>
    </div>
  )
}

/** Human labels for the offered actions (see the grilled design: only the
 * engine-implemented ones — no OpenModal / SubmitFormToDeleteAPI). */
const ACTION_LABELS: Record<ButtonActionKey, string> = {
  StartLoading: 'Start loading',
  SubmitFormToPostAPI: 'Submit form (POST)',
  SubmitFormToPatchAPI: 'Submit form (PATCH)',
  StopLoading: 'Stop loading',
  ClearCurrentFormSelected: 'Clear form selection',
  CloseModal: 'Close modal',
  Navigate: 'Go to page',
}
const ALL_ACTIONS = Object.keys(ACTION_LABELS) as ButtonActionKey[]

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
 * One ordered action list as chips: an add-dropdown appends, × removes, order
 * is insertion order, no duplicates (picked actions leave the dropdown — see
 * the grilled design: lists are short, so no drag machinery).
 */
function ActionChipList({
  value,
  onChange,
}: {
  value: ButtonActionKey[]
  onChange: (next: ButtonActionKey[]) => void
}) {
  const available = ALL_ACTIONS.filter((a) => !value.includes(a))
  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((action) => (
            <span
              key={action}
              className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-panel-2 py-0.5 pl-2 pr-1 text-ui-sm font-medium text-ink"
            >
              {ACTION_LABELS[action]}
              <button
                type="button"
                aria-label={`Remove ${ACTION_LABELS[action]}`}
                onClick={() => onChange(value.filter((a) => a !== action))}
                className="rounded-full p-0.5 text-ink transition-colors hover:bg-panel-2 hover:text-ink"
              >
                <X size={11} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      {available.length > 0 && (
        <Select
          aria-label="Add action"
          options={[
            { value: '', label: '+ Add action…' },
            ...available.map((a) => ({ value: a, label: ACTION_LABELS[a] })),
          ]}
          value=""
          onChange={(v) => {
            if (v) onChange([...value, v as ButtonActionKey])
          }}
        />
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

  const confirm = config.mode === 'confirm'
  const effectiveActions = confirm
    ? [...config.confirmTrue, ...config.confirmFalse]
    : config.actions
  const usesSubmit = effectiveActions.some(isSubmit)
  const usesCloseModal = effectiveActions.includes('CloseModal')

  const modalDangling =
    config.modalItemId !== '' && !targets.modals.some((m) => m.itemId === config.modalItemId)
  const tableDangling =
    config.reloadTableItemId !== '' &&
    !targets.tables.some((t) => t.itemId === config.reloadTableItemId)

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
          <Field label="Reload data table after submit">
            <Select
              options={[
                { value: '', label: '— none —' },
                ...(tableDangling
                  ? [{ value: config.reloadTableItemId, label: '⚠ missing table' }]
                  : []),
                ...targets.tables.map((t) => ({
                  value: t.itemId,
                  label: t.name || '(unnamed table)',
                })),
              ]}
              value={config.reloadTableItemId}
              onChange={(v) => set('reloadTableItemId', v)}
            />
          </Field>
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
  { value: 'state', label: 'From global state' },
]
const ROW_SOURCE_OPTION: { value: NavParamSource['type']; label: string } = {
  value: 'row',
  label: 'From the clicked row',
}
const URL_SOURCE_OPTIONS = [
  { value: 'param', label: ':param' },
  { value: 'query', label: '?query' },
]

/** A fresh source of the given type for the `:param` named `key`. */
function defaultSource(type: NavParamSource['type'], key: string): NavParamSource {
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
  const sourceOptions = allowRow ? [ROW_SOURCE_OPTION, ...SOURCE_OPTIONS_BASE] : SOURCE_OPTIONS_BASE
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
      {params.map((key) => {
        const src = value.params[key] ?? defaultSource(seedType, key)
        return (
          <div key={key} className="space-y-1.5 rounded-md border border-line bg-panel p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-ui-sm font-medium text-ink-2">:{key}</span>
              <div className="w-44">
                <Select
                  aria-label={`Source of :${key}`}
                  options={sourceOptions}
                  value={src.type}
                  onChange={(t) => setParam(key, defaultSource(t as NavParamSource['type'], key))}
                />
              </div>
            </div>
            {src.type === 'value' && (
              <Input
                value={src.value}
                onChange={(e) => setParam(key, { ...src, value: e.target.value })}
                placeholder="fixed value"
                className="font-mono"
              />
            )}
            {src.type === 'url' && (
              <div className="flex gap-1.5">
                <div className="flex-1">
                  <Input
                    value={src.key}
                    onChange={(e) => setParam(key, { ...src, key: e.target.value })}
                    placeholder="param / query name"
                    className="font-mono"
                  />
                </div>
                <div className="w-24">
                  <Select
                    aria-label="URL part"
                    options={URL_SOURCE_OPTIONS}
                    value={src.source}
                    onChange={(s) => setParam(key, { ...src, source: s as 'param' | 'query' })}
                  />
                </div>
              </div>
            )}
            {src.type === 'state' && (
              <div className="flex gap-1.5">
                <div className="flex-1">
                  <Input
                    value={src.key}
                    onChange={(e) => setParam(key, { ...src, key: e.target.value })}
                    placeholder="state key"
                    className="font-mono"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    value={src.path}
                    onChange={(e) => setParam(key, { ...src, path: e.target.value })}
                    placeholder="path (optional)"
                    className="font-mono"
                  />
                </div>
              </div>
            )}
            {src.type === 'row' && (
              <Input
                value={src.key}
                onChange={(e) => setParam(key, { ...src, key: e.target.value })}
                placeholder="row field, e.g. _id"
                className="font-mono"
              />
            )}
          </div>
        )
      })}
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
