import type { DataValue } from '@gummy-ui/ui'
import { MISSING_PAGE, navParamValue } from '../Layout/gridConfig'
import type { PageDef } from './types'

/** The breadcrumb-related part of an exported `PageElement`. */
export type EnginePageMeta = {
  /** The page name, or the authored crumb source as an engine `DataValue`. */
  title: string | DataValue
  parent?: string
  breadcrumb?: false
}

/**
 * A studio page's `title` / `parent` / `breadcrumb` as `pages.ts` emits them
 * and the Live Preview renders them: the crumb source becomes the title
 * `DataValue` (an empty one falls back to the page name), the parent id
 * resolves to its key (loud `MISSING_PAGE` when that page is gone).
 */
export function enginePageMeta(pg: PageDef, pages: Pick<PageDef, 'id' | 'key'>[]): EnginePageMeta {
  const crumb = pg.crumb ? navParamValue(pg.crumb) : undefined
  return {
    title: (crumb as DataValue | undefined) ?? pg.name,
    ...(pg.parentId ? { parent: pages.find((p) => p.id === pg.parentId)?.key ?? MISSING_PAGE } : {}),
    ...(pg.hideBreadcrumbs ? { breadcrumb: false as const } : {}),
  }
}
