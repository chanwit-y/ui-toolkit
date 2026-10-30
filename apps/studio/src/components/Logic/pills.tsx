import { Calendar, CircleDot, Hash, List, ToggleLeft, Type } from 'lucide-react'
import { cn } from '../common'
import type { OperandType, SentencePart, SpanTone } from './model'

/** Pill colours per operand kind (spec §14.9) — literal class strings so Tailwind emits them. */
export const PILL_TONE: Record<SpanTone, string> = {
  field: 'bg-logic-field-tint text-logic-field',
  data: 'bg-logic-data-tint text-logic-data',
  saved: 'bg-logic-saved-tint text-logic-saved',
  rule: 'bg-logic-rule-tint text-logic-rule',
  value: 'bg-logic-value-tint text-logic-value',
  fn: 'bg-panel-2 text-logic-fn font-semibold',
  op: 'text-ink-2',
  punct: 'text-ink-3',
  plain: 'bg-panel-2 text-ink',
  error: 'bg-panel-2 text-danger',
}

const TYPE_ICON = { text: Type, number: Hash, date: Calendar, boolean: ToggleLeft, options: List, list: List, any: CircleDot } as const

export const TYPE_LABEL: Record<OperandType, string> = { text: 'text', number: 'number', date: 'date', boolean: 'yes / no', options: 'options', list: 'list', any: 'value' }

export function TypeIcon({ type, className }: { type: OperandType; className?: string }) {
  const Icon = TYPE_ICON[type]
  return <Icon aria-hidden className={cn('size-3 shrink-0', className)} strokeWidth={2.2} />
}

/** An operand as a pill: type icon + name on the operand kind's tint. */
export function OperandPill({ text, tone, type, className, title }: { text: string; tone: SpanTone; type?: OperandType; className?: string; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-px align-middle text-ui-sm font-medium', PILL_TONE[tone], className)}>
      {type && <TypeIcon type={type} />}
      <span className="truncate">{text}</span>
    </span>
  )
}

/** A value as a chip. */
export function ValueChip({ text }: { text: string }) {
  return <span className="inline-flex max-w-full items-center truncate rounded-md bg-logic-value-tint px-1.5 py-px align-middle text-ui-sm text-logic-value">{text}</span>
}

/** A summary line: operand pills, operator words, value chips. */
export function SentenceLine({ parts }: { parts: SentencePart[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {parts.map((p, i) =>
        p.kind === 'operand' ? (
          <OperandPill key={i} text={p.text} tone={p.tone} type={p.type} />
        ) : p.kind === 'value' ? (
          <ValueChip key={i} text={p.text} />
        ) : p.kind === 'code' ? (
          <code key={i} className="rounded bg-panel-2 px-1 font-mono text-ui-xs text-ink">
            {p.text}
          </code>
        ) : (
          <span key={i} className="text-ui-sm text-ink-2">
            {p.text}
          </span>
        ),
      )}
    </span>
  )
}

/** A condition's whole summary: one line, or *All of / Any of* with a line each. */
export function Sentence({ sentence }: { sentence: { head?: string; lines: SentencePart[][] } }) {
  if (!sentence.head) return <SentenceLine parts={sentence.lines[0] ?? []} />
  return (
    <div className="space-y-1">
      <div className="text-ui-xs font-semibold uppercase tracking-wide text-ink-3">{sentence.head}</div>
      <ul className="space-y-1 border-l-2 border-line pl-2">
        {sentence.lines.map((l, i) => (
          <li key={i}>
            <SentenceLine parts={l} />
          </li>
        ))}
      </ul>
    </div>
  )
}
