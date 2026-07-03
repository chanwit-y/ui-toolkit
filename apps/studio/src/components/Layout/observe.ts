import type { GridItemData, SelectFieldConfig } from './types'

/**
 * Cross-item observe wiring for cascading selects (engine `observeTo`). The
 * inspector stores the *target item's id* (rename-safe); everything name-based
 * — the emitted `observeTo`, the derived `api.params` entry, the publisher's
 * `canObserve` — is resolved here at serialization time, so the exported trio
 * is always consistent and the silent-failure states (observer without a
 * publisher, missing params) are not authorable.
 */

/** Canvas types that render the Autocomplete2 family and can join a cascade. */
const SELECT_FAMILY = new Set<GridItemData['type']>([
  'select',
  'autocomplete',
  'multiAutocomplete',
])

export function isSelectFamily(item: GridItemData): boolean {
  return SELECT_FAMILY.has(item.type)
}

/**
 * Emitted as `observeTo` when the observed item was deleted or has no binding
 * name. Container JSON is untyped at the destination, so this is deliberately
 * loud/greppable rather than falling back to the inert `""`.
 */
export const MISSING_OBSERVE_TARGET = 'MISSING_OBSERVE_TARGET'

function selectConfig(item: GridItemData | undefined): SelectFieldConfig | null {
  if (!item || !isSelectFamily(item)) return null
  return (item.config as SelectFieldConfig | undefined) ?? null
}

/** The item id this one observes, or ''. Only honored in `source` mode — the
 * inspector shows the field there; a value left behind by a mode switch is inert. */
function observeToId(item: GridItemData): string {
  const c = selectConfig(item)
  return c?.mode === 'source' ? (c.observeToItemId ?? '') : ''
}

export type ObserveContext = {
  /** Some source-mode item observes this one → it must publish (`canObserve`). */
  isObserved: boolean
  /** Resolved binding name of the observed item; null when unset or broken. */
  observedName: string | null
  /** `observeTo` is set but the target is deleted or has no binding name. */
  isDangling: boolean
}

/** Everything the Bin serializer needs to emit the observe trio for one item. */
export function observeContext(item: GridItemData, items: GridItemData[]): ObserveContext {
  const isObserved = items.some((o) => o.id !== item.id && observeToId(o) === item.id)
  const id = observeToId(item)
  if (!id) return { isObserved, observedName: null, isDangling: false }
  const target = items.find((t) => t.id === id && isSelectFamily(t))
  const name = selectConfig(target)?.name.trim() ?? ''
  return { isObserved, observedName: name || null, isDangling: !name }
}

/**
 * Non-blocking authoring checks for one item's observe wiring — dangling or
 * unnamed target, ambiguous (duplicate) binding names, and loops in the chain.
 * The engine binds observe *by name* at runtime, so each of these produces a
 * cascade that silently misbehaves in the consuming app.
 */
export function observeWarnings(item: GridItemData, items: GridItemData[]): string[] {
  const id = observeToId(item)
  if (!id) return []
  const warnings: string[] = []

  const target = items.find((t) => t.id === id && isSelectFamily(t))
  if (!target) {
    warnings.push('The observed field was deleted — the export emits "MISSING_OBSERVE_TARGET".')
  } else {
    const name = selectConfig(target)?.name.trim() ?? ''
    if (!name) {
      warnings.push(
        'The observed field has no binding name — the export emits "MISSING_OBSERVE_TARGET".',
      )
    } else {
      const sharers = items.filter(
        (o) => o.id !== target.id && (selectConfig(o)?.name.trim() ?? '') === name,
      )
      if (sharers.length > 0) {
        warnings.push(
          `Binding name "${name}" is used by ${sharers.length + 1} fields — the engine binds observe by name, so the cascade is ambiguous.`,
        )
      }
    }
  }

  // Walk the chain (region → city → district …); revisiting any item means a loop.
  const visited = new Set<string>([item.id])
  let cursor = id
  while (cursor) {
    if (visited.has(cursor)) {
      warnings.push('This observe chain contains a loop — the cascade cannot stabilize.')
      break
    }
    visited.add(cursor)
    const next = items.find((t) => t.id === cursor)
    cursor = next ? observeToId(next) : ''
  }

  return warnings
}
