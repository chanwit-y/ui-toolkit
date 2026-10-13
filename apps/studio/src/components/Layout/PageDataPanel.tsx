import { Input, Select } from '../common'
import { WiringHint } from './ButtonConfigPanel'
import { useGridStore } from './gridStore'
import { LoadFieldPicker, usePageLoads } from './pageData'
import { isBlockedInRepeater } from './repeaterRules'
import { createDataCondition, type DataCondition, type GridItemData } from './types'

const TEST_OPTIONS: { value: DataCondition['test'] | 'always'; label: string }[] = [
  { value: 'always', label: 'Always' },
  { value: 'loaded', label: 'When a load succeeded' },
  { value: 'loading', label: 'While a load is loading' },
  { value: 'failed', label: 'When a load failed' },
  { value: 'compare', label: 'When a field…' },
]
const OP_OPTIONS: { value: DataCondition['op']; label: string }[] = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'does not equal' },
  { value: 'gt', label: 'is greater than' },
  { value: 'gte', label: 'is at least' },
  { value: 'lt', label: 'is less than' },
  { value: 'lte', label: 'is at most' },
  { value: 'set', label: 'has a value' },
  { value: 'unset', label: 'has no value' },
]

/**
 * Page-data wiring on the inspected item (see the grilled page-data design):
 * a generic "Show when" over the page's loads — a load's status, or one of
 * its fields compared to a value (exported as a `source: "state"` engine
 * condition, combined with a table modal's adding / editing one) — and, on
 * form fields, the initial value read from a load. Renders nothing while the
 * page has no loads and the item carries no such wiring.
 */
export function PageDataPanel({ item }: { item: GridItemData }) {
  const loads = usePageLoads()
  const update = useGridStore((s) => s.updateItemPageData)
  const when = item.dataWhen ?? null
  const initial = item.initialValue ?? null
  const isField = isBlockedInRepeater(item.type)
  if (loads.length === 0 && !when && !initial) return null
  const setWhen = (patch: Partial<DataCondition>) => when && update(item.id, { dataWhen: { ...when, ...patch } })
  const dangling = (id: string) => id !== '' && !loads.some((l) => l.id === id)

  return (
    <div className="mb-3 space-y-2 rounded-lg border border-line bg-panel p-2">
      <div className="space-y-1.5">
        <span className="text-ui-sm font-medium text-ink-2">Show when (page data)</span>
        <Select
          aria-label="Show when page data"
          options={TEST_OPTIONS}
          value={when ? when.test : 'always'}
          onChange={(test) =>
            update(item.id, {
              dataWhen:
                test === 'always'
                  ? null
                  : { ...(when ?? createDataCondition(loads[0]?.id ?? '')), test: test as DataCondition['test'] },
            })
          }
        />
        {when && (
          <LoadFieldPicker
            label="Condition"
            loadId={when.loadId}
            path={when.test === 'compare' ? when.path : ''}
            onChange={({ loadId, path }) => setWhen({ loadId, path })}
            mode={when.test === 'compare' ? 'field' : 'load'}
            allowStatus={when.test === 'compare'}
          />
        )}
        {when?.test === 'compare' && (
          <div className="flex gap-1.5">
            <div className="flex-1">
              <Select
                aria-label="Comparison"
                options={OP_OPTIONS}
                value={when.op}
                onChange={(op) => setWhen({ op: op as DataCondition['op'] })}
              />
            </div>
            {when.op !== 'set' && when.op !== 'unset' && (
              <div className="flex-1">
                <Input
                  aria-label="Compared value"
                  value={when.value}
                  onChange={(e) => setWhen({ value: e.target.value })}
                  placeholder="value"
                  className="font-mono"
                />
              </div>
            )}
          </div>
        )}
        {when && dangling(when.loadId) && <WiringHint>The load this condition reads was deleted.</WiringHint>}
      </div>

      {isField && (
        <div className="space-y-1.5 border-t border-line pt-2">
          <span className="text-ui-sm font-medium text-ink-2">Initial value</span>
          <Select
            aria-label="Initial value source"
            options={[
              { value: 'none', label: 'None (empty / default)' },
              { value: 'state', label: 'From page data' },
            ]}
            value={initial ? 'state' : 'none'}
            onChange={(v) =>
              update(item.id, {
                initialValue: v === 'state' ? { key: loads[0]?.id ?? '', path: '', source: 'state' } : null,
              })
            }
          />
          {initial && (
            <LoadFieldPicker
              label="Initial value"
              loadId={initial.key}
              path={initial.path}
              onChange={({ loadId, path }) => update(item.id, { initialValue: { key: loadId, path, source: 'state' } })}
            />
          )}
          {initial && dangling(initial.key) && <WiringHint>The load this value reads was deleted.</WiringHint>}
        </div>
      )}
    </div>
  )
}
