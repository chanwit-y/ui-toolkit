import { useDraggable } from '@dnd-kit/core'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '../common'
import { childCanvasCount } from './types'
import { COMPONENT_GROUPS, type ComponentDef } from './componentCatalog'
import { useGridStore } from './gridStore'
import { LayersPanel } from './LayersPanel'
import { PagesPanel } from './PagesPanel'
import { TemplatesPanel } from './TemplatesPanel'

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
      title={
        def.designOnly
          ? `${def.label} — design only (no library component yet). Drag onto the canvas, or click to append it`
          : `Drag ${def.label} onto the canvas, or click to append it`
      }
      onClick={() => addItem({ type: def.type, label: def.label })}
      {...listeners}
      {...attributes}
      className={cn(
        'group relative flex h-[58px] touch-none flex-col items-center justify-center gap-1.5 rounded-md border border-line bg-surface p-1 text-center text-ui-xs font-medium leading-tight text-ink-2',
        'cursor-grab transition-[border-color,color,transform] duration-100 hover:border-line-strong hover:text-ink active:scale-[0.97] active:cursor-grabbing',
        isContainer && 'border-dashed',
        isDragging && 'opacity-40',
      )}
    >
      {def.designOnly && (
        <span
          aria-hidden="true"
          title="Design only"
          className="absolute right-1 top-1 block h-1.5 w-1.5 rounded-full bg-warn"
        />
      )}
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

type LeftTab = 'components' | 'layers' | 'pages' | 'templates'

const LEFT_TABS: { value: LeftTab; label: string; projectOnly?: boolean }[] = [
  { value: 'components', label: 'Components' },
  { value: 'layers', label: 'Layers' },
  { value: 'pages', label: 'Pages', projectOnly: true },
  { value: 'templates', label: 'Templates', projectOnly: true },
]

/**
 * The left pane: mini-tabs over the component palette (draggable / clickable
 * tiles, searchable), the Layers tree of the whole canvas, and — inside a
 * project — its Pages and the library's Templates. The master-layout editor
 * (`templateMode`) hides the two project tabs.
 */
export function Toolbox({ templateMode = false }: { templateMode?: boolean }) {
  const [tab, setTab] = useState<LeftTab>('components')
  const tabs = LEFT_TABS.filter((t) => !(templateMode && t.projectOnly))
  const current = tabs.some((t) => t.value === tab) ? tab : 'components'

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex shrink-0 gap-0.5 border-b border-line p-1.5" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={current === t.value}
            onClick={() => setTab(t.value)}
            className="mini-tab"
          >
            {t.label}
          </button>
        ))}
      </div>

      {current === 'components' ? (
        <Palette />
      ) : current === 'layers' ? (
        <LayersPanel />
      ) : current === 'pages' ? (
        <PagesPanel />
      ) : (
        <TemplatesPanel />
      )}
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
