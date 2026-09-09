import { useDraggable } from '@dnd-kit/core'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '../common'
import { childCanvasCount } from './types'
import { COMPONENT_GROUPS, type ComponentDef } from './componentCatalog'
import { useGridStore } from './gridStore'
import { LayersPanel } from './LayersPanel'
import { PagesPanel } from './PagesPanel'

/** dnd-kit id prefix for toolbox draggables — distinguishes them from grid item ids. */
export const TOOLBOX_DRAG_PREFIX = 'toolbox:'

export type ToolboxDragData = { from: 'toolbox'; def: ComponentDef }

type ToolboxItemProps = {
  def: ComponentDef
}

// A palette tile: drag it onto the canvas to insert at the drop point (handled
// in Layout's DndContext), or click it to append (dnd-kit's 4px activation
// distance keeps a plain click from starting a drag). Container-hosting types
// draw dashed, like the mockup. The original tile dims while dragging; a
// floating preview (`ToolboxDragOverlay`) follows the cursor.
function ToolboxItem({ def }: ToolboxItemProps) {
  const Icon = def.icon
  const addItem = useGridStore((s) => s.addItem)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${TOOLBOX_DRAG_PREFIX}${def.type}`,
    data: { from: 'toolbox', def } satisfies ToolboxDragData,
  })
  const isContainer = childCanvasCount(def.type, undefined) > 0 || def.type === 'tab'
  return (
    <button
      ref={setNodeRef}
      type="button"
      title={`Drag ${def.label} onto the canvas, or click to append it`}
      onClick={() => addItem({ type: def.type, label: def.label })}
      {...listeners}
      {...attributes}
      className={cn(
        'group flex h-[58px] touch-none flex-col items-center justify-center gap-1.5 rounded-md border border-line bg-surface p-1 text-center text-ui-xs font-medium leading-tight text-ink-2',
        'cursor-grab transition-[border-color,color,transform] duration-100 hover:border-line-strong hover:text-ink active:scale-[0.97] active:cursor-grabbing',
        isContainer && 'border-dashed',
        isDragging && 'opacity-40',
      )}
    >
      <Icon
        className="h-[15px] w-[15px] text-ink-3 transition-colors group-hover:text-ink"
        aria-hidden="true"
      />
      <span>{def.label}</span>
    </button>
  )
}

/** Floating preview rendered in the DragOverlay while a toolbox tile is dragged. */
export function ToolboxDragOverlay({ def }: { def: ComponentDef }) {
  const Icon = def.icon
  return (
    <div className="flex cursor-grabbing items-center gap-2 rounded-md border border-focus bg-surface px-3 py-2 shadow-frame ring-1 ring-focus">
      <Icon className="h-4 w-4 text-ink" aria-hidden="true" />
      <span className="text-ui-sm font-medium text-ink">{def.label}</span>
    </div>
  )
}

type LeftTab = 'components' | 'layers' | 'pages'

const LEFT_TABS: { value: LeftTab; label: string }[] = [
  { value: 'components', label: 'Components' },
  { value: 'layers', label: 'Layers' },
  { value: 'pages', label: 'Pages' },
]

/**
 * The left pane: mini-tabs over the component palette (draggable / clickable
 * tiles, searchable), the Layers tree of the whole canvas, and the project's
 * Pages.
 */
export function Toolbox() {
  const [tab, setTab] = useState<LeftTab>('components')

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex shrink-0 gap-0.5 border-b border-line p-1.5" role="tablist">
        {LEFT_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className="mini-tab"
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'components' ? <Palette /> : tab === 'layers' ? <LayersPanel /> : <PagesPanel />}
    </aside>
  )
}

function Palette() {
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
    <>
      <div className="shrink-0 border-b border-line p-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components…"
            aria-label="Search components"
            className="field pl-7"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {groups.length === 0 ? (
          <p className="px-1 py-6 text-center text-ui text-ink-3">
            No components match “{query}”.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.category} className="mb-3 last:mb-0">
              <h3 className="sec-label block px-1 pb-1.5 pt-1">{group.category}</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {group.items.map((def) => (
                  <ToolboxItem key={def.type} def={def} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
