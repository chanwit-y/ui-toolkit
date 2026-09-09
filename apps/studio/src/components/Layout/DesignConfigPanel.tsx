import type { ReactNode } from 'react'
import { Input, Select } from '../common'
import {
  CHART_SHAPES,
  MEDIA_RATIOS,
  type AlertConfig,
  type BannerConfig,
  type ChartConfig,
  type DesignConfig,
  type GalleryConfig,
  type HeroConfig,
  type ImageConfig,
  type LinkCardConfig,
  type MediaRatio,
  type OrgChartConfig,
  type PeopleConfig,
  type ProgressConfig,
  type QuickLinksConfig,
  type SpacerConfig,
  type StatConfig,
  type VideoConfig,
} from './designTypes'
import { useGridStore } from './gridStore'
import { EndpointPicker } from './SelectFieldConfigPanel'
import type { GridItemData } from './types'

/** One labelled row in the config form. */
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="block text-ui-xs leading-snug text-ink-3">{hint}</span>}
    </label>
  )
}

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

function Heading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">{children}</h3>
  )
}

/** The "design only" notice every panel here opens with. */
function DesignOnlyNote() {
  return (
    <p className="rounded-md border border-dashed border-line-strong bg-panel px-2.5 py-2 text-ui-xs leading-snug text-ink-3">
      Design only — not in @gummy-ui/ui yet. It renders on the canvas and exports into
      project.json; the Live Preview shows a placeholder in its place.
    </p>
  )
}

const RATIO_OPTIONS = MEDIA_RATIOS.map((r) => ({ value: r, label: r }))
const FIT_OPTIONS = [
  { value: 'cover', label: 'cover' },
  { value: 'contain', label: 'contain' },
]
const ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
]
const SHAPE_OPTIONS = CHART_SHAPES.map((s) => ({ value: s, label: s }))
const MODE_OPTIONS = [
  { value: 'Count', label: 'Count rows' },
  { value: 'Sum', label: 'Sum a field' },
]

function useSetter<C extends DesignConfig>(itemId: string) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  return <K extends keyof C>(key: K, value: C[K]) =>
    updateItemConfig(itemId, { [key]: value } as unknown as Partial<C>)
}

function toInt(value: string, fallback: number): number {
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? fallback : n
}

function HeroPanel({ itemId, config }: { itemId: string; config: HeroConfig }) {
  const set = useSetter<HeroConfig>(itemId)
  return (
    <>
      <Field label="Title">
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Subtitle">
        <Input value={config.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
      </Field>
      <Field label="Call to action" hint="Leave empty to hide the button.">
        <Input value={config.cta} onChange={(e) => set('cta', e.target.value)} />
      </Field>
      <Field label="Background image URL">
        <Input
          value={config.bgImage}
          onChange={(e) => set('bgImage', e.target.value)}
          placeholder="https://…"
          className="font-mono"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Alignment">
          <Select
            options={ALIGN_OPTIONS}
            value={config.align}
            onChange={(v) => set('align', v as HeroConfig['align'])}
          />
        </Field>
        <Field label="Min height (px)">
          <Input
            type="number"
            value={config.height}
            onChange={(e) => set('height', toInt(e.target.value, 200))}
          />
        </Field>
      </div>
      <Field label="Image overlay (%)" hint="Darkens the image so the text stays readable.">
        <Input
          type="number"
          min={0}
          max={100}
          value={config.overlay}
          onChange={(e) => set('overlay', Math.max(0, Math.min(100, toInt(e.target.value, 0))))}
        />
      </Field>
    </>
  )
}

function ImagePanel({ itemId, config }: { itemId: string; config: ImageConfig }) {
  const set = useSetter<ImageConfig>(itemId)
  return (
    <>
      <Field label="Image URL">
        <Input
          value={config.url}
          onChange={(e) => set('url', e.target.value)}
          placeholder="https://…"
          className="font-mono"
        />
      </Field>
      <Field label="Alt text">
        <Input value={config.alt} onChange={(e) => set('alt', e.target.value)} />
      </Field>
      <Field label="Caption">
        <Input value={config.caption} onChange={(e) => set('caption', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Aspect ratio">
          <Select
            options={RATIO_OPTIONS}
            value={config.ratio}
            onChange={(v) => set('ratio', v as MediaRatio)}
          />
        </Field>
        <Field label="Image fit">
          <Select
            options={FIT_OPTIONS}
            value={config.fit}
            onChange={(v) => set('fit', v as ImageConfig['fit'])}
          />
        </Field>
      </div>
    </>
  )
}

function GalleryPanel({ itemId, config }: { itemId: string; config: GalleryConfig }) {
  const set = useSetter<GalleryConfig>(itemId)
  return (
    <>
      <Field label="Images (one URL per line)">
        <textarea
          value={config.images}
          onChange={(e) => set('images', e.target.value)}
          rows={4}
          className="field field-area font-mono"
        />
      </Field>
      <Field label="Caption">
        <Input value={config.caption} onChange={(e) => set('caption', e.target.value)} />
      </Field>
      <Field label="Aspect ratio">
        <Select
          options={RATIO_OPTIONS}
          value={config.ratio}
          onChange={(v) => set('ratio', v as MediaRatio)}
        />
      </Field>
      <Toggle label="Thumbnail strip" checked={config.thumbs} onChange={(v) => set('thumbs', v)} />
    </>
  )
}

function VideoPanel({ itemId, config }: { itemId: string; config: VideoConfig }) {
  const set = useSetter<VideoConfig>(itemId)
  return (
    <>
      <Field label="Video URL" hint="A YouTube link or a direct media file.">
        <Input
          value={config.url}
          onChange={(e) => set('url', e.target.value)}
          placeholder="https://…"
          className="font-mono"
        />
      </Field>
      <Field label="Caption">
        <Input value={config.caption} onChange={(e) => set('caption', e.target.value)} />
      </Field>
      <Field label="Aspect ratio">
        <Select
          options={RATIO_OPTIONS}
          value={config.ratio}
          onChange={(v) => set('ratio', v as MediaRatio)}
        />
      </Field>
    </>
  )
}

function LinkCardPanel({ itemId, config }: { itemId: string; config: LinkCardConfig }) {
  const set = useSetter<LinkCardConfig>(itemId)
  return (
    <>
      <Field label="Title">
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="URL">
        <Input
          value={config.url}
          onChange={(e) => set('url', e.target.value)}
          className="font-mono"
        />
      </Field>
      <Field label="Description">
        <Input
          value={config.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>
      <Toggle label="Open in a new tab" checked={config.newTab} onChange={(v) => set('newTab', v)} />
    </>
  )
}

function QuickLinksPanel({ itemId, config }: { itemId: string; config: QuickLinksConfig }) {
  const set = useSetter<QuickLinksConfig>(itemId)
  return (
    <>
      <Field label="Title">
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Links (Label | URL)">
        <textarea
          value={config.items}
          onChange={(e) => set('items', e.target.value)}
          rows={5}
          className="field field-area font-mono"
        />
      </Field>
    </>
  )
}

function SpacerPanel({ itemId, config }: { itemId: string; config: SpacerConfig }) {
  const set = useSetter<SpacerConfig>(itemId)
  return (
    <Field label="Height (px)">
      <Input
        type="number"
        min={4}
        value={config.height}
        onChange={(e) => set('height', Math.max(4, toInt(e.target.value, 24)))}
      />
    </Field>
  )
}

function ChartPanel({ itemId, config }: { itemId: string; config: ChartConfig }) {
  const set = useSetter<ChartConfig>(itemId)
  const shapes =
    config.kind === 'bar'
      ? SHAPE_OPTIONS.filter((o) => o.value === 'Column' || o.value === 'Bar')
      : config.kind === 'line'
        ? SHAPE_OPTIONS.filter((o) => o.value === 'Line' || o.value === 'Area')
        : SHAPE_OPTIONS.filter((o) => o.value === 'Pie' || o.value === 'Donut')
  return (
    <>
      <Field label="Title">
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Chart type">
        <Select
          options={shapes}
          value={config.chartType}
          onChange={(v) => set('chartType', v as ChartConfig['chartType'])}
        />
      </Field>
      <Field label="Data endpoint (API page)">
        <EndpointPicker value={config.endpointId} onChange={(id) => set('endpointId', id)} />
      </Field>
      {config.endpointId != null && (
        <>
          <Field label="Aggregate">
            <Select
              options={MODE_OPTIONS}
              value={config.mode}
              onChange={(v) => set('mode', v as ChartConfig['mode'])}
            />
          </Field>
          <Field label="Group by field">
            <Input
              value={config.labelField}
              onChange={(e) => set('labelField', e.target.value)}
              className="font-mono"
            />
          </Field>
          {config.mode === 'Sum' && (
            <Field label="Value field">
              <Input
                value={config.valueField}
                onChange={(e) => set('valueField', e.target.value)}
                className="font-mono"
              />
            </Field>
          )}
        </>
      )}
      <Field label="Sample labels" hint="Only used before an API is bound.">
        <Input value={config.sample} onChange={(e) => set('sample', e.target.value)} />
      </Field>
      <Field label="Palette" hint="Comma separated. Leave blank to shade the accent.">
        <Input
          value={config.palette}
          onChange={(e) => set('palette', e.target.value)}
          placeholder="#1f6feb, #7c3aed, #0b6b3a"
          className="font-mono"
        />
      </Field>
    </>
  )
}

function PeoplePanel({ itemId, config }: { itemId: string; config: PeopleConfig }) {
  const set = useSetter<PeopleConfig>(itemId)
  return (
    <>
      <Field label="Title">
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Data endpoint (API page)">
        <EndpointPicker value={config.endpointId} onChange={(id) => set('endpointId', id)} />
      </Field>
      {config.endpointId != null ? (
        <div className="grid grid-cols-1 gap-2">
          <Field label="Name field">
            <Input
              value={config.nameField}
              onChange={(e) => set('nameField', e.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="Role field">
            <Input
              value={config.roleField}
              onChange={(e) => set('roleField', e.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="Avatar field">
            <Input
              value={config.avatarField}
              onChange={(e) => set('avatarField', e.target.value)}
              className="font-mono"
            />
          </Field>
        </div>
      ) : (
        <Field label="People (Name | Role)" hint="Shown until an API is bound.">
          <textarea
            value={config.items}
            onChange={(e) => set('items', e.target.value)}
            rows={5}
            className="field field-area font-mono"
          />
        </Field>
      )}
    </>
  )
}

function OrgChartPanel({ itemId, config }: { itemId: string; config: OrgChartConfig }) {
  const set = useSetter<OrgChartConfig>(itemId)
  return (
    <>
      <Field label="Title">
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="People" hint="Name | Role per line; prefix a line with - for a direct report.">
        <textarea
          value={config.items}
          onChange={(e) => set('items', e.target.value)}
          rows={6}
          className="field field-area font-mono"
        />
      </Field>
    </>
  )
}

function StatPanel({ itemId, config }: { itemId: string; config: StatConfig }) {
  const set = useSetter<StatConfig>(itemId)
  return (
    <>
      <Field label="Label">
        <Input value={config.label} onChange={(e) => set('label', e.target.value)} />
      </Field>
      <Field label="Value" hint="Shown until an API is bound; then the row count.">
        <Input value={config.value} onChange={(e) => set('value', e.target.value)} />
      </Field>
      <Field label="Data endpoint (API page)">
        <EndpointPicker value={config.endpointId} onChange={(id) => set('endpointId', id)} />
      </Field>
    </>
  )
}

function AlertPanel({ itemId, config }: { itemId: string; config: AlertConfig }) {
  const set = useSetter<AlertConfig>(itemId)
  return (
    <>
      <Field label="Title">
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Body">
        <textarea
          value={config.body}
          onChange={(e) => set('body', e.target.value)}
          rows={3}
          className="field field-area"
        />
      </Field>
      <Field label="Action label" hint="Leave empty to hide it.">
        <Input value={config.action} onChange={(e) => set('action', e.target.value)} />
      </Field>
    </>
  )
}

function BannerPanel({ itemId, config }: { itemId: string; config: BannerConfig }) {
  const set = useSetter<BannerConfig>(itemId)
  return (
    <>
      <Field label="Text">
        <Input value={config.text} onChange={(e) => set('text', e.target.value)} />
      </Field>
      <Field label="Action label" hint="Leave empty to hide it.">
        <Input value={config.action} onChange={(e) => set('action', e.target.value)} />
      </Field>
    </>
  )
}

function ProgressPanel({ itemId, config }: { itemId: string; config: ProgressConfig }) {
  const set = useSetter<ProgressConfig>(itemId)
  return (
    <>
      <Field label="Label">
        <Input value={config.label} onChange={(e) => set('label', e.target.value)} />
      </Field>
      <Field label="Value (%)">
        <Input
          type="number"
          min={0}
          max={100}
          value={config.value}
          onChange={(e) => set('value', Math.max(0, Math.min(100, toInt(e.target.value, 0))))}
        />
      </Field>
    </>
  )
}

/** Inspector Props for a design-only item, or null for other types. */
export function DesignConfigPanel({ item }: { item: GridItemData }) {
  const c = item.config
  if (!c) return null
  let body: ReactNode = null
  let heading = ''
  switch (item.type) {
    case 'hero':
      heading = 'Hero'
      body = <HeroPanel itemId={item.id} config={c as HeroConfig} />
      break
    case 'image':
      heading = 'Image'
      body = <ImagePanel itemId={item.id} config={c as ImageConfig} />
      break
    case 'gallery':
      heading = 'Image gallery'
      body = <GalleryPanel itemId={item.id} config={c as GalleryConfig} />
      break
    case 'video':
      heading = 'Video'
      body = <VideoPanel itemId={item.id} config={c as VideoConfig} />
      break
    case 'linkcard':
      heading = 'Link'
      body = <LinkCardPanel itemId={item.id} config={c as LinkCardConfig} />
      break
    case 'quicklinks':
      heading = 'Quick links'
      body = <QuickLinksPanel itemId={item.id} config={c as QuickLinksConfig} />
      break
    case 'spacer':
      heading = 'Spacer'
      body = <SpacerPanel itemId={item.id} config={c as SpacerConfig} />
      break
    case 'barchart':
      heading = 'Bar chart'
      body = <ChartPanel itemId={item.id} config={c as ChartConfig} />
      break
    case 'linechart':
      heading = 'Line chart'
      body = <ChartPanel itemId={item.id} config={c as ChartConfig} />
      break
    case 'piechart':
      heading = 'Pie / donut'
      body = <ChartPanel itemId={item.id} config={c as ChartConfig} />
      break
    case 'people':
      heading = 'People'
      body = <PeoplePanel itemId={item.id} config={c as PeopleConfig} />
      break
    case 'orgchart':
      heading = 'Org chart'
      body = <OrgChartPanel itemId={item.id} config={c as OrgChartConfig} />
      break
    case 'stat':
      heading = 'Stat'
      body = <StatPanel itemId={item.id} config={c as StatConfig} />
      break
    case 'alert':
      heading = 'Alert'
      body = <AlertPanel itemId={item.id} config={c as AlertConfig} />
      break
    case 'banner':
      heading = 'Banner'
      body = <BannerPanel itemId={item.id} config={c as BannerConfig} />
      break
    case 'progress':
      heading = 'Progress'
      body = <ProgressPanel itemId={item.id} config={c as ProgressConfig} />
      break
    default:
      return null
  }
  return (
    <div className="space-y-3">
      <Heading>{heading}</Heading>
      <DesignOnlyNote />
      {body}
    </div>
  )
}
