import type { PageDef } from '../Workspace/types'
import type { ButtonItemConfig, DataTableConfig, GridItemData } from './types'

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

/** True when the button's effective action list plays `Navigate`. */
export function buttonNavigates(c: ButtonItemConfig): boolean {
  const list = c.mode === 'confirm' ? [...c.confirmTrue, ...c.confirmFalse] : c.actions
  return list.includes('Navigate')
}

/**
 * What a page's components lead to (the mockup's `pageLinks`): the Pages tree
 * nests pages under the page that links to them, and the Overview draws the
 * same edges. Page edges come from the engine navigation — a button's
 * `Navigate` action target and a data table's row click; the design-only
 * `navigation` still contributes links, toasts and dialogs.
 */
export function pageLinks(page: PageDef): PageLink[] {
  const out: PageLink[] = []
  walkItems(page.grid.items, (item) => {
    if (!item.config) return
    if (item.type === 'datatable') {
      const t = item.config as DataTableConfig
      if (t.rowNavigate?.pageId) {
        out.push({
          kind: 'page',
          pageId: t.rowNavigate.pageId,
          via: `${t.title || t.name || 'table'} row`,
          buttonId: item.id,
        })
      }
      return
    }
    if (item.type !== 'button') return
    const c = item.config as ButtonItemConfig
    const via = c.label || 'button'
    if (buttonNavigates(c) && c.navigate?.pageId) {
      out.push({ kind: 'page', pageId: c.navigate.pageId, via, buttonId: item.id })
    }
    const nav = c.navigation
    if (!nav || nav.kind === 'none') return
    if ((nav.kind === 'toast' || nav.kind === 'dialog') && nav.targetItemId) {
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
