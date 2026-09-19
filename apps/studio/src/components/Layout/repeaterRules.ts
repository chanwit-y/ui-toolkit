import type { ComponentType } from './componentCatalog'
import type { GridItemData } from './types'

/**
 * Pure repeater rules (no store import — `gridStore` enforces them).
 *
 * A repeater's item template is read-only display (see the grilled design):
 * every item would mount a copy of the same field name into one form, so the
 * form-bound types can't be placed anywhere inside one. Editable rows are the
 * Form List's job.
 */
const BLOCKED_IN_REPEATER: ReadonlySet<ComponentType> = new Set<ComponentType>([
  'textfield',
  'textarea',
  'select',
  'autocomplete',
  'multiAutocomplete',
  'checkbox',
  'radio',
  'datepicker',
  'daterangepicker',
  'datetimepicker',
  'uploadimage',
  'uploadfile',
  'hidden',
])

export const BLOCKED_IN_REPEATER_HINT =
  'Repeater items are read-only — use a Form List for editable rows'

export function isBlockedInRepeater(type: ComponentType): boolean {
  return BLOCKED_IN_REPEATER.has(type)
}

/**
 * The repeaters whose item template a drill-in path is inside, outermost
 * first — the inspected / dropped item always lives in the active canvas, so
 * its ancestors are exactly the items along the path.
 */
export function ancestorRepeaters(
  rootItems: GridItemData[],
  activePath: { itemId: string; canvasIndex: number }[],
): GridItemData[] {
  const out: GridItemData[] = []
  let items = rootItems
  for (const seg of activePath) {
    const item = items.find((i) => i.id === seg.itemId)
    const child = item?.childCanvases?.[seg.canvasIndex]
    if (!item || !child) break
    if (item.type === 'repeater' && item.config) out.push(item)
    items = child.items
  }
  return out
}

/** `items` without the form-bound types, at any depth. */
export function withoutBlockedItems(items: GridItemData[]): GridItemData[] {
  return items
    .filter((item) => !isBlockedInRepeater(item.type))
    .map((item) =>
      item.childCanvases
        ? {
            ...item,
            childCanvases: item.childCanvases.map((c) => ({
              ...c,
              items: withoutBlockedItems(c.items),
            })),
          }
        : item,
    )
}
