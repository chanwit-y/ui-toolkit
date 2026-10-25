import type { ArrayOf, FieldKind, ModelDef, ModelField } from './types'

/*
 * The model editing rules, pure (see the grilled design `mcp-server`):
 * `modelStore` applies them to the live library and `gummy mcp` to a stored one.
 */

/** Mirror gridStore's id strategy. */
export function createId(): string {
  return crypto.randomUUID()
}

export function createField(name: string): ModelField {
  return { id: createId(), name, kind: 'string', children: [], arrayOf: 'string' }
}

export function createModel(name: string, groupId: string | null = null): ModelDef {
  return { id: createId(), name, fields: [], groupId }
}

/** Recursively map the one field matching `id`, returning a new tree. */
export function patchField(
  fields: ModelField[],
  id: string,
  fn: (f: ModelField) => ModelField,
): ModelField[] {
  return fields.map((f) => {
    if (f.id === id) return fn(f)
    if (f.children.length) {
      const children = patchField(f.children, id, fn)
      if (children !== f.children) return { ...f, children }
    }
    return f
  })
}

/** Recursively drop the field matching `id`. */
export function removeField(fields: ModelField[], id: string): ModelField[] {
  const next: ModelField[] = []
  let changed = false
  for (const f of fields) {
    if (f.id === id) {
      changed = true
      continue
    }
    if (f.children.length) {
      const children = removeField(f.children, id)
      if (children !== f.children) {
        next.push({ ...f, children })
        changed = true
        continue
      }
    }
    next.push(f)
  }
  return changed ? next : fields
}

/** Recursively swap the node at `id` for `replacement`, returning a new tree. */
export function replaceFieldNode(
  fields: ModelField[],
  id: string,
  replacement: ModelField,
): ModelField[] {
  return fields.map((f) => {
    if (f.id === id) return replacement
    if (f.children.length) {
      const children = replaceFieldNode(f.children, id, replacement)
      if (children !== f.children) return { ...f, children }
    }
    return f
  })
}

/** Recursively append a child under `parentId`. */
export function appendChild(
  fields: ModelField[],
  parentId: string,
  child: ModelField,
): ModelField[] {
  return fields.map((f) => {
    if (f.id === parentId) return { ...f, children: [...f.children, child] }
    if (f.children.length) {
      const children = appendChild(f.children, parentId, child)
      if (children !== f.children) return { ...f, children }
    }
    return f
  })
}

/**
 * A field "has children" — and therefore renders a nested subtree — when it is
 * an `object`, or an `array` of `object`. Switching a field away from those
 * shapes drops its accumulated children so the export stays consistent.
 */
export function fieldHasChildren(kind: FieldKind, arrayOf: ArrayOf): boolean {
  return kind === 'object' || (kind === 'array' && arrayOf === 'object')
}

/** Unique "Field N" within a sibling list. */
export function nextFieldName(siblings: ModelField[]): string {
  let n = siblings.length + 1
  const taken = new Set(siblings.map((f) => f.name))
  while (taken.has(`field${n}`)) n++
  return `field${n}`
}

/** Unique "modelN" across the master. */
export function nextModelName(models: ModelDef[]): string {
  let n = models.length + 1
  const taken = new Set(models.map((m) => m.name))
  while (taken.has(`model${n}`)) n++
  return `model${n}`
}

/** Apply `fn` to the model with `id`, leaving the rest untouched. */
export function patchModel(
  models: ModelDef[],
  id: string,
  fn: (m: ModelDef) => ModelDef,
): ModelDef[] {
  return models.map((m) => (m.id === id ? fn(m) : m))
}

/** Recursively locate a field by id (read-only helper). */
export function findField(fields: ModelField[], id: string): ModelField | null {
  for (const f of fields) {
    if (f.id === id) return f
    if (f.children.length) {
      const hit = findField(f.children, id)
      if (hit) return hit
    }
  }
  return null
}

