import { useMemo, useState, type ReactNode } from 'react'
import { IconData } from '@gummy-ui/ui'
import { Ban, X } from 'lucide-react'
import { cn, Input, SegmentedControl, Select } from '../common'
import { useGridStore } from './gridStore'
import { EndpointPicker } from './SelectFieldConfigPanel'
import {
  collectButtonTargets,
  type ButtonActionKey,
  type ButtonItemConfig,
  type ButtonSnackbarVariant,
} from './types'

/** One labelled row in the config form. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
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
      <div className="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/60 p-1.5">
        <button
          type="button"
          title="No icon"
          onClick={() => onChange('')}
          className={cn(
            'flex h-8 items-center justify-center rounded-md transition-colors',
            value === ''
              ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-400'
              : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600',
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
                  ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-400'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700',
              )}
            >
              <Glyph size={16} aria-hidden="true" />
            </button>
          )
        })}
        {keys.length === 0 && (
          <p className="col-span-6 py-2 text-center text-xs text-zinc-400">
            No icons match “{filter}”
          </p>
        )}
      </div>
      <p className="text-[11px] text-zinc-400">
        {value ? (
          <>
            Selected: <span className="font-mono text-zinc-500">{value}</span>
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
              className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 py-0.5 pl-2 pr-1 text-[11px] font-medium text-teal-800"
            >
              {ACTION_LABELS[action]}
              <button
                type="button"
                aria-label={`Remove ${ACTION_LABELS[action]}`}
                onClick={() => onChange(value.filter((a) => a !== action))}
                className="rounded-full p-0.5 text-teal-500 transition-colors hover:bg-teal-100 hover:text-teal-800"
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
    <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-zinc-300 accent-teal-600"
      />
      {label}
    </label>
  )
}

/** Amber inline hint for incomplete wiring (the export still emits — see the
 * grilled design: emit authored, omit empty; never block). */
export function WiringHint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-relaxed text-amber-700">
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
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Button
      </h3>
      <Field label="Label">
        <Input value={config.label} onChange={(e) => set('label', e.target.value)} />
      </Field>
      <Field label="Icon">
        <IconPicker value={config.icon} onChange={(v) => set('icon', v)} />
      </Field>

      <h3 className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        On click
      </h3>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-1">
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
              className="text-[11px] font-medium text-teal-700 underline-offset-2 hover:underline"
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
    </div>
  )
}
