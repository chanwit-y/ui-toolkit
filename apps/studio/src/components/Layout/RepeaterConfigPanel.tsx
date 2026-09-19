import type { ReactNode } from 'react'
import { FieldPicker, Input, SegmentedControl, Select } from '../common'
import { BREAKPOINTS } from './breakpoints'
import { NavigateEditor, WiringHint } from './ButtonConfigPanel'
import { EditContentsButton } from './ContainerHostConfigPanel'
import { CrudRefEditor } from './FormListConfigPanel'
import { useGridStore } from './gridStore'
import { useParentRepeaterArrays } from './repeaterScope'
import { createDefaultNavigate, type RepeaterConfig } from './types'

const SOURCE_OPTIONS = [
  { value: 'endpoint', label: 'Endpoint' },
  { value: 'parent', label: 'Parent item field' },
]
const SURFACE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'outlined', label: 'Outlined card' },
  { value: 'elevation', label: 'Elevated card' },
]
const SPAN_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const span = 12 - i
  const perRow = 12 % span === 0 ? ` · ${12 / span} per row` : ''
  return { value: String(span), label: `${span} / 12${perRow}` }
})

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

function Heading({ children }: { children: ReactNode }) {
  return (
    <h4 className="pt-1 text-ui-sm font-semibold uppercase tracking-wide text-ink-3">{children}</h4>
  )
}

type RepeaterConfigPanelProps = {
  itemId: string
  config: RepeaterConfig
}

/**
 * Editor for a repeater's config (see the grilled design). The item template
 * is the item's child canvas (drill in with "Edit item template"); the array
 * comes from an endpoint or — inside another repeater's template — from an
 * array field of the parent item. Item spans are out of 12 per breakpoint,
 * the surface draws a card around each item, and "Item click" makes the whole
 * item a page link whose params can read the item.
 */
export function RepeaterConfigPanel({ itemId, config }: RepeaterConfigPanelProps) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof RepeaterConfig>(key: K, value: RepeaterConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<RepeaterConfig>)
  const { nested, arrays } = useParentRepeaterArrays()
  // A parent source authored elsewhere (template insert, undo) stays editable.
  const showSource = nested || config.source === 'parent'

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">Repeater</h3>

      <Field label="Name (binding key)">
        <Input
          value={config.name}
          onChange={(e) => set('name', e.target.value)}
          className="font-mono"
        />
      </Field>
      <Field label="Title">
        <Input value={config.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Item id key">
        <Input
          value={config.idKey}
          onChange={(e) => set('idKey', e.target.value)}
          className="font-mono"
        />
      </Field>

      <Heading>Item template</Heading>
      <EditContentsButton itemId={itemId}>Edit item template</EditContentsButton>
      <WiringHint>
        Rendered once per item. Text, Typography and Avatar inside it can show an item field
        (their “Item field” switch); inputs aren’t supported — use a Form List for editable rows.
      </WiringHint>

      <Heading>Items</Heading>
      {showSource && (
        <SegmentedControl
          aria-label="Item source"
          options={SOURCE_OPTIONS}
          value={config.source}
          onChange={(v) => set('source', v as RepeaterConfig['source'])}
        />
      )}
      {config.source === 'endpoint' ? (
        <>
          <CrudRefEditor
            value={config.read}
            onChange={(read) => set('read', read)}
            allowRow={nested}
            extraLabel="Query fields"
          />
          {config.read.endpointId != null ? (
            <Field label="Response item path (dot path)">
              <Input
                value={config.readPaths}
                onChange={(e) => set('readPaths', e.target.value)}
                placeholder="data"
                className="font-mono"
              />
            </Field>
          ) : (
            <WiringHint>Pick an endpoint — the repeater has no items without one.</WiringHint>
          )}
        </>
      ) : (
        <>
          <Field label="Array field of the parent item">
            <FieldPicker
              fields={arrays.fields}
              value={config.parentField}
              onChange={(v) => set('parentField', v)}
              fallbackHint={arrays.reason}
              aria-label="Parent item array field"
            />
          </Field>
          {!nested && (
            <WiringHint>
              This repeater isn’t inside another repeater’s item template — a parent-item source
              resolves to nothing here.
            </WiringHint>
          )}
        </>
      )}
      <Field label="Empty text">
        <Input
          value={config.emptyText}
          onChange={(e) => set('emptyText', e.target.value)}
          placeholder="No items"
        />
      </Field>

      <Heading>Item layout</Heading>
      <div className="grid grid-cols-2 gap-2">
        {BREAKPOINTS.map((bp) => (
          <Field key={bp.key} label={`${bp.label} span`}>
            <Select
              options={SPAN_OPTIONS}
              value={String(config.itemSpan[bp.key])}
              onChange={(v) => set('itemSpan', { ...config.itemSpan, [bp.key]: Number(v) })}
            />
          </Field>
        ))}
      </div>
      <Field label="Gap (scale key or CSS length)">
        <Input
          value={config.gap}
          onChange={(e) => set('gap', e.target.value)}
          placeholder="4"
          className="font-mono"
        />
      </Field>
      <Field label="Item surface">
        <Select
          options={SURFACE_OPTIONS}
          value={config.itemSurface}
          onChange={(v) => set('itemSurface', v as RepeaterConfig['itemSurface'])}
        />
      </Field>
      <Field label="Item padding (scale key or CSS length)">
        <Input
          value={config.itemPadding}
          onChange={(e) => set('itemPadding', e.target.value)}
          placeholder={config.itemSurface === 'none' ? '0' : '4'}
          className="font-mono"
        />
      </Field>

      <Heading>Item click</Heading>
      <Toggle
        label="Go to a page when an item is clicked"
        checked={config.itemNavigate !== null}
        onChange={(on) => set('itemNavigate', on ? createDefaultNavigate() : null)}
      />
      {config.itemNavigate && (
        <NavigateEditor
          value={config.itemNavigate}
          onChange={(v) => set('itemNavigate', v)}
          allowRow
        />
      )}
    </div>
  )
}
