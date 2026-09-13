import { X } from 'lucide-react'
import { Button, IconButton, Input } from '../common'
import { COMPONENT_BY_TYPE } from './componentCatalog'
import { createDefaultElementStyle, hasElementStyle, type ElementStyle } from './designTypes'
import { useGridStore } from './gridStore'
import type { GridItemData } from './types'

/** A colour row: swatch picker + hex text + clear (the mockup's `colourRow`). */
function ColourRow({
  label,
  value,
  hint,
  onChange,
}: {
  label: string
  value: string
  hint?: string
  onChange: (value: string) => void
}) {
  const pickerValue = /^#[0-9a-f]{6}$/i.test(value) ? value : '#888888'
  return (
    <div className="space-y-1">
      <span className="block text-ui-sm font-medium text-ink-2">{label}</span>
      <div className="flex items-center gap-1.5">
        <label
          className="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-md border border-line"
          title="Pick a colour"
          style={value ? { background: value } : undefined}
        >
          {!value && (
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(135deg,transparent_46%,var(--line-strong)_46%,var(--line-strong)_54%,transparent_54%)]"
            />
          )}
          <input
            type="color"
            value={pickerValue}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label} colour`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="theme default"
          className="font-mono"
        />
        {value && (
          <IconButton
            label={`Clear ${label.toLowerCase()}`}
            className="btn-icon-sm h-6! shrink-0 text-ink-3 hover:text-ink"
            onClick={() => onChange('')}
          >
            <X size={12} aria-hidden="true" />
          </IconButton>
        )}
      </div>
      {hint && <span className="block text-ui-xs leading-snug text-ink-3">{hint}</span>}
    </div>
  )
}

/**
 * The inspector's Style tab (see the grilled design): per-element colours,
 * radius and — for data tables — header colours and striped rows. A
 * design-only annotation: the canvas paints it through CSS variables and the
 * export carries it in project.json, but the engine ignores it (the library's
 * components track the theme accent, not per-element hex values). Containers
 * additionally derive their engine `surface` flags from background/border.
 */
export function StylePanel({ item }: { item: GridItemData }) {
  const updateItemStyle = useGridStore((s) => s.updateItemStyle)
  const style: ElementStyle = { ...createDefaultElementStyle(), ...item.style }
  const set = <K extends keyof ElementStyle>(key: K, value: ElementStyle[K]) =>
    updateItemStyle(item.id, { [key]: value } as Partial<ElementStyle>)
  const def = COMPONENT_BY_TYPE[item.type]
  const isContainer =
    item.type === 'container' || item.type === 'paper' || item.type === 'tab' || item.type === 'modal'
  const isTable = item.type === 'datatable' || item.type === 'datatableeditable'

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">
        {def?.label ?? item.type} colours
      </h3>
      <p className="rounded-md border border-dashed border-line-strong bg-panel px-2.5 py-2 text-ui-xs leading-snug text-ink-3">
        Design annotation: painted on the canvas and exported in project.json. Library
        components follow the project theme, so the Live Preview ignores these.
        {isContainer && ' A background or border here also turns on the engine surface.'}
      </p>
      <ColourRow
        label="Background"
        value={style.bg}
        hint={isContainer ? 'Cascades to everything inside this container.' : undefined}
        onChange={(v) => set('bg', v)}
      />
      <ColourRow label="Text" value={style.fg} onChange={(v) => set('fg', v)} />
      <ColourRow label="Border" value={style.line} onChange={(v) => set('line', v)} />
      <ColourRow
        label="Accent"
        value={style.accent}
        hint="Buttons, badges and chart bars inside this element."
        onChange={(v) => set('accent', v)}
      />
      <label className="block space-y-1">
        <span className="text-ui-sm font-medium text-ink-2">Corner radius (px)</span>
        <Input
          type="number"
          min={0}
          value={style.radius}
          onChange={(e) => set('radius', e.target.value)}
          placeholder="theme default"
        />
      </label>

      {isTable && (
        <div className="space-y-3 border-t border-line pt-3">
          <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">Table</h3>
          <ColourRow
            label="Header background"
            value={style.thBg}
            onChange={(v) => set('thBg', v)}
          />
          <ColourRow label="Header text" value={style.thFg} onChange={(v) => set('thFg', v)} />
          <label className="flex items-center justify-between gap-2">
            <span className="text-ui-sm font-medium text-ink-2">Striped rows</span>
            <input
              type="checkbox"
              checked={style.zebra}
              onChange={(e) => set('zebra', e.target.checked)}
              className="h-4 w-4 rounded border-line-strong text-ink focus:ring-focus/30"
            />
          </label>
        </div>
      )}

      {hasElementStyle(item.style) && (
        <Button
          size="sm"
          className="text-danger"
          onClick={() => updateItemStyle(item.id, createDefaultElementStyle())}
        >
          Reset colours
        </Button>
      )}
    </div>
  )
}
