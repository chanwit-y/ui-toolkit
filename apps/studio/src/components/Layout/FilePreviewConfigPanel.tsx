import { Blurhash, decodeBlurhash } from '@gummy-ui/ui'
import { useMemo, useRef, type ReactNode } from 'react'
import { Input, SegmentedControl, Select } from '../common'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import type { ModelField } from '../Model/types'
import { PathListField, type PathFields } from './ApprovalLineConfigPanel'
import { WiringHint } from './ButtonConfigPanel'
import { CrudRefEditor } from './FormListConfigPanel'
import { useGridStore } from './gridStore'
import { ItemBindingField } from './ItemBindingField'
import { useLoadShapes } from './pageData'
import { useRepeaterScope, type RepeaterScope } from './repeaterScope'
import { flattenModelFields, walkModelPath } from './rowFields'
import type { FilePreviewConfig, FilePreviewKeyConfig } from './types'

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

/** The engine's default paths in each label: an unset key uses them. */
const KEY_ROWS: { key: Exclude<keyof FilePreviewKeyConfig, 'blurhash'>; label: string }[] = [
  { key: 'name', label: 'File name (name, fileName, filename)' },
  { key: 'type', label: 'Mime type (type, mimeType, contentType)' },
  { key: 'size', label: 'Size in bytes (size)' },
  { key: 'url', label: 'URL (url, src)' },
  { key: 'data', label: 'Inline content (data)' },
]

/** The fields at `path`: an object's, or a list's records (a list previews its first file). */
function recordAt(fields: ModelField[], path: string, label: string): PathFields {
  if (!path) return { fields: flattenModelFields(fields) }
  const field = walkModelPath(fields, path)
  if (field?.kind === 'object' || (field?.kind === 'array' && field.arrayOf === 'object')) return { fields: flattenModelFields(field.children) }
  return { fields: null, reason: `“${path}” is not a record in ${label}.` }
}

/**
 * The file record's fields, per source: the endpoint's response walked along
 * `recordPath`, a page load or selection at the bound path, or the enclosing
 * repeater's item. A record here, where `bindingRowModel` wants a list.
 */
function useRecordFields(config: FilePreviewConfig, scope: RepeaterScope): PathFields {
  const endpoints = useProjectEndpoints()
  const models = useProjectModels()
  const shapes = useLoadShapes()
  return useMemo(() => {
    if (config.source === 'endpoint') {
      const endpoint = endpoints.find((e) => e.id === config.read.endpointId)
      const model = endpoint?.response == null ? undefined : models.find((m) => m.id === endpoint.response)
      if (!model) return { fields: null, reason: 'Pick the endpoint.' }
      return recordAt(model.fields, config.recordPath.trim(), model.name)
    }
    const binding = config.binding
    if (!binding) return { fields: null, reason: 'Bind the file to pick its fields.' }
    if (binding.source === 'state') {
      const shape = shapes.get(binding.key)
      if (!shape) return { fields: null, reason: 'That load was deleted.' }
      if (shape.shape === null) return { fields: null, reason: shape.reason }
      return recordAt(shape.fields, binding.path.trim(), binding.key)
    }
    if (!scope) return { fields: null, reason: 'Not inside a repeater — the item field resolves to nothing here.' }
    if (scope.itemModel.fields === null) return { fields: null, reason: scope.itemModel.reason }
    return recordAt(scope.itemModel.fields, [binding.key === 'none' ? '' : binding.key, binding.path].filter(Boolean).join('.'), 'the item')
  }, [config.source, config.binding, config.read.endpointId, config.recordPath, endpoints, models, shapes, scope])
}

/**
 * The content URL template: a text box and an "Insert field" select over the
 * record, dropping `{{field}}` at the cursor (the `ColumnHtmlField` pattern).
 */
function UrlTemplateField({ value, onChange, fields }: { value: string; onChange: (next: string) => void; fields: PathFields }) {
  const input = useRef<HTMLInputElement>(null)
  const insert = (name: string) => {
    if (!name) return
    const start = input.current?.selectionStart ?? value.length
    const end = input.current?.selectionEnd ?? value.length
    onChange(`${value.slice(0, start)}{{${name}}}${value.slice(end)}`)
  }
  const options = [
    { value: '', label: 'Insert field…' },
    ...(fields.fields ?? []).filter((f) => f.kind !== 'object' && f.kind !== 'array').map((f) => ({ value: f.name, label: `${f.name} · ${f.kind}` })),
  ]
  return (
    <div className="space-y-1">
      <Field
        label="Content URL"
        hint="For a record with only an id. Leave empty when the record carries a URL or the bytes. Each value is URL-encoded."
      >
        <Input ref={input} value={value} onChange={(e) => onChange(e.target.value)} placeholder="/api/files/{{id}}/content" className="font-mono" />
      </Field>
      {options.length > 1 && <Select aria-label="Insert field" options={options} value="" onChange={insert} />}
    </div>
  )
}

/**
 * Inspector for a file preview (see `docs/prompts/file-preview.md`). The file
 * comes from a binding — a literal URL, the repeater item or page data, where a
 * file collection's selection is listed like any other slice — or the preview's
 * own endpoint; once the source resolves to a model, each key is picked from
 * its fields. A browser-loaded URL carries no bearer token, so the hint says so.
 */
export function FilePreviewConfigPanel({ itemId, config }: { itemId: string; config: FilePreviewConfig }) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof FilePreviewConfig>(key: K, value: FilePreviewConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<FilePreviewConfig>)
  const scope = useRepeaterScope()
  const fields = useRecordFields(config, scope)
  const endpoint = config.source === 'endpoint'
  const statics = !endpoint && config.binding === null
  const showBlurhash = config.showBlurhash !== false
  const hash = config.blurhash?.trim() ?? ''

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">File preview</h3>
      <Field label="Name">
        <Input value={config.name} onChange={(e) => set('name', e.target.value)} className="font-mono" />
      </Field>

      <Heading>File</Heading>
      <SegmentedControl
        aria-label="File source"
        options={[
          { value: 'binding', label: 'Value' },
          { value: 'endpoint', label: 'Endpoint' },
        ]}
        value={config.source}
        onChange={(v) => set('source', v as FilePreviewConfig['source'])}
      />
      {endpoint ? (
        <>
          <CrudRefEditor value={config.read} onChange={(read) => set('read', read)} allowRow={!!scope} extraLabel="Query fields" />
          {config.read.endpointId == null && <WiringHint>Pick an endpoint — the preview fetches the file record itself.</WiringHint>}
          <Field label="Response record path" hint="Dot path to the file record in the response.">
            <Input value={config.recordPath} onChange={(e) => set('recordPath', e.target.value)} placeholder="data" className="font-mono" />
          </Field>
        </>
      ) : (
        <>
          <ItemBindingField label="File" binding={config.binding} onChange={(b) => set('binding', b)} scope={scope} />
          {statics && (
            <Field label="File URL" hint="Name the file in the URL's last segment: its extension picks how it is shown.">
              <Input value={config.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…/report.pdf" className="font-mono" />
            </Field>
          )}
          {statics && !config.url.trim() && <WiringHint>Bind the file, or type a URL. A file collection's selection is under Page data.</WiringHint>}
        </>
      )}
      <UrlTemplateField value={config.urlTemplate} onChange={(v) => set('urlTemplate', v)} fields={fields} />
      <p className="text-ui-xs text-ink-3">
        The browser loads a URL itself, without the app's bearer token: protected files need a cookie session, a signed URL or inline content.
      </p>

      <Heading>Record keys</Heading>
      <p className="text-ui-xs text-ink-3">
        Set a key only if the record doesn't use the names in brackets. A key tries its paths top to bottom. A type that isn't a mime type is
        ignored, and the file name's extension decides.
      </p>
      {KEY_ROWS.map(({ key, label }) => (
        <PathListField key={key} label={label} paths={config.keys[key]} onChange={(p) => set('keys', { ...config.keys, [key]: p })} fields={fields} />
      ))}

      <Heading>Image placeholder</Heading>
      <Toggle label="Show a blurhash while an image loads" checked={showBlurhash} onChange={(v) => set('showBlurhash', v)} />
      {showBlurhash && (
        <>
          <p className="text-ui-xs text-ink-3">
            A blurhash is a short text of a blurred image, drawn until the image arrives. It has to be computed from the image when it is stored, so
            it comes with the record. Other file kinds ignore it.
          </p>
          <PathListField
            label="Blurhash key (blurhash, blurHash)"
            paths={config.keys.blurhash ?? []}
            onChange={(p) => set('keys', { ...config.keys, blurhash: p })}
            fields={fields}
          />
          <Field label="Blurhash" hint="Used when the record has none, as with a literal URL.">
            <Input value={config.blurhash ?? ''} onChange={(e) => set('blurhash', e.target.value)} placeholder="LEHV6nWB2yk8pyo0adR*.7kCMdnj" className="font-mono" />
          </Field>
          {hash && (decodeBlurhash(hash) ? <Blurhash hash={hash} className="block h-16 w-full rounded-md" /> : <WiringHint>That isn't a valid blurhash.</WiringHint>)}
          <Field label="Delay (ms)" hint="Keep the blurhash on show at least this long, up to 10000, even if the image is ready sooner. Empty = until it loads.">
            <Input
              type="number"
              min={0}
              max={10000}
              step={100}
              value={config.blurhashDelay ?? ''}
              onChange={(e) => set('blurhashDelay', e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
            />
          </Field>
        </>
      )}

      <Heading>Look</Heading>
      <Field label="Height" hint="Any CSS length, or auto to let an image size itself.">
        <Input value={config.height} onChange={(e) => set('height', e.target.value)} placeholder="320px" className="font-mono" />
      </Field>
      <Toggle label="Show the header" checked={config.showHeader} onChange={(v) => set('showHeader', v)} />
      <Toggle label="Open the viewer on click" checked={config.openOnClick} onChange={(v) => set('openOnClick', v)} />
      <Field label="Empty text">
        <Input value={config.emptyText} onChange={(e) => set('emptyText', e.target.value)} placeholder="Select a file to preview" />
      </Field>
    </div>
  )
}
