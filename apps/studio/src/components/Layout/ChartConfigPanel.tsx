import { useMemo, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { IconData, LOW_CONTRAST_HUES } from '@gummy-ui/ui'
import { useProjectEndpoints, useProjectModels } from '../Library/scope'
import { ColorField } from '../Theme/ThemeEditor'
import { FieldPicker, IconButton, Input, SegmentedControl, Select, SortableCardList, type PickableField } from '../common'
import { NavigateEditor, WiringHint } from './ButtonConfigPanel'
import { ColumnFormatFields } from './ColumnFormatFields'
import { RequestMappingSection, seedRequestParams } from './DataTableRequestPanel'
import { useGridStore } from './gridStore'
import { bindingRowModel, LoadFieldPicker, useLoadShapes, usePageLoads } from './pageData'
import { flattenModelFields, rowModelFields } from './rowFields'
import { EndpointPicker } from './SelectFieldConfigPanel'
import {
  CHART_TYPE_FEATURES,
  CHART_TYPE_OPTIONS,
  createDefaultChartSeries,
  createDefaultNavigate,
  type ChartAxisConfig,
  type ChartConfig,
  type ChartGaugeBandConfig,
  type ChartOptionsConfig,
  type ChartReferenceLineConfig,
  type ChartSeriesConfig,
  type ChartType,
} from './types'

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
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

function AddRow({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-line-strong px-2 py-1.5 text-ui-sm text-ink-2 hover:bg-panel-2"
    >
      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </button>
  )
}

const LEGEND_POSITION_OPTIONS = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
]
const ORIENTATION_OPTIONS = [
  { value: 'vertical', label: 'Vertical' },
  { value: 'horizontal', label: 'Horizontal' },
]
const MODE_OPTIONS = [
  { value: 'grouped', label: 'Grouped' },
  { value: 'stacked', label: 'Stacked' },
  { value: 'stackGroup', label: 'Stack groups' },
]
const LABEL_POSITION_OPTIONS = [
  { value: 'outside', label: 'Outside' },
  { value: 'inside', label: 'Inside' },
  { value: 'none', label: 'None' },
]
const SORT_OPTIONS = [
  { value: 'desc', label: 'Largest first' },
  { value: 'asc', label: 'Smallest first' },
  { value: 'none', label: 'As received' },
]
const AXIS_OPTIONS = [
  { value: 'y', label: 'Across the value axis (horizontal line)' },
  { value: 'x', label: 'Across the category axis (vertical line)' },
]

/** The ten types as a glyph grid. */
function TypePicker({ value, onChange }: { value: ChartType; onChange: (type: ChartType) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Chart type">
      {CHART_TYPE_OPTIONS.map((opt) => {
        const Glyph = IconData[opt.icon as keyof typeof IconData]
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-[10px] leading-tight ${
              active ? 'border-accent bg-accent/10 text-ink' : 'border-line text-ink-3 hover:bg-panel-2 hover:text-ink-2'
            }`}
          >
            {Glyph ? <Glyph className="h-4 w-4" aria-hidden="true" /> : null}
            <span className="truncate">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function AxisFields({ label, axis, onChange }: { label: string; axis: ChartAxisConfig; onChange: (next: ChartAxisConfig) => void }) {
  const set = (patch: Partial<ChartAxisConfig>) => onChange({ ...axis, ...patch })
  return (
    <div className="space-y-1.5 rounded-md border border-line bg-panel p-2">
      <span className="text-ui-sm font-semibold text-ink-2">{label}</span>
      <Field label="Title">
        <Input value={axis.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <div className="flex gap-2">
        <Field label="Min">
          <Input value={axis.min} onChange={(e) => set({ min: e.target.value })} placeholder="auto" className="font-mono" />
        </Field>
        <Field label="Max">
          <Input value={axis.max} onChange={(e) => set({ max: e.target.value })} placeholder="auto" className="font-mono" />
        </Field>
      </div>
      <ColumnFormatFields column={{ format: axis.format }} onChange={(format) => set({ format })} />
      <Toggle label="Grid lines" checked={axis.showGrid} onChange={(showGrid) => set({ showGrid })} />
    </div>
  )
}

type ChartConfigPanelProps = { itemId: string; config: ChartConfig }

/**
 * Editor for a chart (see `spec/gummy-chart-spec.md` §3.4): General · Data ·
 * Series · Options · Axes · Reference lines · Legend & labels · Interaction.
 * Only the sections the current type reads are shown.
 */
export function ChartConfigPanel({ itemId, config }: ChartConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const endpoints = useProjectEndpoints()
  const models = useProjectModels()
  const pageLoads = usePageLoads()
  const shapes = useLoadShapes()
  const set = <K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<ChartConfig>)
  const setOption = <K extends keyof ChartOptionsConfig>(key: K, value: ChartOptionsConfig[K]) =>
    set('options', { ...config.options, [key]: value })

  const f = CHART_TYPE_FEATURES[config.type]
  const uses = (key: keyof ChartOptionsConfig) => f.options.includes(key)
  const rowsFromState = !!config.rowsBinding
  const endpoint = endpoints.find((e) => e.id === config.endpointId)

  // The row fields every accessor picker offers: the endpoint's response walked along `dataPath`, or the bound load's rows.
  const rowFields = useMemo<{ fields: PickableField[] | null; reason?: string }>(() => {
    const model = rowsFromState ? bindingRowModel(config.rowsBinding, shapes) : rowModelFields(config.endpointId, config.dataPath, endpoints, models)
    if (model.fields === null) return { fields: null, reason: model.reason }
    return { fields: flattenModelFields(model.fields) }
  }, [rowsFromState, config.rowsBinding, config.endpointId, config.dataPath, endpoints, models, shapes])

  const setEndpoint = (endpointId: string | null) => {
    const next = endpoints.find((e) => e.id === endpointId)
    updateItemConfig(itemId, { endpointId, requestMapping: seedRequestParams(config.requestMapping, next, 'value') } as Partial<ChartConfig>)
  }

  const series = f.singleSeries ? config.series.slice(0, 1) : config.series
  const patchSeries = (index: number, patch: Partial<ChartSeriesConfig>) =>
    set('series', config.series.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  const usedColors = new Map<string, number>()
  for (const s of config.series) if (s.color) usedColors.set(s.color, (usedColors.get(s.color) ?? 0) + 1)

  const lines = config.referenceLines
  const patchLine = (index: number, patch: Partial<ChartReferenceLineConfig>) =>
    set('referenceLines', lines.map((l, i) => (i === index ? { ...l, ...patch } : l)))

  const bands = config.options.bands
  const patchBand = (index: number, patch: Partial<ChartGaugeBandConfig>) =>
    setOption('bands', bands.map((b, i) => (i === index ? { ...b, ...patch } : b)))

  const fieldPicker = (value: string, onChange: (v: string) => void, label: string) => (
    <FieldPicker fields={rowFields.fields} value={value} onChange={onChange} aria-label={label} />
  )

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">Chart</h3>

      <Field label="Name (binding key)">
        <Input value={config.name} onChange={(e) => set('name', e.target.value)} className="font-mono" />
      </Field>
      <Field label="Type">
        <TypePicker value={config.type} onChange={(type) => set('type', type)} />
      </Field>
      <Field label="Title">
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} placeholder="No header" />
      </Field>
      <Field label="Subtitle">
        <Input value={config.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
      </Field>
      <Field label="Footnote">
        <Input value={config.footnote} onChange={(e) => set('footnote', e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Field label="Plot height (CSS)">
          <Input value={config.height} onChange={(e) => set('height', e.target.value)} placeholder="320px" className="font-mono" />
        </Field>
        <Field label="Empty text">
          <Input value={config.emptyText} onChange={(e) => set('emptyText', e.target.value)} placeholder="No data" />
        </Field>
      </div>

      <Heading>Data</Heading>
      {(pageLoads.length > 0 || rowsFromState) && (
        <Field label="Rows from">
          <SegmentedControl
            aria-label="Rows from"
            options={[
              { value: 'endpoint', label: 'Endpoint' },
              { value: 'state', label: 'Page data' },
            ]}
            value={rowsFromState ? 'state' : 'endpoint'}
            onChange={(v) => set('rowsBinding', v === 'state' ? { key: pageLoads[0]?.id ?? '', path: '', source: 'state' } : null)}
          />
        </Field>
      )}
      {rowsFromState && config.rowsBinding && (
        <div className="space-y-1.5 rounded-lg border border-line bg-panel p-2">
          <LoadFieldPicker
            label="Rows"
            mode="rows"
            loadId={config.rowsBinding.key}
            path={config.rowsBinding.path}
            onChange={({ loadId, path }) => set('rowsBinding', { key: loadId, path, source: 'state' })}
          />
          <p className="text-ui-xs text-ink-3">In-memory rows: no request mapping, and reference lines can't read a response path.</p>
        </div>
      )}
      {!rowsFromState && (
        <>
          <Field label="Data endpoint">
            <EndpointPicker value={config.endpointId} onChange={setEndpoint} />
          </Field>
          {config.endpointId == null && <WiringHint>Pick an endpoint — the canvas shows sample data until one is wired.</WiringHint>}
          {config.endpointId != null && (
            <>
              <Field label="Rows path (dot path)" hint="Where the row array sits in the response; blank = the response itself.">
                <Input value={config.dataPath} onChange={(e) => set('dataPath', e.target.value)} placeholder="data" className="font-mono" />
              </Field>
              <RequestMappingSection
                itemId={itemId}
                rows={config.requestMapping}
                onRows={(rows) => set('requestMapping', rows)}
                endpoint={endpoint}
                models={models}
                allowFilter={false}
              />
            </>
          )}
        </>
      )}
      {rowFields.fields === null && rowFields.reason && <p className="text-ui-xs text-ink-3">{rowFields.reason}</p>}

      <Heading>Series</Heading>
      {f.xField && (
        <>
          <Field label={config.type === 'pie' || config.type === 'funnel' ? 'Label field' : config.type === 'radar' ? 'Indicator field' : config.type === 'heatmap' ? 'Column field (x)' : 'Category field (x)'}>
            {fieldPicker(config.xField, (xField) => set('xField', xField), 'Category field')}
          </Field>
          {config.type !== 'heatmap' && (
            <div className="rounded-md border border-line bg-panel p-2">
              <ColumnFormatFields column={{ format: config.xFormat }} onChange={(xFormat) => set('xFormat', xFormat)} />
              <p className="pt-1 text-ui-xs text-ink-3">A date format with a pattern also buckets rows by that label (daily rows → months).</p>
            </div>
          )}
        </>
      )}
      {config.type === 'heatmap' && (
        <>
          <Field label="Row field (y)">{fieldPicker(config.options.yField, (v) => setOption('yField', v), 'Row field')}</Field>
          <Field label="Value field">{fieldPicker(config.options.valueField, (v) => setOption('valueField', v), 'Value field')}</Field>
        </>
      )}
      {config.type === 'scatter' && (
        <Field label="X field (numeric)">{fieldPicker(config.options.xField, (v) => setOption('xField', v), 'X field')}</Field>
      )}
      {f.splitBy && (
        <Field label="Split into series by" hint="A field whose distinct values each become a series; blank = one series per card below.">
          <FieldPicker fields={rowFields.fields} value={config.splitBy} onChange={(splitBy) => set('splitBy', splitBy)} allowNone aria-label="Split by" />
        </Field>
      )}
      {config.type !== 'heatmap' && (
        <SortableCardList
          items={series}
          onReorder={(next) => set('series', next)}
          gripLabel={(s) => `Reorder series ${s.label || s.field}`}
        >
          {(s, index) => (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-ui-sm font-semibold text-ink-2">{config.splitBy && f.splitBy ? 'Value' : s.label || s.field || `Series ${index + 1}`}</span>
                <span className="flex-1" />
                {!f.singleSeries && config.series.length > 1 && (
                  <IconButton label="Remove series" onClick={() => set('series', config.series.filter((_, i) => i !== index))}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                )}
              </div>
              <Field label={config.type === 'scatter' ? 'Y field' : 'Value field'}>{fieldPicker(s.field, (field) => patchSeries(index, { field }), 'Series field')}</Field>
              <Field label="Label">
                <Input value={s.label} onChange={(e) => patchSeries(index, { label: e.target.value })} placeholder={s.field || 'the field name'} />
              </Field>
              <ColorField label="Colour" value={s.color} onChange={(color) => patchSeries(index, { color })} unsetLabel="Auto (palette slot)" />
              {s.color && LOW_CONTRAST_HUES.has(s.color) && <p className="text-ui-xs text-warn">Low contrast as a series colour.</p>}
              {s.color && (usedColors.get(s.color) ?? 0) > 1 && <p className="text-ui-xs text-warn">Another series uses this colour.</p>}
              <ColumnFormatFields column={{ format: s.format }} onChange={(format) => patchSeries(index, { format })} />
              {config.type === 'barLine' && (
                <div className="flex gap-2">
                  <Field label="Shape">
                    <SegmentedControl
                      aria-label="Shape"
                      options={[
                        { value: 'bar', label: 'Bar' },
                        { value: 'line', label: 'Line' },
                      ]}
                      value={s.shape}
                      onChange={(shape) => patchSeries(index, { shape: shape as ChartSeriesConfig['shape'] })}
                    />
                  </Field>
                  <Field label="Axis">
                    <SegmentedControl
                      aria-label="Axis"
                      options={[
                        { value: 'left', label: 'Left' },
                        { value: 'right', label: 'Right' },
                      ]}
                      value={s.axis}
                      onChange={(axis) => patchSeries(index, { axis: axis as ChartSeriesConfig['axis'] })}
                    />
                  </Field>
                </div>
              )}
              {config.type === 'bar' && config.options.mode === 'stackGroup' && (
                <Field label="Stack id" hint="Series sharing an id stack together; blank = its own stack.">
                  <Input value={s.stack} onChange={(e) => patchSeries(index, { stack: e.target.value })} className="font-mono" />
                </Field>
              )}
            </div>
          )}
        </SortableCardList>
      )}
      {!f.singleSeries && !(f.splitBy && config.splitBy) && config.type !== 'heatmap' && (
        <AddRow onClick={() => set('series', [...config.series, createDefaultChartSeries(crypto.randomUUID(), '', '')])}>Add series</AddRow>
      )}
      {config.type === 'barLine' && (
        <p className="text-ui-xs text-ink-3">Use the right axis only when the two measures differ in scale; readers compare heights.</p>
      )}

      {f.options.length > 0 && <Heading>Options</Heading>}
      {uses('orientation') && (
        <Field label="Orientation">
          <SegmentedControl aria-label="Orientation" options={ORIENTATION_OPTIONS} value={config.options.orientation} onChange={(v) => setOption('orientation', v as ChartOptionsConfig['orientation'])} />
        </Field>
      )}
      {uses('mode') && (
        <Field label="Bars">
          <SegmentedControl aria-label="Bar mode" options={MODE_OPTIONS} value={config.options.mode} onChange={(v) => setOption('mode', v as ChartOptionsConfig['mode'])} />
        </Field>
      )}
      {uses('barMaxWidth') && (
        <Field label="Max bar width (px)">
          <Input value={config.options.barMaxWidth} onChange={(e) => setOption('barMaxWidth', e.target.value)} placeholder="auto" className="font-mono" />
        </Field>
      )}
      {uses('smooth') && <Toggle label="Smooth lines" checked={config.options.smooth} onChange={(v) => setOption('smooth', v)} />}
      {uses('showMarkers') && <Toggle label="Point markers" checked={config.options.showMarkers} onChange={(v) => setOption('showMarkers', v)} />}
      {uses('stacked') && <Toggle label="Stacked" checked={config.options.stacked} onChange={(v) => setOption('stacked', v)} />}
      {uses('innerRadius') && (
        <Field label="Inner radius" hint='Blank = a pie; "60%" = a donut.'>
          <Input value={config.options.innerRadius} onChange={(e) => setOption('innerRadius', e.target.value)} placeholder="pie" className="font-mono" />
        </Field>
      )}
      {uses('labelPosition') && (
        <Field label="Slice labels">
          <SegmentedControl aria-label="Slice labels" options={LABEL_POSITION_OPTIONS} value={config.options.labelPosition} onChange={(v) => setOption('labelPosition', v as ChartOptionsConfig['labelPosition'])} />
        </Field>
      )}
      {uses('centerText') && config.options.innerRadius && (
        <Field label="Centre text" hint="$total shows the sum of the values.">
          <Input value={config.options.centerText} onChange={(e) => setOption('centerText', e.target.value)} placeholder="none" />
        </Field>
      )}
      {uses('sizeField') && (
        <Field label="Size field (bubble)" hint="Blank = fixed marker size.">
          <FieldPicker fields={rowFields.fields} value={config.options.sizeField} onChange={(v) => setOption('sizeField', v)} allowNone aria-label="Size field" />
        </Field>
      )}
      {uses('labelField') && (
        <Field label="Point label field">
          <FieldPicker fields={rowFields.fields} value={config.options.labelField} onChange={(v) => setOption('labelField', v)} allowNone aria-label="Label field" />
        </Field>
      )}
      {uses('radarShape') && (
        <Field label="Shape">
          <SegmentedControl
            aria-label="Radar shape"
            options={[
              { value: 'polygon', label: 'Polygon' },
              { value: 'circle', label: 'Circle' },
            ]}
            value={config.options.radarShape}
            onChange={(v) => setOption('radarShape', v as ChartOptionsConfig['radarShape'])}
          />
        </Field>
      )}
      {uses('radarMax') && (
        <Field label="Axis max">
          <Input value={config.options.radarMax} onChange={(e) => setOption('radarMax', e.target.value)} placeholder="auto per indicator" className="font-mono" />
        </Field>
      )}
      {uses('gaugeShape') && (
        <Field label="Shape">
          <SegmentedControl
            aria-label="Gauge shape"
            options={[
              { value: 'radial', label: 'Radial' },
              { value: 'linear', label: 'Linear' },
            ]}
            value={config.options.gaugeShape}
            onChange={(v) => setOption('gaugeShape', v as ChartOptionsConfig['gaugeShape'])}
          />
        </Field>
      )}
      {uses('min') && (
        <div className="flex gap-2">
          <Field label="Min">
            <Input value={config.options.min} onChange={(e) => setOption('min', e.target.value)} placeholder="0" className="font-mono" />
          </Field>
          <Field label="Max">
            <Input value={config.options.max} onChange={(e) => setOption('max', e.target.value)} placeholder="100" className="font-mono" />
          </Field>
        </div>
      )}
      {uses('bands') && (
        <div className="space-y-1.5">
          <span className="text-ui-sm font-medium text-ink-2">Bands</span>
          <p className="text-ui-xs text-ink-3">Colour the arc up to each bound; the last band may leave its bound blank (= max). Try grass / amber / red.</p>
          {bands.map((b, index) => (
            <div key={b.id} className="flex items-center gap-1.5 rounded-md border border-line bg-panel p-2">
              <div className="w-20 shrink-0">
                <Input value={b.to} onChange={(e) => patchBand(index, { to: e.target.value })} placeholder="to" className="font-mono" aria-label="Band upper bound" />
              </div>
              <div className="min-w-0 flex-1">
                <ColorField label="" value={b.color} onChange={(color) => patchBand(index, { color })} unsetLabel="Palette slot" />
              </div>
              <IconButton label="Remove band" onClick={() => setOption('bands', bands.filter((_, i) => i !== index))}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </IconButton>
            </div>
          ))}
          <AddRow onClick={() => setOption('bands', [...bands, { id: crypto.randomUUID(), to: '', color: '' }])}>Add band</AddRow>
        </div>
      )}
      {uses('hue') && <ColorField label="Ramp hue" value={config.options.hue} onChange={(hue) => setOption('hue', hue)} unsetLabel="Accent" />}
      {uses('showValues') && <Toggle label="Show values in cells" checked={config.options.showValues} onChange={(v) => setOption('showValues', v)} />}
      {uses('funnelShape') && (
        <Field label="Shape">
          <SegmentedControl
            aria-label="Funnel shape"
            options={[
              { value: 'funnel', label: 'Funnel' },
              { value: 'pyramid', label: 'Pyramid' },
            ]}
            value={config.options.funnelShape}
            onChange={(v) => setOption('funnelShape', v as ChartOptionsConfig['funnelShape'])}
          />
        </Field>
      )}
      {uses('sort') && config.options.funnelShape !== 'pyramid' && (
        <Field label="Order">
          <Select aria-label="Order" options={SORT_OPTIONS} value={config.options.sort} onChange={(v) => setOption('sort', v as ChartOptionsConfig['sort'])} />
        </Field>
      )}

      {f.axes !== 'none' && <Heading>Axes</Heading>}
      {f.axes === 'radar' && (
        <Field label="Indicator axis title">
          <Input value={config.xAxis.title} onChange={(e) => set('xAxis', { ...config.xAxis, title: e.target.value })} />
        </Field>
      )}
      {f.axes === 'titles' && (
        <div className="flex gap-2">
          <Field label="X title">
            <Input value={config.xAxis.title} onChange={(e) => set('xAxis', { ...config.xAxis, title: e.target.value })} />
          </Field>
          <Field label="Y title">
            <Input value={config.yAxis.title} onChange={(e) => set('yAxis', { ...config.yAxis, title: e.target.value })} />
          </Field>
        </div>
      )}
      {(f.axes === 'xy' || f.axes === 'xyRight') && (
        <>
          <AxisFields label={config.type === 'scatter' ? 'X axis' : 'Category axis (x)'} axis={config.xAxis} onChange={(a) => set('xAxis', a)} />
          <AxisFields label={config.type === 'scatter' ? 'Y axis' : 'Value axis (y)'} axis={config.yAxis} onChange={(a) => set('yAxis', a)} />
          {f.axes === 'xyRight' && <AxisFields label="Right axis" axis={config.yAxisRight} onChange={(a) => set('yAxisRight', a)} />}
        </>
      )}

      {f.referenceLines && (
        <>
          <Heading>Reference lines</Heading>
          {rowsFromState && lines.some((l) => l.value.trim() !== '' && Number.isNaN(Number(l.value))) && (
            <p className="text-ui-xs text-warn">Rows come from page data, so a response path can't be read — use a number.</p>
          )}
          <SortableCardList items={lines} onReorder={(next) => set('referenceLines', next)} gripLabel={(l) => `Reorder line ${l.label || l.value}`}>
            {(l, index) => (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-ui-sm font-semibold text-ink-2">{l.label || l.value || `Line ${index + 1}`}</span>
                  <span className="flex-1" />
                  <IconButton label="Remove line" onClick={() => set('referenceLines', lines.filter((_, i) => i !== index))}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                </div>
                <Field label="Value" hint="A number, or a dot path into the raw response (crossline[0].value).">
                  <Input value={l.value} onChange={(e) => patchLine(index, { value: e.target.value })} className="font-mono" />
                </Field>
                <Field label="Label">
                  <Input value={l.label} onChange={(e) => patchLine(index, { label: e.target.value })} placeholder="the formatted value" />
                </Field>
                {config.type !== 'gauge' && (
                  <Field label="Axis">
                    <Select aria-label="Reference axis" options={AXIS_OPTIONS} value={l.axis} onChange={(v) => patchLine(index, { axis: v as 'x' | 'y' })} />
                  </Field>
                )}
                <ColorField label="Colour" value={l.color} onChange={(color) => patchLine(index, { color })} unsetLabel="Secondary text" />
                <Toggle label="Dashed" checked={l.dashed} onChange={(dashed) => patchLine(index, { dashed })} />
              </div>
            )}
          </SortableCardList>
          <AddRow onClick={() => set('referenceLines', [...lines, { id: crypto.randomUUID(), label: '', value: '', axis: 'y', color: '', dashed: false }])}>
            Add reference line
          </AddRow>
        </>
      )}

      <Heading>Legend & labels</Heading>
      <Toggle label="Legend" checked={config.legend.show} onChange={(show) => set('legend', { ...config.legend, show })} />
      {config.legend.show && (
        <Field label="Legend position">
          <SegmentedControl aria-label="Legend position" options={LEGEND_POSITION_OPTIONS} value={config.legend.position} onChange={(v) => set('legend', { ...config.legend, position: v as ChartConfig['legend']['position'] })} />
        </Field>
      )}
      <Toggle label="Direct labels" checked={config.showDataLabels} onChange={(v) => set('showDataLabels', v)} />

      <Heading>Interaction</Heading>
      <Toggle
        label="Click writes page data"
        checked={!!config.clickState?.enabled}
        onChange={(v) => set('clickState', v ? { enabled: true, stateKey: config.clickState?.stateKey ?? '' } : undefined)}
      />
      {config.clickState?.enabled && (
        <Field label="State key" hint="The clicked datum: the row's fields plus $series / $value (… $x / $y / $percent by type).">
          <Input
            value={config.clickState.stateKey}
            onChange={(e) => set('clickState', { enabled: true, stateKey: e.target.value })}
            placeholder={`${config.name || 'chart'}Selected`}
            className="font-mono"
          />
        </Field>
      )}
      <Toggle label="Navigate on click" checked={!!config.clickNavigate} onChange={(v) => set('clickNavigate', v ? createDefaultNavigate() : undefined)} />
      {config.clickNavigate && <NavigateEditor value={config.clickNavigate} onChange={(v) => set('clickNavigate', v)} allowRow />}
    </div>
  )
}
