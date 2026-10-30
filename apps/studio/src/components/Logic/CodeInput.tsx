import { createContext, useContext, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../common'
import { LOGIC_FUNCTIONS, type FormulaLibDef, type RuleLibDef } from '../Workspace/logic'
import type { LogicScopeInfo } from './scope'

/**
 * Where the palette inserts: the code input that last had focus registers an
 * `insert(text)` that puts the text at its caret. One per dialog.
 */
export type InsertTarget = { insert: (text: string) => void }
export const InsertContext = createContext<{ setTarget: (t: InsertTarget) => void; insert: (text: string) => void } | null>(null)

type Suggestion = { label: string; sub?: string; insert: string; replace: number }

/** Suggestions for the text before the caret: `[` fields, `((` formulas, `IF((` rules, `$` page data, `row.` fields, function names. */
function suggest(before: string, scope: LogicScopeInfo, formulas: FormulaLibDef[], rules: RuleLibDef[]): Suggestion[] {
  let m: RegExpExecArray | null
  const has = (s: string, q: string) => s.toLowerCase().includes(q.toLowerCase())
  if ((m = /IF\(\(([^()]*)$/.exec(before)))
    return rules.filter((r) => r.name && has(r.name, m![1])).map((r) => ({ label: r.name, sub: `rule · ${r.resultType}`, insert: `${r.name}))`, replace: m![1].length }))
  if ((m = /\(\(([^()]*)$/.exec(before)))
    return formulas.filter((f) => f.name && has(f.name, m![1])).map((f) => ({ label: f.name, sub: 'formula', insert: `${f.name}))`, replace: m![1].length }))
  if ((m = /\[([^\]]*)$/.exec(before)))
    return scope.fields.filter((f) => has(f.name, m![1])).map((f) => ({ label: f.name, sub: f.kind, insert: `${f.name}]`, replace: m![1].length }))
  if ((m = /\$([A-Za-z0-9_]*)$/.exec(before)))
    return scope.loads.filter((l) => has(l.key, m![1])).map((l) => ({ label: `$${l.key}`, sub: 'page data', insert: l.key, replace: m![1].length }))
  if ((m = /\brow\.([A-Za-z0-9_]*)$/.exec(before)) && scope.row?.fields)
    return scope.row.fields.filter((f) => has(f.name, m![1])).map((f) => ({ label: `row.${f.name}`, sub: f.kind, insert: f.name, replace: m![1].length }))
  if ((m = /(?:^|[^A-Za-z0-9_.$\][])([A-Za-z]{2,})$/.exec(before)))
    return LOGIC_FUNCTIONS.filter((f) => f.fn.startsWith(m![1].toUpperCase())).map((f) => ({ label: `${f.fn}(${f.args})`, sub: f.hint, insert: `${f.fn}(`, replace: m![1].length }))
  return []
}

export type CodeInputProps = {
  value: string
  onChange: (text: string) => void
  scope: LogicScopeInfo
  formulas: FormulaLibDef[]
  rules: RuleLibDef[]
  /** The parse problem to show (red border + message); `null` when the text is valid. */
  error?: string | null
  multiline?: boolean
  placeholder?: string
  className?: string
  'aria-label': string
}

/** A logic code field (one line, or a textarea for Code mode) with autocomplete and palette inserts. */
export function CodeInput({ value, onChange, scope, formulas, rules, error, multiline, placeholder, className, 'aria-label': ariaLabel }: CodeInputProps) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const insertCtx = useContext(InsertContext)
  const [caret, setCaret] = useState<number | null>(null)
  const [active, setActive] = useState(0)
  const [closed, setClosed] = useState(false)
  const items = useMemo(
    () => (caret === null || closed ? [] : suggest(value.slice(0, caret), scope, formulas, rules).slice(0, 8)),
    [caret, closed, value, scope, formulas, rules],
  )

  const insertAt = (text: string, replace = 0) => {
    const el = ref.current
    const at = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? at
    const before = value.slice(0, at - replace)
    const needsSpace = replace === 0 && before && !/[\s([]$/.test(before) && !/^[)\],]/.test(text)
    const next = `${before}${needsSpace ? ' ' : ''}${text}${value.slice(end)}`
    const pos = before.length + (needsSpace ? 1 : 0) + text.length
    onChange(next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(pos, pos)
      setCaret(pos)
    })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!items.length) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const s = items[Math.min(active, items.length - 1)]
      insertAt(s.insert, s.replace)
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      setClosed(true)
    }
  }

  const common = {
    ref,
    value,
    'aria-label': ariaLabel,
    'aria-invalid': !!error,
    placeholder,
    spellCheck: false,
    onChange: (e: { target: { value: string; selectionStart: number | null } }) => {
      onChange(e.target.value)
      setCaret(e.target.selectionStart)
      setClosed(false)
      setActive(0)
    },
    onKeyDown,
    onSelect: (e: { currentTarget: { selectionStart: number | null } }) => setCaret(e.currentTarget.selectionStart),
    onFocus: () => insertCtx?.setTarget({ insert: (text) => insertAt(text) }),
    onBlur: () => window.setTimeout(() => setCaret(null), 150),
    className: cn('field w-full font-mono', multiline && 'min-h-24 py-1.5 leading-relaxed', error && 'border-danger', className),
  }

  return (
    <div className="relative min-w-0">
      {multiline ? <textarea {...common} rows={4} /> : <input {...common} />}
      {items.length > 0 && (
        <ul role="listbox" aria-label="Suggestions" className="absolute left-0 top-full z-50 mt-1 max-h-56 w-72 overflow-auto rounded-md border border-line bg-panel py-1 shadow-lg">
          {items.map((s, i) => (
            <li key={`${s.label}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  insertAt(s.insert, s.replace)
                }}
                className={cn('flex w-full items-baseline justify-between gap-2 px-2 py-1 text-left text-ui-sm', i === active ? 'bg-panel-2 text-ink' : 'text-ink-2')}
              >
                <span className="truncate font-mono">{s.label}</span>
                {s.sub && <span className="shrink-0 text-ui-xs text-ink-3">{s.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-ui-xs text-danger">{error}</p>}
    </div>
  )
}
