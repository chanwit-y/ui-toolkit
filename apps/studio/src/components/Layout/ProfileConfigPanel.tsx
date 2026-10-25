import { useMemo, type ReactNode } from 'react'
import { IconPicker, Input, Select, SegmentedControl } from '../common'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import { PathListField, type PathFields } from './ApprovalLineConfigPanel'
import { NavigateEditor, WiringHint } from './ButtonConfigPanel'
import { CrudRefEditor } from './FormListConfigPanel'
import { useGridStore } from './gridStore'
import { ItemBindingField } from './ItemBindingField'
import { LoadFieldPicker, usePageLoads } from './pageData'
import { useRepeaterScope } from './repeaterScope'
import { flattenModelFields, rowModelFields } from './rowFields'
import {
  BUTTON_VARIANT_OPTIONS,
  createDefaultNavigate,
  PROFILE_KEY_ROWS,
  type SwitchProfileDisplay,
  type ButtonVariant,
  type DataCondition,
  type FormListCrudRef,
  type ProfileSessionConfig,
  type ReplaceProfileConfig,
  type SwitchProfileConfig,
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

/** The row model of a profiles read: the response walked along `paths` to an array of objects, flattened to dotted fields. */
function useProfileRowFields(read: FormListCrudRef, paths: string): PathFields {
  const endpoints = useProjectEndpoints()
  const models = useProjectModels()
  return useMemo(() => {
    const model = rowModelFields(read.endpointId, paths, endpoints, models)
    return model.fields === null ? model : { fields: flattenModelFields(model.fields) }
  }, [read.endpointId, paths, endpoints, models])
}

/** The `:param` the element fills: a hint naming it, or a warning when the URL has several and none is chosen. */
function PersonParamField({
  value,
  onChange,
  read,
}: {
  value: string
  onChange: (next: string) => void
  read: FormListCrudRef
}) {
  const endpoints = useProjectEndpoints()
  const url = endpoints.find((e) => e.id === read.endpointId)?.url ?? ''
  const names = [...url.matchAll(/:([A-Za-z_$][A-Za-z0-9_$]*)/g)].map((m) => m[1])
  const filled = value.trim() || (names.length === 1 ? names[0] : '')
  return (
    <Field label="Person id param" hint={filled ? `The element fills :${filled} with the person's id — no source needed.` : undefined}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={names[0] ?? 'personId'} className="font-mono" />
      {!filled && read.endpointId != null && names.length > 1 && (
        <WiringHint>The URL has several :params — name the one that takes the person id.</WiringHint>
      )}
    </Field>
  )
}

/** A panel's typed `set` over the shared session keys. The switch / replace configs extend `ProfileSessionConfig`, so each panel's narrower generic setter is cast to this at the call site (TS cannot relate the two generics). */
type ProfileSessionSetter = <K extends keyof ProfileSessionConfig>(key: K, value: ProfileSessionConfig[K]) => void

/** Name, state slice, the logged-in profile, the record keys, persistence, reload and navigate — the shared half of both panels. */
function ProfileSessionFields<C extends ProfileSessionConfig>({
  config,
  set,
  rows,
}: {
  config: C
  set: ProfileSessionSetter
  rows: PathFields
}) {
  const scope = useRepeaterScope()
  const loads = usePageLoads()
  return (
    <>
      <Field label="Name">
        <Input value={config.name} onChange={(e) => set('name', e.target.value)} className="font-mono" />
      </Field>
      <Field label="State slice" hint="Where the active profile lives; bind anything to it as page data. Empty = profile.">
        <Input value={config.stateKey} onChange={(e) => set('stateKey', e.target.value)} placeholder="profile" className="font-mono" />
      </Field>
      <ItemBindingField label="Logged-in profile" binding={config.initial} onChange={(b) => set('initial', b)} scope={scope} />
      {!config.initial && loads.length > 0 && (
        <WiringHint>Bind the logged-in profile (a page load) — it seeds the slice while it is empty.</WiringHint>
      )}
      {loads.length === 0 && (
        <WiringHint>Add a page load for the logged-in profile on the Page data tab, then bind it here.</WiringHint>
      )}

      <Heading>Record keys</Heading>
      <p className="text-ui-xs text-ink-3">How a profile record is read — paths tried top to bottom. Empty keeps the engine default (the default profile shape).</p>
      <Field label="Name template" hint="{{path}} placeholders; wins over the Name paths. Empty = {{firstNameEn}} {{lastNameEN}}.">
        <Input
          value={config.keys.nameTemplate}
          onChange={(e) => set('keys', { ...config.keys, nameTemplate: e.target.value })}
          placeholder="{{firstNameEn}} {{lastNameEN}}"
          className="font-mono"
        />
      </Field>
      {PROFILE_KEY_ROWS.map(({ key, label }) => (
        <PathListField key={key} label={label} paths={config.keys[key]} onChange={(p) => set('keys', { ...config.keys, [key]: p })} fields={rows} />
      ))}

      <Heading>After a change</Heading>
      <Toggle label="Remember the choice" checked={config.persist} onChange={(v) => set('persist', v)} />
      <Field label="Reload" hint="Names registered for Reload data (tables, lists, page loads), comma-separated.">
        <Input
          value={config.reload.join(', ')}
          onChange={(e) => set('reload', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          placeholder="countries, lookups"
          className="font-mono"
        />
      </Field>
      <Toggle label="Navigate afterwards" checked={config.navigate !== null} onChange={(v) => set('navigate', v ? createDefaultNavigate() : null)} />
      {config.navigate && <NavigateEditor value={config.navigate} onChange={(n) => set('navigate', n)} />}
    </>
  )
}

/** Inspector for a Switch Profile list (see the grilled design). */
export function SwitchProfileConfigPanel({ itemId, config }: { itemId: string; config: SwitchProfileConfig }) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof SwitchProfileConfig>(key: K, value: SwitchProfileConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<SwitchProfileConfig>)
  const scope = useRepeaterScope()
  const rows = useProfileRowFields(config.read, config.readPaths)
  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">Switch profile</h3>

      <Heading>Profiles</Heading>
      <CrudRefEditor value={config.read} onChange={(read) => set('read', read)} allowRow={!!scope} extraLabel="Query fields" />
      {config.read.endpointId == null && <WiringHint>Pick the endpoint listing a person's profiles.</WiringHint>}
      <Field label="Rows path" hint="Dot path from the response to the profile list.">
        <Input value={config.readPaths} onChange={(e) => set('readPaths', e.target.value)} placeholder="data" className="font-mono" />
      </Field>
      <PersonParamField value={config.personParam} onChange={(v) => set('personParam', v)} read={config.read} />
      {rows.fields !== null && <p className="text-ui-xs text-ok">Row model resolved — {rows.fields.length} fields to pick from.</p>}

      <ProfileSessionFields config={config} set={set as unknown as ProfileSessionSetter} rows={rows} />

      <Heading>Control</Heading>
      <SegmentedControl
        aria-label="Display"
        options={[
          { value: 'list', label: 'List' },
          { value: 'dropdown', label: 'Dropdown' },
        ]}
        value={config.display}
        onChange={(v) => set('display', v as SwitchProfileDisplay)}
      />
      <p className="text-ui-xs text-ink-3">
        {config.display === 'dropdown'
          ? 'A select whose value is the profile id and label the job title — the shape of a profile menu.'
          : 'One row per profile (avatar, name, job title), the active one checked.'}
      </p>
      <Field label={config.display === 'dropdown' ? 'Label' : 'Title'}>
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} placeholder="Switch profile" />
      </Field>
      <Field label="Empty text">
        <Input value={config.emptyText} onChange={(e) => set('emptyText', e.target.value)} placeholder="No other profile." />
      </Field>
      <Toggle label="Show company · department" checked={config.showSubtitle} onChange={(v) => set('showSubtitle', v)} />
      <Toggle label="Hide with a single profile" checked={config.hideWhenSingle} onChange={(v) => set('hideWhenSingle', v)} />
    </div>
  )
}

const OP_OPTIONS: { value: DataCondition['op']; label: string }[] = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'does not equal' },
  { value: 'set', label: 'has a value' },
  { value: 'unset', label: 'has no value' },
]

/** Inspector for a Replace Profile trigger + dialog (see the grilled design). */
export function ReplaceProfileConfigPanel({ itemId, config }: { itemId: string; config: ReplaceProfileConfig }) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof ReplaceProfileConfig>(key: K, value: ReplaceProfileConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<ReplaceProfileConfig>)
  const scope = useRepeaterScope()
  const loads = usePageLoads()
  const rows = useProfileRowFields(config.read, config.readPaths)
  const patchTrigger = (patch: Partial<ReplaceProfileConfig['trigger']>) => set('trigger', { ...config.trigger, ...patch })
  const when = config.canReplace
  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">Replace profile</h3>

      <Heading>People search</Heading>
      <CrudRefEditor value={config.search} onChange={(search) => set('search', search)} allowRow={!!scope} extraLabel="Query fields" />
      {config.search.endpointId == null && <WiringHint>Pick the endpoint that searches people.</WiringHint>}
      <Field label="Rows path">
        <Input value={config.searchPaths} onChange={(e) => set('searchPaths', e.target.value)} placeholder="data" className="font-mono" />
      </Field>
      <div className="flex gap-1.5">
        <div className="flex-1">
          <Field label="Search query key" hint="Receives the typed text; the endpoint must declare it.">
            <Input value={config.searchParam} onChange={(e) => set('searchParam', e.target.value)} placeholder="search" className="font-mono" />
          </Field>
        </div>
        <div className="w-24">
          <Field label="Debounce (ms)">
            <Input
              type="number"
              value={config.debounceMs}
              onChange={(e) => set('debounceMs', e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="300"
            />
          </Field>
        </div>
      </div>

      <Heading>Profiles of the picked person</Heading>
      <CrudRefEditor value={config.read} onChange={(read) => set('read', read)} allowRow={!!scope} extraLabel="Query fields" />
      {config.read.endpointId == null && <WiringHint>Pick the endpoint listing a person's profiles — Confirm fetches it and takes the first one.</WiringHint>}
      <Field label="Rows path">
        <Input value={config.readPaths} onChange={(e) => set('readPaths', e.target.value)} placeholder="data" className="font-mono" />
      </Field>
      <PersonParamField value={config.personParam} onChange={(v) => set('personParam', v)} read={config.read} />
      {rows.fields !== null && <p className="text-ui-xs text-ok">Row model resolved — {rows.fields.length} fields to pick from.</p>}

      <ProfileSessionFields config={config} set={set as unknown as ProfileSessionSetter} rows={rows} />

      <Heading>Who may replace</Heading>
      <SegmentedControl
        aria-label="Who may replace"
        options={[
          { value: 'everyone', label: 'Everyone' },
          { value: 'when', label: 'When page data…' },
        ]}
        value={when ? 'when' : 'everyone'}
        onChange={(v) => set('canReplace', v === 'when' ? { loadId: loads[0]?.id ?? '', test: 'compare', path: '', op: 'eq', value: 'true' } : null)}
      />
      {when && (
        <>
          <LoadFieldPicker
            label="Allowed when"
            loadId={when.loadId}
            path={when.path}
            onChange={({ loadId, path }) => set('canReplace', { ...when, loadId, path })}
            mode="field"
          />
          <div className="flex gap-1.5">
            <div className="flex-1">
              <Select options={OP_OPTIONS} value={when.op} onChange={(v) => set('canReplace', { ...when, op: v as DataCondition['op'] })} aria-label="Operator" />
            </div>
            {when.op !== 'set' && when.op !== 'unset' && (
              <div className="flex-1">
                <Input value={when.value} onChange={(e) => set('canReplace', { ...when, value: e.target.value })} placeholder="true" aria-label="Value" />
              </div>
            )}
          </div>
          <p className="text-ui-xs text-ink-3">Read off the logged-in user's load, so it holds while impersonating someone who may not.</p>
        </>
      )}

      <Heading>Trigger button</Heading>
      <Field label="Label">
        <Input value={config.trigger.label} onChange={(e) => patchTrigger({ label: e.target.value })} />
      </Field>
      <Field label="Icon">
        <IconPicker value={config.trigger.icon} onChange={(v) => patchTrigger({ icon: v })} />
      </Field>
      <Field label="Variant">
        <SegmentedControl
          options={BUTTON_VARIANT_OPTIONS}
          value={config.trigger.variant}
          onChange={(v) => patchTrigger({ variant: v as ButtonVariant })}
          aria-label="Variant"
        />
      </Field>
      <Toggle label="Show the “Viewing as” banner" checked={config.showBanner} onChange={(v) => set('showBanner', v)} />

      <Heading>Dialog texts</Heading>
      <Field label="Title">
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} placeholder="Replace profile" />
      </Field>
      <Field label="Description">
        <Input value={config.description} onChange={(e) => set('description', e.target.value)} placeholder="The app will be read as the person you pick…" />
      </Field>
      <Field label="Search placeholder">
        <Input value={config.placeholder} onChange={(e) => set('placeholder', e.target.value)} placeholder="Search by name" />
      </Field>
      <div className="flex gap-1.5">
        <div className="flex-1">
          <Field label="Confirm">
            <Input value={config.confirmLabel} onChange={(e) => set('confirmLabel', e.target.value)} placeholder="Confirm" />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Cancel">
            <Input value={config.cancelLabel} onChange={(e) => set('cancelLabel', e.target.value)} placeholder="Cancel" />
          </Field>
        </div>
      </div>
      <Field label="Return label">
        <Input value={config.returnLabel} onChange={(e) => set('returnLabel', e.target.value)} placeholder="Return to my profile" />
      </Field>
      <Field label="No results">
        <Input value={config.emptyText} onChange={(e) => set('emptyText', e.target.value)} placeholder="No results" />
      </Field>
    </div>
  )
}
