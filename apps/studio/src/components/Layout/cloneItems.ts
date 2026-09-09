import type { ButtonItemConfig, GridItemData } from './types'

/**
 * Deep-clone a canvas tree with fresh ids (the mockup's `instantiate`): every
 * item and nested child canvas gets a new id, and the stable-id references a
 * button carries (modal to close, table to reload, toast / dialog to show) are
 * remapped onto the copies. A page navigation is dropped — a template is
 * project-agnostic and the target page would not exist here. Used to insert
 * a template into a page and to save a page as a template.
 */
export function cloneItems(items: GridItemData[]): GridItemData[] {
  const copy = JSON.parse(JSON.stringify(items)) as GridItemData[]
  const idMap = new Map<string, string>()

  const reId = (list: GridItemData[]) => {
    for (const item of list) {
      const next = crypto.randomUUID()
      idMap.set(item.id, next)
      item.id = next
      item.childCanvases?.forEach((c) => reId(c.items))
    }
  }
  reId(copy)

  const remap = (list: GridItemData[]) => {
    for (const item of list) {
      if (item.type === 'button' && item.config) {
        const c = item.config as ButtonItemConfig
        if (c.modalItemId) c.modalItemId = idMap.get(c.modalItemId) ?? ''
        if (c.reloadTableItemId) c.reloadTableItemId = idMap.get(c.reloadTableItemId) ?? ''
        const nav = c.navigation
        if (nav?.kind === 'toast' || nav?.kind === 'dialog') {
          c.navigation = { ...nav, targetItemId: idMap.get(nav.targetItemId) ?? '' }
        } else if (nav?.kind === 'page') {
          c.navigation = { kind: 'none' }
        }
      }
      item.childCanvases?.forEach((c) => remap(c.items))
    }
  }
  remap(copy)
  return copy
}
