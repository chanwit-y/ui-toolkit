import { Lock, Plus, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { CodeViewer, IconButton, Input } from '../common'
import { useEnvStore } from './envStore'
import { exportName, toDotEnv, toWiringTs } from './serialize'

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

        <div className="mt-6">
          <span className="sec-label mb-2 block">Export</span>
          <CodeViewer
            maxHeightClassName="max-h-[60vh]"
            tabs={[
              { id: 'env', label: '.env', language: 'text', code: dotEnv },
              { id: 'wiring', label: 'App wiring', language: 'text', code: wiring },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
