import { useMemo } from 'react'
import type { EndpointDef } from '../Api/types'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import type { ModelDef } from '../Model/types'
import type { PickableField } from '../common'
import { useGridStore } from './gridStore'
import { ancestorRepeaters } from './repeaterRules'
import { rowModelFields, type RowFields, type RowModel } from './rowFields'
import type { GridItemData, RepeaterConfig } from './types'

/**
 * The item model of the innermost repeater of `chain`: an endpoint source
 * walks the response model along `readPaths`; a parent source takes the
 * children of the named array-of-objects field of the enclosing repeater's
 * item (recursively — nesting is arbitrary).
 */
export function repeaterItemModel(
  chain: GridItemData[],
  endpoints: EndpointDef[],
  models: ModelDef[],
): RowModel {
  const self = chain[chain.length - 1]
  if (!self) return { fields: null, reason: 'Not inside a repeater.' }
  const config = self.config as RepeaterConfig
  if (config.source === 'endpoint') {
    return rowModelFields(config.read.endpointId, config.readPaths, endpoints, models)
  }
  if (chain.length < 2) {
    return { fields: null, reason: 'A parent-item source needs an enclosing repeater.' }
  }
  if (!config.parentField) return { fields: null, reason: 'Pick the parent item’s array field.' }
  const parent = repeaterItemModel(chain.slice(0, -1), endpoints, models)
  if (parent.fields === null) return parent
  const field = parent.fields.find((f) => f.name === config.parentField)
  if (!field) return { fields: null, reason: `“${config.parentField}” is not a field of the parent item.` }
  if (field.kind !== 'array' || field.arrayOf !== 'object') {
    return { fields: null, reason: `“${config.parentField}” is not an array of objects — bind the item itself instead.` }
  }
  return { fields: field.children }
}

function pickable(model: RowModel): RowFields {
  if (model.fields === null) return model
  return { fields: model.fields.map((f): PickableField => ({ name: f.name, kind: f.kind })) }
}

/** What the inspected item's bindings can read: `null` outside any repeater. */
export type RepeaterScope = {
  /** Item fields of the innermost enclosing repeater. */
  itemFields: RowFields
} | null

/** The enclosing repeater's item fields for the item being inspected. */
export function useRepeaterScope(): RepeaterScope {
  const items = useGridStore((s) => s.items)
  const activePath = useGridStore((s) => s.activePath)
  const endpoints = useProjectEndpoints()
  const models = useProjectModels()
  return useMemo(() => {
    const chain = ancestorRepeaters(items, activePath)
    if (chain.length === 0) return null
    return { itemFields: pickable(repeaterItemModel(chain, endpoints, models)) }
  }, [items, activePath, endpoints, models])
}

/**
 * For a repeater's own panel: whether it sits inside another repeater, and
 * that parent's array-of-object fields (the candidates for a parent source).
 */
export function useParentRepeaterArrays(): { nested: boolean; arrays: RowFields } {
  const items = useGridStore((s) => s.items)
  const activePath = useGridStore((s) => s.activePath)
  const endpoints = useProjectEndpoints()
  const models = useProjectModels()
  return useMemo(() => {
    const chain = ancestorRepeaters(items, activePath)
    if (chain.length === 0) return { nested: false, arrays: { fields: null, reason: 'Not inside a repeater.' } }
    const parent = repeaterItemModel(chain, endpoints, models)
    if (parent.fields === null) return { nested: true, arrays: parent }
    return {
      nested: true,
      arrays: {
        fields: parent.fields
          .filter((f) => f.kind === 'array')
          .map((f): PickableField => ({ name: f.name, kind: f.kind })),
      },
    }
  }, [items, activePath, endpoints, models])
}
