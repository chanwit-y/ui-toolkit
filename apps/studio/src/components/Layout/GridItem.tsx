import type { DataType } from '@gummy-ui/ui'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Calendar,
  GripVertical,
  Hash,
  Link,
  Lock,
  Mail,
  Phone,
  Search,
  Type,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { memo } from 'react'
import { cn, IconButton } from '../common'
import { COMPONENT_BY_TYPE } from './componentCatalog'
import { useGridStore } from './gridStore'
import type { GridItemData, TextFieldConfig } from './types'
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
 * The cell's visual content when NOT active. A textfield shows a compact,
 * size-aware chip (icon + label + dataType); every other component type shows
 * its label as a placeholder.
 */
function CellContent({ item }: { item: GridItemData }) {
  if (item.type === 'textfield' && item.config) {
    return <TextFieldChip config={item.config} />
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
      ? iconForDataType(item.config.dataType)
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
 * Minimal collapsed representation, size-aware via a container query on the
 * cell's measured width (colSpan makes cells narrower at smaller breakpoints):
 * icon is always shown; the label appears once there's room (~8rem); the
 * dataType badge only when the cell is wide (~13rem). Keeps the chip readable
 * instead of truncating to noise on narrow cells.
 */
function TextFieldChip({ config }: { config: TextFieldConfig }) {
  const Icon = iconForDataType(config.dataType)
  return (
    <div
      data-grid-item-content
      className="@container flex h-full w-full items-center justify-center gap-2 px-1 @min-[8rem]:justify-start @min-[8rem]:pl-6"
    >
      <Icon className="h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
      <span className="hidden min-w-0 truncate text-xs font-medium text-zinc-700 @min-[8rem]:block">
        {config.label}
        {config.isRequired && <span className="text-red-500"> *</span>}
      </span>
      <span className="ml-auto hidden shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 @min-[13rem]:inline-block">
        {config.dataType}
      </span>
    </div>
  )
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

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
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
          'absolute left-1 top-1 z-10 h-6! w-6! cursor-grab rounded-md shadow-sm transition-opacity group-hover:opacity-100 active:cursor-grabbing',
          isSelected ? 'opacity-100' : 'opacity-0',
        )}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
      </IconButton>
      <TypeLabel type={item.type} isSelected={isSelected} />
      {/* Active cells collapse to just the component icon + the pill above. */}
      {isSelected ? <ActiveBody item={item} /> : <CellContent item={item} />}
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
      <span className="absolute left-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md border border-violet-500 bg-violet-50 text-violet-700 shadow-sm">
        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="text-xs font-medium text-zinc-400">{item.label}</span>
    </div>
  )
}
