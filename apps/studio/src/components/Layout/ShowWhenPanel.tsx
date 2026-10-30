import type { PathSeg } from './gridStore'
import type { GridItemData } from './types'

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
