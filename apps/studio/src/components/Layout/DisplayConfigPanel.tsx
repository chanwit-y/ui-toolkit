import type { ReactNode } from 'react'
import { Input, Select, SegmentedControl } from '../common'
import { useGridStore } from './gridStore'
import type {
  AvatarConfig,
  DividerConfig,
  HiddenConfig,
  TextConfig,
  TypographyConfig,
} from './types'

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

/** The panel's section heading, shared across the display panels. */
function Heading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
      {children}
    </h3>
  )
}

/**
 * Editor for a text's config. Two knobs — the content and the label-styling
 * flag — matching the engine's `TextElement` exactly.
 */
export function TextConfigPanel({ itemId, config }: { itemId: string; config: TextConfig }) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof TextConfig>(key: K, value: TextConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<TextConfig>)

  return (
    <div className="space-y-3">
      <Heading>Text</Heading>
      <Field label="Text">
        <Input value={config.text} onChange={(e) => set('text', e.target.value)} />
      </Field>
      <Toggle
        label="Label styling"
        checked={config.isLabel}
        onChange={(v) => set('isLabel', v)}
      />
    </div>
  )
}

const TYPOGRAPHY_VARIANTS: TypographyConfig['variant'][] = [
  'display1',
  'display2',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'subtitle1',
  'subtitle2',
  'body1',
  'body2',
  'caption',
  'overline',
  'button',
]
const VARIANT_OPTIONS = TYPOGRAPHY_VARIANTS.map((v) => ({ value: v, label: v }))
const WEIGHT_OPTIONS = [
  { value: '', label: '— variant default —' },
  ...['light', 'regular', 'medium', 'bold'].map((v) => ({ value: v, label: v })),
]
// The Radix color scale Typography accepts; '' = the variant/theme default.
const COLOR_OPTIONS = [
  { value: '', label: '— default —' },
  ...[
    'gray', 'gold', 'bronze', 'brown', 'yellow', 'amber', 'orange', 'tomato',
    'red', 'ruby', 'crimson', 'pink', 'plum', 'purple', 'violet', 'iris',
    'indigo', 'blue', 'cyan', 'teal', 'jade', 'green', 'grass', 'lime',
    'mint', 'sky',
  ].map((v) => ({ value: v, label: v })),
]
const ALIGN_OPTIONS = [
  { value: '', label: '—' },
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
]

/**
 * Editor for a typography's config — the curated `TypographyElement` slice
 * (see the grilled design): text, variant, and the visual overrides
 * (weight/color/align/truncate) plus `href`. `''` selections mean "variant
 * default" and are dropped on export.
 */
export function TypographyConfigPanel({
  itemId,
  config,
}: {
  itemId: string
  config: TypographyConfig
}) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof TypographyConfig>(key: K, value: TypographyConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<TypographyConfig>)

  return (
    <div className="space-y-3">
      <Heading>Typography</Heading>
      <Field label="Text">
        <Input value={config.text} onChange={(e) => set('text', e.target.value)} />
      </Field>
      <Field label="Variant">
        <Select
          options={VARIANT_OPTIONS}
          value={config.variant}
          onChange={(v) => set('variant', v as TypographyConfig['variant'])}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Weight">
          <Select
            options={WEIGHT_OPTIONS}
            value={config.weight}
            onChange={(v) => set('weight', v as TypographyConfig['weight'])}
          />
        </Field>
        <Field label="Color">
          <Select
            options={COLOR_OPTIONS}
            value={config.color}
            onChange={(v) => set('color', v)}
          />
        </Field>
      </div>
      <Field label="Align">
        <Select
          options={ALIGN_OPTIONS}
          value={config.align}
          onChange={(v) => set('align', v as TypographyConfig['align'])}
        />
      </Field>
      <Toggle
        label="Truncate"
        checked={config.truncate}
        onChange={(v) => set('truncate', v)}
      />
      <Field label="Link (href)">
        <Input
          value={config.href}
          onChange={(e) => set('href', e.target.value)}
          placeholder="https://…"
        />
      </Field>
    </div>
  )
}

const AVATAR_SIZE_OPTIONS = ['xs', 'sm', 'md', 'lg', 'xl'].map((v) => ({
  value: v,
  label: v,
}))

/**
 * Editor for an avatar's config. An empty `src` shows the `fallback` (or the
 * first letter of `alt`) at runtime and in the preview alike, so no field here
 * is required. `name` is the engine element's optional binding key.
 */
export function AvatarConfigPanel({
  itemId,
  config,
}: {
  itemId: string
  config: AvatarConfig
}) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<AvatarConfig>)

  return (
    <div className="space-y-3">
      <Heading>Avatar</Heading>
      <Field label="Name (binding key)">
        <Input
          value={config.name}
          onChange={(e) => set('name', e.target.value)}
          className="font-mono"
        />
      </Field>
      <Field label="Image URL">
        <Input
          value={config.src}
          onChange={(e) => set('src', e.target.value)}
          placeholder="https://…"
        />
      </Field>
      <Field label="Alt text">
        <Input value={config.alt} onChange={(e) => set('alt', e.target.value)} />
      </Field>
      <Field label="Fallback (initials)">
        <Input
          value={config.fallback}
          onChange={(e) => set('fallback', e.target.value)}
        />
      </Field>
      <Field label="Size">
        <SegmentedControl
          options={AVATAR_SIZE_OPTIONS}
          value={config.size}
          onChange={(v) => set('size', v as AvatarConfig['size'])}
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-1"
          aria-label="Avatar size"
        />
      </Field>
    </div>
  )
}

const DIVIDER_VARIANT_OPTIONS = [
  { value: 'fullWidth', label: 'Full width' },
  { value: 'inset', label: 'Inset' },
  { value: 'middle', label: 'Middle' },
]

/**
 * Editor for a divider's config: the MUI-style inset variant and the vertical
 * spacing in px (empty = the component's 8px default).
 */
export function DividerConfigPanel({
  itemId,
  config,
}: {
  itemId: string
  config: DividerConfig
}) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof DividerConfig>(key: K, value: DividerConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<DividerConfig>)

  return (
    <div className="space-y-3">
      <Heading>Divider</Heading>
      <Field label="Variant">
        <SegmentedControl
          options={DIVIDER_VARIANT_OPTIONS}
          value={config.variant}
          onChange={(v) => set('variant', v as DividerConfig['variant'])}
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-1"
          aria-label="Divider variant"
        />
      </Field>
      <Field label="Spacing (px)">
        <Input
          type="number"
          min={0}
          value={config.spacing === '' ? '' : String(config.spacing)}
          onChange={(e) =>
            set('spacing', e.target.value === '' ? '' : Number(e.target.value))
          }
          placeholder="8 (default)"
        />
      </Field>
    </div>
  )
}

const HIDDEN_DATATYPE_OPTIONS = ['string', 'number', 'boolean', 'any'].map((v) => ({
  value: v,
  label: v,
}))

/**
 * Editor for a hidden field: just the form binding (`name` + engine `dataType`).
 * A hidden renders nothing at runtime, so the canvas keeps its chip at every
 * width — this panel is the whole authoring surface.
 */
export function HiddenConfigPanel({
  itemId,
  config,
}: {
  itemId: string
  config: HiddenConfig
}) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof HiddenConfig>(key: K, value: HiddenConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<HiddenConfig>)

  return (
    <div className="space-y-3">
      <Heading>Hidden</Heading>
      <p className="text-xs text-zinc-500">
        Carries form state without rendering anything. Only the binding is
        configurable.
      </p>
      <Field label="Name (binding key)">
        <Input
          value={config.name}
          onChange={(e) => set('name', e.target.value)}
          className="font-mono"
        />
      </Field>
      <Field label="Data type">
        <Select
          options={HIDDEN_DATATYPE_OPTIONS}
          value={config.dataType}
          onChange={(v) => set('dataType', v as HiddenConfig['dataType'])}
        />
      </Field>
    </div>
  )
}
