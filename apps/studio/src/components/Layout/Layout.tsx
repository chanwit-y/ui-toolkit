import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { LayoutGrid } from 'lucide-react'
import {
  memo,
  Profiler,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ProfilerOnRenderCallback,
} from 'react'
import { BREAKPOINTS } from './breakpoints'
import type { ComponentDef } from './componentCatalog'
import { SMOOTH_EASING } from './gridAnimation'
import { gridConfigToJson } from './gridConfig'
import { GridItemMemo, GridItemOverlay } from './GridItem'
import { useActiveItem, useGridStore } from './gridStore'
import { generateGridStyles } from './gridStyles'
import { PreviewToolbar } from './PreviewToolbar'
import { Sidebar } from './Sidebar'
import { Toolbox, ToolboxDragOverlay, type ToolboxDragData } from './Toolbox'
import type { GridItemData } from './types'
import { useGridFlipAnimation } from './useGridFlipAnimation'
import { escapeClassName } from './utils'

// Dev-only commit logger. No-op in prod (the <Profiler> below is unconditional,
// but React strips Profiler overhead from production builds).
const onRenderCommit: ProfilerOnRenderCallback = (_id, phase, actualDuration) => {
  if (import.meta.env.DEV) {
    console.debug(`[perf] commit (${phase}): ${actualDuration.toFixed(2)}ms`)
  }
}

// Memoized grid item so unchanged items skip re-render when the canvas
// re-renders (see EditorBody note for why this alone isn't sufficient).
const ItemComponent = GridItemMemo

/** Reads `data` off a drag event's active node as toolbox drag data, or null. */
function asToolboxDrag(data: unknown): ToolboxDragData | null {
  return (data as ToolboxDragData | undefined)?.from === 'toolbox'
    ? (data as ToolboxDragData)
    : null
}

/**
 * Reading-order insertion index for a pointer dropped at (px, py), by
 * hit-testing the rendered `[data-grid-item]` rects (which are in store order).
 * Done from geometry rather than dnd-kit's `over` because the full-canvas
 * container droppable competes with item droppables under `closestCenter` and
 * would skew the target. Returns the first item that sits *after* the pointer in
 * reading order (lower row, or same row and right of its midpoint); falls
 * through to the end (append) when the pointer is past every item.
 */
function computeInsertIndex(container: HTMLElement, px: number, py: number): number {
  const els = Array.from(
    container.querySelectorAll<HTMLElement>('[data-grid-item]'),
  )
  for (let i = 0; i < els.length; i++) {
    const r = els[i].getBoundingClientRect()
    if (py < r.top) return i // pointer is in a row above this item
    if (py <= r.bottom && px < r.left + r.width / 2) return i // same row, left half
  }
  return els.length
}

type GridCanvasProps = {
  sortableIds: string[]
  items: GridItemData[]
  selectedItemId: string | null
  layoutId: string
  gridRef: React.RefObject<HTMLDivElement | null>
  onCanvasClick: () => void
}

/**
 * The sortable grid surface. It is also a droppable (`grid-canvas`) so a toolbox
 * tile dropped anywhere on it — including when the grid is empty — registers an
 * `over` target. Memoized so it skips re-rendering when only the active drag
 * overlay changes (it deliberately does NOT take `activeItem` as a prop).
 */
function GridCanvasInner({
  sortableIds,
  items,
  selectedItemId,
  layoutId,
  gridRef,
  onCanvasClick,
}: GridCanvasProps) {
  const { setNodeRef: setDroppableRef } = useDroppable({ id: 'grid-canvas' })
  // Merge the FLIP container ref with the droppable ref — both need the node.
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      gridRef.current = node
      setDroppableRef(node)
    },
    [gridRef, setDroppableRef],
  )

  return (
    <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
      <div
        ref={setRefs}
        className={`gl-${layoutId} w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm`}
        onClick={onCanvasClick}
      >
        {items.length === 0 ? (
          <div className="col-span-full flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 text-sm text-zinc-500">
            <LayoutGrid className="h-6 w-6 text-zinc-400" aria-hidden="true" />
            Drag a component from the toolbox to add one.
          </div>
        ) : (
          items.map((item) => (
            <ItemComponent
              key={item.id}
              item={item}
              isSelected={selectedItemId === item.id}
            />
          ))
        )}
      </div>
    </SortableContext>
  )
}

const GridCanvas = memo(GridCanvasInner)

type EditorBodyProps = {
  sortableIds: string[]
  items: GridItemData[]
  selectedItemId: string | null
  activeItem: GridItemData | null
  layoutId: string
  gridRef: React.RefObject<HTMLDivElement | null>
  frameRef: React.RefObject<HTMLDivElement | null>
}

/**
 * The whole dnd-kit subtree: the Toolbox (drag source) and the canvas (drop
 * target) under one `DndContext`, so a component can be dragged from palette to
 * grid. Extracted and memoized so it does NOT re-render when only
 * `previewBreakpoint` / popover / code-panel state changes — none of those are
 * in its props. Without this, any Layout re-render re-creates DndContext's
 * context value and forces every `useSortable` / `useDraggable` to re-render
 * (which is why `memo(GridItem)` alone does nothing). The preview frame width is
 * fed via the `--preview-frame-w` CSS variable (set on Layout's outer element),
 * not a prop, precisely so a breakpoint switch never re-renders this subtree.
 *
 * Sensors live here (not a prop) so an unstable sensor array can't defeat the memo.
 */
function EditorBodyInner({
  sortableIds,
  items,
  selectedItemId,
  activeItem,
  layoutId,
  gridRef,
  frameRef,
}: EditorBodyProps) {
  const addItem = useGridStore((s) => s.addItem)
  const moveItem = useGridStore((s) => s.moveItem)
  const setActiveId = useGridStore((s) => s.setActiveId)
  const clearSelection = useGridStore((s) => s.clearSelection)

  // The toolbox component being dragged (for the overlay preview), or null.
  const [activeToolbox, setActiveToolbox] = useState<ComponentDef | null>(null)
  // Kind of the current/just-finished drag, read by the DragOverlay to decide
  // the drop animation. Not reset on drag end so it still holds the right value
  // during dnd-kit's drop-animation phase, after `activeToolbox` is cleared.
  const [dragKind, setDragKind] = useState<'item' | 'toolbox'>('item')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const toolbox = asToolboxDrag(event.active.data.current)
      if (toolbox) {
        setDragKind('toolbox')
        setActiveToolbox(toolbox.def)
      } else {
        setDragKind('item')
        setActiveId(String(event.active.id))
      }
    },
    [setActiveId],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      const toolbox = asToolboxDrag(active.data.current)
      if (toolbox) {
        setActiveToolbox(null)
        const container = gridRef.current
        // `over` gates the drop to the canvas (null ⇒ released off it). The
        // index is computed from the pointer's final position, not `over`.
        if (!over || !container) return
        const activator = event.activatorEvent as PointerEvent
        const px = activator.clientX + event.delta.x
        const py = activator.clientY + event.delta.y
        addItem(
          { type: toolbox.def.type, label: toolbox.def.label },
          computeInsertIndex(container, px, py),
        )
        return
      }
      // Reorder an existing item.
      setActiveId(null)
      if (!over || active.id === over.id) return
      moveItem(String(active.id), String(over.id))
    },
    [addItem, moveItem, setActiveId, gridRef],
  )

  const handleDragCancel = useCallback(() => {
    setActiveToolbox(null)
    setActiveId(null)
  }, [setActiveId])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Toolbox />

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mx-auto flex min-h-0 w-full flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100/80">
            <PreviewToolbar />

            <div
              className="flex min-h-0 flex-1 flex-col items-center p-4"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(113,113,122,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(113,113,122,0.12) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            >
              <div
                ref={frameRef}
                className="mx-auto w-full max-w-full rounded-lg"
                style={{ width: 'var(--preview-frame-w, 100%)' }}
              >
                <GridCanvas
                  sortableIds={sortableIds}
                  items={items}
                  selectedItemId={selectedItemId}
                  layoutId={layoutId}
                  gridRef={gridRef}
                  onCanvasClick={clearSelection}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Suppress the default "fly back to source" for toolbox drops — the new
          grid item's enter "pop" carries the landing instead. Item reorders keep
          the settle animation. */}
      <DragOverlay
        dropAnimation={
          dragKind === 'toolbox'
            ? null
            : { duration: 220, easing: SMOOTH_EASING }
        }
      >
        {activeToolbox ? (
          <ToolboxDragOverlay def={activeToolbox} />
        ) : activeItem ? (
          <GridItemOverlay item={activeItem} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

const EditorBody = memo(EditorBodyInner)

export function Layout() {
  const layoutId = escapeClassName(useId())

  const items = useGridStore((s) => s.items)
  const containerSettings = useGridStore((s) => s.containerSettings)
  const previewBreakpoint = useGridStore((s) => s.previewBreakpoint)
  const sidebarView = useGridStore((s) => s.sidebarView)
  const selectedItemId = useGridStore((s) => s.selectedItemId)

  const setAnimator = useGridStore((s) => s.setAnimator)
  const clearSelection = useGridStore((s) => s.clearSelection)

  const activeItem = useActiveItem()

  // Click-away deselect: a pointer-down anywhere that isn't on a grid item or
  // inside a sidebar panel de-activates the current selection. Sidebars are
  // exempt because the right one (the inspector) is where you edit the selected
  // item — clicking into it must keep the cell active. Listens on `document` so
  // clicking the gray frame, the preview toolbar, or off the editor entirely all
  // count as "focus off". Capture phase so it runs regardless of inner handlers.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (target.closest('[data-grid-item]') || target.closest('aside')) return
      clearSelection()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [clearSelection])

  // FLIP animation lives in React (DOM refs + effects); register its callbacks
  // with the store so data actions can animate layout changes.
  const { gridRef, frameRef, captureSnapshot, scheduleAnimation } = useGridFlipAnimation()
  useEffect(() => {
    setAnimator({ capture: captureSnapshot, schedule: scheduleAnimation })
    return () => setAnimator(null)
  }, [setAnimator, captureSnapshot, scheduleAnimation])

  const gridCss = useMemo(
    () => generateGridStyles(layoutId, containerSettings, items, previewBreakpoint),
    [layoutId, containerSettings, items, previewBreakpoint],
  )

  // Stable id array for SortableContext. Without this, a fresh
  // `items.map(i => i.id)` every render changes the dnd-kit context value and
  // forces every `useSortable` consumer to re-render. Keyed on the id
  // *sequence*, so it only changes on add/remove/reorder, not on per-item
  // settings edits.
  const idSequence = items.map((i) => i.id).join(',')
  const sortableIds = useMemo(
    () => idSequence.split(',').filter(Boolean),
    [idSequence],
  )

  // The JSON config and full responsive CSS are only shown in the code view,
  // so only build them when it's open — otherwise every edit pays to serialize
  // the whole config and regenerate the full stylesheet for nothing.
  const computeCode = sidebarView === 'code'

  const gridConfigJson = useMemo(
    () => (computeCode ? gridConfigToJson(containerSettings, items) : ''),
    [computeCode, containerSettings, items],
  )

  const fullGridCss = useMemo(
    () => (computeCode ? generateGridStyles(layoutId, containerSettings, items) : ''),
    [computeCode, layoutId, containerSettings, items],
  )

  const previewWidthPx = BREAKPOINTS.find((b) => b.key === previewBreakpoint)?.previewWidth
  // Fed to the dnd subtree's preview frame via CSS, not props, so changing the
  // breakpoint never re-renders the memoized EditorBody (preserves the
  // 100-item no-churn-on-breakpoint-switch win).
  const previewFrameWidth = previewWidthPx != null ? `${previewWidthPx}px` : '100%'

  return (
    <Profiler id="grid" onRender={onRenderCommit}>
      <div
        className="flex min-h-0 flex-1 bg-zinc-50"
        style={{ '--preview-frame-w': previewFrameWidth } as React.CSSProperties}
      >
        <style dangerouslySetInnerHTML={{ __html: gridCss }} />

        <EditorBody
          sortableIds={sortableIds}
          items={items}
          selectedItemId={selectedItemId}
          activeItem={activeItem}
          layoutId={layoutId}
          gridRef={gridRef}
          frameRef={frameRef}
        />

        <Sidebar gridConfigJson={gridConfigJson} fullGridCss={fullGridCss} />
      </div>
    </Profiler>
  )
}
