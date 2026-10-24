import { ChevronDown, ChevronRight, Lock, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { authEnvName, authEnvRows, AUTH_ENV_ROLES, type AuthDef } from '../Workspace/auth'
import { useScopedEndpoints } from '../Library/scope'
import { useMemo, useState } from 'react'
import { CodeViewer, IconButton, Input, Select } from '../common'
import { useEnvStore } from './envStore'
import { exportName, toDotEnv, toWiringTs } from './serialize'
import { useActiveProject, useWorkspaceStore } from '../Workspace/workspaceStore'
import {
  createCustomActionDef,
  duplicateActionNames,
  isValidActionName,
  toActionsTs,
  type CustomActionDef,
} from '../Workspace/customActions'

import {
  CUSTOM_PROP_KIND_OPTIONS,
  createCustomComponentDef,
  createCustomPropDef,
  duplicateComponentNames,
  isValidComponentName,
  toComponentsTsx,
  type CustomComponentDef,
  type CustomPropDef,
  type CustomPropKind,
} from '../Workspace/customComponents'

const NO_ACTIONS: CustomActionDef[] = []
const NO_COMPONENTS: CustomComponentDef[] = []

/** One declared prop row: key, kind, label, select options, default. */
function PropRow({ prop, onChange, onRemove }: { prop: CustomPropDef; onChange: (p: Partial<CustomPropDef>) => void; onRemove: () => void }) {
  const key = prop.key.trim()
  const invalid = !!key && !isValidComponentName(key)
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-[160px] shrink-0">
          <Input value={prop.key} onChange={(e) => onChange({ key: e.target.value })} placeholder="propKey" aria-label="Prop key" className="font-mono" />
        </div>
        <div className="w-[110px] shrink-0">
          <Select value={prop.kind} onChange={(v) => onChange({ kind: v as CustomPropKind })} options={CUSTOM_PROP_KIND_OPTIONS} aria-label="Prop kind" />
        </div>
        <Input value={prop.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="Label (optional)" aria-label="Prop label" />
        <div className="w-[120px] shrink-0">
          <Input value={prop.defaultValue} onChange={(e) => onChange({ defaultValue: e.target.value })} placeholder="default" aria-label="Prop default" className="font-mono" />
        </div>
        <IconButton label={`Remove ${key || 'prop'}`} onClick={onRemove} className="shrink-0 text-ink-3 hover:text-danger">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </IconButton>
      </div>
      {prop.kind === 'select' && (
        <Input
          value={prop.options.join(', ')}
          onChange={(e) => onChange({ options: e.target.value.split(',').map((o) => o.trim()) })}
          placeholder="Options, comma-separated (bar, line, pie)"
          aria-label="Select options"
          className="font-mono"
        />
      )}
      {invalid && (
        <p className="pl-1 text-ui-sm text-warn">
          Not a JS identifier — <span className="font-mono">props.{key}</span> can't be written; the prop is left out.
        </p>
      )}
    </div>
  )
}

/**
 * The project's custom components (see the grilled design): the names of
 * React components the developer codes in the app and hands to
 * `<ComponentsProvider>`, each with the props it accepts (key + kind, so the
 * item inspector draws a typed field). Declared once here, picked by a
 * Custom item, exported as typed stubs in `components.tsx`.
 */
function CustomComponentsSection() {
  const project = useActiveProject()
  const update = useWorkspaceStore((s) => s.updateProjectCustomComponents)
  const defs = project?.snapshot.customComponents ?? NO_COMPONENTS
  const duplicates = useMemo(() => duplicateComponentNames(defs), [defs])
  const [open, setOpen] = useState<Record<string, boolean>>({})
  if (!project) return null
  const set = (next: CustomComponentDef[]) => update(project.id, next)
  const patch = (id: string, p: Partial<CustomComponentDef>) => set(defs.map((d) => (d.id === id ? { ...d, ...p } : d)))
  return (
    <div className="mt-8">
      <h2 className="text-base font-[650] tracking-[-0.01em] text-ink">Custom components</h2>
      <p className="mb-4 mt-1 text-ui text-ink-2">
        React components coded in the app and registered through{' '}
        <span className="font-mono">{'<ComponentsProvider components={…}>'}</span>. Declare a name and
        the props it accepts here, then place a <span className="font-mono">Custom</span> item and pick
        it. The export's <span className="font-mono">components.tsx</span> carries a typed stub for
        each; the Live Preview shows a placeholder with the resolved value.
      </p>
      <div className="space-y-2">
        {defs.map((d) => {
          const name = d.name.trim()
          const invalid = !!name && !isValidComponentName(name)
          const duplicate = !!name && duplicates.has(name)
          const expanded = open[d.id] ?? false
          return (
            <div key={d.id} className="space-y-1 rounded-md border border-line bg-panel p-2">
              <div className="flex items-center gap-2">
                <IconButton label={expanded ? 'Hide props' : 'Show props'} onClick={() => setOpen({ ...open, [d.id]: !expanded })} className="shrink-0 text-ink-3">
                  {expanded ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
                </IconButton>
                <div className="w-[200px] shrink-0">
                  <Input
                    value={d.name}
                    onChange={(e) => patch(d.id, { name: e.target.value })}
                    placeholder="ComponentName"
                    aria-label="Custom component name"
                    className="font-mono"
                  />
                </div>
                <Input
                  value={d.description}
                  onChange={(e) => patch(d.id, { description: e.target.value })}
                  placeholder="What it shows (optional)"
                  aria-label="Custom component description"
                />
                <span className="shrink-0 text-ui-sm text-ink-3">{d.props.length} prop{d.props.length === 1 ? '' : 's'}</span>
                <IconButton label={`Remove ${name || 'component'}`} onClick={() => set(defs.filter((x) => x.id !== d.id))} className="shrink-0 text-ink-3 hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
              </div>
              {!name && <p className="pl-1 text-ui-sm text-ink-3">Unnamed — items using it export MISSING_COMPONENT until it has a name.</p>}
              {invalid && (
                <p className="pl-1 text-ui-sm text-warn">
                  Not a JS identifier — <span className="font-mono">components.{name}</span> can't be written. Letters, digits, _ and $ only, no leading digit.
                </p>
              )}
              {duplicate && (
                <p className="pl-1 text-ui-sm text-warn">
                  Duplicate name <span className="font-mono">{name}</span> — one registry key, so only one implementation survives.
                </p>
              )}
              {expanded && (
                <div className="mt-2 space-y-2 border-t border-line pt-2">
                  <span className="sec-label block">Props</span>
                  {d.props.map((p, i) => (
                    <PropRow
                      key={i}
                      prop={p}
                      onChange={(patchProp) => patch(d.id, { props: d.props.map((x, j) => (j === i ? { ...x, ...patchProp } : x)) })}
                      onRemove={() => patch(d.id, { props: d.props.filter((_, j) => j !== i) })}
                    />
                  ))}
                  <button type="button" onClick={() => patch(d.id, { props: [...d.props, createCustomPropDef()] })} className="btn w-full border-dashed">
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add prop
                  </button>
                </div>
              )}
            </div>
          )
        })}
        <button type="button" onClick={() => set([...defs, createCustomComponentDef()])} className="btn w-full border-dashed">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add custom component
        </button>
      </div>
    </div>
  )
}

/**
 * The project's custom button actions (see the grilled design): the names of
 * functions the developer codes in the app and hands to `<ActionsProvider>`.
 * Declared once here, picked in a button's action chips, exported as typed
 * stubs in `actions.ts`. Only the names live in the studio — like the env
 * vars, the values (the code) belong to the app.
 */
function CustomActionsSection() {
  const project = useActiveProject()
  const update = useWorkspaceStore((s) => s.updateProjectCustomActions)
  const actions = project?.snapshot.customActions ?? NO_ACTIONS
  const duplicates = useMemo(() => duplicateActionNames(actions), [actions])
  if (!project) return null
  const set = (next: CustomActionDef[]) => update(project.id, next)
  const patch = (id: string, p: Partial<CustomActionDef>) =>
    set(actions.map((a) => (a.id === id ? { ...a, ...p } : a)))
  return (
    <div className="mt-8">
      <h2 className="text-base font-[650] tracking-[-0.01em] text-ink">Custom actions</h2>
      <p className="mb-4 mt-1 text-ui text-ink-2">
        Functions coded in the app and registered through{' '}
        <span className="font-mono">{'<ActionsProvider actions={…}>'}</span>. Declare a name here,
        then add it to a button's action chips (
        <span className="font-mono">fn:&lt;name&gt;</span> in the export). The export's{' '}
        <span className="font-mono">actions.ts</span> carries a typed stub for each; the Live
        Preview logs a stub call and continues the chain.
      </p>
      <div className="space-y-2">
        {actions.map((a) => {
          const name = a.name.trim()
          const invalid = !!name && !isValidActionName(name)
          const duplicate = !!name && duplicates.has(name)
          return (
            <div key={a.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-[220px] shrink-0">
                  <Input
                    value={a.name}
                    onChange={(e) => patch(a.id, { name: e.target.value })}
                    placeholder="actionName"
                    aria-label="Custom action name"
                    className="font-mono"
                  />
                </div>
                <Input
                  value={a.description}
                  onChange={(e) => patch(a.id, { description: e.target.value })}
                  placeholder="What it does (optional)"
                  aria-label="Custom action description"
                />
                <IconButton
                  label={`Remove ${name || 'action'}`}
                  onClick={() => set(actions.filter((x) => x.id !== a.id))}
                  className="shrink-0 text-ink-3 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
              </div>
              {!name && (
                <p className="pl-1 text-ui-sm text-ink-3">Unnamed — buttons using it export fn:MISSING_ACTION until it has a name.</p>
              )}
              {invalid && (
                <p className="pl-1 text-ui-sm text-warn">
                  Not a JS identifier — <span className="font-mono">actions.{name}</span> can't be written. Letters, digits, _ and $ only, no leading digit.
                </p>
              )}
              {duplicate && (
                <p className="pl-1 text-ui-sm text-warn">
                  Duplicate name <span className="font-mono">{name}</span> — one registry key, so only one implementation survives.
                </p>
              )}
            </div>
          )
        })}
        <button
          type="button"
          onClick={() => set([...actions, createCustomActionDef()])}
          className="btn w-full border-dashed"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add custom action
        </button>
      </div>
    </div>
  )
}

const NO_AUTH: AuthDef[] = []

/**
 * The project's sign-in (see the grilled design `azure-sso-auth`): a select
 * over the shared library's Azure SSO entries. Picking one seeds its four env
 * var rows above (locked, with the entry's dev values) and attaches its
 * profile endpoint; *None* unlocks the rows and never deletes them.
 */
function AuthSection() {
  const project = useActiveProject()
  const entries = useWorkspaceStore((s) => s.library.auth ?? NO_AUTH)
  const setProjectAuth = useWorkspaceStore((s) => s.setProjectAuth)
  const endpoints = useScopedEndpoints()
  const navigate = useNavigate()
  if (!project) return null
  const authId = project.snapshot.authId ?? null
  const picked = authId ? entries.find((a) => a.id === authId) : undefined
  const dangling = !!authId && !picked
  const pick = (next: string | null) => {
    const def = next ? entries.find((a) => a.id === next) ?? null : null
    setProjectAuth(project.id, next)
    // The Env rows live in the live store while the project is open (autosaved from there).
    useEnvStore.getState().hydrate(authEnvRows(def, useEnvStore.getState().vars, picked ?? null))
  }
  const endpointName = picked?.profile.enabled ? endpoints.find((e) => e.id === picked.profile.read.endpointId)?.name : undefined
  return (
    <div className="mt-8">
      <h2 className="text-base font-[650] tracking-[-0.01em] text-ink">Sign-in</h2>
      <p className="mb-4 mt-1 text-ui text-ink-2">
        Azure SSO from the shared library: the app shows a sign-in screen until the user signs in, passes the bearer token on
        every request, loads the profile into a state slice and shows the user menu — exported as the document's{' '}
        <span className="font-mono">auth</span>, no app code. The Live Preview signs the studio user in as a mock account.
      </p>
      <div className="flex items-center gap-2">
        <div className="w-[260px] shrink-0">
          <Select
            aria-label="Sign-in entry"
            value={authId ?? ''}
            onChange={(v) => pick(v === '' ? null : v)}
            options={[
              { value: '', label: '— none (no sign-in) —' },
              ...(dangling ? [{ value: authId!, label: '⚠ missing entry' }] : []),
              ...entries.map((a) => ({ value: a.id, label: a.name.trim() || '(unnamed)' })),
            ]}
          />
        </div>
        <button type="button" className="btn" onClick={() => navigate('/library/auth')}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Manage entries
        </button>
      </div>
      {dangling && (
        <p className="mt-2 text-ui-sm text-warn">The picked entry was deleted — the export carries no sign-in until another one is picked.</p>
      )}
      {picked && (
        <ul className="mt-3 space-y-1 text-ui-sm text-ink-2">
          <li>
            Env vars (locked above):{' '}
            {AUTH_ENV_ROLES.map((r) => (
              <span key={r.role} className="mr-1.5 font-mono">
                {authEnvName(picked, r.role)}
              </span>
            ))}
          </li>
          <li>
            Profile:{' '}
            {picked.profile.enabled ? (
              endpointName ? (
                <>
                  <span className="font-mono">{endpointName}</span> → state slice <span className="font-mono">{picked.profile.stateKey.trim() || 'me'}</span> (bindable as page data under “Sign-in”)
                </>
              ) : (
                <span className="text-warn">the entry's endpoint is missing — signed-in is enough, no profile.</span>
              )
            ) : (
              'none (signed-in is enough).'
            )}
          </li>
          <li>User menu: {picked.userMenu.show ? 'shown in the app bar' : 'hidden'} · login: {picked.loginMode}</li>
        </ul>
      )}
    </div>
  )
}

/**
 * The Env page — environment variables the exported app config consumes.
 * One centered column (the mockup's detail page): the var table, then the
 * live export below it: a paste-ready `.env` plus the App-wiring snippet
 * showing how `HttpClientFactory`/`Core` read it. `API_URL` is seeded and
 * locked (name fixed, row not removable) because studio itself consumes it:
 * it's the Live Preview modal's base URL, which is what lets wired bins fetch
 * for real. Like every other studio store, values are in-memory only.
 */
export function EnvEditor() {
  const vars = useEnvStore((s) => s.vars)
  const addVar = useEnvStore((s) => s.addVar)
  const removeVar = useEnvStore((s) => s.removeVar)
  const renameVar = useEnvStore((s) => s.renameVar)
  const updateValue = useEnvStore((s) => s.updateValue)

  const dotEnv = useMemo(() => toDotEnv(vars), [vars])
  const wiring = useMemo(() => toWiringTs(vars), [vars])
  const customActions = useActiveProject()?.snapshot.customActions ?? NO_ACTIONS
  const actionsTs = useMemo(() => toActionsTs(customActions), [customActions])
  const customComponents = useActiveProject()?.snapshot.customComponents ?? NO_COMPONENTS
  const componentsTsx = useMemo(() => toComponentsTsx(customComponents), [customComponents])

  // Non-blocking duplicate check on the *exported* names (API_URL and
  // VITE_API_URL collide after prefixing) — same philosophy as the API page's
  // warnings: never prevent the edit, just say what breaks.
  const duplicateNames = useMemo(() => {
    const seen = new Map<string, number>()
    for (const v of vars) {
      const name = v.name.trim()
      if (!name) continue
      const exported = exportName(name)
      seen.set(exported, (seen.get(exported) ?? 0) + 1)
    }
    return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([name]) => name))
  }, [vars])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto max-w-[760px] px-6 pb-16 pt-6">
        <h2 className="text-base font-[650] tracking-[-0.01em] text-ink">Environment variables</h2>
        <p className="mb-4 mt-1 text-ui text-ink-2">
          Exported as a Vite <span className="font-mono">.env</span> — names get the{' '}
          <span className="font-mono">VITE_</span> prefix.{' '}
          <span className="font-mono">API_URL</span> is also the Live Preview's API base
          URL, so wired bins fetch for real.
        </p>

        <div className="space-y-2">
          {vars.map((v) => {
            const isDuplicate = !!v.name.trim() && duplicateNames.has(exportName(v.name))
            return (
              <div key={v.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="relative w-[220px] shrink-0">
                    <Input
                      value={v.name}
                      onChange={(e) => renameVar(v.id, e.target.value)}
                      disabled={v.locked}
                      placeholder="NAME"
                      className={v.locked ? 'pr-7 font-mono disabled:cursor-default' : 'font-mono'}
                    />
                    {v.locked && (
                      <Lock
                        className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-3"
                        aria-label="Name locked — studio consumes this variable"
                      />
                    )}
                  </div>
                  <Input
                    value={v.value}
                    onChange={(e) => updateValue(v.id, e.target.value)}
                    placeholder={v.name === 'API_URL' ? 'http://localhost:9000' : 'value'}
                    className="font-mono"
                  />
                  <IconButton
                    label={v.locked ? `${v.name} cannot be removed` : `Remove ${v.name || 'variable'}`}
                    onClick={() => removeVar(v.id)}
                    disabled={v.locked}
                    className="shrink-0 text-ink-3 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                </div>
                {isDuplicate && (
                  <p className="pl-1 text-ui-sm text-warn">
                    Duplicate exported name{' '}
                    <span className="font-mono">{exportName(v.name)}</span> — only one
                    line survives in the .env.
                  </p>
                )}
              </div>
            )
          })}

          <button type="button" onClick={addVar} className="btn w-full border-dashed">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add variable
          </button>
        </div>

        <AuthSection />
        <CustomActionsSection />
        <CustomComponentsSection />

        <div className="mt-6">
          <span className="sec-label mb-2 block">Export</span>
          <CodeViewer
            maxHeightClassName="max-h-[60vh]"
            tabs={[
              { id: 'env', label: '.env', language: 'text', code: dotEnv },
              { id: 'wiring', label: 'App wiring', language: 'text', code: wiring },
              { id: 'actions', label: 'actions.ts', language: 'text', code: actionsTs },
              { id: 'components', label: 'components.tsx', language: 'text', code: componentsTsx },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
