import { arrayMove } from '@dnd-kit/sortable'
import { create } from 'zustand'
import type { Breakpoint } from './breakpoints'
import type { ComponentType } from './componentCatalog'
import { ENTER_DURATION_MS, prefersReducedMotion } from './gridAnimation'
import { updateContainerBreakpoint, updateItemBreakpoint } from './gridSettings'
import { readSeedCount } from './perf'
import { countrySeedGridItems } from '../seed/country'
import {
  childCanvasCount,
  createChildCanvas,
  createDefaultAutocompleteConfig,
  createDefaultAvatarConfig,
  createDefaultButtonItemConfig,
  createDefaultCheckboxConfig,
  createDefaultDataTableConfig,
  createDefaultDataTableEditableConfig,
  createDefaultDateConfig,
  createDefaultDividerConfig,
  createDefaultHiddenConfig,
  createDefaultItemSettings,
  createDefaultModalConfig,
  createDefaultMultiAutocompleteConfig,
  createDefaultPaperConfig,
  createDefaultPopoverConfig,
  createDefaultRadioConfig,
  createDefaultSelectFieldConfig,
  createDefaultTabConfig,
  createDefaultTextareaConfig,
  createDefaultTextConfig,
  createDefaultTextFieldConfig,
  createDefaultTypographyConfig,
  createDefaultUploadFileConfig,
  createDefaultUploadImageConfig,
  defaultContainerSettings,
  type AvatarConfig,
  type ButtonItemConfig,
  type CheckboxConfig,
  type ChildCanvas,
  type DataTableConfig,
  type DataTableEditableConfig,
  type DateConfig,
  type DividerConfig,
  type GridContainerSettings,
  type GridItemData,
  type HiddenConfig,
  type ModalConfig,
  type MultiAutocompleteConfig,
  type PaperConfig,
  type PopoverConfig,
  type RadioConfig,
  type SelectFieldConfig,
  type TabConfig,
  type TextareaConfig,
  type TextConfig,
  type TextFieldConfig,
  type TypographyConfig,
  type UploadFileConfig,
  type UploadImageConfig,
} from './types'

/** A palette component being dropped onto the canvas. */
export type NewComponent = { type: ComponentType; label: string }

/**
 * One step of the drill-in path: which item's child canvas the editor is inside
 * (`canvasIndex` distinguishes a tab's canvases; it is 0 for the single-canvas
 * types). The root canvas is the empty path — see the grilled design: only one
 * flat canvas is ever active, so dnd-kit/selection/inspector work unchanged.
 */
export type PathSeg = { itemId: string; canvasIndex: number }

/**
 * Walk `path` down from the root canvas, returning each step's canvas. Stops at
 * the first dangling segment (item removed / canvas gone), so callers can heal
 * by truncating to what resolved.
 */
function resolvePath(
  root: ChildCanvas,
  path: PathSeg[],
): { canvases: ChildCanvas[]; items: GridItemData[] } {
  const canvases: ChildCanvas[] = [root]
  const pathItems: GridItemData[] = []
  let current = root
  for (const seg of path) {
    const item = current.items.find((i) => i.id === seg.itemId)
    const child = item?.childCanvases?.[seg.canvasIndex]
    if (!item || !child) break
    canvases.push(child)
    pathItems.push(item)
    current = child
  }
  return { canvases, items: pathItems }
}

/** The canvas at `path` (or the deepest resolvable ancestor). */
function canvasAtPath(root: ChildCanvas, path: PathSeg[]): ChildCanvas {
  const { canvases } = resolvePath(root, path)
  return canvases[canvases.length - 1]
}

/**
 * Immutably apply `fn` to the canvas at `path`, rebuilding only the spine of
 * ancestors (untouched siblings keep their references, preserving the memoized
 * GridItem no-rerender behavior).
 */
function updateCanvasAtPath(
  canvas: ChildCanvas,
  path: PathSeg[],
  fn: (canvas: ChildCanvas) => ChildCanvas,
): ChildCanvas {
  if (path.length === 0) return fn(canvas)
  const [head, ...rest] = path
  let changed = false
  const items = canvas.items.map((item) => {
    if (item.id !== head.itemId || !item.childCanvases) return item
    const child = item.childCanvases[head.canvasIndex]
    if (!child) return item
    const next = updateCanvasAtPath(child, rest, fn)
    if (next === child) return item
    changed = true
    const childCanvases = item.childCanvases.slice()
    childCanvases[head.canvasIndex] = next
    return { ...item, childCanvases }
  })
  return changed ? { ...canvas, items } : canvas
}

/** Which panel the right sidebar shows. `inspector` resolves to the selected
 * item's config+layout, or the container settings when nothing is selected. */
export type SidebarView = 'inspector' | 'layout' | 'code'

/**
 * Bridge to the FLIP animation layer. The animation relies on DOM refs and
 * effects that must live in React (see `useGridFlipAnimation`), so the store
 * doesn't own them directly. Instead the component registers `capture` /
 * `schedule` callbacks and store actions invoke them around data mutations.
 */
export type AnimationBridge = {
  capture: () => void
  schedule: (changedItemId?: string | 'all') => void
}

type GridState = {
  // Grid data — the ROOT canvas. Nested canvases live on items' `childCanvases`;
  // every data action below targets the canvas at `activePath`.
  items: GridItemData[]
  containerSettings: GridContainerSettings
  // Monotonic counter for unique textfield binding names (textField_1, _2, …).
  fieldSeq: number

  // Drill-in position: the child canvas the editor is inside ([] = root).
  activePath: PathSeg[]

  // Ids of items still playing their entrance: a freshly appeared cell stays a
  // cheap chip (suppressing its live preview) until its enter "pop" lands, so no
  // library component mounts mid-pop and reflows. Seeded with the initial items
  // and added to on every drop; each id is cleared by its own timer after
  // `ENTER_DURATION_MS`. Empty under reduced motion (no pop ⇒ nothing to guard).
  enteringIds: Set<string>

  // Drag state
  activeId: string | null

  // UI / selection state
  selectedItemId: string | null
  sidebarView: SidebarView
  previewBreakpoint: Breakpoint

  // Animation bridge
  animator: AnimationBridge | null
  setAnimator: (animator: AnimationBridge | null) => void

  // Data actions (animated)
  addItem: (component?: NewComponent, index?: number) => void
  removeItem: (id: string) => void
  removeSelectedItem: () => void
  updateContainer: (bp: Breakpoint, key: string, value: string, animate?: boolean) => void
  updateItem: (
    id: string,
    bp: Breakpoint,
    key: string,
    value: string,
    animate?: boolean,
  ) => void
  updateItemLabel: (id: string, label: string) => void
  updateItemConfig: (
    id: string,
    patch: Partial<
      | TextFieldConfig
      | TextareaConfig
      | SelectFieldConfig
      | MultiAutocompleteConfig
      | CheckboxConfig
      | RadioConfig
      | DateConfig
      | TextConfig
      | TypographyConfig
      | AvatarConfig
      | DividerConfig
      | ButtonItemConfig
      | HiddenConfig
      | PaperConfig
      | TabConfig
      | ModalConfig
      | PopoverConfig
    >,
  ) => void
  moveItem: (activeId: string, overId: string) => void

  // Tab canvas sync: add/remove a tab header and its child canvas together, so
  // `TabConfig.tabs` and `childCanvases` stay index-aligned.
  addTab: (itemId: string) => void
  removeTab: (itemId: string, index: number) => void

  // Drill-in navigation (see the grilled design: breadcrumb, arbitrary depth)
  enterCanvas: (itemId: string, canvasIndex: number) => void
  exitToDepth: (depth: number) => void

  // Drag actions
  setActiveId: (id: string | null) => void

  // UI actions
  selectItem: (id: string) => void
  clearSelection: () => void
  showContainer: () => void
  setSidebarView: (view: SidebarView) => void
  setPreviewBreakpoint: (bp: Breakpoint) => void
}

function createId(): string {
  return crypto.randomUUID()
}

function createInitialItems(): GridItemData[] {
  // Dev-only `?seed=N` benchmark seeding (no-op in prod, see perf.ts).
  const seed = readSeedCount()
  if (seed > 0) {
    return Array.from({ length: seed }, (_, i) => ({
      id: createId(),
      label: `Item ${i + 1}`,
      type: 'empty' as ComponentType,
      settings: createDefaultItemSettings({
        colSpan: { xs: 4, sm: 3, md: 2, lg: 2 },
      }),
    }))
  }

  // Studio boots with the country mock (see seed/country.ts): a small form +
  // a data table wired to the seeded searchCountries endpoint.
  return countrySeedGridItems()
}

export const useGridStore = create<GridState>((set, get) => {
  /** Wrap a data mutation in a FLIP snapshot/animation so layout changes animate. */
  const animated = (mutate: () => void, changedItemId?: string | 'all') => {
    const { animator } = get()
    animator?.capture()
    mutate()
    animator?.schedule(changedItemId)
  }

  /** The root canvas as a `ChildCanvas` (adapter over the two root fields). */
  const rootCanvas = (): ChildCanvas => {
    const { items, containerSettings } = get()
    return { items, settings: containerSettings }
  }

  /** The canvas the editor is currently inside. */
  const activeCanvas = (): ChildCanvas => canvasAtPath(rootCanvas(), get().activePath)

  /** Apply `fn` to the active canvas and commit the rebuilt root. */
  const setActiveCanvas = (fn: (canvas: ChildCanvas) => ChildCanvas) => {
    const next = updateCanvasAtPath(rootCanvas(), get().activePath, fn)
    set({ items: next.items, containerSettings: next.settings })
  }

  // Per-id timers that clear an entering flag once the pop has landed. Tracked so
  // a removed item (or a re-drop of the same id) never leaks a pending clear.
  const enterTimers = new Map<string, ReturnType<typeof setTimeout>>()

  /** True when an entrance animation will play — so the chip-stall is worth it. */
  const canEnter = () => typeof window !== 'undefined' && !prefersReducedMotion()

  /** Drop `id` from `enteringIds` after the enter "pop" duration, upgrading the
   * cell from its chip to the live preview. */
  const scheduleEnterClear = (id: string) => {
    const prev = enterTimers.get(id)
    if (prev) clearTimeout(prev)
    enterTimers.set(
      id,
      setTimeout(() => {
        enterTimers.delete(id)
        set((s) => {
          if (!s.enteringIds.has(id)) return {}
          const next = new Set(s.enteringIds)
          next.delete(id)
          return { enteringIds: next }
        })
      }, ENTER_DURATION_MS),
    )
  }

  /** Cancel a pending clear (item removed before its pop finished). */
  const cancelEnter = (id: string) => {
    const prev = enterTimers.get(id)
    if (prev) {
      clearTimeout(prev)
      enterTimers.delete(id)
    }
  }

  // Initial items land-as-chip too: seed their ids and arm the clear timers up
  // front so first paint behaves exactly like a drop (chip → fade-to-live).
  const initialItems = createInitialItems()
  const initialEntering = new Set<string>()
  if (canEnter()) {
    for (const it of initialItems) {
      initialEntering.add(it.id)
      scheduleEnterClear(it.id)
    }
  }

  return {
    items: initialItems,
    containerSettings: defaultContainerSettings,
    fieldSeq: 0,
    activePath: [],
    enteringIds: initialEntering,

    activeId: null,

    selectedItemId: null,
    sidebarView: 'inspector',
    previewBreakpoint: 'lg',

    animator: null,
    setAnimator: (animator) => set({ animator }),

    // `index` (when provided) inserts the new item at that position, shifting the
    // rest right; otherwise it appends. The new id isn't in the pre-mutation FLIP
    // snapshot, so it gets the enter "pop" animation while shifted neighbors FLIP.
    addItem: (component, index) =>
      animated(() => {
        const { fieldSeq } = get()
        const { items, settings } = activeCanvas()
        const bpCols = settings.columns
        const type: ComponentType = component?.type ?? 'empty'

        // Textfields and textareas get a unique binding name + a default config
        // (sharing the one `fieldSeq` counter for global uniqueness); other types
        // are config-less.
        let config:
          | TextFieldConfig
          | TextareaConfig
          | SelectFieldConfig
          | MultiAutocompleteConfig
          | CheckboxConfig
          | RadioConfig
          | DateConfig
          | UploadImageConfig
          | UploadFileConfig
          | DataTableConfig
          | DataTableEditableConfig
          | TextConfig
          | TypographyConfig
          | AvatarConfig
          | DividerConfig
          | ButtonItemConfig
          | HiddenConfig
          | PaperConfig
          | TabConfig
          | ModalConfig
          | PopoverConfig
          | undefined
        let nextSeq = fieldSeq
        if (type === 'textfield') {
          nextSeq = fieldSeq + 1
          config = createDefaultTextFieldConfig(`textField_${nextSeq}`)
        } else if (type === 'textarea') {
          nextSeq = fieldSeq + 1
          config = createDefaultTextareaConfig(`textArea_${nextSeq}`)
        } else if (type === 'select') {
          nextSeq = fieldSeq + 1
          config = createDefaultSelectFieldConfig(`select_${nextSeq}`)
        } else if (type === 'autocomplete') {
          nextSeq = fieldSeq + 1
          config = createDefaultAutocompleteConfig(`autocomplete_${nextSeq}`)
        } else if (type === 'multiAutocomplete') {
          nextSeq = fieldSeq + 1
          config = createDefaultMultiAutocompleteConfig(`multiAutocomplete_${nextSeq}`)
        } else if (type === 'checkbox') {
          nextSeq = fieldSeq + 1
          config = createDefaultCheckboxConfig(`checkbox_${nextSeq}`)
        } else if (type === 'radio') {
          nextSeq = fieldSeq + 1
          config = createDefaultRadioConfig(`radio_${nextSeq}`)
        } else if (type === 'datepicker') {
          nextSeq = fieldSeq + 1
          config = createDefaultDateConfig('date', `datePicker_${nextSeq}`)
        } else if (type === 'daterangepicker') {
          nextSeq = fieldSeq + 1
          config = createDefaultDateConfig('range', `dateRange_${nextSeq}`)
        } else if (type === 'datetimepicker') {
          nextSeq = fieldSeq + 1
          config = createDefaultDateConfig('datetime', `dateTime_${nextSeq}`)
        } else if (type === 'uploadimage') {
          nextSeq = fieldSeq + 1
          config = createDefaultUploadImageConfig(`uploadImage_${nextSeq}`)
        } else if (type === 'uploadfile') {
          nextSeq = fieldSeq + 1
          config = createDefaultUploadFileConfig(`uploadFile_${nextSeq}`)
        } else if (type === 'datatable') {
          nextSeq = fieldSeq + 1
          config = createDefaultDataTableConfig(`dataTable_${nextSeq}`)
        } else if (type === 'datatableeditable') {
          nextSeq = fieldSeq + 1
          config = createDefaultDataTableEditableConfig(`editableTable_${nextSeq}`)
        } else if (type === 'text') {
          config = createDefaultTextConfig()
        } else if (type === 'typography') {
          config = createDefaultTypographyConfig()
        } else if (type === 'avatar') {
          nextSeq = fieldSeq + 1
          config = createDefaultAvatarConfig(`avatar_${nextSeq}`)
        } else if (type === 'divider') {
          config = createDefaultDividerConfig()
        } else if (type === 'button') {
          config = createDefaultButtonItemConfig()
        } else if (type === 'hidden') {
          nextSeq = fieldSeq + 1
          config = createDefaultHiddenConfig(`hidden_${nextSeq}`)
        } else if (type === 'paper') {
          config = createDefaultPaperConfig()
        } else if (type === 'tab') {
          config = createDefaultTabConfig()
        } else if (type === 'modal') {
          nextSeq = fieldSeq + 1
          config = createDefaultModalConfig(`modal_${nextSeq}`)
        } else if (type === 'popover') {
          config = createDefaultPopoverConfig()
        }

        // Container-hosting types start with their (empty) child canvases —
        // one for container/paper/modal/popover, one per starter tab for tab.
        const canvasCount = childCanvasCount(type, config)
        const childCanvases =
          canvasCount > 0
            ? Array.from({ length: canvasCount }, () => createChildCanvas())
            : undefined

        // Default span (of 12) by component kind: a data table (and a divider —
        // a rule reads edge to edge) is full-bleed, so it spans the full width at
        // every breakpoint, as are the content-hosting containers (container/
        // paper/tab — a nested layout needs room); uploads need room for their
        // dropzone (lg 6); the common text-ish inputs (and standalone text/
        // typography) read better a touch wider (lg 4); everything else —
        // including the trigger-only modal/popover — falls back to the standard 2.
        const isFullBleed =
          type === 'datatable' ||
          type === 'datatableeditable' ||
          type === 'divider' ||
          type === 'container' ||
          type === 'paper' ||
          type === 'tab'
        const isUpload = type === 'uploadimage' || type === 'uploadfile'
        const isWideInput =
          type === 'textfield' ||
          type === 'textarea' ||
          type === 'select' ||
          type === 'autocomplete' ||
          type === 'multiAutocomplete' ||
          type === 'checkbox' ||
          type === 'radio' ||
          type === 'text' ||
          type === 'typography'
        const defaultLg = isUpload ? 6 : isWideInput ? 4 : 2
        const colSpan = isFullBleed
          ? { xs: bpCols.xs, sm: bpCols.sm, md: bpCols.md, lg: bpCols.lg }
          : {
              xs: bpCols.xs,
              sm: Math.min(3, bpCols.sm),
              md: Math.min(2, bpCols.md),
              lg: Math.min(defaultLg, bpCols.lg),
            }
        const newItem: GridItemData = {
          id: createId(),
          label: component?.label ?? `Item ${items.length + 1}`,
          type,
          settings: createDefaultItemSettings({ colSpan }),
          config,
          ...(childCanvases ? { childCanvases } : {}),
        }
        const at =
          index == null ? items.length : Math.max(0, Math.min(index, items.length))

        // The new cell lands as a chip and upgrades to its live preview only once
        // the enter "pop" finishes — so the pop is byte-identical across types.
        const willEnter = canEnter()
        const enteringIds = willEnter
          ? new Set(get().enteringIds).add(newItem.id)
          : get().enteringIds
        setActiveCanvas((canvas) => {
          const next = canvas.items.slice()
          next.splice(at, 0, newItem)
          return { ...canvas, items: next }
        })
        set({ fieldSeq: nextSeq, enteringIds })
        if (willEnter) scheduleEnterClear(newItem.id)
      }),

    removeItem: (id) =>
      animated(() => {
        cancelEnter(id)
        // Removing an item whose canvas the editor is inside would strand the
        // path — exit to the removed item's parent canvas first.
        const { activePath } = get()
        const strandDepth = activePath.findIndex((seg) => seg.itemId === id)
        if (strandDepth !== -1) {
          set({ activePath: activePath.slice(0, strandDepth), selectedItemId: null })
        }
        setActiveCanvas((canvas) => ({
          ...canvas,
          items: canvas.items.filter((item) => item.id !== id),
        }))
        set((s) => {
          if (!s.enteringIds.has(id)) return {}
          const next = new Set(s.enteringIds)
          next.delete(id)
          return { enteringIds: next }
        })
      }),

    removeSelectedItem: () => {
      const { selectedItemId, removeItem } = get()
      if (!selectedItemId) return
      removeItem(selectedItemId)
      set({ selectedItemId: null })
    },

    // Text-field edits pass `animate: false` so live typing updates the grid
    // (CSS transitions smooth gap/columns) without firing a JS FLIP per
    // keystroke. Discrete controls (selects, span buttons) pass `animate: true`.
    updateContainer: (bp, key, value, animate = true) => {
      const run = () =>
        setActiveCanvas((canvas) => ({
          ...canvas,
          settings: updateContainerBreakpoint(canvas.settings, bp, key, value),
        }))
      if (animate) animated(run, 'all')
      else run()
    },

    updateItem: (id, bp, key, value, animate = true) => {
      const run = () =>
        setActiveCanvas((canvas) => ({
          ...canvas,
          items: canvas.items.map((item) =>
            item.id === id
              ? { ...item, settings: updateItemBreakpoint(item.settings, bp, key, value) }
              : item,
          ),
        }))
      if (animate) animated(run, id)
      else run()
    },

    updateItemLabel: (id, label) =>
      setActiveCanvas((canvas) => ({
        ...canvas,
        items: canvas.items.map((item) =>
          item.id === id ? { ...item, label } : item,
        ),
      })),

    // Config edits change the cell's preview but never the grid layout, so they
    // skip the FLIP animation. No-op for items without a config (non-textfield).
    updateItemConfig: (id, patch) =>
      setActiveCanvas((canvas) => ({
        ...canvas,
        items: canvas.items.map((item) =>
          item.id === id && item.config
            ? // Spreading the config *union* widens shared keys (e.g. `dataType`,
              // absent on CheckboxConfig) to optional, so cast back to the union —
              // the patch only ever carries keys valid for this item's config.
              ({
                ...item,
                config: { ...item.config, ...patch } as GridItemData['config'],
              } as GridItemData)
            : item,
        ),
      })),

    // dnd-kit already animates items to their preview slots during the drag and
    // lands the dragged item via the DragOverlay drop animation, so we only
    // commit the new order here (no custom FLIP animation).
    moveItem: (activeId, overId) => {
      setActiveCanvas((canvas) => {
        const oldIndex = canvas.items.findIndex((i) => i.id === activeId)
        const newIndex = canvas.items.findIndex((i) => i.id === overId)
        if (oldIndex === -1 || newIndex === -1) return canvas
        return { ...canvas, items: arrayMove(canvas.items, oldIndex, newIndex) }
      })
    },

    // Append a tab header + its child canvas in one commit (index-aligned).
    addTab: (itemId) =>
      setActiveCanvas((canvas) => ({
        ...canvas,
        items: canvas.items.map((item) => {
          if (item.id !== itemId || item.type !== 'tab' || !item.config) return item
          const config = item.config as TabConfig
          const n = config.tabs.length + 1
          return {
            ...item,
            config: {
              ...config,
              tabs: [...config.tabs, { label: `Tab ${n}`, value: `tab_${n}` }],
            },
            childCanvases: [...(item.childCanvases ?? []), createChildCanvas()],
          }
        }),
      })),

    // Remove a tab header + its child canvas (and heal a path drilled into a
    // canvas of this tab item — indexes shift, so exit to this canvas).
    removeTab: (itemId, index) => {
      const { activePath } = get()
      const strandDepth = activePath.findIndex((seg) => seg.itemId === itemId)
      if (strandDepth !== -1) {
        set({ activePath: activePath.slice(0, strandDepth), selectedItemId: null })
      }
      setActiveCanvas((canvas) => ({
        ...canvas,
        items: canvas.items.map((item) => {
          if (item.id !== itemId || item.type !== 'tab' || !item.config) return item
          const config = item.config as TabConfig
          return {
            ...item,
            config: { ...config, tabs: config.tabs.filter((_, i) => i !== index) },
            childCanvases: (item.childCanvases ?? []).filter((_, i) => i !== index),
          }
        }),
      }))
    },

    // Drill into an item's child canvas. Only valid for an item of the active
    // canvas that actually carries that canvas — silently no-ops otherwise.
    enterCanvas: (itemId, canvasIndex) => {
      const item = activeCanvas().items.find((i) => i.id === itemId)
      if (!item?.childCanvases?.[canvasIndex]) return
      set((s) => ({
        activePath: [...s.activePath, { itemId, canvasIndex }],
        selectedItemId: null,
        sidebarView: s.sidebarView === 'code' ? 'code' : 'inspector',
      }))
    },

    // Jump back up the breadcrumb: keep the first `depth` segments (0 = root).
    exitToDepth: (depth) =>
      set((s) => ({
        activePath: s.activePath.slice(0, Math.max(0, depth)),
        selectedItemId: null,
      })),

    setActiveId: (activeId) => set({ activeId }),

    // Clicking a cell selects it; the sidebar's inspector switches to that item.
    selectItem: (id) => set({ selectedItemId: id, sidebarView: 'inspector' }),

    // Canvas click clears selection so the inspector falls back to the container.
    clearSelection: () => set({ selectedItemId: null }),

    showContainer: () => set({ selectedItemId: null, sidebarView: 'layout' }),

    setSidebarView: (view) => set({ sidebarView: view }),

    setPreviewBreakpoint: (bp) => animated(() => set({ previewBreakpoint: bp }), 'all'),
  }
})

// Dev-only: expose the store for scripted benchmarking (see perf.ts). Stripped
// from production builds.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __gridStore?: typeof useGridStore }).__gridStore =
    useGridStore
}

/**
 * The items of the canvas at `activePath`. Walks without allocating, returning
 * the stored array reference — safe for zustand's referential-equality check.
 * A dangling path (healed by the next action) falls back to the deepest
 * resolvable ancestor.
 */
export function selectActiveItems(s: {
  items: GridItemData[]
  activePath: PathSeg[]
}): GridItemData[] {
  let items = s.items
  for (const seg of s.activePath) {
    const child = items
      .find((i) => i.id === seg.itemId)
      ?.childCanvases?.[seg.canvasIndex]
    if (!child) break
    items = child.items
  }
  return items
}

/** The grid settings of the canvas at `activePath` (same walk as items). */
export function selectActiveSettings(s: {
  items: GridItemData[]
  containerSettings: GridContainerSettings
  activePath: PathSeg[]
}): GridContainerSettings {
  let items = s.items
  let settings = s.containerSettings
  for (const seg of s.activePath) {
    const child = items
      .find((i) => i.id === seg.itemId)
      ?.childCanvases?.[seg.canvasIndex]
    if (!child) break
    items = child.items
    settings = child.settings
  }
  return settings
}

/** Items of the canvas the editor is inside (root when not drilled in). */
export function useActiveItems(): GridItemData[] {
  return useGridStore(selectActiveItems)
}

/** Grid settings of the canvas the editor is inside. */
export function useActiveSettings(): GridContainerSettings {
  return useGridStore(selectActiveSettings)
}

/** One breadcrumb entry: the host item of each path segment (plus its tab
 * label when the segment is one of a tab's canvases). */
export type BreadcrumbSeg = { itemId: string; canvasIndex: number; label: string }

/** The drill-in trail as display labels. Encoded as a joined string inside the
 * selector so the hook result is referentially stable across unrelated updates. */
export function useBreadcrumb(): BreadcrumbSeg[] {
  const encoded = useGridStore((s) => {
    let items = s.items
    const parts: string[] = []
    for (const seg of s.activePath) {
      const item = items.find((i) => i.id === seg.itemId)
      const child = item?.childCanvases?.[seg.canvasIndex]
      if (!item || !child) break
      let label = item.label
      if (item.type === 'tab' && item.config) {
        const tab = (item.config as TabConfig).tabs[seg.canvasIndex]
        if (tab) label = `${item.label}: ${tab.label || tab.value}`
      }
      parts.push(`${seg.itemId}\u001f${seg.canvasIndex}\u001f${label}`)
      items = child.items
    }
    return parts.join('\u001e')
  })
  if (!encoded) return []
  return encoded.split('\u001e').map((part) => {
    const [itemId, canvasIndex, label] = part.split('\u001f')
    return { itemId, canvasIndex: Number(canvasIndex), label }
  })
}

/** Selector helper for the currently selected item (or null). Selection always
 * lives in the active canvas (navigation clears it). */
export function useSelectedItem(): GridItemData | null {
  return useGridStore(
    (s) => selectActiveItems(s).find((item) => item.id === s.selectedItemId) ?? null,
  )
}

/** Whether an item is still playing its entrance (chip-stall before live). The
 * boolean result means only the cell whose membership flips re-renders. */
export function useIsEntering(id: string): boolean {
  return useGridStore((s) => s.enteringIds.has(id))
}

/** Selector helper for the item currently being dragged (or null). */
export function useActiveItem(): GridItemData | null {
  return useGridStore(
    (s) =>
      (s.activeId
        ? selectActiveItems(s).find((item) => item.id === s.activeId) ?? null
        : null),
  )
}
