import dayjs from 'dayjs'
import { templateFields } from '@gummy-ui/ui'
import type { DataTableColumnConfig } from './types'

const ID_ISH = /^id$|Id$|_id$/
/** Prose-like accessors get a paragraph so the line clamp / tooltip is visible on the canvas. */
const PROSE_ISH = /(description|about|summary|note|notes|comment|comments|remark|remarks|detail|details|body|text|message)$/i
const PROSE =
  'A longer value that runs past the cell: the table cuts it to the configured number of lines and shows the whole text in a tooltip when you point at it in the Live Preview.'

/** Write `value` at a dot path, creating the objects on the way (mock rows only). */
function setPath(row: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.split('.').filter(Boolean)
  let level = row
  for (const segment of segments.slice(0, -1)) {
    if (typeof level[segment] !== 'object' || level[segment] === null) level[segment] = {}
    level = level[segment] as Record<string, unknown>
  }
  const last = segments[segments.length - 1]
  if (last !== undefined && level[last] === undefined) level[last] = value
}

/**
 * Synthesize mock preview rows from the authored columns, so the table body
 * always matches the inspector. Type-aware per column: an id-ish accessor
 * (`id`, `userId`, `user_id`) counts 1..N, a date-format column renders real
 * consecutive dates through dayjs with that format, everything else is
 * "<Header> N". Fields a column's `html` template reads beyond the accessors
 * (`{{code}}`, `{{region.name}}`) are filled the same way, so an HTML cell
 * never previews blank. The base date is fixed so re-renders are deterministic.
 * Rows fit on a single client-mode page (size 10), so the pagination footer
 * renders "Page 1 of 1" without making the cell tall.
 */
export const DATATABLE_PREVIEW_ROW_COUNT = 5
export function buildDataTablePreviewRows(
  columns: DataTableColumnConfig[],
): Record<string, unknown>[] {
  return Array.from({ length: DATATABLE_PREVIEW_ROW_COUNT }, (_, i) => {
    const row: Record<string, unknown> = {}
    for (const column of columns) {
      if (!column.accessor) continue
      if (column.useDateFormat) {
        row[column.accessor] = dayjs('2026-01-05').add(i, 'day').format(column.useDateFormat)
      } else if (ID_ISH.test(column.accessor)) {
        row[column.accessor] = i + 1
      } else if (PROSE_ISH.test(column.accessor)) {
        row[column.accessor] = `${column.header || column.accessor} ${i + 1} — ${PROSE}`
      } else if (column.mergeRows) {
        // Repeat down the rows in pairs so a `mergeRows` column shows its spans.
        row[column.accessor] = `${column.header || column.accessor} ${Math.floor(i / 2) + 1}`
      } else if (column.mergeColumns) {
        // The same value in every flagged column of a row (but the last row),
        // so adjacent `mergeColumns` columns show a merged cell.
        row[column.accessor] = i === DATATABLE_PREVIEW_ROW_COUNT - 1 ? `${column.header || column.accessor} ${i + 1}` : `Shared ${i + 1}`
      } else {
        row[column.accessor] = `${column.header || column.accessor} ${i + 1}`
      }
    }
    for (const column of columns) {
      for (const path of templateFields(column.html)) {
        const leaf = path.split('.').pop() ?? path
        // `{{items.length}}` reads an array's size: preview it as a count.
        setPath(row, path, ID_ISH.test(leaf) || leaf === 'length' ? i + 1 : `${leaf} ${i + 1}`)
      }
    }
    return row
  })
}

/**
 * The mock value an `html` block's template renders against on the canvas and
 * in its inspector preview: every `{{path}}` the template reads resolves to
 * its own `{path}` token (a `.length` to a count), so a bound block previews
 * its shape without the item. `{{value}}` reads the value itself, so the root
 * carries a `value` token too.
 */
export function buildHtmlPreviewValue(template: string): Record<string, unknown> {
  const row: Record<string, unknown> = { value: '{value}' }
  for (const path of templateFields(template)) {
    const leaf = path.split('.').pop() ?? path
    setPath(row, path, leaf === 'length' ? 3 : `{${path}}`)
  }
  return row
}
