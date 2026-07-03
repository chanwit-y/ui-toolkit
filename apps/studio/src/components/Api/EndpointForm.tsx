import { AlertTriangle } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Input, SegmentedControl, Select } from '../common'
import { useModelStore } from '../Model/modelStore'
import { useApiStore } from './apiStore'
import {
  HTTP_METHODS,
  MODEL_REF_KEYS,
  type EndpointDef,
  type HttpMethod,
  type ModelRefKey,
} from './types'
import { endpointWarnings, type EndpointWarning, type WarningField } from './warnings'
import { TestRunSection } from './TestRunSection'

const METHOD_OPTIONS = HTTP_METHODS.map((m) => ({ value: m, label: m }))

const REF_LABELS: Record<ModelRefKey, string> = {
  response: 'Response',
  query: 'Query',
  parameter: 'Parameter',
  body: 'Body',
}

/** One labelled row in the endpoint form. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  )
}

/** The amber warning lines belonging to one form field. */
function Warnings({ warnings }: { warnings: EndpointWarning[] }) {
  if (warnings.length === 0) return null
  return (
    <div className="space-y-0.5">
      {warnings.map((w) => (
        <p key={w.message} className="flex items-start gap-1 text-xs text-amber-600">
          <AlertTriangle size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
          {w.message}
        </p>
      ))}
    </div>
  )
}

/**
 * Center pane: the selected endpoint's `TApiMaster` entry fields. Model refs
 * are dropdowns over the Model page's store (stored by id — see ./types); all
 * checks render as non-blocking warnings next to the field they concern.
 */
export function EndpointForm({ endpoint }: { endpoint: EndpointDef }) {
  const endpoints = useApiStore((s) => s.endpoints)
  const updateEndpoint = useApiStore((s) => s.updateEndpoint)
  const models = useModelStore((s) => s.models)

  const warnings = useMemo(
    () => endpointWarnings(endpoint, endpoints, models),
    [endpoint, endpoints, models],
  )
  const warningsFor = (field: WarningField) => warnings.filter((w) => w.field === field)

  const refOptions = (key: ModelRefKey) => {
    const options = [
      { value: '', label: '(none)' },
      ...models.map((m) => ({ value: m.id, label: m.name.trim() || '(unnamed)' })),
    ]
    // A dangling ref (model deleted) still needs a visible <option> to keep the
    // select controlled; the warning below the field explains it.
    const id = endpoint[key]
    if (id != null && !models.some((m) => m.id === id)) {
      options.push({ value: id, label: '(missing model)' })
    }
    return options
  }

  return (
    <div className="max-w-xl space-y-4">
      <Warnings warnings={warningsFor('name')} />

      <Field label="Description">
        <Input
          value={endpoint.description}
          onChange={(e) => updateEndpoint(endpoint.id, { description: e.target.value })}
          placeholder="What this endpoint does"
        />
      </Field>

      <Field label="URL">
        <Input
          value={endpoint.url}
          onChange={(e) => updateEndpoint(endpoint.id, { url: e.target.value })}
          placeholder="/collection/detail/:id"
          className="font-mono"
        />
      </Field>
      <Warnings warnings={warningsFor('url')} />

      <div className="space-y-1">
        <span className="text-xs font-medium text-zinc-600">Method</span>
        <SegmentedControl
          variant="chips"
          aria-label="HTTP method"
          options={METHOD_OPTIONS}
          value={endpoint.method}
          onChange={(value) => updateEndpoint(endpoint.id, { method: value as HttpMethod })}
        />
      </div>

      <div className="space-y-3 rounded-md border border-zinc-200 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Model references
        </h3>
        {MODEL_REF_KEYS.map((key) => (
          <div key={key} className="space-y-1">
            <Field label={REF_LABELS[key]}>
              <Select
                options={refOptions(key)}
                value={endpoint[key] ?? ''}
                onChange={(value) => updateEndpoint(endpoint.id, { [key]: value || null })}
              />
            </Field>
            <Warnings warnings={warningsFor(key)} />
          </div>
        ))}
      </div>

      {endpoint.method === 'GET' && (
        <label className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-600">
            withOptions (caller exposes React Query options via .use)
          </span>
          <input
            type="checkbox"
            checked={endpoint.withOptions}
            onChange={(e) => updateEndpoint(endpoint.id, { withOptions: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500/30"
          />
        </label>
      )}

      <TestRunSection endpoint={endpoint} />
    </div>
  )
}
