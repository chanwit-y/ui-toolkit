import { useMemo, useRef } from 'react'
import { renderHtmlCell } from '@gummy-ui/ui'
import { Select } from '../common'
import { pathParams } from '../Workspace/snapshots'
import type { PageDef } from '../Workspace/types'
import type { DataTableColumnConfig } from './types'

const TEXTAREA_CLASS =
  'w-full rounded-md border border-line-strong bg-surface px-2.5 py-1.5 font-mono text-ui-sm text-ink outline-none focus:border-focus focus:ring-2 focus:ring-focus/20'

/**
 * Ready-made cells built on the library's always-shipped `dt-*` helper classes
 * (a Tailwind class typed here is never scanned, so it wouldn't be emitted).
 * `{{value}}` is the column's own value, so a snippet works on any column.
 */
const SNIPPETS: { id: string; label: string; html: string }[] = [
  { id: 'strong', label: 'Bold value', html: '<span class="dt-strong">{{value}}</span>' },
  {
    id: 'subtitle',
    label: 'Value + muted subtitle',
    html: '<div class="dt-strong">{{value}}</div>\n<div class="dt-muted">{{field}}</div>',
  },
  { id: 'badge', label: 'Badge', html: '<span class="dt-badge">{{value}}</span>' },
  { id: 'badge-gray', label: 'Badge (gray)', html: '<span class="dt-badge dt-badge-gray">{{value}}</span>' },
  {
    id: 'external',
    label: 'External link (new tab)',
    html: '<a href="https://example.com/{{value}}" target="_blank">{{value}} ↗</a>',
  },
]

/** The structural slice of `RowModel` / `RowFields` the picker needs. */
export type PickableFields = { fields: { name: string; kind: string }[] | null; reason?: string }

const PAGE_PREFIX = 'page:'

/** `/country/:id` → `/country/{{id}}` — each `:param` reads the same-named row field. */
function pageLinkSnippet(page: PageDef): string {
  const href = pathParams(page.path).reduce((path, param) => path.replace(`:${param}`, `{{${param}}}`), page.path)
  return `<a href="${href}">{{value}}</a>`
}

type ColumnHtmlFieldProps = {
  /** The template and the accessor `{{value}}` reads (`''` for a page-level block, where `{{value}}` is the bound value itself). */
  column: Pick<DataTableColumnConfig, 'html' | 'accessor'>
  onChange: (html: string) => void
  /** The fields "Insert field" offers (a table's row model, a repeater's item fields), or why there are none. */
  rowModel: PickableFields
  pages: PageDef[]
  /** The canvas's first mock row — what the preview strip renders. */
  previewRow: Record<string, unknown>
  /** Textarea height (default 3 — a cell; a page block wants more). */
  rows?: number
  /** The preview strip's caption (default "Cell preview"). */
  previewLabel?: string
  /** Preview with the page block's typographic defaults. */
  prose?: boolean
}

/**
 * Authors a column's `html` template (see the grilled HTML-column design):
 * a monospace textarea, an "Insert field" picker over the row model dropping
 * `{{field}}` at the cursor, snippets (incl. an in-app link per page), and a
 * one-row preview through the engine's own template + sanitiser — with a hint
 * when the sanitiser dropped something, which would otherwise read as a bug.
 */
export function ColumnHtmlField({ column, onChange, rowModel, pages, previewRow, rows = 3, previewLabel = 'Cell preview', prose = false }: ColumnHtmlFieldProps) {
  const textarea = useRef<HTMLTextAreaElement>(null)

  /** Replace the selection (or append) and put the caret after the insert. */
  const insert = (text: string) => {
    const el = textarea.current
    const start = el?.selectionStart ?? column.html.length
    const end = el?.selectionEnd ?? column.html.length
    onChange(column.html.slice(0, start) + text + column.html.slice(end))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + text.length, start + text.length)
    })
  }

  const fieldOptions = [
    { value: '', label: 'Insert field…' },
    { value: 'value', label: 'value · this column (formatted)' },
    ...(rowModel.fields ?? []).map((f) => ({ value: f.name, label: `${f.name} · ${f.kind}` })),
  ]
  const snippetOptions = [
    { value: '', label: 'Insert snippet…' },
    ...SNIPPETS.map((s) => ({ value: s.id, label: s.label })),
    ...pages.map((p) => ({ value: `${PAGE_PREFIX}${p.id}`, label: `Link to page: ${p.name}` })),
  ]
  const insertSnippet = (id: string) => {
    if (id.startsWith(PAGE_PREFIX)) {
      const page = pages.find((p) => p.id === id.slice(PAGE_PREFIX.length))
      if (page) insert(pageLinkSnippet(page))
      return
    }
    const snippet = SNIPPETS.find((s) => s.id === id)
    if (snippet) insert(snippet.html)
  }

  const preview = useMemo(
    () => (column.html.trim() ? renderHtmlCell(column.html, previewRow, previewRow[column.accessor]) : null),
    [column.html, column.accessor, previewRow],
  )

  return (
    <div className="space-y-1.5">
      <textarea
        ref={textarea}
        value={column.html}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        placeholder={'<b>{{value}}</b> — empty = plain value'}
        aria-label="Cell HTML"
        className={TEXTAREA_CLASS}
      />
      <div className="grid grid-cols-2 gap-2">
        <Select options={fieldOptions} value="" onChange={(v) => v && insert(`{{${v}}}`)} aria-label="Insert field" />
        <Select options={snippetOptions} value="" onChange={(v) => v && insertSnippet(v)} aria-label="Insert snippet" />
      </div>
      {rowModel.fields === null && (
        <p className="text-ui-xs text-ink-3">{rowModel.reason} You can still type {'{{field}}'} by hand.</p>
      )}
      {preview && (
        <div className="space-y-1">
          <span className="text-ui-sm font-medium text-ink-2">{previewLabel}</span>
          <div className="pointer-events-none overflow-hidden rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink">
            <div className={`datatable-html-cell ${prose ? 'gummy-html-prose' : ''}`} dangerouslySetInnerHTML={{ __html: preview.html }} />
          </div>
          {preview.removed > 0 && (
            <p className="text-ui-xs text-warn">
              The sanitiser removed {preview.removed} unsafe {preview.removed === 1 ? 'part' : 'parts'} (scripts, event
              handlers, {'<style>'} and form controls are not allowed).
            </p>
          )}
        </div>
      )}
      <p className="text-ui-xs text-ink-3">
        {'{{field}}'} reads the row (escaped). Style with <code>dt-strong</code> / <code>dt-muted</code> /{' '}
        <code>dt-badge</code> or a <code>style</code> attribute with Radix vars; sorting and search still use the
        accessor value.
      </p>
    </div>
  )
}
