import type { ReactNode } from 'react'
import { ACCEPT_PRESETS, resolveAccept } from '@gummy-ui/ui'
import { Input, Select, SegmentedControl, cn } from '../common'
import { useGridStore } from './gridStore'
import { uploadAccept } from './types'
import type {
  UploadAcceptPreset,
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

const MODE_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'multiple', label: 'Multiple' },
]
const PREVIEW_LAYOUT_OPTIONS = [
  { value: 'list', label: 'List' },
  { value: 'grid', label: 'Grid' },
]
const ACCEPT_PRESET_KEYS = Object.keys(ACCEPT_PRESETS) as UploadAcceptPreset[]

/** One labelled row in the config form. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
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
        <div className="space-y-3 rounded-lg border border-line bg-panel p-3">
          <h4 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">
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
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">
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
 * Editor for a file upload. Mode writes `multiple`; Multiple reveals the
 * `maxFiles` cap (single mode has no cap to set). Accepted types are preset chips
 * (`acceptPresets`) plus a comma list of extra extensions/mime types (`accept`),
 * exported together as the engine's `accept` array. Preview toggles the
 * thumbnails + viewer and reveals its list/grid layout. `valueFormat` reveals the shared API section in `'api'`
 * mode. The engine `dataType` is fixed `any` on export (a file upload stores an
 * array), so it isn't surfaced here.
 */
export function UploadFileConfigPanel({ itemId, config }: UploadFileConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof UploadFileConfig>(key: K, value: UploadFileConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<UploadFileConfig>)
  const accepted = resolveAccept(uploadAccept(config)).filter((t) => t.startsWith('.'))

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">
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

      <Field label="Mode">
        <SegmentedControl
          options={MODE_OPTIONS}
          value={config.multiple ? 'multiple' : 'single'}
          onChange={(v) => set('multiple', v === 'multiple')}
          aria-label="Mode"
        />
      </Field>

      <div className="space-y-1">
        <span className="text-ui-sm font-medium text-ink-2">Accepted types</span>
        <div className="flex flex-wrap gap-1">
          {ACCEPT_PRESET_KEYS.map((preset) => {
            const on = config.acceptPresets.includes(preset)
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  set(
                    'acceptPresets',
                    // Kept in catalog order so the export doesn't depend on click order.
                    ACCEPT_PRESET_KEYS.filter((p) => (p === preset ? !on : config.acceptPresets.includes(p))),
                  )
                }
                className={cn('tag cursor-pointer', on && 'tag-solid')}
              >
                {ACCEPT_PRESETS[preset].label}
              </button>
            )
          })}
        </div>
      </div>

      <Field label="Extra types">
        <Input
          value={config.accept}
          onChange={(e) => set('accept', e.target.value)}
          className="font-mono"
          placeholder=".dwg,.psd"
        />
      </Field>

      <p className="text-ui-xs text-ink-3 break-words">
        {accepted.length > 0 ? `Accepts ${accepted.join(' ')}` : 'Accepts every file type'}
      </p>

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

      <Toggle
        label="Preview (thumbnails + viewer)"
        checked={config.preview}
        onChange={(v) => set('preview', v)}
      />

      {config.preview && (
        <Field label="Preview layout">
          <SegmentedControl
            options={PREVIEW_LAYOUT_OPTIONS}
            value={config.previewLayout}
            onChange={(v) => set('previewLayout', v as UploadFileConfig['previewLayout'])}
            aria-label="Preview layout"
          />
        </Field>
      )}

      <UploadValueFormatSection
        valueFormat={config.valueFormat}
        api={config.api}
        onValueFormatChange={(v) => set('valueFormat', v)}
        onApiChange={(next) => set('api', next)}
      />
    </div>
  )
}
