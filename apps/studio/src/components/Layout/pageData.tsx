import { useCallback, useMemo } from 'react'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import { FieldPicker, Input, Select, type PickableField } from '../common'
import type { ModelField } from '../Model/types'
import { loadShape, type LoadShape, type PageLoadDef } from '../Workspace/pageLoads'
import { useActivePage, useActiveProject, useWorkspaceStore } from '../Workspace/workspaceStore'
import { authProfileLoad, type AuthDef } from '../Workspace/auth'

const NO_LOADS: PageLoadDef[] = []

/** The active page's own data loads ([] outside a project page — templates have none). */
export function useOwnPageLoads(): PageLoadDef[] {
  return useActivePage()?.loads ?? NO_LOADS
}

/** The project's app-wide loads (fetched once, kept across pages). */
export function useGlobalLoads(): PageLoadDef[] {
  return useActiveProject()?.snapshot.globalLoads ?? NO_LOADS
}

/**
 * Every load the active page can read: its own, then the project's global
 * ones — what bindings, conditions and param sources pick from, and what
 * export resolves their ids against.
 */
export function usePageLoads(): PageLoadDef[] {
  const own = useOwnPageLoads()
  const global = useGlobalLoads()
  const auth = useAuthProfileLoad()
  return useMemo(() => {
    const list = global.length ? [...own, ...global] : own
    return auth ? [...list, auth] : list
  }, [own, global, auth])
}

/** The shared auth entry the active project signs in with (null = none / deleted). */
export function useProjectAuth(): AuthDef | null {
  const authId = useActiveProject()?.snapshot.authId ?? null
  const entries = useWorkspaceStore((s) => s.library.auth)
  return useMemo(() => (authId ? (entries ?? []).find((a) => a.id === authId) ?? null : null), [authId, entries])
}

/**
 * The sign-in's profile fetch as a read-only pseudo-load (see the grilled
 * design `azure-sso-auth`): the signed-in profile lands in its slice without
 * a page load, so bindings pick it here like a global one.
 */
export function useAuthProfileLoad(): PageLoadDef | null {
  const auth = useProjectAuth()
  return useMemo(() => authProfileLoad(auth ?? undefined), [auth])
}

/** Replace the project's global loads. */
export function useSetGlobalLoads(): (loads: PageLoadDef[]) => void {
  const projectId = useWorkspaceStore((s) => s.activeProjectId)
  const update = useWorkspaceStore((s) => s.updateProjectGlobalLoads)
  return useCallback((loads: PageLoadDef[]) => projectId && update(projectId, loads), [projectId, update])
}

/** Replace the active page's loads. */
export function useSetPageLoads(): (loads: PageLoadDef[]) => void {
  const projectId = useWorkspaceStore((s) => s.activeProjectId)
  const page = useActivePage()
  const updatePage = useWorkspaceStore((s) => s.updatePage)
  return useCallback(
    (loads: PageLoadDef[]) => {
      if (projectId && page) updatePage(projectId, page.id, { loads })
    },
    [projectId, page, updatePage],
  )
}

/** Each load's shape (what its slice holds), by load id. */
export function useLoadShapes(): Map<string, LoadShape> {
  const loads = usePageLoads()
  const endpoints = useProjectEndpoints()
  const models = useProjectModels()
  return useMemo(
    () => new Map(loads.map((l) => [l.id, loadShape(l, endpoints, models)])),
    [loads, endpoints, models],
  )
}

/** One line describing a load's shape, for hints. */
export function shapeLabel(shape: LoadShape | undefined): string {
  if (!shape) return ''
  if (shape.shape === null) return shape.reason
  if (shape.shape === 'array') return `a list of rows (${shape.fields.length} fields each)`
  if (shape.shape === 'object') return `one record (${shape.fields.length} fields)`
  return 'a single value'
}

/** The slice's load state, readable like a field (`$status`: idle / held / loading / success / error). */
const STATUS_FIELD: PickableField = { name: '$status', kind: 'status' }

type LoadFieldPickerProps = {
  /** What is being picked, for the controls' accessible names. */
  label: string
  loadId: string
  path: string
  onChange: (next: { loadId: string; path: string }) => void
  /**
   * `field`: pick one field of a record load (the path's first segment, plus
   * an optional deeper path) — or the whole data. `rows`: a list load, bound
   * whole (a table's rows, a select's options, a repeater's items); record
   * loads can still reach a list inside them through the path. `load`: the
   * load alone (a status condition).
   */
  mode?: 'field' | 'rows' | 'load'
  /** Offer `$status` beside the fields. */
  allowStatus?: boolean
  /** Only offer these load ids (e.g. not the load being edited). */
  exclude?: string
}

/**
 * Picks a page load and a path into its data (see the grilled page-data
 * design): a select over the page's loads, then a `FieldPicker` over the
 * load's model — the endpoint's response walked along the load's paths —
 * with a free-text path for anything deeper. Free text throughout when the
 * model can't be resolved.
 */
export function LoadFieldPicker({
  label,
  loadId,
  path,
  onChange,
  mode = 'field',
  allowStatus = false,
  exclude,
}: LoadFieldPickerProps) {
  const loads = usePageLoads().filter((l) => l.id !== exclude)
  const globalIds = new Set(useGlobalLoads().map((l) => l.id))
  const shapes = useLoadShapes()
  const shape = shapes.get(loadId)
  const stale = loadId !== '' && !loads.some((l) => l.id === loadId)
  const loadOptions = [
    ...(loadId === '' ? [{ value: '', label: '— choose a load —' }] : []),
    ...(stale ? [{ value: loadId, label: '⚠ deleted load' }] : []),
    ...loads.map((l) => ({ value: l.id, label: `${l.key || '(unnamed)'}${globalIds.has(l.id) ? ' · global' : ''}` })),
  ]
  const [head, ...rest] = path.split('.')
  const tail = rest.join('.')
  const fields: PickableField[] | null =
    shape?.shape === 'object' || shape?.shape === 'array'
      ? shape.fields.map((f) => ({ name: f.name, kind: f.kind }))
      : shape?.shape === 'value'
        ? []
        : null
  const pickPath = mode === 'field' || (mode === 'rows' && shape?.shape === 'object')
  return (
    <div className="space-y-1.5">
      <Select
        aria-label={`${label} load`}
        options={loadOptions}
        value={loadId}
        onChange={(id) => onChange({ loadId: id, path: '' })}
      />
      {loadId !== '' && pickPath && (
        <>
          <FieldPicker
            fields={fields ? [...(allowStatus ? [STATUS_FIELD] : []), ...fields] : null}
            value={path === '' ? '' : head}
            onChange={(name) => onChange({ loadId, path: name })}
            allowNone
            fallbackHint={shape?.shape === null ? shape.reason : undefined}
            aria-label={`${label} field`}
          />
          {path !== '' && head !== '$status' && fields !== null && (
            <Input
              value={tail}
              onChange={(e) => onChange({ loadId, path: e.target.value ? `${head}.${e.target.value}` : head })}
              placeholder="deeper path (optional)"
              className="font-mono"
              aria-label={`${label} deeper path`}
            />
          )}
        </>
      )}
      {loadId !== '' && shape && <p className="text-ui-xs text-ink-3">Holds {shapeLabel(shape)}.</p>}
    </div>
  )
}

/**
 * The row fields of a page-data binding that should be a list (a table's
 * rows, a select's options, a repeater's items): a list load bound whole, or
 * a list of objects reached through the path of a record load.
 */
export function bindingRowModel(
  binding: { key: string; path: string } | null | undefined,
  shapes: Map<string, LoadShape>,
): { fields: ModelField[]; reason?: undefined } | { fields: null; reason: string } {
  if (!binding?.key) return { fields: null, reason: 'Pick the page load the rows come from.' }
  const shape = shapes.get(binding.key)
  if (!shape) return { fields: null, reason: 'That load was deleted.' }
  if (shape.shape === null) return { fields: null, reason: shape.reason }
  const segments = binding.path.split('.').map((s) => s.trim()).filter(Boolean)
  if (segments.length === 0) {
    return shape.shape === 'array'
      ? { fields: shape.fields }
      : { fields: null, reason: 'This load holds one record — pick its list field.' }
  }
  if (shape.shape !== 'object') return { fields: null, reason: 'Only a record load has fields to follow.' }
  let level = shape.fields
  for (const [i, segment] of segments.entries()) {
    const field = level.find((f) => f.name === segment)
    if (!field) return { fields: null, reason: `“${segment}” is not in the load’s model.` }
    const last = i === segments.length - 1
    if (last) {
      return field.kind === 'array' && field.arrayOf === 'object'
        ? { fields: field.children }
        : { fields: null, reason: `“${segment}” is not a list of records.` }
    }
    if (field.kind !== 'object') return { fields: null, reason: `“${segment}” is not an object.` }
    level = field.children
  }
  return { fields: null, reason: 'Unreachable.' }
}
