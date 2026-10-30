import { Plus, Trash2 } from 'lucide-react'
import { IconButton, Input, Select } from '../common'
import { ColorField } from '../Theme/ThemeEditor'
import { createStyleRule, type StyleRuleConfig } from './types'
import { LogicChip } from '../Logic/LogicChip'
import { useTableRowScope } from '../Logic/scope'
import { useMemo } from 'react'

const OP_OPTIONS: { value: StyleRuleConfig['op']; label: string }[] = [
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'set', label: 'is set' },
  { value: 'unset', label: 'is empty' },
]

const FIELD_OPTIONS = [
  { value: 'value', label: 'this cell' },
  { value: 'row', label: 'row field' },
]

/**
 * The conditional-style rules of a column (`cellStyles`, `scope: 'cell'`) or
 * of a table's rows (`rowStyles`, `scope: 'row'` — a rule there always reads a
 * row field). One card per rule: when (field · comparison · value), then the
 * look (a Radix tone, fill, bold / italic / strike). The first matching rule
 * gives the tone; every matching rule adds its weight / style. "Custom
 * condition" swaps the one comparison for the logic editor (AND / OR groups,
 * formulas, saved rules over `row.<field>` / `row.$value`).
 */
export function StyleRulesField({
  label,
  rules,
  onChange,
  scope,
  fieldSuggestions = [],
}: {
  label: string
  rules: StyleRuleConfig[] | undefined
  onChange: (rules: StyleRuleConfig[]) => void
  scope: 'cell' | 'row'
  /** Row field names offered as placeholders. */
  fieldSuggestions?: string[]
}) {
  const list = rules ?? []
  const rowFields = useMemo(() => (fieldSuggestions.length ? fieldSuggestions.map((name) => ({ name, kind: '' })) : null), [fieldSuggestions])
  const logicScope = useTableRowScope(rowFields, scope === 'cell')
  const patch = (i: number, p: Partial<StyleRuleConfig>) => onChange(list.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const flag = (i: number, key: 'fill' | 'bold' | 'italic' | 'strike', text: string) => (
    <label className="flex items-center gap-1 text-ui-xs text-ink-2">
      <input
        type="checkbox"
        checked={list[i][key]}
        onChange={(e) => patch(i, { [key]: e.target.checked })}
        className="h-3.5 w-3.5 rounded border-line-strong text-ink focus:ring-focus/30"
      />
      {text}
    </label>
  )
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-ui-sm font-medium text-ink-2">{label}</span>
        <IconButton
          label="Add a style rule"
          onClick={() => onChange([...list, createStyleRule(scope === 'row' ? 'row' : 'value')])}
        >
          <Plus size={14} />
        </IconButton>
      </div>
      {list.length === 0 && <p className="text-ui-xs text-ink-3">No rules — add one to tint {scope === 'row' ? 'rows' : 'cells'} by a condition.</p>}
      {list.map((rule, i) => {
        const presence = rule.op === 'set' || rule.op === 'unset'
        const readsRow = scope === 'row' || rule.field === 'row'
        return (
          <div key={rule.id} className="box space-y-1.5 p-2">
            {rule.condition ? (
              <div className="flex items-start gap-1.5">
                <div className="min-w-0 flex-1">
                  <LogicChip
                    kind="condition"
                    label="When"
                    emptyLabel="Always"
                    scope={logicScope}
                    value={rule.condition}
                    onChange={(condition) => patch(i, { condition })}
                  />
                </div>
                <IconButton label="Remove rule" onClick={() => onChange(list.filter((_, j) => j !== i))}>
                  <Trash2 size={13} />
                </IconButton>
              </div>
            ) : (
            <>
            <div className="flex items-center gap-1.5">
              <span className="text-ui-xs text-ink-3">When</span>
              {scope === 'cell' && (
                <div className="w-28 shrink-0">
                  <Select options={FIELD_OPTIONS} value={rule.field} onChange={(v) => patch(i, { field: v as StyleRuleConfig['field'] })} />
                </div>
              )}
              {readsRow && (
                <div className="min-w-0 flex-1">
                  <Input
                    value={rule.path}
                    onChange={(e) => patch(i, { path: e.target.value })}
                    placeholder={fieldSuggestions[0] ?? 'field'}
                    className="font-mono"
                    list={`style-rule-fields-${rule.id}`}
                  />
                  <datalist id={`style-rule-fields-${rule.id}`}>
                    {fieldSuggestions.map((f) => <option key={f} value={f} />)}
                  </datalist>
                </div>
              )}
              <IconButton label="Remove rule" onClick={() => onChange(list.filter((_, j) => j !== i))}>
                <Trash2 size={13} />
              </IconButton>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-24 shrink-0">
                <Select options={OP_OPTIONS} value={rule.op} onChange={(v) => patch(i, { op: v as StyleRuleConfig['op'] })} />
              </div>
              {!presence && (
                <div className="min-w-0 flex-1">
                  <Input value={rule.value} onChange={(e) => patch(i, { value: e.target.value })} placeholder="0 · true · text" className="font-mono" />
                </div>
              )}
            </div>
            <button
              type="button"
              className="text-ui-xs text-ink-3 underline"
              onClick={() => patch(i, { condition: { all: [{ cmp: 'eq', left: { ref: 'row', key: readsRow ? rule.path || 'none' : '$value' }, right: { lit: '' } }] } })}
            >
              Custom condition…
            </button>
            </>
            )}
            <ColorField label="Tone" value={rule.tone} onChange={(tone) => patch(i, { tone })} unsetLabel="no tone" />
            <div className="flex flex-wrap items-center gap-3">
              {flag(i, 'fill', 'fill')}
              {flag(i, 'bold', 'bold')}
              {flag(i, 'italic', 'italic')}
              {flag(i, 'strike', 'strike')}
            </div>
          </div>
        )
      })}
    </div>
  )
}
