import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import type { PickableField } from '../common'
import { useActiveItems, useGridStore } from '../Layout/gridStore'
import { usePageLoads } from '../Layout/pageData'
import { useRepeaterScope } from '../Layout/repeaterScope'
import { isBlockedInRepeater } from '../Layout/repeaterRules'
import { enclosingDataTable } from '../Layout/ShowWhenPanel'
import type { DataTableConfig, GridItemData, RadioConfig } from '../Layout/types'
import { makeLogicNames, type FormulaLibDef, type LogicNames, type RuleLibDef } from '../Workspace/logic'
import { pathParams } from '../Workspace/snapshots'
import { useActivePages, useActiveProject } from '../Workspace/workspaceStore'

/**
 * What the logic editor can offer as operands where it is opened (spec §8.2):
 * the form fields in scope, the page data, the item / row, the URL params, the
 * enclosing data table (for its adding / editing presets). Saved formulas and
 * rules come from the project (`useLogicLibrary`).
 */
export type LogicField = { name: string; kind: string; options?: { value: string; label: string }[] }

export type LogicScopeInfo = {
  fields: LogicField[]
  loads: { id: string; key: string }[]
  /** The nearest item: a repeater item, a table row (style rules / computed columns). */
  row: { label: string; fields: PickableField[] | null; hint?: string; extras: { code: string; label: string }[] } | null
  /** The data table whose modal holds the item (`row.$table`). */
  table: string | null
  urlParams: string[]
}

const NO_FORMULAS: FormulaLibDef[] = []
const NO_RULES: RuleLibDef[] = []

/** The project's saved formulas / rules and the names the printer / parser need. */
export function useLogicLibrary(loads: { id: string; key: string }[] = []): {
  formulas: FormulaLibDef[]
  rules: RuleLibDef[]
  names: LogicNames
} {
  const project = useActiveProject()
  const formulas = project?.snapshot.formulas ?? NO_FORMULAS
  const rules = project?.snapshot.rules ?? NO_RULES
  const names = useMemo(() => makeLogicNames(formulas, rules, loads), [formulas, rules, loads])
  return { formulas, rules, names }
}

/** Canvases drawn on the same form as their host (a nested container, a tab's panels, a card's slots, a paper). */
const SAME_FORM = new Set(['container', 'tab', 'card', 'paper'])

/** The form fields of a canvas, through the hosts that share its form. */
export function formFieldsOf(items: GridItemData[]): LogicField[] {
  const out: LogicField[] = []
  const walk = (list: GridItemData[]) => {
    for (const item of list) {
      if (SAME_FORM.has(item.type)) for (const c of item.childCanvases ?? []) walk(c.items)
      if (!isBlockedInRepeater(item.type)) continue
      const config = item.config as { name?: string; dataType?: string } | undefined
      if (!config?.name) continue
      const options =
        item.type === 'radio' ? (item.config as RadioConfig).options.map((o) => ({ value: o.value, label: o.label })) : undefined
      out.push({ name: config.name, kind: item.type === 'switch' || item.type === 'checkbox' ? 'boolean' : (config.dataType ?? 'text'), ...(options ? { options } : {}) })
    }
  }
  walk(items)
  return out
}

/** The scope for an item on the active canvas (the inspector's Show when / Enabled when / Value). */
export function useCanvasLogicScope(): LogicScopeInfo {
  const items = useActiveItems()
  const rootItems = useGridStore((s) => s.items)
  const activePath = useGridStore((s) => s.activePath)
  const loads = usePageLoads()
  const repeater = useRepeaterScope()
  const pages = useActivePages()
  const { pageId } = useParams()
  return useMemo(() => {
    const table = enclosingDataTable(rootItems, activePath)
    const page = pages.find((p) => p.id === pageId)
    return {
      fields: formFieldsOf(items),
      loads: loads.map((l) => ({ id: l.id, key: l.key })),
      row: repeater
        ? {
            label: 'Repeater item',
            fields: repeater.itemFields.fields,
            hint: repeater.itemFields.fields ? undefined : repeater.itemFields.reason,
            extras: [{ code: 'row', label: 'the item itself' }],
          }
        : null,
      table: table ? (table.config as DataTableConfig).name : null,
      urlParams: page ? pathParams(page.path) : [],
    }
  }, [items, rootItems, activePath, loads, repeater, pages, pageId])
}

/** The scope for a data table's row (a style rule, a computed column): the row's fields, the cell's value. */
export function useTableRowScope(fields: PickableField[] | null, withValue: boolean): LogicScopeInfo {
  const base = useCanvasLogicScope()
  return useMemo(
    () => ({
      ...base,
      fields: [],
      row: {
        label: 'Table row',
        fields,
        extras: [...(withValue ? [{ code: 'row.$value', label: 'this cell’s value' }] : []), { code: 'row.$index', label: 'the row’s position' }],
      },
      table: null,
    }),
    [base, fields, withValue],
  )
}

/** The scope for a saved formula / rule (the Logic tab): every form field of the project, every load. */
export function useLibraryLogicScope(): LogicScopeInfo {
  const project = useActiveProject()
  return useMemo(() => {
    const pages = project?.snapshot.pages ?? []
    const seen = new Set<string>()
    const fields = pages.flatMap((p) => formFieldsOf(p.grid.items)).filter((f) => (seen.has(f.name) ? false : (seen.add(f.name), true)))
    const loads = [...(project?.snapshot.globalLoads ?? []), ...pages.flatMap((p) => p.loads ?? [])].map((l) => ({ id: l.id, key: l.key }))
    return {
      fields,
      loads,
      row: { label: 'Item / row', fields: null, hint: 'Saved items read the item / row where they are used: type row.<field>.', extras: [{ code: 'row', label: 'the item itself' }, { code: 'row.$value', label: 'a table cell’s value' }] },
      table: null,
      urlParams: [],
    }
  }, [project])
}
