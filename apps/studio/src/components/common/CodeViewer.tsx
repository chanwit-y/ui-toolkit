import { Check, Copy } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cn } from './cn'

export type CodeTab = {
  id: string
  label: string
  language: 'json' | 'css' | 'text'
  code: string
}

type CodeViewerProps = {
  tabs: CodeTab[]
  initialTabId?: string
  maxHeightClassName?: string
}

/**
 * Read-only code viewer with tabs, line numbers, copy-to-clipboard and minimal
 * JSON syntax tinting. Purely presentational so it can be reused anywhere.
 */
export function CodeViewer({
  tabs,
  initialTabId,
  maxHeightClassName = 'max-h-80',
}: CodeViewerProps) {
  const [activeId, setActiveId] = useState(initialTabId ?? tabs[0]?.id)
  const [copied, setCopied] = useState(false)

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0]

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const lines = useMemo(
    () => (activeTab ? activeTab.code.replace(/\n$/, '').split('\n') : []),
    [activeTab],
  )

  if (!activeTab) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeTab.code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/80 px-2 py-1.5">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                tab.id === activeTab.id
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          {copied ? (
            <>
              <Check size={13} aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy size={13} aria-hidden="true" />
              Copy
            </>
          )}
        </button>
      </div>

      <div className={cn(maxHeightClassName, 'overflow-auto')}>
        <pre className="min-w-full text-[11px] leading-relaxed">
          <code className="grid grid-cols-[auto_1fr]">
            {lines.map((line, i) => (
              <Fragment key={i}>
                <span className="select-none border-r border-zinc-800/80 px-2 text-right text-zinc-600">
                  {i + 1}
                </span>
                <span className="whitespace-pre px-3 text-zinc-100">
                  {highlight(line, activeTab.language)}
                </span>
              </Fragment>
            ))}
          </code>
        </pre>
      </div>
    </div>
  )
}

/**
 * Tiny token-tinting for JSON keys / strings / numbers / keywords. Returns React
 * nodes so we never inject raw HTML. Other languages render plain.
 */
function highlight(line: string, language: CodeTab['language']): ReactNode {
  if (language !== 'json') return line || '\u00A0'

  const tokenPattern =
    /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(\b-?\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)/gi

  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = tokenPattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index))
    }
    const [text, propKey, str, num, keyword] = match
    if (propKey) {
      nodes.push(
        <span key={key++} className="text-sky-300">
          {text}
        </span>,
      )
    } else if (str) {
      nodes.push(
        <span key={key++} className="text-emerald-300">
          {text}
        </span>,
      )
    } else if (num) {
      nodes.push(
        <span key={key++} className="text-amber-300">
          {text}
        </span>,
      )
    } else if (keyword) {
      nodes.push(
        <span key={key++} className="text-violet-300">
          {text}
        </span>,
      )
    }
    lastIndex = tokenPattern.lastIndex
  }

  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex))
  }

  return nodes.length > 0 ? nodes : '\u00A0'
}
