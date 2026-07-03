import { useMemo, useState, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from './cn'

export type SortableCardContext = {
  /** True while any card in the list is lifted (pointer or keyboard drag).
   * Consumers use it to render every card collapsed for uniform slot heights. */
  dragging: boolean
  /** Ready-made grab handle (drag listeners live only here, so the card's
   * inputs stay freely clickable) — place it wherever the card wants its grip. */
  grip: ReactNode
}

function SortableCard({
  id,
  gripLabel,
  className,
  children,
}: {
  id: string
  gripLabel: string
  className?: string
  children: (grip: ReactNode) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  // Keyboard path: focus the grip, Space lifts, arrows move, Space drops.
  const grip = (
    <button
      type="button"
      aria-label={gripLabel}
      title={gripLabel}
      {...attributes}
      {...listeners}
      className="flex h-6 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-zinc-400 transition-colors hover:text-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 active:cursor-grabbing"
    >
      <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  )

  return (
    <div
      ref={setNodeRef}
      // Translate only (no scale): with all cards collapsed during a drag the
      // heights are uniform, and scaling would distort the card chrome.
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
      }}
      className={cn(className, isDragging && 'relative opacity-40')}
    >
      {children(grip)}
    </div>
  )
}

/**
 * A vertically sortable list of cards for the config panels' ordered editors
 * (data-table / editable-table columns). Owns the whole dnd-kit stack — its own
 * `DndContext` (the inspector sidebar sits outside the canvas's context in
 * `Layout.tsx`, so there's no nesting) + `SortableContext`, pointer sensor with
 * a small activation distance, and a keyboard sensor on the grip. The reordered
 * array is committed once, on drop; Esc-cancel restores order for free.
 *
 * Items must carry a stable `id` — cards are keyed and sorted by it, never by
 * index.
 */
export function SortableCardList<T extends { id: string }>({
  items,
  onReorder,
  cardClassName,
  gripLabel,
  children,
}: {
  items: T[]
  onReorder: (next: T[]) => void
  /** Card wrapper classes — the wrapper div must be the sortable node, so the
   * card chrome lives here rather than in the render prop. */
  cardClassName?: string
  gripLabel: (item: T, index: number) => string
  children: (item: T, index: number, ctx: SortableCardContext) => ReactNode
}) {
  const [dragging, setDragging] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Stable id array keyed on the sequence (same trick as Layout.tsx), so
  // per-field edits don't churn the SortableContext value.
  const idSequence = items.map((i) => i.id).join(',')
  const sortableIds = useMemo(() => idSequence.split(',').filter(Boolean), [idSequence])

  const handleDragEnd = (event: DragEndEvent) => {
    setDragging(false)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === String(active.id))
    const to = items.findIndex((i) => i.id === String(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(items, from, to))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => setDragging(true)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(false)}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <SortableCard
            key={item.id}
            id={item.id}
            gripLabel={gripLabel(item, index)}
            className={cardClassName}
          >
            {(grip) => children(item, index, { dragging, grip })}
          </SortableCard>
        ))}
      </SortableContext>
    </DndContext>
  )
}
