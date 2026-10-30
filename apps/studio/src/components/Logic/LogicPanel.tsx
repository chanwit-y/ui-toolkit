import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, SegmentedControl, Select } from '../common'
import { WiringHint } from '../Layout/ButtonConfigPanel'
import { useGridStore } from '../Layout/gridStore'
import { LoadFieldPicker, usePageLoads } from '../Layout/pageData'
import { isBlockedInRepeater } from '../Layout/repeaterRules'
import type { GridItemData } from '../Layout/types'
import { countFieldRefs, inlineFormula, renameFieldRefs } from '../Workspace/logic'
import { useActiveProject, useWorkspaceStore } from '../Workspace/workspaceStore'
import { LogicChip, showWhenPresets } from './LogicChip'
import { useCanvasLogicScope, useLogicLibrary } from './scope'

/** Every form field name on a page, through all its canvases. */
function pageFieldNames(items: GridItemData[]): string[] {
  const out: string[] = []
  const walk = (list: GridItemData[]) => {
    for (const item of list) {
      const name = (item.config as { name?: string } | undefined)?.name
      if (isBlockedInRepeater(item.type) && name) out.push(name)
      for (const c of item.childCanvases ?? []) walk(c.items)
    }
  }
  walk(items)
  return out
}

/** The name each field had when the studio last saw its references settled (this session). */
const settledNames = new Map<string, string>()

/**
 * After a field is renamed, the logic that still reads the old name (spec
 * §13.1: field refs are by name): on this page — every canvas — and in the
 * saved formulas / rules, unless another page still has a field with the old
 * name (then the saved items are left alone).
 */
function FieldRenameNotice({ item }: { item: GridItemData }) {
  const name = (item.config as { name?: string } | undefined)?.name ?? ''
  const rootItems = useGridStore((s) => s.items)
  const renameOnPage = useGridStore((s) => s.renameFieldRefsOnPage)
  const project = useActiveProject()
  const updateLogic = useWorkspaceStore((s) => s.updateProjectLogic)
  const { formulas, rules } = useLogicLibrary()
  const { pageId } = useParams()
  const [, rerender] = useState(0)
  const prev = settledNames.get(item.id)

  let notice: { pageCount: number; savedCount: number; savedBlocked: boolean } | null = null
  if (prev !== undefined && prev !== name && prev.trim() && name.trim() && !pageFieldNames(rootItems).includes(prev)) {
    const pageCount = countFieldRefs(rootItems, prev)
    const savedCount = countFieldRefs(formulas, prev) + countFieldRefs(rules, prev)
    const savedBlocked = (project?.snapshot.pages ?? []).some((pg) => pg.id !== pageId && pageFieldNames(pg.grid.items).includes(prev))
    if (pageCount + (savedBlocked ? 0 : savedCount) > 0) notice = { pageCount, savedCount, savedBlocked }
  }
  // Nothing pending: the current name is the settled one.
  useEffect(() => {
    if (!notice) settledNames.set(item.id, name)
  })
  if (!notice || prev === undefined) return null
  const settle = () => {
    settledNames.set(item.id, name)
    rerender((n) => n + 1)
  }
  const apply = () => {
    if (notice!.pageCount) renameOnPage(prev, name)
    if (project && !notice!.savedBlocked && notice!.savedCount) updateLogic(project.id, { formulas: renameFieldRefs(formulas, prev, name), rules: renameFieldRefs(rules, prev, name) })
    settle()
  }
  const parts = [
    notice.pageCount ? `${notice.pageCount} on this page` : '',
    notice.savedCount && !notice.savedBlocked ? `${notice.savedCount} in saved formulas / rules` : '',
  ].filter(Boolean)
  const total = notice.pageCount + (notice.savedBlocked ? 0 : notice.savedCount)
  return (
    <div role="status" className="space-y-1.5 rounded-md border border-warn/50 bg-panel p-2 text-ui-sm text-ink-2">
      <p>
        Renamed from <span className="font-mono text-ink">[{prev}]</span>. {parts.join(' and ')} still {total === 1 ? 'reads' : 'read'} the old name.
      </p>
      {notice.savedBlocked && notice.savedCount > 0 && (
        <p className="text-ui-xs text-ink-3">Saved formulas / rules are left alone: another page still has a field named {prev}.</p>
      )}
      <div className="flex gap-1.5">
        <Button size="sm" variant="primary" onClick={apply}>
          Update to [{name}]
        </Button>
        <Button size="sm" onClick={settle}>
          Keep
        </Button>
      </div>
    </div>
  )
}

/**
 * The inspected item's logic (spec §8.2 — it replaced "Show when" and "Show
 * when (page data)"): **Show when** on every item, **Enabled when** on inputs
 * and buttons, and a form field's **Value** — none, from page data, or a
 * formula that seeds the field once or keeps it computed (locked).
 */
export function LogicPanel({ item }: { item: GridItemData }) {
  const scope = useCanvasLogicScope()
  const loads = usePageLoads()
  const updateLogic = useGridStore((s) => s.updateItemLogic)
  const updatePageData = useGridStore((s) => s.updateItemPageData)
  const isField = isBlockedInRepeater(item.type)
  const canEnable = isField || item.type === 'button'
  const initial = item.initialValue ?? null
  const valueSource = item.valueFormula ? 'formula' : initial ? 'state' : 'none'
  const dangling = (id: string) => id !== '' && !loads.some((l) => l.id === id)

  return (
    <div className="mb-3 space-y-3 rounded-lg border border-line bg-panel p-2">
      {isField && <FieldRenameNotice item={item} />}
      <LogicChip
        kind="condition"
        label="Show when"
        emptyLabel="Always"
        scope={scope}
        value={item.condition}
        presets={showWhenPresets(scope)}
        onChange={(condition) => updateLogic(item.id, { condition })}
        hint={isField ? 'Hidden, a field is neither validated nor sent.' : undefined}
      />
      {canEnable && (
        <div className="border-t border-line pt-2">
          <LogicChip
            kind="condition"
            label="Enabled when"
            emptyLabel="Always enabled"
            scope={scope}
            value={item.enabledWhen}
            onChange={(enabledWhen) => updateLogic(item.id, { enabledWhen })}
            hint={isField ? 'Disabled, a field is not validated but is still sent.' : 'Disabled until the condition first holds.'}
          />
        </div>
      )}
      {isField && (
        <div className="space-y-1.5 border-t border-line pt-2">
          <span className="text-ui-sm font-medium text-ink-2">Value</span>
          <Select
            aria-label="Value source"
            options={[
              { value: 'none', label: 'None (empty / default)' },
              { value: 'state', label: 'From page data' },
              { value: 'formula', label: 'From a formula' },
            ]}
            value={valueSource}
            onChange={(v) => {
              if (v === 'formula') {
                updatePageData(item.id, { initialValue: null })
                updateLogic(item.id, { valueFormula: item.valueFormula ?? inlineFormula() })
              } else {
                updateLogic(item.id, { valueFormula: null })
                updatePageData(item.id, { initialValue: v === 'state' ? { key: loads[0]?.id ?? '', path: '', source: 'state' } : null })
              }
            }}
          />
          {valueSource === 'state' && initial && (
            <>
              <LoadFieldPicker
                label="Initial value"
                loadId={initial.key}
                path={initial.path}
                onChange={({ loadId, path }) => updatePageData(item.id, { initialValue: { key: loadId, path, source: 'state' } })}
              />
              {dangling(initial.key) && <WiringHint>The load this value reads was deleted.</WiringHint>}
            </>
          )}
          {valueSource === 'formula' && (
            <>
              <LogicChip kind="formula" label="Formula" emptyLabel="No formula" scope={scope} value={item.valueFormula} onChange={(valueFormula) => updateLogic(item.id, { valueFormula })} />
              <SegmentedControl
                aria-label="Value mode"
                options={[
                  { value: 'initial', label: 'Seeds once' },
                  { value: 'computed', label: 'Computed (locked)' },
                ]}
                value={item.valueMode === 'computed' ? 'computed' : 'initial'}
                onChange={(m) => updateLogic(item.id, { valueMode: m === 'computed' ? 'computed' : undefined })}
              />
              <p className="text-ui-xs leading-relaxed text-ink-3">
                {item.valueMode === 'computed'
                  ? 'Locked and recalculated as its inputs change; sent and validated with the form.'
                  : 'The first result fills the field while it is untouched; the user can change it.'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
