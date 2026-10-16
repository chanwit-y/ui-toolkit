/**
 * Custom button actions (see the grilled design in the library's
 * `core/actions.tsx`): functions the developer codes in the app and hands to
 * `<ActionsProvider actions={{ increase, … }}>`, which a button's action
 * chain names inline as `"fn:<name>"`. The studio only knows the *names*: a
 * project declares them once (the Env page's "Custom actions" section),
 * buttons pick them in their action chips, the export writes a typed
 * `actions.ts` stub for every declared name, and the Live Preview stubs
 * them (a log line, then the chain continues).
 *
 * Button configs store the declaration's stable **id** (`fn:action-…`), so a
 * rename propagates and a deleted action shows as dangling; the export
 * resolves it to `fn:<name>`, or `fn:MISSING_ACTION` when it is gone — loud
 * in the config, warned-and-skipped by the engine (same pattern as
 * `MISSING_PAGE` / `MISSING_LOAD`).
 */

export type CustomActionDef = {
  /** Stable id (`action-…`) the button configs reference. */
  id: string
  /** The registry key the engine calls (`actions[name]`): a JS identifier. */
  name: string
  description: string
}

/** What the export needs of a declaration. */
export type CustomActionRef = Pick<CustomActionDef, 'id' | 'name'>

export const ACTION_ID_PREFIX = 'action-'
/** The engine's prefix — `"fn:<name>"` in a config, `"fn:<id>"` in a studio button. */
export const CUSTOM_ACTION_PREFIX = 'fn:'
/** Emitted for a button whose declared action was deleted. */
export const MISSING_ACTION = 'MISSING_ACTION'

export type CustomActionKey = `fn:${string}`

export function createCustomActionDef(name = ''): CustomActionDef {
  return { id: `${ACTION_ID_PREFIX}${crypto.randomUUID()}`, name, description: '' }
}

/** Whether a button action key is a custom one (`"fn:…"`). */
export function isCustomActionKey(key: string): key is CustomActionKey {
  return key.startsWith(CUSTOM_ACTION_PREFIX)
}

/** The chip key a button stores for a declaration: `"fn:<id>"`. */
export function customActionKey(id: string): CustomActionKey {
  return `${CUSTOM_ACTION_PREFIX}${id}`
}

/** `"fn:<id>"` → `"<id>"`. */
export function customActionIdOf(key: string): string {
  return key.slice(CUSTOM_ACTION_PREFIX.length)
}

/** A registry key the engine can call: a JS identifier. */
export function isValidActionName(name: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(name)
}

/**
 * Export resolver: a built-in key passes through, a custom one becomes
 * `fn:<name>` — or `fn:MISSING_ACTION` when its declaration is gone or
 * unnamed (an unnamed declaration can't be called either).
 */
export function makeActionKeyResolver(defs: CustomActionRef[] = []): (key: string) => string {
  const byId = new Map(defs.map((d) => [d.id, d.name.trim()]))
  return (key) => {
    if (!isCustomActionKey(key)) return key
    const name = byId.get(customActionIdOf(key))
    return customActionKey(name || MISSING_ACTION)
  }
}

/** Declarations whose name is duplicated (after trimming), by name. */
export function duplicateActionNames(defs: CustomActionRef[]): Set<string> {
  const seen = new Map<string, number>()
  for (const d of defs) {
    const name = d.name.trim()
    if (!name) continue
    seen.set(name, (seen.get(name) ?? 0) + 1)
  }
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([name]) => name))
}

/**
 * The exported `actions.ts`: one typed stub per declared action, ready for
 * `<ActionsProvider actions={actions}>`. Unnamed / invalid declarations are
 * listed in a comment instead of breaking the file.
 */
export function toActionsTs(defs: CustomActionDef[]): string {
  const valid = defs.filter((d) => isValidActionName(d.name.trim()))
  const skipped = defs.filter((d) => !isValidActionName(d.name.trim()))
  const lines: string[] = [
    'import type { TActionMaster } from "@gummy-ui/ui";',
    '',
    '/**',
    ' * Custom button actions — behaviour coded here, named in the config as "fn:<name>".',
    ' * Mount once above the routes: <ActionsProvider actions={actions}> (see HANDOFF.md).',
    ' * Each function gets one ActionContext (form, row, contextData, state, api, fns,',
    ' * snackbar, startLoading / stopLoading, navigate, element, event). It may be async;',
    ' * `return false` ends the button\'s action chain; a throw shows through',
    ' * snackbarError: "$exception".',
    ' */',
    'export const actions: TActionMaster = {',
  ]
  for (const d of valid) {
    const name = d.name.trim()
    if (d.description.trim()) lines.push(`  /** ${d.description.trim().replace(/\*\//g, '* /')} */`)
    lines.push(`  ${name}: async (ctx) => {`, `    // TODO: implement "${name}"`, `    console.log("[actions] ${name}", ctx.form.getValues());`, `  },`)
  }
  lines.push('};', '')
  if (skipped.length) {
    lines.push(
      `// Not exported — the name must be a JS identifier: ${skipped.map((d) => JSON.stringify(d.name)).join(', ')}`,
      '',
    )
  }
  return lines.join('\n')
}
