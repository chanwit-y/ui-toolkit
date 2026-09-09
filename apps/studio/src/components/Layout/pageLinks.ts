import type { PageDef } from '../Workspace/types'
import type { ButtonItemConfig, GridItemData } from './types'

/** Visit every item of a canvas tree, child canvases included. */
export function walkItems(items: GridItemData[], visit: (item: GridItemData) => void): void {
  for (const item of items) {
    visit(item)
    item.childCanvases?.forEach((c) => walkItems(c.items, visit))
  }
}

export type PageLink =
  | { kind: 'page'; pageId: string; via: string; buttonId: string }
  | { kind: 'toast' | 'dialog'; targetItemId: string; via: string; buttonId: string }
  | { kind: 'link'; href: string; via: string; buttonId: string }

/**
 * What a page's buttons lead to (the mockup's `pageLinks`): the Pages tree
 * nests pages under the page that links to them, and the Overview draws the
 * same edges. Reads the design-only `navigation` of every standalone button.
 */
export function pageLinks(page: PageDef): PageLink[] {
  const out: PageLink[] = []
  walkItems(page.grid.items, (item) => {
    if (item.type !== 'button' || !item.config) return
    const c = item.config as ButtonItemConfig
    const nav = c.navigation
    if (!nav || nav.kind === 'none') return
    const via = c.label || 'button'
    if (nav.kind === 'page' && nav.pageId) {
      out.push({ kind: 'page', pageId: nav.pageId, via, buttonId: item.id })
    } else if ((nav.kind === 'toast' || nav.kind === 'dialog') && nav.targetItemId) {
      out.push({ kind: nav.kind, targetItemId: nav.targetItemId, via, buttonId: item.id })
    } else if (nav.kind === 'link' && nav.href) {
      out.push({ kind: 'link', href: nav.href, via, buttonId: item.id })
    }
  })
  return out
}

/** Every item id → item, across a page's canvases. */
export function indexItems(items: GridItemData[]): Map<string, GridItemData> {
  const map = new Map<string, GridItemData>()
  walkItems(items, (item) => map.set(item.id, item))
  return map
}
