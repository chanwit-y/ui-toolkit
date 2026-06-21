import { useDraggable } from '@dnd-kit/core'
import { LayoutGrid, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '../common'
import { COMPONENT_GROUPS, type ComponentDef } from './componentCatalog'

/** dnd-kit id prefix for toolbox draggables — distinguishes them from grid item ids. */
export const TOOLBOX_DRAG_PREFIX = 'toolbox:'

export type ToolboxDragData = { from: 'toolbox'; def: ComponentDef }

type ToolboxItemProps = {
  def: ComponentDef
}

// A draggable palette tile. There is no onClick — the interaction is dragging
// the tile onto the canvas, which appends a grid item (handled in Layout's
// DndContext). The original tile dims while dragging; a floating preview
// (`ToolboxDragOverlay`) follows the cursor.
function ToolboxItem({ def }: ToolboxItemProps) {
  const Icon = def.icon
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${TOOLBOX_DRAG_PREFIX}${def.type}`,
    data: { from: 'toolbox', def } satisfies ToolboxDragData,
  })
  return (
    <button
      ref={setNodeRef}
      type="button"
      title={`Drag ${def.label} onto the canvas`}
      {...listeners}
      {...attributes}
      className={cn(
        'group flex touch-none flex-col items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-3 text-center',
        'cursor-grab transition-colors hover:border-violet-400 hover:bg-violet-50 active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
    >
      <Icon
        className="h-5 w-5 text-zinc-500 transition-colors group-hover:text-violet-600"
        aria-hidden="true"
      />
      <span className="text-[11px] font-medium leading-tight text-zinc-600 group-hover:text-violet-700">
        {def.label}
      </span>
    </button>
  )
}

/** Floating preview rendered in the DragOverlay while a toolbox tile is dragged. */
export function ToolboxDragOverlay({ def }: { def: ComponentDef }) {
  const Icon = def.icon
  return (
    <div className="flex cursor-grabbing items-center gap-2 rounded-lg border-2 border-violet-500 bg-white px-3 py-2 shadow-2xl shadow-violet-500/30 ring-2 ring-violet-400/50">
      <Icon className="h-4 w-4 text-violet-600" aria-hidden="true" />
      <span className="text-xs font-medium text-zinc-700">{def.label}</span>
    </div>
  )
}

/**
 * Left sidebar palette of available components. Each tile is draggable onto the
 * canvas to append a grid item (see Layout's drag handling). The search box
 * filters by label or type across all categories.
 */
export function Toolbox() {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMPONENT_GROUPS
    return COMPONENT_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q),
      ),
    })).filter((group) => group.items.length > 0)
  }, [query])

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 px-4 py-3">
        <LayoutGrid className="h-4 w-4 text-violet-600" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-zinc-800">Components</h2>
      </div>

      <div className="shrink-0 border-b border-zinc-200 p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components"
            className="w-full rounded-md border border-zinc-300 bg-white py-1.5 pl-8 pr-2.5 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {groups.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-zinc-400">
            No components match “{query}”.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.category} className="mb-4 last:mb-0">
              <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                {group.category}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((def) => (
                  <ToolboxItem key={def.type} def={def} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
