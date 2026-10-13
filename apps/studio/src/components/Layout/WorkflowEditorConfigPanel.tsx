import { Plus, Trash2 } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { FieldPicker, IconButton, Input, Select } from '../common'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import { WiringHint } from './ButtonConfigPanel'
import { useGridStore } from './gridStore'
import { IMAGE_KINDS, rowModelFields, TEXT_KINDS } from './rowFields'
import { EndpointPicker } from './SelectFieldConfigPanel'
import { DEFAULT_WORKFLOW_LABELS, type WorkflowEditorConfig, type WorkflowRoleConfig } from './types'

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

const POSITION_OPTIONS = [
  { value: '', label: 'Anywhere' },
  { value: 'first', label: 'Always first' },
  { value: 'last', label: 'Always last' },
]

/**
 * Inspector for a workflow editor (see the grilled design): the field, the
 * roles with their rules (at most N per line, pinned first / last), the
 * dialog's user list (an endpoint walked to the user rows, keys picked from
 * its model like the select family's), the saved step field names, the
 * dialog labels and the read-only switch.
 */
export function WorkflowEditorConfigPanel({ itemId, config }: { itemId: string; config: WorkflowEditorConfig }) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof WorkflowEditorConfig>(key: K, value: WorkflowEditorConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<WorkflowEditorConfig>)
  const setUsers = (patch: Partial<WorkflowEditorConfig['users']>) => set('users', { ...config.users, ...patch })
  const setRole = (id: string, patch: Partial<WorkflowRoleConfig>) =>
    set('roles', config.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const endpoints = useProjectEndpoints()
  const models = useProjectModels()
  const row = useMemo(
    () => rowModelFields(config.users.endpointId, config.users.paths, endpoints, models),
    [config.users.endpointId, config.users.paths, endpoints, models],
  )
  const fields = row.fields === null ? null : row.fields.map((f) => ({ name: f.name, kind: f.kind }))
  const picker = (key: 'idKey' | 'displayKey' | 'subtitleKey' | 'avatarKey' | 'searchKey', label: string, kinds: readonly string[], allowNone = true) => (
    <Field key={key} label={label}>
      <FieldPicker
        fields={fields}
        value={config.users[key]}
        onChange={(v) => setUsers({ [key]: v })}
        kinds={kinds}
        allowNone={allowNone}
        fallbackHint={row.reason}
        aria-label={label}
      />
    </Field>
  )

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">Workflow editor</h3>
      <Field label="Name (field)">
        <Input value={config.name} onChange={(e) => set('name', e.target.value)} className="font-mono" />
      </Field>
      <Field label="Label">
        <Input value={config.label} onChange={(e) => set('label', e.target.value)} />
      </Field>
      <Field label="Helper text">
        <Input value={config.helperText} onChange={(e) => set('helperText', e.target.value)} />
      </Field>
      <Toggle label="Required (at least one step)" checked={config.isRequired} onChange={(v) => set('isRequired', v)} />
      <Field label="Error message">
        <Input value={config.errorMessage} onChange={(e) => set('errorMessage', e.target.value)} />
      </Field>
      <Toggle label="Read-only" checked={config.disabled} onChange={(v) => set('disabled', v)} />

      <Heading>Roles</Heading>
      <p className="text-ui-xs text-ink-3">The dialog's Action Type. "At most" disables the radio once reached ("(Already assigned.)"); a pinned role can't be inserted across.</p>
      {config.roles.map((role) => (
        <div key={role.id} className="space-y-1.5 rounded-md border border-line bg-panel p-2">
          <div className="flex gap-1.5">
            <div className="flex-1">
              <Input value={role.label} onChange={(e) => setRole(role.id, { label: e.target.value })} placeholder="label" aria-label="Role label" />
            </div>
            <div className="flex-1">
              <Input value={role.value} onChange={(e) => setRole(role.id, { value: e.target.value })} placeholder="stored value" className="font-mono" aria-label="Role value" />
            </div>
            <IconButton label={`Remove role ${role.label}`} onClick={() => set('roles', config.roles.filter((r) => r.id !== role.id))}>
              <Trash2 size={12} aria-hidden />
            </IconButton>
          </div>
          <div className="flex gap-1.5">
            <div className="w-24">
              <Input
                type="number"
                min={1}
                value={role.max}
                placeholder="at most"
                onChange={(e) => setRole(role.id, { max: e.target.value === '' ? '' : Number(e.target.value) })}
                aria-label="At most"
              />
            </div>
            <div className="flex-1">
              <Select options={POSITION_OPTIONS} value={role.position} onChange={(v) => setRole(role.id, { position: v as WorkflowRoleConfig['position'] })} aria-label="Position" />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => set('roles', [...config.roles, { id: crypto.randomUUID(), value: '', label: '', max: '', position: '' }])}
      >
        <Plus size={12} aria-hidden /> Add role
      </button>

      <Heading>Users (the dialog's pickers)</Heading>
      <Field label="Endpoint (API page)">
        <EndpointPicker value={config.users.endpointId} onChange={(endpointId) => setUsers({ endpointId })} />
      </Field>
      {config.users.endpointId == null && <WiringHint>Pick the endpoint the user list comes from — loaded once when the dialog opens.</WiringHint>}
      {config.users.endpointId != null && (
        <Field label="Response row path (dot path)">
          <Input value={config.users.paths} onChange={(e) => setUsers({ paths: e.target.value })} placeholder="data" className="font-mono" />
        </Field>
      )}
      {picker('idKey', 'Id field', TEXT_KINDS, false)}
      {picker('displayKey', 'Name field', TEXT_KINDS, false)}
      {picker('subtitleKey', 'Subtitle field (job title)', TEXT_KINDS)}
      {picker('avatarKey', 'Image field', IMAGE_KINDS)}
      {picker('searchKey', 'Search field (default: the name)', TEXT_KINDS)}
      {(!config.users.idKey || !config.users.displayKey) && <WiringHint>The id and name fields are required — what is stored and shown per user.</WiringHint>}

      <Heading>Saved step fields</Heading>
      <p className="text-ui-xs text-ink-3">The names your backend uses on one step of the line.</p>
      {(['role', 'sequence', 'incharge', 'cc'] as const).map((k) => (
        <Field key={k} label={{ role: 'Role', sequence: 'Sequence', incharge: 'In-charge users', cc: 'CC users' }[k]}>
          <Input value={config.stepKeys[k]} onChange={(e) => set('stepKeys', { ...config.stepKeys, [k]: e.target.value })} className="font-mono" />
        </Field>
      ))}

      <Heading>Rules</Heading>
      <Field label="People in charge per step, at least" hint="Add / Save stays disabled under it. Default 1.">
        <Input
          type="number"
          min={0}
          value={config.minInchargeUsers}
          placeholder="1"
          onChange={(e) => set('minInchargeUsers', e.target.value === '' ? '' : Number(e.target.value))}
        />
      </Field>
      <Toggle label="A person may be in charge of several steps" checked={config.allowDuplicateUsers} onChange={(v) => set('allowDuplicateUsers', v)} />

      <Heading>Labels</Heading>
      {(Object.keys(DEFAULT_WORKFLOW_LABELS) as (keyof typeof DEFAULT_WORKFLOW_LABELS)[]).map((k) => (
        <Field key={k} label={{ add: 'Add button', dialogTitle: 'Dialog title (add)', editTitle: 'Dialog title (edit)', roleField: 'Role field', incharge: 'In-charge field', cc: 'CC field', userPlaceholder: 'User placeholder' }[k]}>
          <Input value={config.labels[k]} onChange={(e) => set('labels', { ...config.labels, [k]: e.target.value })} placeholder={DEFAULT_WORKFLOW_LABELS[k]} />
        </Field>
      ))}
    </div>
  )
}
