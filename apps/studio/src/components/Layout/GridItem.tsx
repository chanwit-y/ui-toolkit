import type { DataType } from '@gummy-ui/ui'
import {
  AutocompleteBase2,
  MultiAutocompleteBase,
  TextareaBase,
  TextFieldBase,
} from '@gummy-ui/ui'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Calendar,
  GripVertical,
  Hash,
  Link,
  ListChecks,
  ListFilter,
  Lock,
  Mail,
  Phone,
  Search,
  TextWrap,
  Type,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { memo, useCallback, useLayoutEffect, useState } from 'react'
import { cn, IconButton } from '../common'
import { COMPONENT_BY_TYPE } from './componentCatalog'
import { useGridStore } from './gridStore'
import type {
  GridItemData,
  MultiAutocompleteConfig,
  SelectFieldConfig,
  TextareaConfig,
  TextFieldConfig,
} from './types'
import { escapeClassName } from './utils'

type GridItemProps = {
  item: GridItemData
  isSelected: boolean
}

/** dataType → glyph, so a collapsed chip is scannable at a glance. */
const DATA_TYPE_ICONS: Partial<Record<DataType, LucideIcon>> = {
  email: Mail,
  password: Lock,
  number: Hash,
  date: Calendar,
  'datetime-local': Calendar,
  month: Calendar,
  week: Calendar,
  time: Calendar,
  search: Search,
  tel: Phone,
  url: Link,
}

function iconForDataType(dataType: DataType): LucideIcon {
  return DATA_TYPE_ICONS[dataType] ?? Type
}

/**
 * Cell-width thresholds (content-box px) that gate the chip ↔ live preview
 * switch. A hysteresis band (flip to live at LIVE_MIN, back to chip only below
 * CHIP_MAX) keeps a cell resting near the boundary from strobing between the
 * two subtrees as it resizes.
 */
const LIVE_MIN_PX = 224 // ~14rem: enough room for a real size-3 field
const CHIP_MAX_PX = 208 // ~13rem

/** Content-box width of an element (excludes its padding and border). */
function contentWidth(el: HTMLElement): number {
  const cs = getComputedStyle(el)
  return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
}

/**
 * True once the observed element is wide enough to host a live component, with
 * hysteresis so a cell oscillating around the threshold doesn't flicker. The
 * element is passed as state (not a ref) so the effect re-runs when the node
 * mounts. We measure synchronously up front (`useLayoutEffect` +
 * `getBoundingClientRect`-style read) so the correct state is set before paint —
 * the ResizeObserver only handles later resizes. Relying on the observer's
 * async initial callback alone would flash a chip on mount and never fire at
 * all in throttled contexts (e.g. a hidden/background tab).
 */
function useIsLiveWidth(el: HTMLElement | null): boolean {
  const [isLive, setIsLive] = useState(false)
  useLayoutEffect(() => {
    if (!el) return
    const apply = (w: number) =>
      setIsLive((prev) => (w >= LIVE_MIN_PX ? true : w <= CHIP_MAX_PX ? false : prev))
    apply(contentWidth(el)) // synchronous initial measurement
    const ro = new ResizeObserver((entries) => {
      apply(entries[entries.length - 1].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return isLive
}

/**
 * The cell's visual content when NOT active. A textfield shows a compact,
 * size-aware chip (icon + label + dataType); every other component type shows
 * its label as a placeholder.
 */
function CellContent({ item }: { item: GridItemData }) {
  if (item.type === 'textfield' && item.config) {
    return <TextFieldChip config={item.config as TextFieldConfig} />
  }
  if (item.type === 'textarea' && item.config) {
    return <GlyphChip Icon={TextWrap} />
  }
  if (item.type === 'select' && item.config) {
    return <GlyphChip Icon={ListFilter} />
  }
  if (item.type === 'autocomplete' && item.config) {
    return <GlyphChip Icon={Search} />
  }
  if (item.type === 'multiAutocomplete' && item.config) {
    return <GlyphChip Icon={ListChecks} />
  }
  return (
    <div
      data-grid-item-content
      className="flex h-full w-full items-center justify-center"
    >
      <span className="text-xs font-medium text-zinc-400">{item.label}</span>
    </div>
  )
}

/**
 * The active cell's body: the component glyph in the same position as the
 * non-active chip's icon (left, after the grip) so selecting doesn't shift it.
 * Uses the dataType icon for a textfield. The type pill is rendered separately on
 * the top border by `TypeLabel` (shown for active and hover alike); non-textfield
 * types render no body icon — the pill carries it.
 */
function ActiveBody({ item }: { item: GridItemData }) {
  const Icon =
    item.type === 'textfield' && item.config
      ? iconForDataType((item.config as TextFieldConfig).dataType)
      : item.type === 'textarea' && item.config
        ? TextWrap
        : item.type === 'select' && item.config
          ? ListFilter
          : item.type === 'autocomplete' && item.config
            ? Search
            : item.type === 'multiAutocomplete' && item.config
              ? ListChecks
              : null
  if (!Icon) return null
  return (
    <div
      data-grid-item-content
      className="@container flex h-full w-full items-center justify-center gap-2 px-1 @min-[8rem]:justify-start @min-[8rem]:pl-6"
    >
      <Icon className="h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
    </div>
  )
}

/**
 * The type-label pill straddling the cell's top border. Reads from `item.type`
 * (the palette type), not the user-editable `item.label`. Same neutral styling
 * in both states: revealed on hover, and kept visible while the cell is active.
 */
function TypeLabel({
  type,
  isSelected,
}: {
  type: GridItemData['type']
  isSelected: boolean
}) {
  const def = COMPONENT_BY_TYPE[type]
  if (!def) return null
  const Icon = def.icon
  return (
    <span
      data-grid-item-type
      className={cn(
        'pointer-events-none absolute left-1/2 top-0 z-20 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600 shadow-sm transition-opacity duration-150',
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {def.label}
    </span>
  )
}

/**
 * Collapsed textfield representation for cells too narrow to host the live
 * component (below the `useIsLiveWidth` threshold): just the dataType glyph.
 * The label/dataType are carried by the `TypeLabel` pill and the inspector — at
 * this size a real field would be uselessly cramped, so we stay minimal.
 */
function TextFieldChip({ config }: { config: TextFieldConfig }) {
  return <GlyphChip Icon={iconForDataType(config.dataType)} />
}

/**
 * A centered glyph chip — the minimal representation for a field too narrow to
 * host its live component. The label/config are carried by the `TypeLabel` pill
 * and the inspector, so at this size we stay to a single icon.
 */
function GlyphChip({ Icon }: { Icon: LucideIcon }) {
  return (
    <div
      data-grid-item-content
      className="flex h-full w-full items-center justify-center"
    >
      <Icon className="h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
    </div>
  )
}

/**
 * The live, real `<TextFieldBase>` from the library, rendered in-cell once the
 * cell is wide enough. Inert: `pointer-events-none` lets a click pass through
 * to the cell (select) and keeps drag on the grip — you preview the field, you
 * don't type into it. `isFullWidth` is forced and `isFixedHeight` dropped so
 * the field fills the cell width and the grid row owns the height. The required
 * marker is baked into the label (TextFieldBase has no `isRequired` prop).
 */
function LivePreview({ config }: { config: TextFieldConfig }) {
  const label = config.isRequired ? `${config.label} *` : config.label
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      <TextFieldBase
        dataType={config.dataType}
        label={label}
        placeholder={config.placeholder}
        helperText={config.helperText}
        errorMessage={config.errorMessage}
        variant={config.variant}
        size={config.size}
        radius={config.radius}
        regex={config.regex || undefined}
        regexErrorMessage={config.regexErrorMessage}
        isFullWidth
        isFixedHeight={false}
      />
    </div>
  )
}

/**
 * The live, real `<TextareaBase>` from the library, rendered in-cell once the
 * cell is wide enough. Inert (`pointer-events-none`) like the textfield preview.
 * `resize` is forced to `'none'` in-canvas — the drag handle would be a dead
 * affordance with pointer events off — but the configured `rows` is honored, so
 * the cell auto-grows (grid `minmax(56px, auto)`) to the real textarea height.
 * The required marker is baked into the label (TextareaBase has no `isRequired`).
 */
function TextareaLivePreview({ config }: { config: TextareaConfig }) {
  const label = config.isRequired ? `${config.label} *` : config.label
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      <TextareaBase
        label={label}
        placeholder={config.placeholder}
        helperText={config.helperText}
        errorMessage={config.errorMessage}
        rows={config.rows}
        resize="none"
        autoResize={config.autoResize}
        maxLength={config.maxLength === '' ? undefined : config.maxLength}
        showCharCount={config.showCharCount}
      />
    </div>
  )
}

/**
 * The live, real `<AutocompleteBase2>` from the library, rendered in-cell once the
 * cell is wide enough. Inert (`pointer-events-none`) like the other previews. In
 * `static` mode it shows the authored option records keyed by the configured
 * `idKey`/`displayKey`/`searchKey` (an invalid edit never reaches here — the panel
 * only commits valid arrays, so the preview holds the last-valid one). In `source`
 * mode the cell can't fetch, so it renders an empty trigger with the configured
 * placeholder. The required marker is baked into the label (Autocomplete2 has no
 * `isRequired` prop). Options/keys are cast through `any` — Autocomplete2's generic
 * is fixed to `{ id, label }` for typing, but it reads the keys off each record at
 * runtime, so arbitrary record shapes work. Needs the core providers from
 * `App.tsx` (useCore/useData/react-query).
 */
function SelectLivePreview({ config }: { config: SelectFieldConfig }) {
  const label = config.isRequired ? `${config.label} *` : config.label
  const isSource = config.mode === 'source'
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      <AutocompleteBase2
        name={config.name}
        label={label}
        placeholder={config.placeholder}
        helperText={config.helperText}
        error={!!config.errorMessage}
        errorMessage={config.errorMessage}
        options={(isSource ? [] : config.options) as never}
        idKey={config.idKey as never}
        displayKey={config.displayKey as never}
        searchKey={config.searchKey as never}
      />
    </div>
  )
}

/**
 * The live, real `<MultiAutocompleteBase>` from the library, rendered in-cell once
 * the cell is wide enough. Inert (`pointer-events-none`) like the other previews.
 * Unlike `SelectLivePreview`, the options are fed in *both* modes (the config always
 * carries the static starter records) and the first option is pre-selected via
 * `values`, so a freshly-dropped source-mode cell still shows a removable chip —
 * making the "multi" nature read on the canvas. `maxSelections`/`showSelectedCount`
 * drive the preview only (the engine has no home for them). Options/keys are cast
 * through `never`: the base's generic is fixed to `{ id, label }` for typing, but it
 * reads the keys off each record at runtime, so arbitrary record shapes work. Needs
 * the core providers from `App.tsx` (useCore).
 */
function MultiAutocompleteLivePreview({ config }: { config: MultiAutocompleteConfig }) {
  const label = config.isRequired ? `${config.label} *` : config.label
  const firstId = config.options[0]?.[config.idKey]
  const values = firstId == null ? [] : [String(firstId)]
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      <MultiAutocompleteBase
        name={config.name}
        label={label}
        placeholder={config.placeholder}
        helperText={config.helperText}
        error={!!config.errorMessage}
        errorMessage={config.errorMessage}
        options={config.options as never}
        values={values}
        idKey={config.idKey as never}
        displayKey={config.displayKey as never}
        searchKey={config.searchKey as never}
        maxSelections={config.maxSelections === '' ? undefined : config.maxSelections}
        showSelectedCount={config.showSelectedCount}
      />
    </div>
  )
}

/**
 * The cell's live render, or null when the cell can't (or isn't wide enough to)
 * show one — the generic seam for adding more component types later. `textfield`,
 * `textarea`, `select`, `autocomplete`, and `multiAutocomplete` (with config) go
 * live; everything else falls through to its chip. `select`/`autocomplete` share
 * `SelectLivePreview` (both preview with the library's `Autocomplete2`);
 * `multiAutocomplete` previews with `MultiAutocompleteBase`.
 */
function renderLive(item: GridItemData, isLive: boolean) {
  if (!isLive) return null
  if (item.type === 'textfield' && item.config) {
    return <LivePreview config={item.config as TextFieldConfig} />
  }
  if (item.type === 'textarea' && item.config) {
    return <TextareaLivePreview config={item.config as TextareaConfig} />
  }
  if (item.type === 'select' && item.config) {
    return <SelectLivePreview config={item.config as SelectFieldConfig} />
  }
  if (item.type === 'autocomplete' && item.config) {
    return <SelectLivePreview config={item.config as SelectFieldConfig} />
  }
  if (item.type === 'multiAutocomplete' && item.config) {
    return <MultiAutocompleteLivePreview config={item.config as MultiAutocompleteConfig} />
  }
  return null
}

export function GridItem({ item, isSelected }: GridItemProps) {
  const selectItem = useGridStore((s) => s.selectItem)
  const itemClassName = `gi-${escapeClassName(item.id)}`

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: item.id })

  // Measure the cell to decide chip ↔ live. The element is held in state so the
  // ResizeObserver re-attaches on mount; the callback ref feeds both dnd-kit's
  // sortable node and our measurement.
  const [cellEl, setCellEl] = useState<HTMLDivElement | null>(null)
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node)
      setCellEl(node)
    },
    [setNodeRef],
  )
  const isLive = useIsLiveWidth(cellEl)
  const live = renderLive(item, isLive)

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div
      ref={setRefs}
      style={style}
      data-grid-item={item.id}
      onClick={(e) => {
        // Select this cell; stop the canvas click that would clear selection.
        e.stopPropagation()
        selectItem(item.id)
      }}
      className={cn(
        itemClassName,
        // Let the CSS grid (and `grid-row: span N`) control height. Keep a
        // sensible single-row minimum to match the default `grid-auto-rows`.
        'grid-item-cell group relative flex min-h-14 touch-none items-center justify-center rounded-lg border-2 p-2',
        'transition-[border-color,background-color,box-shadow,opacity] duration-200 ease-out',
        isDragging
          ? 'z-0 border-dashed border-violet-300 bg-violet-50/40 opacity-40'
          : isOver
            ? 'border-dashed border-violet-400 bg-violet-50 shadow-sm ring-2 ring-violet-300/60'
            : isSelected
              ? 'border-dashed border-violet-500 bg-violet-50 ring-2 ring-violet-500/30'
              : 'border-dashed border-zinc-300 bg-white hover:border-violet-400 hover:bg-violet-50/50 hover:shadow-sm',
      )}
    >
      <IconButton
        ref={setActivatorNodeRef}
        label={`Move ${item.label}`}
        className={cn(
          // Drag/drop indicator: hidden at rest, revealed on hover or while active.
          'absolute right-1 top-1 z-10 h-6! w-6! cursor-grab rounded-md shadow-sm transition-opacity group-hover:opacity-100 active:cursor-grabbing',
          isSelected ? 'opacity-100' : 'opacity-0',
        )}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
      </IconButton>
      <TypeLabel type={item.type} isSelected={isSelected} />
      {/*
        Wide enough → the live component (regardless of selection; the border +
        grip just overlay it). Otherwise a selected cell collapses to its glyph
        and an idle cell shows its chip.
      */}
      {live ?? (isSelected ? <ActiveBody item={item} /> : <CellContent item={item} />)}
    </div>
  )
}

/**
 * Memoized GridItem (fix #2). Props are referentially stable for unchanged
 * items (store mutations preserve item references), so editing one item no
 * longer re-renders the rest. Note: during a drag, `useSortable` still re-runs
 * via dnd-kit context — that's inherent and unaffected by this memo.
 */
export const GridItemMemo = memo(GridItem)

export function GridItemOverlay({ item }: { item: GridItemData }) {
  return (
    <div className="relative flex h-14 w-full cursor-grabbing items-center justify-center rounded-lg border-2 border-solid border-violet-500 bg-white p-2 shadow-2xl shadow-violet-500/30 ring-2 ring-violet-400/50">
      <span className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md border border-violet-500 bg-violet-50 text-violet-700 shadow-sm">
        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="text-xs font-medium text-zinc-400">{item.label}</span>
    </div>
  )
}
