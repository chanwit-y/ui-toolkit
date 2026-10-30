import type { Expr, FormulaBlankPolicy, Rule } from '@gummy-ui/ui'
import { Check, X } from 'lucide-react'
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import { cn, Input, Select } from '../common'
import { columnFormatToEngine, type ColumnFormatConfig } from '../Layout/types'
import type { StudioCondition } from '../Workspace/logic'
import { typeContext } from './ConditionLine'
import type { LogicEnv } from './editors'
import { operandOptions, operandType, sampleDefault, type OperandOption, type OperandType } from './model'
import { TypeIcon } from './pills'
import { evaluateSample, makeSampleEval, sampleRefExpr, sampleRefs, sampleSession, type SampleEval, type SampleRef, type SampleResult } from './sample'

/** The samples' evaluator, for the per-line dots and the matching rule card (spec §14.4 / §14.6). */
export const SampleEvalContext = createContext<SampleEval | null>(null)
export const useSampleEval = () => useContext(SampleEvalContext)

export type TryItKind = 'formula' | 'condition' | 'rule'
type Out = { format?: ColumnFormatConfig; onEmpty?: FormulaBlankPolicy; onDivideByZero?: FormulaBlankPolicy }
type SampleInput = { ref: SampleRef; type: OperandType; options: OperandOption[]; text: string; typed: boolean }

/** Everything the Try-it column and the editors need for one node: the inputs, the result, the evaluator. */
export function useTryIt(kind: TryItKind, node: Expr | StudioCondition | Rule | null, out: Out, env: LogicEnv) {
  useSyncExternalStore(sampleSession.subscribe, sampleSession.version)
  const ctx = useMemo(() => typeContext(env), [env])
  const refs = useMemo(() => (node ? sampleRefs(node, env.formulas, env.rules, env.names) : []), [node, env])
  const inputs: SampleInput[] = refs.map((r) => {
    const expr = sampleRefExpr(r, env.scope.loads)
    const type = operandType(expr, ctx)
    const options = operandOptions(expr, ctx)
    const typed = sampleSession.get(r.id)
    return { ref: r, type, options, text: typed ?? sampleDefault(type, options, r.key), typed: typed !== undefined }
  })
  const samples = Object.fromEntries(inputs.map((i) => [i.ref.id, i.text]))
  const key = JSON.stringify(samples)
  const fieldTypes = useMemo(() => Object.fromEntries(env.scope.fields.map((f) => [f.name, f.kind])), [env.scope.fields])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const evaluator = useMemo(() => makeSampleEval(refs, samples, env.formulas, env.rules, env.names, fieldTypes), [refs, key, env, fieldTypes])
  const result: SampleResult | null = useMemo(
    () =>
      node
        ? evaluateSample(kind, node, { format: columnFormatToEngine(out.format), onEmpty: out.onEmpty, onDivideByZero: out.onDivideByZero }, refs, samples, env.formulas, env.rules, env.names, fieldTypes)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, node, out.format, out.onEmpty, out.onDivideByZero, refs, key, env, fieldTypes],
  )
  return { kind, inputs, result, evaluator }
}

export type TryItState = ReturnType<typeof useTryIt>

function SampleBox({ input }: { input: SampleInput }) {
  const set = (v: string) => sampleSession.set(input.ref.id, v)
  const label = `Sample ${input.ref.label}`
  if (input.options.length) return <Select aria-label={label} options={input.options} value={input.text} onChange={set} />
  if (input.type === 'boolean') {
    const on = input.text === 'true'
    return (
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => set(on ? 'false' : 'true')} className="flex h-7 items-center gap-2 text-ui-sm text-ink-2">
        <span className={cn('relative h-4 w-7 rounded-full transition-colors', on ? 'bg-accent' : 'bg-line-strong')}>
          <span className={cn('absolute top-0.5 size-3 rounded-full bg-surface transition-all', on ? 'left-3.5' : 'left-0.5')} />
        </span>
        {on ? 'on' : 'off'}
      </button>
    )
  }
  return (
    <Input
      aria-label={label}
      type={input.type === 'number' ? 'number' : input.type === 'date' ? 'date' : 'text'}
      value={input.text}
      placeholder="empty"
      onChange={(e) => set(e.target.value)}
      className="w-full font-mono"
    />
  )
}

/** The right-hand Try it column: typed, prefilled inputs per operand and the engine's result. */
export function TryIt({ state }: { state: TryItState }) {
  const { kind, inputs, result } = state
  return (
    <aside aria-label="Try it" className="flex min-h-0 flex-col gap-3">
      <div className="sec-label">Try it</div>
      <div className="rounded-lg border border-line bg-panel p-3">
        {kind === 'condition' && result ? (
          <div data-testid="logic-sample-result" className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-ui font-semibold', result.raw ? 'bg-logic-value-tint text-logic-value' : 'bg-panel-2 text-ink-2')}>
            {result.raw ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
            {result.raw ? 'True' : 'False'}
          </div>
        ) : result ? (
          <>
            <div data-testid="logic-sample-result" className="break-all font-mono text-[18px] font-semibold leading-tight text-ink">
              {result.text}
            </div>
            {result.error ? (
              <p className="mt-1 text-ui-xs text-danger">{result.error}</p>
            ) : (
              <p className="mt-1 font-mono text-ui-xs text-ink-3">raw {result.raw === undefined || result.raw === null ? 'empty' : JSON.stringify(result.raw)}</p>
            )}
            {kind === 'rule' && result.branch !== undefined && <p className="mt-1 text-ui-xs text-ink-2">from {result.branch >= 0 ? `branch ${result.branch + 1}` : 'Otherwise'}</p>}
          </>
        ) : (
          <p className="text-ui-sm text-ink-3">Nothing to try yet.</p>
        )}
      </div>
      {inputs.length === 0 ? (
        <p className="text-ui-xs text-ink-3">The result doesn’t read the form or any data.</p>
      ) : (
        <div className="min-h-0 space-y-2 overflow-y-auto pr-0.5">
          {inputs.map((i) => (
            <label key={i.ref.id} className="block space-y-1">
              <span className="flex items-center gap-1 truncate text-ui-xs text-ink-2" title={i.ref.label}>
                <TypeIcon type={i.type} className="text-ink-3" />
                <span className="truncate font-mono">{i.ref.label}</span>
              </span>
              <SampleBox input={i} />
            </label>
          ))}
          <button type="button" className="text-ui-xs text-ink-3 underline-offset-2 hover:text-ink hover:underline" onClick={() => sampleSession.reset(inputs.map((i) => i.ref.id))}>
            Reset samples
          </button>
        </div>
      )}
    </aside>
  )
}
