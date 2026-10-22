import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Input, Select } from '../common'
import { useActiveProject } from '../Workspace/workspaceStore'
import { isValidComponentName, isValidJsonText, type CustomComponentDef, type CustomPropDef } from '../Workspace/customComponents'
import { useGridStore } from './gridStore'
import { ItemBindingField } from './ItemBindingField'
import { useRepeaterScope } from './repeaterScope'
import type { CustomComponentConfig } from './types'

const NO_DEFS: CustomComponentDef[] = []

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
      {hint ? <span className="block text-ui-xs text-ink-3">{hint}</span> : null}
    </label>
  )
}

/** One declared prop's field, by its kind; the text is stored as authored and parsed at export. */
function PropField({ prop, value, onChange }: { prop: CustomPropDef; value: string; onChange: (text: string) => void }) {
  const label = prop.label.trim() || prop.key
  const hint = prop.defaultValue.trim() ? `default ${prop.defaultValue}` : undefined
  switch (prop.kind) {
    case 'boolean':
      return (
        <Field label={label} hint={hint}>
          <Select
            value={value}
            onChange={onChange}
            options={[
              { value: '', label: hint ? `(${hint})` : '(unset)' },
              { value: 'true', label: 'true' },
              { value: 'false', label: 'false' },
            ]}
          />
        </Field>
      )
    case 'select':
      return (
        <Field label={label} hint={hint}>
          <Select
            value={value}
            onChange={onChange}
            options={[
              { value: '', label: hint ? `(${hint})` : '(unset)' },
              ...prop.options.map((o) => o.trim()).filter(Boolean).map((o) => ({ value: o, label: o })),
            ]}
          />
        </Field>
      )
    case 'number':
      return (
        <Field label={label} hint={hint}>
          <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={prop.defaultValue || '0'} />
        </Field>
      )
    case 'json': {
      const invalid = !isValidJsonText(value)
      return (
        <Field label={label} hint={invalid ? 'Not valid JSON — the prop is left out of the export until it parses.' : hint}>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            spellCheck={false}
            placeholder={prop.defaultValue || '{ }'}
            className={`field w-full resize-y font-mono text-ui-sm ${invalid ? 'border-danger' : ''}`}
          />
        </Field>
      )
    }
    default:
      return (
        <Field label={label} hint={hint}>
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={prop.defaultValue} />
        </Field>
      )
  }
}

/**
 * Inspector for a custom component (see the grilled design): the declaration
 * picked from the project's list (Env page → Custom components), one typed
 * field per declared prop, and the binding that becomes the one `value` the
 * component receives (an item field inside a repeater, page data elsewhere).
 */
export function CustomComponentConfigPanel({ itemId, config }: { itemId: string; config: CustomComponentConfig }) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof CustomComponentConfig>(key: K, value: CustomComponentConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<CustomComponentConfig>)
  const project = useActiveProject()
  const defs = project?.snapshot.customComponents ?? NO_DEFS
  const def = useMemo(() => defs.find((d) => d.id === config.componentId), [defs, config.componentId])
  const scope = useRepeaterScope()
  const dangling = !!config.componentId && !def
  const unnamed = !!def && !isValidComponentName(def.name.trim())
  const options = [
    { value: '', label: defs.length ? 'Pick a component…' : 'No components declared' },
    ...defs.map((d) => ({ value: d.id, label: d.name.trim() || '(unnamed)' })),
    ...(dangling ? [{ value: config.componentId, label: '(deleted declaration)' }] : []),
  ]

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">Custom component</h3>
      <Field label="Name">
        <Input value={config.name} onChange={(e) => set('name', e.target.value)} className="font-mono" />
      </Field>
      <Field label="Component" hint="Declared on the Env page (Custom components); the app registers the code under this name.">
        <Select value={config.componentId} onChange={(v) => set('componentId', v)} options={options} />
      </Field>
      {dangling && (
        <p className="text-ui-sm text-warn">The declaration was deleted — exports as MISSING_COMPONENT (a placeholder in the app).</p>
      )}
      {unnamed && (
        <p className="text-ui-sm text-warn">The declaration has no valid name yet — exports as MISSING_COMPONENT until it does.</p>
      )}
      {project && !defs.length && (
        <p className="text-ui-sm text-ink-3">
          Declare one on the{' '}
          <Link to={`/p/${project.id}/env`} className="underline">
            Env page
          </Link>
          .
        </p>
      )}
      {def && def.props.length > 0 && (
        <div className="space-y-2">
          <span className="sec-label block">Props</span>
          {def.props.map((p) => (
            <PropField
              key={p.key}
              prop={p}
              value={config.props[p.key] ?? ''}
              onChange={(text) => set('props', { ...config.props, [p.key]: text })}
            />
          ))}
        </div>
      )}
      {def && def.props.length === 0 && <p className="text-ui-sm text-ink-3">No props declared for this component.</p>}
      <ItemBindingField label="Value" binding={config.binding} onChange={(b) => set('binding', b)} scope={scope} />
    </div>
  )
}
