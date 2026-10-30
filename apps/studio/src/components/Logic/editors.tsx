import type { Expr } from '@gummy-ui/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { parseExpr, printExpr, type FormulaLibDef, type LogicNames, type RuleLibDef } from '../Workspace/logic'
import { CodeInput } from './CodeInput'
import type { LogicScopeInfo } from './scope'

/** What every editor piece needs: the operand scope, the saved items and the names. */
export type LogicEnv = { scope: LogicScopeInfo; formulas: FormulaLibDef[]; rules: RuleLibDef[]; names: LogicNames }

// ---- one expression ----------------------------------------------------------

/**
 * A one-line formula bound to an `Expr`: the text is kept locally while it
 * doesn't parse (the last valid formula stays stored), and follows the value
 * when it changes from outside.
 */
export function ExprField({ value, onChange, env, label, placeholder }: { value: Expr; onChange: (e: Expr) => void; env: LogicEnv; label: string; placeholder?: string }) {
  const printed = useMemo(() => printExpr(value, env.names), [value, env.names])
  const [text, setText] = useState(printed)
  const [error, setError] = useState<{ message: string; at: number } | null>(null)
  const last = useRef(printed)
  useEffect(() => {
    if (printed !== last.current) {
      last.current = printed
      setText(printed)
      setError(null)
    }
  }, [printed])
  return (
    <CodeInput
      aria-label={label}
      value={text}
      placeholder={placeholder}
      error={error?.message}
      errorAt={error?.at}
      scope={env.scope}
      formulas={env.formulas}
      rules={env.rules}
      onChange={(t) => {
        setText(t)
        const r = parseExpr(t, env.names)
        if (r.value === undefined) return setError(t.trim() ? { message: r.error, at: r.at } : null)
        setError(null)
        last.current = printExpr(r.value, env.names)
        onChange(r.value)
      }}
    />
  )
}
