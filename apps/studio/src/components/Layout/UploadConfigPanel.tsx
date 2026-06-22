import type { ReactNode } from 'react'
import { Input, Select, SegmentedControl } from '../common'
import { useGridStore } from './gridStore'
import type {
  UploadApiSettings,
  UploadFileConfig,
  UploadImageConfig,
  UploadValueFormat,
} from './types'

const VALUE_FORMAT_OPTIONS = [
  { value: 'dataUrl', label: 'dataUrl' },
  { value: 'base64', label: 'base64' },
  { value: 'bytes', label: 'bytes' },
  { value: 'api', label: 'api' },
]
const SHAPE_OPTIONS = [
  { value: 'square', label: 'Square' },
  { value: 'circle', label: 'Circle' },
]

/** One labelled row in the config form. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  )
}

/** Inline checkbox row for boolean config. */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500/30"
      />
    </label>
  )
}

/** Number input that maps `''` (cleared) ↔ unset, and a number otherwise. */
function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string
  value: number | ''
  min?: number
  onChange: (value: number | '') => void
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        min={min}
        value={value === '' ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
    </Field>
  )
}

/**
 * The `valueFormat` selector plus, in `'api'` mode, the upload endpoint wiring.
 * Both upload panels share it — the `api` block on the two configs is identical
 * (`UploadApiSettings`). `set('api', …)` merges so each field edits in isolation.
 */
function UploadValueFormatSection({
  valueFormat,
  api,
  onValueFormatChange,
  onApiChange,
}: {
  valueFormat: UploadValueFormat
  api: UploadApiSettings
  onValueFormatChange: (value: UploadValueFormat) => void
  onApiChange: (next: UploadApiSettings) => void
}) {
  const setApi = <K extends keyof UploadApiSettings>(key: K, value: UploadApiSettings[K]) =>
    onApiChange({ ...api, [key]: value })

  return (
    <>
      <Field label="Value format">
        <Select
          options={VALUE_FORMAT_OPTIONS}
          value={valueFormat}
          onChange={(v) => onValueFormatChange(v as UploadValueFormat)}
        />
      </Field>

      {valueFormat === 'api' && (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Upload API
          </h4>
          <Field label="Upload URL">
            <Input
              value={api.uploadUrl}
              onChange={(e) => setApi('uploadUrl', e.target.value)}
              className="font-mono"
              placeholder="/upload/single"
            />
          </Field>
          <Field label="Delete URL">
            <Input
              value={api.deleteUrl}
              onChange={(e) => setApi('deleteUrl', e.target.value)}
              className="font-mono"
              placeholder="/upload/:filename"
            />
          </Field>
          <Field label="Field name">
            <Input
              value={api.fieldName}
              onChange={(e) => setApi('fieldName', e.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="Response path">
            <Input
              value={api.responsePath}
              onChange={(e) => setApi('responsePath', e.target.value)}
              className="font-mono"
              placeholder="data.url"
            />
          </Field>
        </div>
      )}
    </>
  )
}

type UploadImageConfigPanelProps = {
  itemId: string
  config: UploadImageConfig
}

/**
 * Editor for an image upload. Every control writes through `updateItemConfig`,
 * driving both the live canvas preview and the exported JSON. `accept` defaults to
 * `image/*`; `maxSizeMB` is optional (cleared = unset). `valueFormat` reveals the
 * shared API section in `'api'` mode. The engine `dataType` is derived on export
 * (bytes→`any`, else `string`) so it isn't surfaced here.
 */
export function UploadImageConfigPanel({ itemId, config }: UploadImageConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof UploadImageConfig>(key: K, value: UploadImageConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<UploadImageConfig>)

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Upload Image
      </h3>

      <Field label="Name (binding key)">
        <Input
          value={config.name}
          onChange={(e) => set('name', e.target.value)}
          className="font-mono"
        />
      </Field>

      <Field label="Label">
        <Input value={config.label} onChange={(e) => set('label', e.target.value)} />
      </Field>

      <Field label="Helper text">
        <Input
          value={config.helperText}
          onChange={(e) => set('helperText', e.target.value)}
        />
      </Field>

      <Toggle
        label="Required"
        checked={config.isRequired}
        onChange={(v) => set('isRequired', v)}
      />

      <Field label="Error message">
        <Input
          value={config.errorMessage}
          onChange={(e) => set('errorMessage', e.target.value)}
        />
      </Field>

      <Field label="Accept">
        <Input
          value={config.accept}
          onChange={(e) => set('accept', e.target.value)}
          className="font-mono"
          placeholder="image/*"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Max size (MB)"
          value={config.maxSizeMB}
          min={0}
          onChange={(v) => set('maxSizeMB', v)}
        />
        <Field label="Preview height (px)">
          <Input
            type="number"
            min={40}
            value={config.previewHeight}
            onChange={(e) => set('previewHeight', Math.max(40, Number(e.target.value) || 40))}
          />
        </Field>
      </div>

      <Field label="Shape">
        <SegmentedControl
          options={SHAPE_OPTIONS}
          value={config.shape}
          onChange={(v) => set('shape', v as UploadImageConfig['shape'])}
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-1"
          aria-label="Shape"
        />
      </Field>

      <UploadValueFormatSection
        valueFormat={config.valueFormat}
        api={config.api}
        onValueFormatChange={(v) => set('valueFormat', v)}
        onApiChange={(next) => set('api', next)}
      />
    </div>
  )
}

type UploadFileConfigPanelProps = {
  itemId: string
  config: UploadFileConfig
}

/**
 * Editor for a file upload. `multiple` enables multi-file selection and reveals
 * the `maxFiles` cap (single mode has no cap to set). `accept` is a comma list of
 * extensions/mime types. `valueFormat` reveals the shared API section in `'api'`
 * mode. The engine `dataType` is fixed `any` on export (a file upload stores an
 * array), so it isn't surfaced here.
 */
export function UploadFileConfigPanel({ itemId, config }: UploadFileConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof UploadFileConfig>(key: K, value: UploadFileConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<UploadFileConfig>)

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Upload File
      </h3>

      <Field label="Name (binding key)">
        <Input
          value={config.name}
          onChange={(e) => set('name', e.target.value)}
          className="font-mono"
        />
      </Field>

      <Field label="Label">
        <Input value={config.label} onChange={(e) => set('label', e.target.value)} />
      </Field>

      <Field label="Helper text">
        <Input
          value={config.helperText}
          onChange={(e) => set('helperText', e.target.value)}
        />
      </Field>

      <Toggle
        label="Required"
        checked={config.isRequired}
        onChange={(v) => set('isRequired', v)}
      />

      <Field label="Error message">
        <Input
          value={config.errorMessage}
          onChange={(e) => set('errorMessage', e.target.value)}
        />
      </Field>

      <Field label="Accept">
        <Input
          value={config.accept}
          onChange={(e) => set('accept', e.target.value)}
          className="font-mono"
          placeholder=".pdf,.docx"
        />
      </Field>

      <Toggle
        label="Allow multiple"
        checked={config.multiple}
        onChange={(v) => set('multiple', v)}
      />

      <div className="grid grid-cols-2 gap-2">
        {config.multiple && (
          <NumberField
            label="Max files"
            value={config.maxFiles}
            min={1}
            onChange={(v) => set('maxFiles', v)}
          />
        )}
        <NumberField
          label="Max size (MB)"
          value={config.maxSizeMB}
          min={0}
          onChange={(v) => set('maxSizeMB', v)}
        />
      </div>

      <UploadValueFormatSection
        valueFormat={config.valueFormat}
        api={config.api}
        onValueFormatChange={(v) => set('valueFormat', v)}
        onApiChange={(next) => set('api', next)}
      />
    </div>
  )
}
