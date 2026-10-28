import { walkItems } from '../Layout/pageLinks'
import { createFormListCrudRef, selectionStateKey, type DataTableConfig, type GridItemData } from '../Layout/types'
import type { ModelField } from '../Model/types'
import type { PageLoadDef } from './pageLoads'

const selectionField = (name: string, kind: ModelField['kind'], arrayOf: ModelField['arrayOf'] = 'string'): ModelField => ({ id: `selection-${name}`, name, kind, children: [], arrayOf })

/**
 * The page's data tables with row selection, as read-only pseudo-loads (see
 * the grilled design `datatable-ag-grid-features`): a table publishes its
 * picks as the slice `<stateKey>` = `{ ids, rows, count }`, so bindings and
 * conditions pick it here like a page load. The id **is** the slice key, so
 * export resolves it unchanged.
 */
export function selectionLoads(items: GridItemData[]): PageLoadDef[] {
  const out: PageLoadDef[] = []
  walkItems(items, (item) => {
    if (item.type !== 'datatable' || !item.config) return
    const config = item.config as DataTableConfig
    if (!config.selection?.enabled) return
    const key = selectionStateKey(config.name, config.selection)
    out.push({
      id: key,
      key,
      read: createFormListCrudRef(),
      paths: '',
      loading: 'none',
      errorMessage: '',
      shape: {
        shape: 'object',
        fields: [selectionField('ids', 'array'), selectionField('rows', 'array', 'object'), selectionField('count', 'number')],
      },
    })
  })
  return out
}
