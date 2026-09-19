import { FieldPicker, Input, SegmentedControl } from '../common'
import { WiringHint } from './ButtonConfigPanel'
import type { RepeaterScope } from './repeaterScope'
import type { ItemBinding } from './types'

const MODE_OPTIONS = [
  { value: 'static', label: 'Static' },
  { value: 'item', label: 'Item field' },
]

/** `key: 'none'` is the engine's "the item itself" (an item of a primitive array). */
const ITEM_ITSELF = { name: 'none', kind: 'the item itself' }

type ItemBindingFieldProps = {
  /** What is being bound, for the control's accessible names ("Text", "Image URL"). */
  label: string
  binding: ItemBinding
  onChange: (next: ItemBinding) => void
  /** The enclosing repeater's item fields; `null` outside any repeater. */
  scope: RepeaterScope
  /** Only offer item fields of these kinds. */
  kinds?: readonly string[]
}

/**
 * The `Static | Item field` switch of a bindable display prop (see the grilled
 * repeater design). Offered only inside a repeater's item template — a binding
 * authored elsewhere (template insert, a cell dragged out) stays editable
 * behind a warning rather than vanishing. Item-field mode picks the field from
 * the enclosing repeater's item model (free text when it can't be resolved)
 * plus an optional path into a nested object.
 */
export function ItemBindingField({ label, binding, onChange, scope, kinds }: ItemBindingFieldProps) {
  if (scope === null && binding === null) return null
  const fields = scope?.itemFields.fields
  return (
    <div className="space-y-1.5 rounded-md border border-line bg-panel p-2">
      <SegmentedControl
        aria-label={`${label} source`}
        options={MODE_OPTIONS}
        value={binding ? 'item' : 'static'}
        onChange={(mode) => onChange(mode === 'item' ? { key: '', path: '' } : null)}
      />
      {binding && (
        <>
          <FieldPicker
            fields={fields ? [...fields, ITEM_ITSELF] : null}
            value={binding.key}
            onChange={(key) => onChange({ ...binding, key })}
            kinds={kinds ? [...kinds, ITEM_ITSELF.kind] : undefined}
            fallbackHint={scope?.itemFields.reason}
            aria-label={`${label} item field`}
          />
          <Input
            value={binding.path}
            onChange={(e) => onChange({ ...binding, path: e.target.value })}
            placeholder="path inside the field (optional)"
            className="font-mono"
            aria-label={`${label} path`}
          />
          {scope === null && (
            <WiringHint>
              Not inside a repeater’s item template — this binding resolves to nothing here.
            </WiringHint>
          )}
        </>
      )}
    </div>
  )
}

/** The canvas token of a binding: `{name}`, `{flag.png}`, `{item}`. */
export function bindingToken(binding: NonNullable<ItemBinding>): string {
  const base = binding.key === 'none' ? 'item' : binding.key || '?'
  return `{${binding.path ? `${base}.${binding.path}` : base}}`
}
