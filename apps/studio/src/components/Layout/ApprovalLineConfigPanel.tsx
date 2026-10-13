import { Plus, Trash2 } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { FieldPicker, IconButton, Input, SegmentedControl, Select, type PickableField } from '../common'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import { WiringHint } from './ButtonConfigPanel'
import { CrudRefEditor } from './FormListConfigPanel'
import { useGridStore } from './gridStore'
import { ItemBindingField } from './ItemBindingField'
import { bindingRowModel, useLoadShapes } from './pageData'
import { useRepeaterScope, type RepeaterScope } from './repeaterScope'
import { flattenModelFields, rowModelFields, walkModelPath, type RowModel } from './rowFields'
import {
  DEFAULT_APPROVAL_STATUSES,
  type ApprovalLineConfig,
  type ApprovalLineKeyConfig,
  type ApprovalStepStateConfig,
} from './types'

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="block text-ui-xs text-ink-3">{hint}</span>}
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-line-strong text-ink focus:ring-focus/30"
      />
    </label>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return <h4 className="pt-1 text-ui-sm font-semibold uppercase tracking-wide text-ink-3">{children}</h4>
}

/** The row keys, in the order they're edited; `name` and `status` are required. */
const KEY_ROWS: { key: keyof ApprovalLineKeyConfig; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'status', label: 'Status code', required: true },
  { key: 'sequence', label: 'Sequence (sort order)' },
  { key: 'jobTitle', label: 'Job title' },
  { key: 'role', label: 'Role label (if the row has one)' },
  { key: 'remark', label: 'Remark' },
  { key: 'date', label: 'Date' },
  { key: 'personId', label: 'Person id (for the avatar URL)' },
  { key: 'avatar', label: 'Avatar URL on the row' },
]

const STATE_OPTIONS: { value: ApprovalStepStateConfig; label: string }[] = [
  { value: 'done', label: 'Done ✓' },
  { value: 'current', label: 'Current (waiting)' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected ✕' },
  { value: 'revised', label: 'Revised ↺' },
  { value: 'skipped', label: 'Skipped' },
]

/** The flattened (dotted) fields of a model, or the free-text fallback with its reason. */
type PathFields = { fields: PickableField[]; reason?: undefined } | { fields: null; reason: string }

function flatten(model: RowModel): PathFields {
  return model.fields === null ? model : { fields: flattenModelFields(model.fields) }
}

/**
 * What a line reads, per source: the step **row** model (the fields one
 * step has) and — in endpoint mode — the request **record** model (what the
 * requester paths read). Endpoint: the response walked along `recordPath`,
 * then `stepsPath` to an array of objects. Binding: a page load's rows
 * (`bindingRowModel`) or the enclosing repeater item's list field.
 */
function useApprovalModels(config: ApprovalLineConfig, scope: RepeaterScope): { rows: PathFields; record: PathFields } {
  const endpoints = useProjectEndpoints()
  const models = useProjectModels()
  const shapes = useLoadShapes()
  return useMemo(() => {
    if (config.source === 'endpoint') {
      const path = [config.recordPath, config.stepsPath].map((p) => p.trim()).filter(Boolean).join('.')
      const rows = flatten(rowModelFields(config.read.endpointId, path, endpoints, models))
      // The record: the response model walked along `recordPath` to an object.
      const endpoint = endpoints.find((e) => e.id === config.read.endpointId)
      const model = endpoint?.response == null ? undefined : models.find((m) => m.id === endpoint.response)
      let record: PathFields
      if (!endpoint || !model) record = { fields: null, reason: rows.reason ?? 'Pick the endpoint.' }
      else {
        const rec = config.recordPath.trim() ? walkModelPath(model.fields, config.recordPath) : undefined
        const fields = config.recordPath.trim() ? (rec?.kind === 'object' ? rec.children : null) : model.fields
        record = fields ? { fields: flattenModelFields(fields) } : { fields: null, reason: `“${config.recordPath}” is not an object in ${model.name}.` }
      }
      return { rows, record }
    }
    const binding = config.items
    if (!binding) return { rows: { fields: null, reason: 'Bind the step rows first.' }, record: { fields: null, reason: '' } }
    if (binding.source === 'state') return { rows: flatten(bindingRowModel(binding, shapes)), record: { fields: null, reason: '' } }
    // A repeater item's list field.
    if (!scope) return { rows: { fields: null, reason: 'Not inside a repeater — the item field resolves to nothing here.' }, record: { fields: null, reason: '' } }
    if (scope.itemModel.fields === null) return { rows: { fields: null, reason: scope.itemModel.reason }, record: { fields: null, reason: '' } }
    const path = [binding.key === 'none' ? '' : binding.key, binding.path].filter(Boolean).join('.')
    const field = path ? walkModelPath(scope.itemModel.fields, path) : undefined
    if (!field) return { rows: { fields: null, reason: `“${path}” is not a field of the item.` }, record: { fields: null, reason: '' } }
    if (field.kind !== 'array' || field.arrayOf !== 'object')
      return { rows: { fields: null, reason: `“${path}” is not a list of records.` }, record: { fields: null, reason: '' } }
    return { rows: { fields: flattenModelFields(field.children) }, record: { fields: null, reason: '' } }
  }, [config.source, config.items, config.read.endpointId, config.recordPath, config.stepsPath, endpoints, models, shapes, scope])
}

/**
 * One key's fallback paths: a `FieldPicker` per path over the dotted model
 * fields (free text when the model can't be resolved), a "deeper path" box
 * when the picked field is `any` (the model doesn't know what's inside), and
 * add / remove. Paths are tried top to bottom.
 */
function PathListField({
  label,
  paths,
  onChange,
  fields,
  required = false,
}: {
  label: string
  paths: string[]
  onChange: (next: string[]) => void
  fields: PathFields
  required?: boolean
}) {
  const list = paths.length === 0 && required ? [''] : paths
  const set = (i: number, value: string) => onChange(list.map((p, j) => (j === i ? value : p)))
  // The picked entry of a stored path: the longest model path it starts with
  // (so `ApproverUser.extra.x` picks `ApproverUser · any` + the deeper `extra.x`).
  const split = (path: string): { head: string; tail: string; any: boolean } => {
    if (fields.fields === null) return { head: path, tail: '', any: false }
    const exact = fields.fields.find((f) => f.name === path)
    if (exact) return { head: path, tail: '', any: exact.kind === 'any' }
    const anyParents = fields.fields
      .filter((f) => f.kind === 'any' && path.startsWith(`${f.name}.`))
      .sort((a, b) => b.name.length - a.name.length)
    if (anyParents[0]) return { head: anyParents[0].name, tail: path.slice(anyParents[0].name.length + 1), any: true }
    return { head: path, tail: '', any: false }
  }
  return (
    <div className="space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{required ? `${label} *` : label}</span>
      {list.map((path, i) => {
        const { head, tail, any } = split(path)
        return (
          <div key={i} className="flex items-start gap-1">
            <div className="min-w-0 flex-1 space-y-1">
              <FieldPicker
                fields={fields.fields}
                value={head}
                onChange={(name) => set(i, name)}
                allowNone={!required || i > 0}
                fallbackHint={i === 0 ? fields.reason : undefined}
                aria-label={`${label} path ${i + 1}`}
              />
              {any && (
                <Input
                  value={tail}
                  onChange={(e) => set(i, e.target.value ? `${head}.${e.target.value}` : head)}
                  placeholder="deeper path inside it (the model doesn't say)"
                  className="font-mono"
                  aria-label={`${label} path ${i + 1} deeper`}
                />
              )}
            </div>
            {(list.length > 1 || !required) && (
              <IconButton label={`Remove ${label} path ${i + 1}`} onClick={() => onChange(list.filter((_, j) => j !== i))} className="h-7 w-7 shrink-0">
                <Trash2 size={12} aria-hidden />
              </IconButton>
            )}
          </div>
        )
      })}
      <button type="button" className="btn btn-sm" onClick={() => onChange([...list, ''])}>
        <Plus size={12} aria-hidden /> {list.length ? 'Add fallback' : 'Add path'}
      </button>
    </div>
  )
}

/**
 * Inspector for an approval line (see the grilled design, round 2). The rows
 * come from a binding (a page load / the repeater item) or the line's own
 * endpoint; once the source resolves to a model, every key, role-rule path
 * and requester path is picked from the model's dotted fields — each key a
 * list of fallback paths, since reviewer rows and approver rows differ. The
 * status map is pre-filled with the document statuses and exported only when
 * changed.
 */
export function ApprovalLineConfigPanel({ itemId, config }: { itemId: string; config: ApprovalLineConfig }) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof ApprovalLineConfig>(key: K, value: ApprovalLineConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<ApprovalLineConfig>)
  const scope = useRepeaterScope()
  const { rows, record } = useApprovalModels(config, scope)
  const endpoint = config.source === 'endpoint'
  const setKey = (key: keyof ApprovalLineKeyConfig, paths: string[]) => set('keys', { ...config.keys, [key]: paths })
  const setRule = (id: string, patch: Partial<ApprovalLineConfig['roleRules'][number]>) =>
    set('roleRules', config.roleRules.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const setStatus = (i: number, patch: Partial<ApprovalLineConfig['statuses'][number]>) =>
    set('statuses', config.statuses.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  // Role rules point at an object of the row (`ReviewerUser`), so only those are offered.
  const objectFields: PathFields = useMemo(
    () => (rows.fields === null ? rows : { fields: rows.fields.filter((f) => f.kind === 'object' || f.kind === 'any') }),
    [rows],
  )

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">Approval line</h3>
      <Field label="Name">
        <Input value={config.name} onChange={(e) => set('name', e.target.value)} className="font-mono" />
      </Field>

      <Heading>Step rows</Heading>
      <SegmentedControl
        aria-label="Rows source"
        options={[
          { value: 'binding', label: 'Page data / item' },
          { value: 'endpoint', label: 'Endpoint' },
        ]}
        value={config.source}
        onChange={(v) => set('source', v as ApprovalLineConfig['source'])}
      />
      {endpoint ? (
        <>
          <CrudRefEditor value={config.read} onChange={(read) => set('read', read)} allowRow={!!scope} extraLabel="Query fields" />
          {config.read.endpointId == null && <WiringHint>Pick an endpoint — the line fetches the request itself.</WiringHint>}
          <Field label="Response record path" hint="Dot path to the request record (the requester reads it).">
            <Input value={config.recordPath} onChange={(e) => set('recordPath', e.target.value)} placeholder="data" className="font-mono" />
          </Field>
          <Field label="Steps field" hint="Dot path from the record to the step rows; empty = the record is the list.">
            <Input value={config.stepsPath} onChange={(e) => set('stepsPath', e.target.value)} placeholder="steps" className="font-mono" />
          </Field>
        </>
      ) : (
        <>
          <ItemBindingField label="Step rows" binding={config.items} onChange={(b) => set('items', b)} scope={scope} />
          {!config.items && <WiringHint>Bind the rows — a page load's list, or a list field of the repeater item.</WiringHint>}
        </>
      )}
      {rows.fields !== null && (
        <p className="text-ui-xs text-ok">Row model resolved — {rows.fields.length} fields to pick from.</p>
      )}

      <Heading>Row keys</Heading>
      <p className="text-ui-xs text-ink-3">Each key tries its paths top to bottom — the first with a value on the row wins (reviewer rows and approver rows differ).</p>
      {KEY_ROWS.map(({ key, label, required }) => (
        <PathListField key={key} label={label} paths={config.keys[key]} onChange={(p) => setKey(key, p)} fields={rows} required={required} />
      ))}

      <Heading>Role labels</Heading>
      <p className="text-ui-xs text-ink-3">
        The first rule whose path exists on the row (and whose sequence matches, when set) names the step. A role
        key above wins over the rules.
      </p>
      {config.roleRules.map((rule) => (
        <div key={rule.id} className="space-y-1.5 rounded-md border border-line bg-panel p-2">
          <FieldPicker
            fields={objectFields.fields}
            value={rule.path}
            onChange={(path) => setRule(rule.id, { path })}
            fallbackHint={objectFields.reason}
            aria-label="Rule path"
          />
          <div className="flex gap-1.5">
            <div className="w-16">
              <Input value={rule.sequence} onChange={(e) => setRule(rule.id, { sequence: e.target.value })} placeholder="seq" className="font-mono" aria-label="Rule sequence" />
            </div>
            <div className="flex-1">
              <Input value={rule.role} onChange={(e) => setRule(rule.id, { role: e.target.value })} placeholder="label" aria-label="Rule role" />
            </div>
            <IconButton label="Remove rule" onClick={() => set('roleRules', config.roleRules.filter((r) => r.id !== rule.id))}>
              <Trash2 size={12} aria-hidden />
            </IconButton>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => set('roleRules', [...config.roleRules, { id: crypto.randomUUID(), path: '', sequence: '', role: '' }])}
      >
        <Plus size={12} aria-hidden /> Add rule
      </button>

      <Heading>Status codes</Heading>
      <div className="space-y-1">
        {config.statuses.map((s, i) => (
          <div key={i} className="flex gap-1">
            <div className="w-12">
              <Input value={s.code} onChange={(e) => setStatus(i, { code: e.target.value })} className="font-mono" aria-label="Status code" />
            </div>
            <div className="flex-1">
              <Select options={STATE_OPTIONS} value={s.state} onChange={(v) => setStatus(i, { state: v as ApprovalStepStateConfig })} aria-label="Step state" />
            </div>
            <div className="flex-1">
              <Input value={s.label} onChange={(e) => setStatus(i, { label: e.target.value })} placeholder="label" aria-label="Status label" />
            </div>
            <IconButton label="Remove status" onClick={() => set('statuses', config.statuses.filter((_, j) => j !== i))}>
              <Trash2 size={12} aria-hidden />
            </IconButton>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button type="button" className="btn btn-sm" onClick={() => set('statuses', [...config.statuses, { code: '', state: 'pending', label: '' }])}>
          <Plus size={12} aria-hidden /> Add code
        </button>
        <button type="button" className="btn btn-sm" onClick={() => set('statuses', DEFAULT_APPROVAL_STATUSES.map((d) => ({ ...d })))}>
          Reset to defaults
        </button>
      </div>

      <Heading>Requester</Heading>
      <Toggle label="Show the requester first" checked={config.requesterEnabled} onChange={(v) => set('requesterEnabled', v)} />
      {config.requesterEnabled && (
        <>
          {endpoint ? (
            <>
              <p className="text-ui-xs text-ink-3">Read off the fetched record.</p>
              <PathListField label="Name" paths={config.requesterNamePath} onChange={(p) => set('requesterNamePath', p)} fields={record} />
              <PathListField label="Job title" paths={config.requesterJobTitlePath} onChange={(p) => set('requesterJobTitlePath', p)} fields={record} />
              <PathListField label="Person id" paths={config.requesterPersonIdPath} onChange={(p) => set('requesterPersonIdPath', p)} fields={record} />
              <PathListField label="Avatar URL" paths={config.requesterAvatarPath} onChange={(p) => set('requesterAvatarPath', p)} fields={record} />
              <Field label="Name (fallback)">
                <Input value={config.requesterName} onChange={(e) => set('requesterName', e.target.value)} />
              </Field>
            </>
          ) : (
            <>
              <Field label={config.requesterNameBinding ? 'Name (fallback)' : 'Name'}>
                <Input value={config.requesterName} onChange={(e) => set('requesterName', e.target.value)} />
              </Field>
              <ItemBindingField label="Requester name" binding={config.requesterNameBinding} onChange={(b) => set('requesterNameBinding', b)} scope={scope} />
              <Field label="Job title">
                <Input value={config.requesterJobTitle} onChange={(e) => set('requesterJobTitle', e.target.value)} />
              </Field>
              <ItemBindingField label="Requester job title" binding={config.requesterJobTitleBinding} onChange={(b) => set('requesterJobTitleBinding', b)} scope={scope} />
            </>
          )}
          <Field label="Role label">
            <Input value={config.requesterRole} onChange={(e) => set('requesterRole', e.target.value)} placeholder="Requester" />
          </Field>
        </>
      )}

      <Heading>Avatars</Heading>
      <Field label="Avatar URL template" hint="Over the step: {{personId}}, {{name}}… Empty = initials.">
        <Input value={config.avatarUrl} onChange={(e) => set('avatarUrl', e.target.value)} placeholder="/api/profile/{{personId}}/photo" className="font-mono" />
      </Field>

      <Heading>Layout</Heading>
      <Field label="Orientation">
        <SegmentedControl
          aria-label="Orientation"
          options={[
            { value: 'horizontal', label: 'Horizontal' },
            { value: 'vertical', label: 'Vertical' },
          ]}
          value={config.orientation}
          onChange={(v) => set('orientation', v as ApprovalLineConfig['orientation'])}
        />
      </Field>
      <Field label="Size">
        <SegmentedControl
          aria-label="Size"
          options={[
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' },
          ]}
          value={config.size}
          onChange={(v) => set('size', v as ApprovalLineConfig['size'])}
        />
      </Field>
      <Toggle label="Number the steps" checked={config.showIndex} onChange={(v) => set('showIndex', v)} />
      <Toggle label="Show job titles" checked={config.showJobTitle} onChange={(v) => set('showJobTitle', v)} />
      {config.orientation === 'horizontal' && (
        <>
          <Field label="Step minimum width (px)" hint="Under it the line scrolls instead of squeezing.">
            <Input
              type="number"
              min={48}
              value={config.stepMinWidth}
              placeholder="96"
              onChange={(e) => set('stepMinWidth', e.target.value === '' ? '' : Number(e.target.value))}
            />
          </Field>
          <Field label="Vertical below">
            <Select
              aria-label="Vertical below"
              options={[
                { value: '', label: 'Never' },
                { value: 'sm', label: 'sm (640px)' },
                { value: 'md', label: 'md (768px)' },
              ]}
              value={config.verticalBelow}
              onChange={(v) => set('verticalBelow', v as ApprovalLineConfig['verticalBelow'])}
            />
          </Field>
        </>
      )}
      <Field label="Empty text">
        <Input value={config.emptyText} onChange={(e) => set('emptyText', e.target.value)} placeholder="No approval steps." />
      </Field>
    </div>
  )
}
