import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../common'
import type { FormulaLibDef, RuleLibDef } from '../Workspace/logic'
import { callAt, highlightSpans, suggestFor, type SuggestCatalog, type Suggestion } from './model'
import { PILL_TONE } from './pills'
import type { LogicScopeInfo } from './scope'

/**
 * Where the Insert list / operator buttons insert: the code input that last
 * had focus registers an `insert(text)` that puts the text at its caret. One
 * per dialog.
 */
export type InsertTarget = { insert: (text: string) => void }
export const InsertContext = createContext<{ setTarget: (t: InsertTarget) => void; insert: (text: string) => void } | null>(null)

/** What the bar can suggest in a scope. */
export function suggestCatalog(scope: LogicScopeInfo, formulas: FormulaLibDef[], rules: RuleLibDef[], condition = false): SuggestCatalog {
  return {
    fields: scope.fields,
    loads: scope.loads,
    rowFields: scope.row?.fields ?? [],
    urlParams: scope.urlParams,
    formulas: formulas.filter((f) => f.name.trim()),
    rules: rules.filter((r) => r.name.trim()),
    condition,
  }
}

export type CodeInputProps = {
  value: string
  onChange: (text: string) => void
  scope: LogicScopeInfo
  formulas: FormulaLibDef[]
  rules: RuleLibDef[]
  /** The parse problem to show (red border, the bad token underlined, the message below); `null` when valid. */
  error?: string | null
  /** Where the problem is (a character index), to underline the token there. */
  errorAt?: number
  /** A taller box that takes new lines (Code mode); otherwise one line that wraps and grows, Enter never adds a line. */
  multiline?: boolean
  /** Offer AND / OR / IS EMPTY … (a condition's Code mode). */
  condition?: boolean
  /** Show the `+ − × ÷ & ( )` buttons under the bar. */
  operators?: boolean
  placeholder?: string
  className?: string
  'aria-label': string
}

const OPERATORS = ['+', '−', '×', '÷', '&', '(', ')']

/**
 * The formula bar (spec §14.2): a textarea over a coloured overlay — fields,
 * page data, saved items as pills, functions bold, literals green — with
 * plain-word autocomplete, the function hint while the caret is inside a
 * call, and the bad token underlined.
 */
export function CodeInput({ value, onChange, scope, formulas, rules, error, errorAt, multiline, condition, operators, placeholder, className, 'aria-label': ariaLabel }: CodeInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const insertCtx = useContext(InsertContext)
  const [caret, setCaret] = useState<number | null>(null)
  const [active, setActive] = useState(0)
  const [closed, setClosed] = useState(false)
  const catalog = useMemo(() => suggestCatalog(scope, formulas, rules, condition), [scope, formulas, rules, condition])
  const items: Suggestion[] = useMemo(() => (caret === null || closed ? [] : suggestFor(value.slice(0, caret), catalog).slice(0, 8)), [caret, closed, value, catalog])
  const spans = useMemo(() => highlightSpans(value, error ? errorAt : undefined), [value, error, errorAt])
  const call = caret === null ? null : callAt(value, caret)

  // Grow with the text (the overlay has the same metrics, so it follows) — and
  // re-fit when the bar's width changes under it (a canvas cell across
  // breakpoints or a resized pane), since the wrapped line count changes too.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    fit()
    if (typeof ResizeObserver === 'undefined') return
    let width = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return
      width = el.clientWidth
      fit()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [value, multiline])

  // Where an outside insert (an operator button, the Insert list) lands while the bar isn't focused.
  const lastCaret = useRef<number | null>(null)
  const [flash, setFlash] = useState(0)
  const insertAt = (text: string, replace = 0) => {
    setFlash((n) => n + 1)
    const el = ref.current
    const focused = el !== null && document.activeElement === el
    const at = focused ? el.selectionStart : (lastCaret.current ?? value.length)
    const end = focused ? el.selectionEnd : at
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
    if (items.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const s = items[Math.min(active, items.length - 1)]
        insertAt(s.insert, s.replace)
        return
      }
      if (e.key === 'Escape') {
        e.stopPropagation()
        setClosed(true)
        return
      }
    }
    if (e.key === 'Enter' && !multiline) e.preventDefault()
  }

  // The overlay: every span coloured, the text between them as is.
  const overlay: ReactNode[] = []
  let at = 0
  spans.forEach((s, i) => {
    if (s.from > at) overlay.push(value.slice(at, s.from))
    overlay.push(
      <span key={i} className={`logic-hl logic-hl-${s.tone}`}>
        {value.slice(s.from, s.to)}
      </span>,
    )
    at = s.to
  })
  if (at < value.length) overlay.push(value.slice(at))

  return (
    <div className={cn('relative min-w-0', className)}>
      <div className="logic-bar" data-invalid={error ? '' : undefined}>
        {flash > 0 && <span key={flash} aria-hidden className="logic-bar-ring" />}
        <div className="logic-bar-overlay" aria-hidden>
          {overlay}
          {/* Keeps a trailing new line's height. */}
          {'​'}
        </div>
        <textarea
          ref={ref}
          value={value}
          rows={multiline ? 4 : 1}
          aria-label={ariaLabel}
          aria-invalid={!!error}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value)
            setCaret(e.target.selectionStart)
            setClosed(false)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          onSelect={(e) => {
            setCaret(e.currentTarget.selectionStart)
            lastCaret.current = e.currentTarget.selectionStart
          }}
          onFocus={(e) => {
            setCaret(e.currentTarget.selectionStart)
            insertCtx?.setTarget({ insert: (text) => insertAt(text) })
          }}
          onBlur={() => window.setTimeout(() => setCaret(null), 150)}
          className={multiline ? 'min-h-24' : undefined}
        />
        {items.length > 0 && (
          <ul role="listbox" aria-label="Suggestions" className="logic-drop-in absolute left-0 top-full z-50 mt-1 max-h-64 w-full max-w-80 overflow-auto rounded-lg border border-line bg-surface py-1 shadow-xl">
            {items.map((s, i) => (
              <li key={`${s.label}-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    insertAt(s.insert, s.replace)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn('flex w-full items-center gap-2 px-2 py-1 text-left', i === active ? 'bg-panel-2' : '')}
                >
                  <span className={cn('truncate rounded-full px-1.5 font-mono text-ui-xs', s.kind === 'keyword' ? 'text-ink-2' : PILL_TONE[s.kind])}>{s.label}</span>
                  {s.sub && <span className="ml-auto shrink-0 truncate text-ui-xs text-ink-3">{s.sub}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {call && !items.length && (
        <p className="mt-1 text-ui-xs text-ink-3">
          <span className="font-mono text-ink">
            {call.fn}(
            {call.args.map((a, i) => (
              <span key={a}>
                {i ? ', ' : ''}
                <span className={i === call.arg ? 'font-semibold text-ink underline decoration-dotted underline-offset-2' : 'text-ink-2'}>{a}</span>
              </span>
            ))}
            )
          </span>{' '}
          — {call.hint}
        </p>
      )}
      {operators && (
        <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label="Operators">
          {OPERATORS.map((op) => (
            <button
              key={op}
              type="button"
              aria-label={`Insert ${op}`}
              title={op === '&' ? 'Join as text' : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertAt(op)}
              className="h-6 min-w-7 rounded-md border border-line bg-panel px-1.5 font-mono text-ui-sm text-ink-2 hover:bg-panel-2 hover:text-ink"
            >
              {op}
            </button>
          ))}
        </div>
      )}
      {error && !items.length && <p className="mt-1 text-ui-xs text-danger">{error}</p>}
    </div>
  )
}
