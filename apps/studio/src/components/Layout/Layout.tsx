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
import { useStudioStore } from '../studioStore'
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
import { useProjectEndpoints } from '../Library/scope'
import { BREAKPOINTS } from './breakpoints'
import type { ComponentDef } from './componentCatalog'
import { SMOOTH_EASING } from './gridAnimation'
import { gridConfigToJson } from './gridConfig'
import { GridItemMemo, GridItemOverlay } from './GridItem'
import {
  selectActiveItems,
  selectActiveSettings,
  useActiveItem,
  useBreadcrumb,
  useGridStore,
} from './gridStore'
import { generateGridStyles } from './gridStyles'
import { PreviewToolbar } from './PreviewToolbar'
import { Sidebar } from './Sidebar'
import { Toolbox, ToolboxDragOverlay, type ToolboxDragData } from './Toolbox'
import type { GridItemData } from './types'
import { useActivePage, useActiveProject } from '../Workspace/workspaceStore'
import { useGridFlipAnimation } from './useGridFlipAnimation'
import { useUndoShortcuts } from './useUndoShortcuts'
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
        className={`gl-${layoutId} relative z-[1] min-h-[398px] w-full`}
        onClick={onCanvasClick}
      >
        {items.length === 0 ? (
          <div className="col-span-full flex min-h-[200px] flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-line-strong px-5 py-10 text-center text-ui text-ink-2">
            <LayoutGrid className="mb-1 h-5 w-5 text-ink-3" aria-hidden="true" />
            <b className="text-[13px] font-semibold text-ink">This canvas is empty</b>
            Drag a component from the left, or click one to append it.
            <span className="text-ink-3">
              Containers accept nested components and keep their own column count.
            </span>
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

/**
 * The browser-chrome strip on top of the preview frame (mockup `.frame-chrome`):
 * traffic dots, the page's route under the project (plus the drill-in trail),
 * and `BP · width · columns`. Subscribes to the stores itself so the memoized
 * EditorBody never re-renders for it.
 */
function FrameChrome() {
  const bp = useGridStore((s) => s.previewBreakpoint)
  const columns = useGridStore((s) => selectActiveSettings(s).columns[s.previewBreakpoint])
  const trail = useBreadcrumb()
  const project = useActiveProject()
  const page = useActivePage()
  const width = BREAKPOINTS.find((b) => b.key === bp)?.previewWidth
  const slug = (p: string) => p.toLowerCase().replace(/\s+/g, '-')
  const path =
    slug(project?.name ?? 'project') +
    (page?.path ?? '') +
    trail.map((t) => '/' + slug(t.label)).join('')
  return (
    <div className="flex h-7 shrink-0 items-center gap-2 border-b border-line bg-panel px-2.5 font-mono text-ui-xs text-ink-3">
      <span className="flex gap-1" aria-hidden="true">
        <i className="block h-[7px] w-[7px] rounded-full bg-line-strong" />
        <i className="block h-[7px] w-[7px] rounded-full bg-line-strong" />
        <i className="block h-[7px] w-[7px] rounded-full bg-line-strong" />
      </span>
      <span className="min-w-0 truncate">{path}</span>
      <span className="flex-1" />
      <span>
        {bp.toUpperCase()} · {width ? `${width}px` : 'fluid'} · {columns} col
      </span>
    </div>
  )
}

/**
 * Dashed column guides behind the cells (mockup `.stage-guides`), following the
 * active canvas's column count at the preview breakpoint. Toggled from the
 * canvas bar; purely decorative (`pointer-events-none`, below the grid).
 */
function CanvasGuides() {
  const guides = useStudioStore((s) => s.guides)
  const columns = useGridStore((s) => selectActiveSettings(s).columns[s.previewBreakpoint])
  if (!guides) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-4 z-0 grid"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {Array.from({ length: columns }, (_, i) => (
        <i
          key={i}
          className="block h-full border-l border-dashed border-grid-line last:border-r"
        />
      ))}
    </div>
  )
}

type EditorBodyProps = {
  sortableIds: string[]
  items: GridItemData[]
  selectedItemId: string | null
  activeItem: GridItemData | null
  layoutId: string
  gridRef: React.RefObject<HTMLDivElement | null>
  frameRef: React.RefObject<HTMLDivElement | null>
  /** Master-layout editor: no Pages / Templates tabs in the palette. */
  templateMode: boolean
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
  templateMode,
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
      <Toolbox templateMode={templateMode} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-sunken">
        <PreviewToolbar />

        <div className="flex min-h-0 flex-1 justify-center overflow-auto px-5 pb-16 pt-[22px]">
          <div
            ref={frameRef}
            className="flex w-full max-w-full flex-col self-start overflow-hidden rounded-[10px] border border-line bg-surface shadow-frame"
            style={{ width: 'var(--preview-frame-w, 100%)' }}
          >
            <FrameChrome />
            <div className="relative p-4">
              <CanvasGuides />
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

export function Layout({ templateMode = false }: { templateMode?: boolean } = {}) {
  const layoutId = escapeClassName(useId())

  // The canvas renders the ACTIVE canvas (drill-in aware); the code tab always
  // serializes from the root so the export covers the whole tree.
  const items = useGridStore(selectActiveItems)
  const containerSettings = useGridStore(selectActiveSettings)
  const rootItems = useGridStore((s) => s.items)
  const rootSettings = useGridStore((s) => s.containerSettings)
  const previewBreakpoint = useGridStore((s) => s.previewBreakpoint)
  const sidebarView = useGridStore((s) => s.sidebarView)
  const selectedItemId = useGridStore((s) => s.selectedItemId)

  const setAnimator = useGridStore((s) => s.setAnimator)
  const clearSelection = useGridStore((s) => s.clearSelection)

  const activeItem = useActiveItem()

  useUndoShortcuts()

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

  // Endpoint refs resolve against the attached endpoints' current names at
  // export — a ref to a detached endpoint is a dangling ref, like a deleted one.
  const endpoints = useProjectEndpoints()

  const gridConfigJson = useMemo(
    () => (computeCode ? gridConfigToJson(rootSettings, rootItems, endpoints) : ''),
    [computeCode, rootSettings, rootItems, endpoints],
  )

  const fullGridCss = useMemo(
    () => (computeCode ? generateGridStyles(layoutId, rootSettings, rootItems) : ''),
    [computeCode, layoutId, rootSettings, rootItems],
  )

  const previewWidthPx = BREAKPOINTS.find((b) => b.key === previewBreakpoint)?.previewWidth
  // Fed to the dnd subtree's preview frame via CSS, not props, so changing the
  // breakpoint never re-renders the memoized EditorBody (preserves the
  // 100-item no-churn-on-breakpoint-switch win).
  const previewFrameWidth = previewWidthPx != null ? `${previewWidthPx}px` : '100%'

  return (
    <Profiler id="grid" onRender={onRenderCommit}>
      <div
        className="flex min-h-0 flex-1 bg-sunken"
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
          templateMode={templateMode}
        />

        <Sidebar gridConfigJson={gridConfigJson} fullGridCss={fullGridCss} />
      </div>
    </Profiler>
  )
}
