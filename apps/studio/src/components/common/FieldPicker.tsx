import { Input } from './Input'
import { Select } from './Select'

export type PickableField = { name: string; kind: string }

type FieldPickerProps = {
  /** The row's fields, or `null` when they can't be resolved (free-text fallback). */
  fields: PickableField[] | null
  value: string
  onChange: (name: string) => void
  /** Only offer fields of these kinds (the stored value is always kept). */
  kinds?: readonly string[]
  /** Adds a leading "None" choice that stores `''`. */
  allowNone?: boolean
  /** Why the picker fell back to free text. */
  fallbackHint?: string
  'aria-label'?: string
}

/**
 * Picks a field name from a known row shape (a response model's row fields, or
 * the keys of static records) — picking a field you can see beats typing a key.
 * A stored name that is no longer in the row stays selected behind a ⚠ rather
 * than silently snapping to something else, and an unresolvable row shape drops
 * to the old free-text input so a model-less project is never blocked.
 */
export function FieldPicker({
  fields,
  value,
  onChange,
  kinds,
  allowNone = false,
  fallbackHint,
  'aria-label': ariaLabel,
}: FieldPickerProps) {
  if (fields === null) {
    return (
      <div className="space-y-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono"
          aria-label={ariaLabel}
        />
        {fallbackHint && <p className="text-ui-xs text-ink-3">{fallbackHint}</p>}
      </div>
    )
  }

  const offered = kinds ? fields.filter((f) => kinds.includes(f.kind)) : fields
  const isStale = value !== '' && !offered.some((f) => f.name === value)
  const options = [
    ...(allowNone ? [{ value: '', label: 'None' }] : value === '' ? [{ value: '', label: '— choose —' }] : []),
    ...(isStale ? [{ value, label: `⚠ ${value} (not in row)` }] : []),
    ...offered.map((f) => ({ value: f.name, label: `${f.name} · ${f.kind}` })),
  ]
  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      className="font-mono"
      aria-label={ariaLabel}
    />
  )
}
