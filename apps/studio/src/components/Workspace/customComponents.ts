/**
 * Custom components (see the grilled design in the library's
 * `core/components.tsx`): React components the developer codes in the app
 * and hands to `<ComponentsProvider components={{ Chart, … }}>`, which a
 * `custom` Bin places by name (`element.component`). The studio only knows
 * the *declarations*: a project declares them once (the Env page's "Custom
 * components" section) — a name plus the props the component accepts, each
 * with a kind so the inspector can draw a typed field — items pick one, the
 * export writes a typed `components.tsx` stub for every declared name, and
 * the Live Preview mounts a placeholder stub per name that shows the
 * resolved value.
 *
 * Item configs store the declaration's stable **id**, so a rename propagates
 * and a deleted declaration shows as dangling; the export resolves it to the
 * name, or `MISSING_COMPONENT` when it is gone — loud in the config, a
 * placeholder in the engine (same pattern as `MISSING_ACTION`).
 */

export type CustomPropKind = 'text' | 'number' | 'boolean' | 'select' | 'json'

export type CustomPropDef = {
  /** The key on the engine `props` object: a JS identifier. */
  key: string
  kind: CustomPropKind
  /** Field label in the inspector (the key when empty). */
  label: string
  /** `select` only: the allowed values. */
  options: string[]
  /** Pre-fills the inspector field; omitted from the export when unchanged. */
  defaultValue: string
}

export type CustomComponentDef = {
  /** Stable id (`component-…`) the item configs reference. */
  id: string
  /** The registry key the engine renders (`components[name]`): a JS identifier. */
  name: string
  description: string
  props: CustomPropDef[]
}

/** What the export needs of a declaration. */
export type CustomComponentRef = Pick<CustomComponentDef, 'id' | 'name'>

export const COMPONENT_ID_PREFIX = 'component-'
/** Emitted for an item whose declared component was deleted. */
export const MISSING_COMPONENT = 'MISSING_COMPONENT'

export const CUSTOM_PROP_KIND_OPTIONS: { value: CustomPropKind; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select' },
  { value: 'json', label: 'JSON' },
]

export function createCustomComponentDef(name = ''): CustomComponentDef {
  return { id: `${COMPONENT_ID_PREFIX}${crypto.randomUUID()}`, name, description: '', props: [] }
}

export function createCustomPropDef(key = ''): CustomPropDef {
  return { key, kind: 'text', label: '', options: [], defaultValue: '' }
}

/** A registry key the engine can render, or a props key: a JS identifier. */
export function isValidComponentName(name: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(name)
}

/**
 * Export resolver: a declaration id → the engine `component` name, or
 * `MISSING_COMPONENT` when its declaration is gone or unnamed (an unnamed
 * declaration can't be rendered either).
 */
export function makeComponentNameResolver(defs: CustomComponentRef[] = []): (id: string) => string {
  const byId = new Map(defs.map((d) => [d.id, d.name.trim()]))
  return (id) => byId.get(id) || MISSING_COMPONENT
}

/** Declarations whose name is duplicated (after trimming), by name. */
export function duplicateComponentNames(defs: CustomComponentRef[]): Set<string> {
  const seen = new Map<string, number>()
  for (const d of defs) {
    const name = d.name.trim()
    if (!name) continue
    seen.set(name, (seen.get(name) ?? 0) + 1)
  }
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([name]) => name))
}

/**
 * The text an inspector field holds for one prop → the value the engine
 * `props` object carries, or `undefined` when the text is blank / unparsable
 * (dropped: emit authored, omit empty). Booleans are `'true' | 'false'`,
 * numbers parsed, JSON parsed, text and select kept as text.
 */
export function parsePropValue(kind: CustomPropKind, text: string): unknown {
  const t = text.trim()
  if (t === '') return undefined
  switch (kind) {
    case 'number': {
      const n = Number(t)
      return Number.isNaN(n) ? undefined : n
    }
    case 'boolean':
      return t === 'true' ? true : t === 'false' ? false : undefined
    case 'json':
      try {
        return JSON.parse(t)
      } catch {
        return undefined
      }
    default:
      return text
  }
}

/** Whether a `json` prop's text parses (blank counts as fine — it is omitted). */
export function isValidJsonText(text: string): boolean {
  const t = text.trim()
  if (t === '') return true
  try {
    JSON.parse(t)
    return true
  } catch {
    return false
  }
}

/**
 * The values an item's props export as: each declared prop's authored text
 * parsed to its kind, keys left out when blank or equal to the declaration's
 * default (the stub applies defaults in code). Undeclared keys the item still
 * carries (a prop removed from the declaration) are dropped.
 */
export function exportProps(def: CustomComponentDef | undefined, values: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!def) return out
  for (const p of def.props) {
    const key = p.key.trim()
    if (!isValidComponentName(key)) continue
    const text = values[p.key] ?? ''
    if (text.trim() === '' || text === p.defaultValue) continue
    const v = parsePropValue(p.kind, text)
    if (v !== undefined) out[key] = v
  }
  return out
}

/** The TypeScript type of one declared prop. */
function propType(p: CustomPropDef): string {
  switch (p.kind) {
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'json':
      return 'unknown'
    case 'select': {
      const opts = p.options.map((o) => o.trim()).filter(Boolean)
      return opts.length ? opts.map((o) => JSON.stringify(o)).join(' | ') : 'string'
    }
    default:
      return 'string'
  }
}

/** The TypeScript literal of a prop's default, for the stub's destructuring. */
function propDefault(p: CustomPropDef): string | undefined {
  if (p.defaultValue.trim() === '') return undefined
  const v = parsePropValue(p.kind, p.defaultValue)
  return v === undefined ? undefined : JSON.stringify(v)
}

const safeComment = (text: string) => text.replace(/\*\//g, '* /')

/**
 * The exported `components.tsx`: one typed stub per declared component — a
 * props type from the declaration, the stub body applying the defaults and
 * rendering the library placeholder until the developer replaces it — and the
 * assembled registry for `<ComponentsProvider components={components}>`.
 * Unnamed / invalid declarations are listed in a comment instead of breaking
 * the file. Re-generated on every export: copy, don't import.
 */
export function toComponentsTsx(defs: CustomComponentDef[]): string {
  const valid = defs.filter((d) => isValidComponentName(d.name.trim()))
  const skipped = defs.filter((d) => !isValidComponentName(d.name.trim()))
  const lines: string[] = [
    'import { CustomComponentPlaceholder, type CustomComponentProps, type TComponentMaster } from "@gummy-ui/ui";',
    '',
    '/**',
    ' * Custom components — React components coded here, placed by a `custom` Bin naming them.',
    ' * Mount once above the routes: <ComponentsProvider components={components}> (see HANDOFF.md).',
    ' * Each receives one CustomComponentProps: `props` (the config\'s props, typed below), `value`',
    ' * (the bound value, undefined until loaded), `loading` (a skeleton-mode page load still',
    ' * empty — draw your own placeholder), `row` (the enclosing repeater item), `navigate` and',
    ' * read-only `state`. A throw costs its own cell only. Re-generated on every export.',
    ' */',
    '',
  ]
  for (const d of valid) {
    const name = d.name.trim()
    const props = d.props.filter((p) => isValidComponentName(p.key.trim()))
    lines.push(`export type ${name}Props = {`)
    for (const p of props) {
      if (p.label.trim()) lines.push(`  /** ${safeComment(p.label.trim())} */`)
      lines.push(`  ${p.key.trim()}?: ${propType(p)};`)
    }
    lines.push('};', '')
    if (d.description.trim()) lines.push(`/** ${safeComment(d.description.trim())} */`)
    const defaults = props
      .map((p) => {
        const dv = propDefault(p)
        return dv === undefined ? p.key.trim() : `${p.key.trim()} = ${dv}`
      })
      .join(', ')
    lines.push(`export function ${name}({ props, value, loading }: CustomComponentProps<${name}Props>) {`)
    if (props.length) lines.push(`  const { ${defaults} } = props;`)
    lines.push(
      `  // TODO: implement "${name}"`,
      `  return <CustomComponentPlaceholder name="${name}" note={loading ? "loading" : "stub"} details={{ ${props.length ? props.map((p) => p.key.trim()).join(', ') + ', ' : ''}value }} />;`,
      '}',
      '',
    )
  }
  lines.push('export const components: TComponentMaster = {')
  for (const d of valid) lines.push(`  ${d.name.trim()},`)
  lines.push('};', '')
  if (skipped.length) {
    lines.push(
      `// Not exported — the name must be a JS identifier: ${skipped.map((d) => JSON.stringify(d.name)).join(', ')}`,
      '',
    )
  }
  return lines.join('\n')
}
