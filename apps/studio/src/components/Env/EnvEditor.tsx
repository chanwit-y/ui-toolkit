import { Lock, Plus, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { CodeViewer, IconButton, Input } from '../common'
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

const NO_ACTIONS: CustomActionDef[] = []

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

        <CustomActionsSection />

        <div className="mt-6">
          <span className="sec-label mb-2 block">Export</span>
          <CodeViewer
            maxHeightClassName="max-h-[60vh]"
            tabs={[
              { id: 'env', label: '.env', language: 'text', code: dotEnv },
              { id: 'wiring', label: 'App wiring', language: 'text', code: wiring },
              { id: 'actions', label: 'actions.ts', language: 'text', code: actionsTs },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
