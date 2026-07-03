import { AlertTriangle, Play, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '../common'
import { useApiUrl } from '../Env'
import { useModelStore } from '../Model/modelStore'
import { useApiStore } from './apiStore'
import { executeTestRun, modelSkeletonJson, testRunGap, type TestRunResult } from './testRun'
import { useApiTestStore, type TestInputKey } from './testStore'
import type { EndpointDef } from './types'

const INPUT_KEYS: { key: TestInputKey; refKey: 'query' | 'parameter' | 'body'; label: string }[] = [
  { key: 'query', refKey: 'query', label: 'Query' },
  { key: 'parameter', refKey: 'parameter', label: 'Parameter' },
  { key: 'body', refKey: 'body', label: 'Body' },
]

/** Parse one input; returns the value or an error message. */
function parseInput(text: string): { value?: unknown; error?: string } {
  try {
    return { value: JSON.parse(text) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * "Test run" — executes the endpoint through the real engine client (see
 * `testRun.ts` and the grilled design). One seeded JSON editor per defined
 * model ref; the Run button disables with the Live Preview's wiring-gap
 * language when the endpoint can't execute; the result shows the engine-view
 * body plus HTTP status/duration, with non-blocking response-model validation.
 */
export function TestRunSection({ endpoint }: { endpoint: EndpointDef }) {
  const endpoints = useApiStore((s) => s.endpoints)
  const models = useModelStore((s) => s.models)
  const apiUrl = useApiUrl()
  const storedInputs = useApiTestStore((s) => s.inputs[endpoint.id])
  const setInput = useApiTestStore((s) => s.setInput)
  const resetInputs = useApiTestStore((s) => s.resetInputs)

  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<TestRunResult | null>(null)

  const gap = testRunGap(endpoint, models, apiUrl)

  // The visible rows: only refs the endpoint defines. Text = stored edit or
  // the skeleton generated from the current model.
  const rows = useMemo(
    () =>
      INPUT_KEYS.filter(({ refKey }) => endpoint[refKey] != null).map((row) => ({
        ...row,
        text:
          storedInputs?.[row.key] ?? modelSkeletonJson(models, endpoint[row.refKey]),
      })),
    [endpoint, models, storedInputs],
  )

  const parsed = rows.map((row) => ({ ...row, ...parseInput(row.text) }))
  const parseErrors = parsed.filter((p) => p.error)

  const run = async () => {
    setRunning(true)
    setResult(null)
    try {
      setResult(
        await executeTestRun({
          endpoint,
          endpoints,
          models,
          apiUrl,
          inputs: Object.fromEntries(parsed.map((p) => [p.key, p.value])),
        }),
      )
    } finally {
      setRunning(false)
    }
  }

  const statusTone =
    result == null
      ? ''
      : result.ok
        ? 'bg-teal-50 text-teal-700 border-teal-200'
        : 'bg-red-50 text-red-700 border-red-200'

  return (
    <div className="space-y-3 rounded-md border border-zinc-200 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Test run
        </h3>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={() => resetInputs(endpoint.id)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors hover:text-teal-600"
          >
            <RotateCcw size={11} aria-hidden="true" />
            Reset to model skeleton
          </button>
        )}
      </div>

      {parsed.map((row) => (
        <div key={row.key} className="space-y-1">
          <span className="block text-xs font-medium text-zinc-600">
            {row.label} (JSON)
          </span>
          <textarea
            value={row.text}
            onChange={(e) => setInput(endpoint.id, row.key, e.target.value)}
            rows={Math.min(10, Math.max(3, row.text.split('\n').length))}
            spellCheck={false}
            className="w-full resize-y rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-xs text-zinc-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
          {row.error && (
            <p className="flex items-start gap-1 text-xs text-amber-600">
              <AlertTriangle size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
              {row.error}
            </p>
          )}
        </div>
      ))}

      <div className="space-y-1">
        <button
          type="button"
          disabled={!!gap || running || parseErrors.length > 0}
          onClick={run}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700',
            'disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400',
          )}
        >
          <Play size={12} aria-hidden="true" />
          {running ? 'Running…' : 'Run'}
        </button>
        <p className="text-[11px] text-zinc-400">
          {gap
            ? `Can't run: ${gap}.`
            : parseErrors.length > 0
              ? 'Fix the JSON above to run.'
              : `Runs for real against ${apiUrl} — mutating methods change that backend.`}
        </p>
      </div>

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 font-semibold',
                statusTone,
              )}
            >
              {result.ok ? 'OK' : 'Error'}
              {result.status != null ? ` · ${result.status}` : ''}
            </span>
            <span className="text-zinc-400">{result.durationMs} ms</span>
            {result.errorMessage && (
              <span className="min-w-0 truncate text-red-600">{result.errorMessage}</span>
            )}
          </div>

          {result.validation.length > 0 && (
            <div className="space-y-0.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
              <p className="text-[11px] font-medium text-amber-700">
                Response doesn’t match the response model:
              </p>
              {result.validation.map((v) => (
                <p key={v} className="font-mono text-[11px] text-amber-700">
                  {v}
                </p>
              ))}
            </div>
          )}

          <pre className="max-h-72 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-2 font-mono text-[11px] leading-relaxed text-zinc-700">
            {result.body === undefined
              ? '(no response body)'
              : JSON.stringify(result.body, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
