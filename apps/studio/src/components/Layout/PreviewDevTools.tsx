import {
  getStateStore,
  stateStoreKeys,
  useEngineDebugStore,
  useStord,
} from '@gummy-ui/ui'
import { useEffect, useReducer, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bug, ChevronDown, ChevronRight, X } from 'lucide-react'
import { useFormState, useWatch, type UseFormReturn } from 'react-hook-form'
import { CodeViewer, SegmentedControl } from '../common'

/**
 * The Live Preview's runtime state inspector (see the grilled design). Rendered
 * as a *sibling* of the engine tree inside the modal, so everything it shows
 * comes from module-level stores: the engine debug mirror (container forms,
 * DataProvider contextData, active loaders — `Provider isRoot` builds those
 * providers inside the drawn tree, out of hook reach), the state-store
 * registry, the fnCtxs registry, and the request log captured by the modal's
 * `onLog` HttpClient hook. Updates are live: form values via `useWatch`
 * (throttled so typing doesn't churn), the rest via zustand subscriptions —
 * except state-store keys, which are polled (the registry is a plain Map that
 * only grows when loaders mount).
 */

export type ApiLogEntry = {
  id: number
  method: string
  url: string
  status: number | null
  time: string
  data: unknown
}

const TABS = [
  { value: 'form', label: 'Form' },
  { value: 'data', label: 'Data' },
  { value: 'stores', label: 'Stores' },
  { value: 'api', label: 'API' },
  { value: 'config', label: 'Config' },
]

/** JSON.stringify that survives circular refs, Files, and functions. */
function safeJson(value: unknown): string {
  const seen = new WeakSet()
  return JSON.stringify(
    value,
    (_key, v) => {
      if (typeof v === 'function') return '[function]'
      if (typeof v === 'object' && v !== null) {
        if (typeof File !== 'undefined' && v instanceof File) return `[File ${v.name}]`
        if (seen.has(v)) return '[circular]'
        seen.add(v)
      }
      return v
    },
    2,
  )
}

/** Re-emit `value` at most every `ms` — trailing edge kept, so the final
 * keystroke always lands. */
function useThrottled<T>(value: T, ms: number): T {
  const [throttled, setThrottled] = useState(value)
  const [lastAt, setLastAt] = useState(0)
  useEffect(() => {
    const now = Date.now()
    const wait = Math.max(0, lastAt + ms - now)
    const id = setTimeout(() => {
      setThrottled(value)
      setLastAt(Date.now())
    }, wait)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ms])
  return throttled
}

/** One readonly JSON block (single-tab CodeViewer keeps copy + highlighting). */
function JsonBlock({ id, label, value }: { id: string; label: string; value: unknown }) {
  return (
    <CodeViewer
      tabs={[{ id, label, language: 'json', code: safeJson(value) ?? 'undefined' }]}
      maxHeightClassName="max-h-none"
    />
  )
}

/**
 * Live values + errors for one registered container form. Its own component so
 * the `useWatch` subscription count follows the forms map (hooks per form).
 */
function FormSnapshot({ formKey, form }: { formKey: string; form: UseFormReturn<any> }) {
  const values = useWatch({ control: form.control })
  const { errors } = useFormState({ control: form.control })
  const throttledValues = useThrottled(values, 250)
  const errorMessages = Object.fromEntries(
    Object.entries(errors).map(([field, err]) => [
      field,
      (err as { message?: unknown })?.message ?? 'invalid',
    ]),
  )
  // Strip the mount-id suffix (after `#`) — the container name reads better.
  const label = formKey.split('#')[0] || 'form'
  return (
    <JsonBlock
      id={formKey}
      label={label}
      value={{ values: throttledValues, errors: errorMessages }}
    />
  )
}

function FormTab() {
  const forms = useEngineDebugStore((s) => s.forms)
  const entries = Object.entries(forms)
  if (entries.length === 0) {
    return <EmptyHint>No container form mounted yet.</EmptyHint>
  }
  return (
    <div className="space-y-2">
      {entries.map(([key, form]) => (
        <FormSnapshot key={key} formKey={key} form={form} />
      ))}
    </div>
  )
}

function DataTab() {
  const contextData = useEngineDebugStore((s) => s.contextData)
  // Merge provider slots: the studio's own app-level DataProvider plus the
  // preview's inner one — only the written names matter to the reader.
  const merged = Object.assign({}, ...Object.values(contextData))
  if (Object.keys(merged).length === 0) {
    return <EmptyHint>No context data yet — select a table row in the preview.</EmptyHint>
  }
  return <JsonBlock id="context-data" label="contextData" value={merged} />
}

function StoresTab() {
  const loaders = useEngineDebugStore((s) => s.loaders)
  const fnCtxs = useStord((s) => s.fnCtxs)
  const [, bump] = useReducer((n: number) => n + 1, 0)

  // The state-store registry is a plain Map with per-key zustand stores: poll
  // for new keys, subscribe to the current ones for data changes.
  useEffect(() => {
    const poll = setInterval(bump, 500)
    const unsubs = stateStoreKeys().map((k) => getStateStore(k).subscribe(bump))
    return () => {
      clearInterval(poll)
      unsubs.forEach((u) => u())
    }
  })

  const state = Object.fromEntries(
    stateStoreKeys().map((k) => [k, getStateStore(k).getState().data]),
  )
  const snapshot = {
    stateStores: state,
    fnCtxs: Object.keys(fnCtxs),
    activeLoaders: Object.values(loaders).flat(),
  }
  return <JsonBlock id="stores" label="engine stores" value={snapshot} />
}

function ApiTab({ log }: { log: ApiLogEntry[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  if (log.length === 0) {
    return <EmptyHint>No requests yet — interact with an API-wired bin.</EmptyHint>
  }
  return (
    <div className="space-y-1">
      {log.map((entry) => {
        const expanded = expandedId === entry.id
        const ok = entry.status != null && entry.status < 400
        return (
          <div key={entry.id} className="rounded-md border border-zinc-200 bg-zinc-50/60">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : entry.id)}
              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[11px]"
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3 shrink-0 text-zinc-400" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0 text-zinc-400" aria-hidden="true" />
              )}
              <span className="font-semibold text-zinc-600">{entry.method}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-zinc-500">
                {entry.url}
              </span>
              <span
                className={`font-semibold ${ok ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {entry.status ?? '—'}
              </span>
              <span className="text-zinc-400">{entry.time}</span>
            </button>
            {expanded && (
              <div className="border-t border-zinc-200 p-1.5">
                <JsonBlock id={`log-${entry.id}`} label="response" value={entry.data} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-zinc-300 px-2 py-3 text-center text-[11px] text-zinc-400">
      {children}
    </p>
  )
}

/**
 * Rendered react-query-devtools style: portaled to `document.body` as a fixed
 * right-hand drawer ABOVE the Radix dialog layer (the engine's modals portal
 * at z-99999 with a full-screen backdrop — an in-modal panel ends up dimmed
 * and unclickable exactly when an inner modal's state is worth inspecting).
 * `pointer-events-auto` re-enables interaction under Radix's modal
 * `pointer-events: none` body lock, and `data-engine-devtools` is the marker
 * the library Modal's outside-interaction guard checks so clicking the panel
 * doesn't dismiss open dialogs.
 */
export function PreviewDevTools({
  log,
  configJson,
  onClose,
}: {
  log: ApiLogEntry[]
  configJson: string
  onClose: () => void
}) {
  const [tab, setTab] = useState('form')
  return createPortal(
    <aside
      data-engine-devtools=""
      className="pointer-events-auto fixed inset-y-0 right-0 z-[100000] flex w-[360px] flex-col gap-2 border-l border-zinc-200 bg-white p-3 shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Preview dev tools
        </h2>
        <button
          type="button"
          aria-label="Close dev tools"
          onClick={onClose}
          className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <SegmentedControl
        aria-label="Dev tools tab"
        variant="chips"
        options={TABS}
        value={tab}
        onChange={setTab}
      />
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'form' && <FormTab />}
        {tab === 'data' && <DataTab />}
        {tab === 'stores' && <StoresTab />}
        {tab === 'api' && <ApiTab log={log} />}
        {tab === 'config' && (
          <JsonBlock id="config" label="bins JSON" value={JSON.parse(configJson)} />
        )}
      </div>
    </aside>,
    document.body,
  )
}

/**
 * The floating opener, also portaled above the dialog layer (and marked
 * data-engine-devtools) so it stays clickable while any modal is open.
 */
export function PreviewDevToolsToggle({ onOpen }: { onOpen: () => void }) {
  return createPortal(
    <button
      type="button"
      data-engine-devtools=""
      aria-label="Show dev tools"
      title="Show dev tools"
      onClick={onOpen}
      className="pointer-events-auto fixed bottom-4 right-4 z-[100000] flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-colors hover:bg-zinc-700"
    >
      <Bug className="h-4 w-4" aria-hidden="true" />
    </button>,
    document.body,
  )
}
