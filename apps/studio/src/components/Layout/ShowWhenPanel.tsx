import { SegmentedControl } from '../common'
import { useGridStore, type PathSeg } from './gridStore'
import type { DataTableConfig, GridItemData, ShowWhen } from './types'

/**
 * The innermost data table whose modal canvas `activePath` is inside, or
 * `null`. A table's single child canvas is its edit modal's content, which
 * the table's Add button reuses over an empty row — the only place the
 * adding / editing distinction exists.
 */
export function enclosingDataTable(rootItems: GridItemData[], activePath: PathSeg[]): GridItemData | null {
  let items = rootItems
  let found: GridItemData | null = null
  for (const seg of activePath) {
    const item = items.find((i) => i.id === seg.itemId)
    const child = item?.childCanvases?.[seg.canvasIndex]
    if (!item || !child) break
    // Only the edit-modal canvas ([0]) has add / edit modes; [1] is the filter form.
    if (item.type === 'datatable' && item.config) found = seg.canvasIndex === 0 ? item : null
    items = child.items
  }
  return found
}

const SHOW_WHEN_OPTIONS: { value: ShowWhen; label: string }[] = [
  { value: 'always', label: 'Always' },
  { value: 'adding', label: 'Adding' },
  { value: 'editing', label: 'Editing' },
]

/**
 * "Show when" for an item inside a data table's modal canvas: always, only
 * while adding (the table's Add opened the modal over an empty row) or only
 * while editing (a row was clicked). Exported as the engine `condition` on
 * `<table name>._id` — how one form carries both a Create and an Update
 * button. Renders nothing outside such a canvas.
 */
export function ShowWhenPanel({ item }: { item: GridItemData }) {
  const items = useGridStore((s) => s.items)
  const activePath = useGridStore((s) => s.activePath)
  const updateItemShowWhen = useGridStore((s) => s.updateItemShowWhen)
  const table = enclosingDataTable(items, activePath)
  if (!table) return null
  const tableName = (table.config as DataTableConfig).name
  const value = item.showWhen ?? 'always'
  return (
    <div className="mb-3 space-y-1 rounded-lg border border-line bg-panel p-2">
      <span className="text-ui-sm font-medium text-ink-2">Show when</span>
      <SegmentedControl
        options={SHOW_WHEN_OPTIONS}
        value={value}
        onChange={(v) => updateItemShowWhen(item.id, v as ShowWhen)}
        aria-label="Show when"
      />
      <p className="text-ui-xs leading-relaxed text-ink-3">
        {value === 'always'
          ? `Shown whether ${tableName}'s form was opened by Add or by a row's Edit.`
          : value === 'adding'
            ? `Only when ${tableName}'s Add opened the form (no ${tableName}._id).`
            : `Only when a ${tableName} row is being edited (${tableName}._id set).`}
      </p>
    </div>
  )
}
