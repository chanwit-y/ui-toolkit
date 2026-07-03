import type { ReactNode } from 'react'
import { Expand, Plus, Trash2 } from 'lucide-react'
import { IconButton, Input, Select, SegmentedControl } from '../common'
import { IconPicker } from './ButtonConfigPanel'
import { useGridStore } from './gridStore'
import type {
  ButtonConfig,
  ModalConfig,
  PaperConfig,
  PopoverConfig,
  TabConfig,
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

/** The panel's section heading, shared across the container-host panels. */
function Heading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
      {children}
    </h3>
  )
}

/**
 * The drill-in button every container-hosting panel carries: navigates the
 * whole canvas into the item's child canvas (breadcrumb comes from the store).
 */
export function EditContentsButton({
  itemId,
  canvasIndex = 0,
  children = 'Edit contents',
}: {
  itemId: string
  canvasIndex?: number
  children?: ReactNode
}) {
  const enterCanvas = useGridStore((s) => s.enterCanvas)
  return (
    <button
      type="button"
      onClick={() => enterCanvas(itemId, canvasIndex)}
      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-teal-300 bg-teal-50 py-1.5 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-100"
    >
      <Expand className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </button>
  )
}

/**
 * Inspector for a `container` cell. A plain container has no element config —
 * its grid settings live in the Layout tab while drilled in — so the panel is
 * the drill-in affordance plus that pointer.
 */
export function ContainerConfigPanel({ itemId }: { itemId: string }) {
  return (
    <div className="space-y-3">
      <Heading>Container</Heading>
      <p className="text-xs text-zinc-500">
        A nested grid. Edit its contents below; while inside, the Layout tab
        edits this container&rsquo;s own grid settings.
      </p>
      <EditContentsButton itemId={itemId} />
    </div>
  )
}

const PAPER_VARIANT_OPTIONS = [
  { value: 'elevation', label: 'Elevation' },
  { value: 'outlined', label: 'Outlined' },
]

/** Inspector for a paper: surface styling + the drill-in button. */
export function PaperConfigPanel({
  itemId,
  config,
}: {
  itemId: string
  config: PaperConfig
}) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof PaperConfig>(key: K, value: PaperConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<PaperConfig>)

  return (
    <div className="space-y-3">
      <Heading>Paper</Heading>
      <EditContentsButton itemId={itemId} />
      <Field label="Variant">
        <SegmentedControl
          options={PAPER_VARIANT_OPTIONS}
          value={config.variant}
          onChange={(v) => set('variant', v as PaperConfig['variant'])}
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-1"
          aria-label="Paper variant"
        />
      </Field>
      {config.variant === 'elevation' && (
        <Field label="Elevation (0–24)">
          <Input
            type="number"
            min={0}
            max={24}
            value={String(config.elevation)}
            onChange={(e) => set('elevation', Number(e.target.value) || 0)}
          />
        </Field>
      )}
      <Toggle label="Square corners" checked={config.square} onChange={(v) => set('square', v)} />
    </div>
  )
}

/**
 * Inspector for a tab widget: the header list (add/remove — the store keeps the
 * child canvases index-aligned), a per-tab drill-in, and the initially active
 * tab.
 */
export function TabConfigPanel({
  itemId,
  config,
}: {
  itemId: string
  config: TabConfig
}) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const addTab = useGridStore((s) => s.addTab)
  const removeTab = useGridStore((s) => s.removeTab)

  const patchTab = (index: number, patch: Partial<TabConfig['tabs'][number]>) =>
    updateItemConfig(itemId, {
      tabs: config.tabs.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    } as Partial<TabConfig>)

  const defaultValueOptions = [
    { value: '', label: '— first tab —' },
    ...config.tabs.map((t) => ({ value: t.value, label: t.label || t.value })),
  ]

  return (
    <div className="space-y-3">
      <Heading>Tab</Heading>

      <Field label="Tabs">
        <div className="space-y-2">
          {config.tabs.map((tab, index) => (
            <div
              key={index}
              className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-2"
            >
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={tab.label}
                  onChange={(e) => patchTab(index, { label: e.target.value })}
                  placeholder="label"
                />
                <Input
                  value={tab.value}
                  onChange={(e) => patchTab(index, { value: e.target.value })}
                  placeholder="value"
                  className="font-mono"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <EditContentsButton itemId={itemId} canvasIndex={index}>
                  Edit tab contents
                </EditContentsButton>
                <IconButton
                  label={`Remove tab ${index + 1}`}
                  onClick={() => removeTab(itemId, index)}
                  className="h-6! w-6! shrink-0 text-zinc-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addTab(itemId)}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-zinc-300 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-teal-400 hover:text-teal-600"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add tab
          </button>
        </div>
      </Field>

      <Field label="Initially active tab">
        <Select
          options={defaultValueOptions}
          value={config.defaultValue}
          onChange={(v) => updateItemConfig(itemId, { defaultValue: v } as Partial<TabConfig>)}
        />
      </Field>
    </div>
  )
}

/**
 * Inspector for a modal: identity/sizing plus its trigger button (a modal's
 * engine trigger is a full ButtonElement — studio authors its visual slice and
 * the export wires `actions: ["OpenModal"]`). Content is authored via drill-in
 * and exercised in the Live Preview modal, where the engine can actually open it.
 */
export function ModalConfigPanel({
  itemId,
  config,
}: {
  itemId: string
  config: ModalConfig
}) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof ModalConfig>(key: K, value: ModalConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<ModalConfig>)
  const patchTrigger = (patch: Partial<ButtonConfig>) =>
    set('trigger', { ...config.trigger, ...patch })

  return (
    <div className="space-y-3">
      <Heading>Modal</Heading>
      <EditContentsButton itemId={itemId}>Edit modal contents</EditContentsButton>

      <Field label="Id (modal registry key)">
        <Input
          value={config.id}
          onChange={(e) => set('id', e.target.value)}
          className="font-mono"
        />
      </Field>
      <Field label="Title">
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Description">
        <Input
          value={config.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Max width">
          <Input
            value={config.maxWidth}
            onChange={(e) => set('maxWidth', e.target.value)}
            placeholder="40rem"
          />
        </Field>
        <Field label="Min width">
          <Input
            value={config.minWidth}
            onChange={(e) => set('minWidth', e.target.value)}
            placeholder="20rem"
          />
        </Field>
        <Field label="Max height">
          <Input
            value={config.maxHeight}
            onChange={(e) => set('maxHeight', e.target.value)}
            placeholder="80vh"
          />
        </Field>
      </div>

      <Heading>Trigger button</Heading>
      <Field label="Label">
        <Input
          value={config.trigger.label}
          onChange={(e) => patchTrigger({ label: e.target.value })}
        />
      </Field>
      <Field label="Icon">
        <IconPicker
          value={config.trigger.icon}
          onChange={(v) => patchTrigger({ icon: v })}
        />
      </Field>
    </div>
  )
}

const PLACEMENT_OPTIONS = [
  'top',
  'bottom',
  'left',
  'right',
  'top-start',
  'top-end',
  'bottom-start',
  'bottom-end',
].map((v) => ({ value: v, label: v }))

const TRIGGER_MODE_OPTIONS = [
  { value: 'click', label: 'Click' },
  { value: 'hover', label: 'Hover' },
]

const TRIGGER_KIND_OPTIONS = [
  { value: 'button', label: 'Button' },
  { value: 'text', label: 'Text' },
]

/**
 * Inspector for a popover: placement/mode/offset plus its trigger — restricted
 * to button | text (see the grilled design), both configs carried so switching
 * kinds is lossless. Content is authored via drill-in.
 */
export function PopoverConfigPanel({
  itemId,
  config,
}: {
  itemId: string
  config: PopoverConfig
}) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof PopoverConfig>(key: K, value: PopoverConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<PopoverConfig>)

  return (
    <div className="space-y-3">
      <Heading>Popover</Heading>
      <EditContentsButton itemId={itemId}>Edit popover contents</EditContentsButton>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Placement">
          <Select
            options={PLACEMENT_OPTIONS}
            value={config.placement}
            onChange={(v) => set('placement', v as PopoverConfig['placement'])}
          />
        </Field>
        <Field label="Offset (px)">
          <Input
            type="number"
            min={0}
            value={config.offset === '' ? '' : String(config.offset)}
            onChange={(e) =>
              set('offset', e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder="8 (default)"
          />
        </Field>
      </div>

      <Field label="Open on">
        <SegmentedControl
          options={TRIGGER_MODE_OPTIONS}
          value={config.triggerMode}
          onChange={(v) => set('triggerMode', v as PopoverConfig['triggerMode'])}
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-1"
          aria-label="Popover trigger mode"
        />
      </Field>

      <Heading>Trigger</Heading>
      <Field label="Kind">
        <SegmentedControl
          options={TRIGGER_KIND_OPTIONS}
          value={config.triggerKind}
          onChange={(v) => set('triggerKind', v as PopoverConfig['triggerKind'])}
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-1"
          aria-label="Popover trigger kind"
        />
      </Field>
      {config.triggerKind === 'button' ? (
        <>
          <Field label="Label">
            <Input
              value={config.triggerButton.label}
              onChange={(e) =>
                set('triggerButton', { ...config.triggerButton, label: e.target.value })
              }
            />
          </Field>
          <Field label="Icon">
            <IconPicker
              value={config.triggerButton.icon}
              onChange={(v) => set('triggerButton', { ...config.triggerButton, icon: v })}
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="Text">
            <Input
              value={config.triggerText.text}
              onChange={(e) =>
                set('triggerText', { ...config.triggerText, text: e.target.value })
              }
            />
          </Field>
          <Toggle
            label="Label styling"
            checked={config.triggerText.isLabel}
            onChange={(v) => set('triggerText', { ...config.triggerText, isLabel: v })}
          />
        </>
      )}
    </div>
  )
}
