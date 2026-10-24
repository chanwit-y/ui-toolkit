import { ChevronDown, ChevronRight, Database, Globe, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button, IconButton, Input, SegmentedControl, cn } from '../common'
import {
  LOADING_MODE_OPTIONS,
  createPageLoad,
  loadsOnCycle,
  uniqueLoadKey,
  type LoadingMode,
  type PageLoadDef,
} from '../Workspace/pageLoads'
import { useActivePage } from '../Workspace/workspaceStore'
import { WiringHint } from './ButtonConfigPanel'
import { CrudRefEditor } from './FormListConfigPanel'
import {
  shapeLabel,
  useAuthProfileLoad,
  useGlobalLoads,
  useLoadShapes,
  useOwnPageLoads,
  useSetGlobalLoads,
  useSetPageLoads,
} from './pageData'

const KEY_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  )
}

/**
 * The Data tab of the left pane (see the grilled page-data design), in two
 * sections: the current page's loads — fetched when the page opens, cleared
 * when it closes — and the project's global loads, fetched once when the app
 * starts and kept across pages (the library `<GlobalLoads>`). Every load is
 * stored under its key, where every component on the page can bind to it
 * ("Page data" in a binding, Show when, a table's rows, a select's options, a
 * field's initial value). A load's `:params` may read another load (a page
 * load may read a global one), which chains them; the engine fires them in
 * dependency order.
 */
export function DataPanel() {
  const page = useActivePage()
  const own = useOwnPageLoads()
  const global = useGlobalLoads()
  const setOwn = useSetPageLoads()
  const setGlobal = useSetGlobalLoads()
  const authLoad = useAuthProfileLoad()
  const [open, setOpen] = useState<string | null>(null)
  if (!page) return null
  const all = authLoad ? [...own, ...global, authLoad] : [...own, ...global]
  const clash = authLoad ? [...own, ...global].find((l) => l.key.trim() === authLoad.key) : undefined
  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-3">
      <LoadSection
        title={`This page · ${page.name}`}
        hint="Fetched when the page opens, cleared when it closes. Bind components to a load from their Props (“Page data”)."
        loads={own}
        all={all}
        setLoads={setOwn}
        open={open}
        setOpen={setOpen}
        empty="No loads on this page yet."
        base="data"
      />
      <LoadSection
        title="Global · every page"
        hint="Fetched once when the app starts and kept across pages — the current user, lookup lists. Global loads can’t read a page’s URL :params."
        loads={global}
        all={all}
        setLoads={setGlobal}
        open={open}
        setOpen={setOpen}
        empty="No global loads."
        base="lookups"
        global
      />
      {authLoad && (
        <section className="px-3 pt-3">
          <span className="sec-label block">Sign-in · every page</span>
          <p className="mb-2 mt-1 text-ui-sm text-ink-3">
            The signed-in user's profile, fetched by the project's Azure SSO entry (Env page) — bindable as page data under{' '}
            <span className="font-mono">{authLoad.key}</span>. Not a load you edit: the entry's Profile block is.
          </p>
          <div className="list-row flex items-center gap-2 font-mono text-ui-sm">
            <span className="truncate text-ink">{authLoad.key}</span>
            <span className="tag ml-auto">sign-in</span>
          </div>
          {clash && (
            <p className="mt-1 text-ui-sm text-warn">
              The load <span className="font-mono">{clash.key}</span> writes the same key — it would clear the signed-in profile when its page closes. Rename one.
            </p>
          )}
        </section>
      )}
    </div>
  )
}

function LoadSection({
  title,
  hint,
  loads,
  all,
  setLoads,
  open,
  setOpen,
  empty,
  base,
  global = false,
}: {
  title: string
  hint: string
  loads: PageLoadDef[]
  /** Page + global loads: keys must be unique across both, cycles can span both. */
  all: PageLoadDef[]
  setLoads: (loads: PageLoadDef[]) => void
  open: string | null
  setOpen: (id: string | null) => void
  empty: string
  base: string
  global?: boolean
}) {
  const shapes = useLoadShapes()
  const cycles = loadsOnCycle(all)
  const update = (id: string, patch: Partial<PageLoadDef>) =>
    setLoads(loads.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  const add = () => {
    const load = createPageLoad(uniqueLoadKey(all, base))
    setLoads([...loads, load])
    setOpen(load.id)
  }

  return (
    <section className="pt-2">
      <div className="flex items-center justify-between gap-2 px-3 pb-1">
        <span className="sec-label truncate">{title}</span>
        <IconButton label={global ? 'Add a global load' : 'Add a load'} onClick={add} className="h-6 w-6">
          <Plus size={13} aria-hidden />
        </IconButton>
      </div>
      <p className="px-3 pb-2 text-ui-xs text-ink-3">{hint}</p>
      <div className="space-y-1.5 px-2">
        {loads.length === 0 && (
          <div className="rounded-md border border-dashed border-line p-3 text-center text-ui-sm text-ink-3">
            {global ? <Globe className="mx-auto mb-1 h-4 w-4" aria-hidden /> : <Database className="mx-auto mb-1 h-4 w-4" aria-hidden />}
            {empty}
            <Button size="sm" className="mx-auto mt-2" onClick={add}>
              <Plus size={12} aria-hidden /> {global ? 'Add a global load' : 'Add a load'}
            </Button>
          </div>
        )}
        {loads.map((load) => {
          const expanded = open === load.id
          const key = load.key.trim()
          const keyError = !key
            ? 'A load needs a key.'
            : !KEY_RE.test(key)
              ? 'Use letters, digits, _ or $ (not starting with a digit).'
              : all.some((o) => o.id !== load.id && o.key.trim() === key)
                ? 'Another load (on this page or global) uses this key.'
                : undefined
          const readsUrlParam =
            global &&
            Object.values(load.read.params).some((src) => src.type === 'url' && src.source === 'param')
          return (
            <div key={load.id} className="rounded-md border border-line bg-surface">
              <div className="flex items-center gap-1 px-1.5 py-1">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : load.id)}
                  aria-expanded={expanded}
                  className="flex min-w-0 flex-1 items-center gap-1 text-left"
                >
                  {expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                  )}
                  <span className={cn('truncate font-mono text-ui-sm font-medium', keyError ? 'text-danger' : 'text-ink')}>
                    {key || '(no key)'}
                  </span>
                  {load.loading !== 'none' && <span className="tag shrink-0">{load.loading === 'cycle' ? 'spinner' : 'skeleton'}</span>}
                  {cycles.has(load.id) && <span className="tag shrink-0 text-danger">cycle</span>}
                </button>
                <IconButton
                  label={`Delete load ${key}`}
                  onClick={() => setLoads(loads.filter((l) => l.id !== load.id))}
                  className="h-6 w-6"
                >
                  <Trash2 size={12} aria-hidden />
                </IconButton>
              </div>
              {!expanded && (
                <p className="truncate px-2 pb-1.5 text-ui-xs text-ink-3">{shapeLabel(shapes.get(load.id))}</p>
              )}
              {expanded && (
                <div className="space-y-2 border-t border-line p-2">
                  <Field label="Key (state slice name)">
                    <Input
                      value={load.key}
                      onChange={(e) => update(load.id, { key: e.target.value })}
                      className="font-mono"
                    />
                  </Field>
                  {keyError && <WiringHint>{keyError}</WiringHint>}
                  <CrudRefEditor
                    value={load.read}
                    onChange={(read) => update(load.id, { read })}
                    allowRow={false}
                    extraLabel="Query"
                  />
                  {readsUrlParam && (
                    <WiringHint>
                      A global load sits above every page, so a URL :param never resolves and the load stays held —
                      use a fixed value, a ?query or another global load.
                    </WiringHint>
                  )}
                  <Field label="Response path">
                    <Input
                      value={load.paths}
                      onChange={(e) => update(load.id, { paths: e.target.value })}
                      placeholder="data"
                      className="font-mono"
                    />
                  </Field>
                  <p className="text-ui-xs text-ink-3">Holds {shapeLabel(shapes.get(load.id))}.</p>
                  {cycles.has(load.id) && (
                    <WiringHint>
                      This load and another read each other’s data — neither will ever fire. Break the loop in a
                      param source.
                    </WiringHint>
                  )}
                  <div className="space-y-1">
                    <span className="block text-ui-sm font-medium text-ink-2">While loading</span>
                    <SegmentedControl
                      options={LOADING_MODE_OPTIONS}
                      value={load.loading}
                      onChange={(v) => update(load.id, { loading: v as LoadingMode })}
                      aria-label="While loading"
                    />
                    <p className="text-ui-xs text-ink-3">
                      {load.loading === 'skeleton'
                        ? 'Every component bound to this load draws a placeholder in its own shape until the data lands.'
                        : load.loading === 'cycle'
                          ? 'The page is covered by the loading overlay (a spinner) while the request is in flight.'
                          : 'Nothing is shown — bind “Show when (page data)” to its status instead.'}
                    </p>
                  </div>
                  <Field label="Error message (snackbar)">
                    <Input
                      value={load.errorMessage}
                      onChange={(e) => update(load.id, { errorMessage: e.target.value })}
                      placeholder={load.loading === 'cycle' ? `Couldn't load ${key || 'data'}.` : 'none — silent'}
                    />
                  </Field>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
