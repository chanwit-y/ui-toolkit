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
 * JSON syntax tinting, in the mockup's `.code` look (panel-2 well in light,
 * near-black in dark; keys/numbers lifted to full ink). Purely presentational.
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
    <div className="overflow-hidden rounded-md border border-line bg-panel-2 dark:bg-[#0a0b0d]">
      <div className="flex items-center justify-between gap-2 border-b border-line px-1.5 py-1">
        <div className="flex items-center gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-selected={tab.id === activeTab.id}
              onClick={() => setActiveId(tab.id)}
              className="mini-tab flex-none whitespace-nowrap px-2 font-mono text-ui-sm! aria-selected:bg-surface"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-sm border-transparent bg-transparent font-mono text-ui-sm text-ink-3 hover:text-ink"
        >
          {copied ? (
            <>
              <Check size={12} aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} aria-hidden="true" />
              Copy
            </>
          )}
        </button>
      </div>

      <div className={cn(maxHeightClassName, 'overflow-auto')}>
        <pre className="min-w-full py-1.5 font-mono text-[11px] leading-[1.65] text-ink-2">
          <code className="grid grid-cols-[auto_1fr]">
            {lines.map((line, i) => (
              <Fragment key={i}>
                <span className="select-none border-r border-line px-2 text-right text-ink-3">
                  {i + 1}
                </span>
                <span className="whitespace-pre px-3">
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
        <span key={key++} className="text-ink">
          {text}
        </span>,
      )
    } else if (str) {
      nodes.push(
        <span key={key++} className="text-ink-2">
          {text}
        </span>,
      )
    } else if (num) {
      nodes.push(
        <span key={key++} className="font-semibold text-ink">
          {text}
        </span>,
      )
    } else if (keyword) {
      nodes.push(
        <span key={key++} className="font-semibold text-ink">
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
