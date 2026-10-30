import { create } from 'zustand'
import type { Breakpoint } from './breakpoints'
import type { ComponentPreset, ComponentType } from './componentCatalog'
import { ENTER_DURATION_MS, prefersReducedMotion } from './gridAnimation'
import { ancestorRepeaters, isBlockedInRepeater, withoutBlockedItems } from './repeaterRules'
import { readSeedCount } from './perf'
import { countrySeedGridItems } from '../seed/country'
import { renameFieldRefs } from '../Workspace/logic'
import {
  addTab,
  canvasAtPath,
  createItem,
  insertItems,
  mergeItemConfig,
  moveItemOver,
  removeItem,
  removeTab,
  resolvePath,
  setCanvasLayout,
  setItemLabel,
  setItemLayout,
  setItemPageData,
  setItemLogic,
  type ItemLogicPatch,
  setItemShowWhen,
  updateCanvasAtPath,
  type PathSeg,
} from './canvasCommands'
import {
  createDefaultItemSettings,
  defaultContainerSettings,
  type AvatarConfig,
  type ButtonItemConfig,
  type CheckboxConfig,
  type SwitchConfig,
  type ChildCanvas,
  type DataTableConfig,
  type DataTableEditableConfig,
  type FormListConfig,
  type RepeaterConfig,
  type DateConfig,
  type DividerConfig,
  type GridContainerSettings,
  type GridItemData,
  type HiddenConfig,
  type ModalConfig,
  type DrawerConfig,
  type MultiAutocompleteConfig,
  type PaperConfig,
  type PopoverConfig,
  type RadioConfig,
  type SelectFieldConfig,
  type ShowWhen,
  type DataCondition,
  type ItemBinding,
  type TabConfig,
  type TextareaConfig,
  type TextConfig,
  type TextFieldConfig,
  type TypographyConfig,
  type UploadFileConfig,
  type UploadImageConfig,
  type ContainerConfig,
} from './types'

export type { PathSeg } from './canvasCommands'

/** A palette component being dropped onto the canvas. */
export type NewComponent = {
  type: ComponentType
  label: string
  /** `custom` only: the registry declaration the new item is mapped onto. */
  componentId?: string
  /** A preset tile: the item starts configured for it, selected, with its editor open. */
  preset?: ComponentPreset
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
  /** The item whose logic editor should open as soon as its chip mounts (a
   * preset tile was just dropped); the chip clears it once opened. */
  logicOpenItemId: string | null

  // Undo/redo (see the grilled design): per-page snapshot history of the
  // canvas tree. Depths are mirrored here for the toolbar; the entries
  // themselves live in module scope (`past` / `future`).
  undoDepth: number
  redoDepth: number
  undo: () => void
  redo: () => void

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
  /** Adding / editing visibility for an item in a data table's modal canvas. */
  updateItemShowWhen: (id: string, showWhen: ShowWhen) => void
  /** Page-data wiring on the item itself: its `dataWhen` condition / field `initialValue` (`null` clears). */
  updateItemPageData: (
    id: string,
    patch: { dataWhen?: DataCondition | null; initialValue?: ItemBinding },
  ) => void
  /** The item's own logic: Show when, Enabled when, value formula + mode (`null` clears). */
  updateItemLogic: (id: string, patch: ItemLogicPatch) => void
  /** A field was renamed: every `[from]` reference on the page (all canvases) now reads `[to]`. One undo step. */
  renameFieldRefsOnPage: (from: string, to: string) => void
  updateItemConfig: (
    id: string,
    patch: Partial<
      | TextFieldConfig
      | TextareaConfig
      | SelectFieldConfig
      | MultiAutocompleteConfig
      | CheckboxConfig
      | SwitchConfig
      | RadioConfig
      | DateConfig
      | UploadImageConfig
      | UploadFileConfig
      | DataTableConfig
      | DataTableEditableConfig
      | FormListConfig
      | RepeaterConfig
      | TextConfig
      | TypographyConfig
      | AvatarConfig
      | DividerConfig
      | ButtonItemConfig
      | HiddenConfig
      | PaperConfig
      | TabConfig
      | ModalConfig
      | DrawerConfig
      | PopoverConfig
      | ContainerConfig
    >,
  ) => void
  /** Append ready-made items (a template's blocks, already re-id'd) to the
   * active canvas. */
  appendItems: (items: GridItemData[]) => void
  moveItem: (activeId: string, overId: string) => void

  // Tab canvas sync: add/remove a tab header and its child canvas together, so
  // `TabConfig.tabs` and `childCanvases` stay index-aligned.
  addTab: (itemId: string) => void
  removeTab: (itemId: string, index: number) => void

  /** Replace the whole canvas tree from a project snapshot (workspace open /
   * switch). Resets drill-in, selection, drag and entrance state. */
  hydrate: (snapshot: {
    items: GridItemData[]
    containerSettings: GridContainerSettings
    fieldSeq: number
  }) => void

  // Drill-in navigation (see the grilled design: breadcrumb, arbitrary depth)
  enterCanvas: (itemId: string, canvasIndex: number) => void
  exitToDepth: (depth: number) => void
  /** Jump to an arbitrary canvas (the Layers tree crosses canvases), optionally
   * selecting an item there. A dangling path heals to its deepest ancestor. */
  goToCanvas: (path: PathSeg[], selectId?: string | null) => void

  // Drag actions
  setActiveId: (id: string | null) => void

  // UI actions
  selectItem: (id: string) => void
  clearSelection: () => void
  showContainer: () => void
  setSidebarView: (view: SidebarView) => void
  setPreviewBreakpoint: (bp: Breakpoint) => void
  clearLogicOpen: () => void
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

/** What one undo step restores — the canvas tree plus where the editor was. */
type HistoryEntry = {
  items: GridItemData[]
  containerSettings: GridContainerSettings
  fieldSeq: number
  activePath: PathSeg[]
  /** Every item id in tree order — two states with the same sequence differ
   * only in settings/config (an "edit"), not in structure. */
  ids: string
}

const HISTORY_CAP = 50
/** Consecutive edits (typing in the inspector, nudging a span) within this
 * window collapse into one undo step. */
const HISTORY_COALESCE_MS = 600

let past: HistoryEntry[] = []
let future: HistoryEntry[] = []
/** Set while undo/redo/hydrate write the store, so the recorder ignores them. */
let historyLock = false
let lastRecordedAt = 0

function idSequence(items: GridItemData[]): string {
  const out: string[] = []
  const walk = (list: GridItemData[]) => {
    for (const item of list) {
      out.push(item.id)
      item.childCanvases?.forEach((c) => walk(c.items))
    }
  }
  walk(items)
  return out.join(',')
}

function toHistoryEntry(s: {
  items: GridItemData[]
  containerSettings: GridContainerSettings
  fieldSeq: number
  activePath: PathSeg[]
}): HistoryEntry {
  return {
    items: s.items,
    containerSettings: s.containerSettings,
    fieldSeq: s.fieldSeq,
    activePath: s.activePath,
    ids: idSequence(s.items),
  }
}

function clearHistory() {
  past = []
  future = []
  lastRecordedAt = 0
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
  const insideRepeater = (): boolean => ancestorRepeaters(get().items, get().activePath).length > 0

  /** Apply `fn` to the active canvas and commit the rebuilt root. */
  const setActiveCanvas = (fn: (canvas: ChildCanvas) => ChildCanvas) => {
    const next = updateCanvasAtPath(rootCanvas(), get().activePath, fn)
    set({ items: next.items, containerSettings: next.settings })
  }

  /** Write a history entry into the store (animated, recorder muted). */
  const restoreEntry = (entry: HistoryEntry) => {
    const root: ChildCanvas = { items: entry.items, settings: entry.containerSettings }
    const resolvable = resolvePath(root, entry.activePath).items.length
    const activePath = entry.activePath.slice(0, resolvable)
    const canvas = canvasAtPath(root, activePath)
    const { selectedItemId } = get()
    historyLock = true
    try {
      animated(
        () =>
          set({
            items: entry.items,
            containerSettings: entry.containerSettings,
            fieldSeq: entry.fieldSeq,
            activePath,
            selectedItemId:
              selectedItemId && canvas.items.some((i) => i.id === selectedItemId)
                ? selectedItemId
                : null,
            undoDepth: past.length,
            redoDepth: future.length,
          }),
        'all',
      )
    } finally {
      historyLock = false
    }
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
    logicOpenItemId: null,

    undoDepth: 0,
    redoDepth: 0,

    // Restore the previous tree; the current one goes onto the redo stack. The
    // drill-in path heals to what still resolves, and the selection survives
    // only if its cell is still in the active canvas.
    undo: () => {
      const entry = past.pop()
      if (!entry) return
      future.push(toHistoryEntry(get()))
      restoreEntry(entry)
    },

    redo: () => {
      const entry = future.pop()
      if (!entry) return
      past.push(toHistoryEntry(get()))
      restoreEntry(entry)
    },

    animator: null,
    setAnimator: (animator) => set({ animator }),

    // `index` (when provided) inserts the new item at that position, shifting the
    // rest right; otherwise it appends. The new id isn't in the pre-mutation FLIP
    // snapshot, so it gets the enter "pop" animation while shifted neighbors FLIP.
    addItem: (component, index) =>
      animated(() => {
        const { items, settings } = activeCanvas()
        const type: ComponentType = component?.type ?? 'empty'
        // A repeater's item template is read-only: no form-bound types inside.
        if (isBlockedInRepeater(type) && insideRepeater()) return
        const { item: newItem, fieldSeq } = createItem(type, {
          fieldSeq: get().fieldSeq,
          columns: settings.columns,
          label: component?.label,
          componentId: component?.componentId,
          preset: component?.preset,
          siblingCount: items.length,
        })

        // The new cell lands as a chip and upgrades to its live preview only once
        // the enter "pop" finishes — so the pop is byte-identical across types.
        const willEnter = canEnter()
        const enteringIds = willEnter
          ? new Set(get().enteringIds).add(newItem.id)
          : get().enteringIds
        setActiveCanvas((canvas) => insertItems(canvas, [newItem], index))
        set({ fieldSeq, enteringIds })
        // A preset tile has one job, so its editor opens at once: select the
        // cell (the inspector shows its Props) and flag it for the chip.
        if (component?.preset) set({ selectedItemId: newItem.id, sidebarView: 'inspector', logicOpenItemId: newItem.id })
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
        setActiveCanvas((canvas) => removeItem(canvas, id))
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
        setActiveCanvas((canvas) => setCanvasLayout(canvas, bp, key, value))
      if (animate) animated(run, 'all')
      else run()
    },

    updateItem: (id, bp, key, value, animate = true) => {
      const run = () =>
        setActiveCanvas((canvas) => setItemLayout(canvas, id, bp, key, value))
      if (animate) animated(run, id)
      else run()
    },

    updateItemLabel: (id, label) => setActiveCanvas((canvas) => setItemLabel(canvas, id, label)),

    // `always` is the absent default, so it is stored as absence.
    updateItemShowWhen: (id, showWhen) => setActiveCanvas((canvas) => setItemShowWhen(canvas, id, showWhen)),

    updateItemPageData: (id, patch) => setActiveCanvas((canvas) => setItemPageData(canvas, id, patch)),

    updateItemLogic: (id, patch) => setActiveCanvas((canvas) => setItemLogic(canvas, id, patch)),
    renameFieldRefsOnPage: (from, to) => {
      const items = renameFieldRefs(get().items, from, to)
      if (items !== get().items) set({ items })
    },

    // Config edits change the cell's preview but never the grid layout, so they
    // skip the FLIP animation. No-op for items without a config (non-textfield).
    updateItemConfig: (id, patch) => setActiveCanvas((canvas) => mergeItemConfig(canvas, id, patch)),

    appendItems: (incoming) =>
      animated(() => {
        // A template dropped into a repeater's item template loses its inputs.
        const newItems = insideRepeater() ? withoutBlockedItems(incoming) : incoming
        if (newItems.length === 0) return
        const willEnter = canEnter()
        const enteringIds = new Set(get().enteringIds)
        if (willEnter) newItems.forEach((it) => enteringIds.add(it.id))
        setActiveCanvas((canvas) => insertItems(canvas, newItems))
        set({ enteringIds })
        if (willEnter) newItems.forEach((it) => scheduleEnterClear(it.id))
      }),


    // dnd-kit already animates items to their preview slots during the drag and
    // lands the dragged item via the DragOverlay drop animation, so we only
    // commit the new order here (no custom FLIP animation).
    moveItem: (activeId, overId) => {
      setActiveCanvas((canvas) => moveItemOver(canvas, activeId, overId))
    },

    // Append a tab header + its child canvas in one commit (index-aligned).
    addTab: (itemId) => setActiveCanvas((canvas) => addTab(canvas, itemId)),

    // Remove a tab header + its child canvas (and heal a path drilled into a
    // canvas of this tab item — indexes shift, so exit to this canvas).
    removeTab: (itemId, index) => {
      const { activePath } = get()
      const strandDepth = activePath.findIndex((seg) => seg.itemId === itemId)
      if (strandDepth !== -1) {
        set({ activePath: activePath.slice(0, strandDepth), selectedItemId: null })
      }
      setActiveCanvas((canvas) => removeTab(canvas, itemId, index))
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

    hydrate: ({ items, containerSettings, fieldSeq }) => {
      enterTimers.forEach((t) => clearTimeout(t))
      enterTimers.clear()
      clearHistory()
      historyLock = true
      try {
        set({
          items,
          containerSettings,
          fieldSeq,
          activePath: [],
          enteringIds: new Set(),
          activeId: null,
          selectedItemId: null,
          sidebarView: 'inspector',
          undoDepth: 0,
          redoDepth: 0,
        })
      } finally {
        historyLock = false
      }
    },

    goToCanvas: (path, selectId = null) => {
      const resolvable = resolvePath(rootCanvas(), path).items.length
      const activePath = path.slice(0, resolvable)
      const canvas = canvasAtPath(rootCanvas(), activePath)
      const selectedItemId =
        selectId && canvas.items.some((i) => i.id === selectId) ? selectId : null
      set((s) => ({
        activePath,
        selectedItemId,
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
    clearLogicOpen: () => set({ logicOpenItemId: null }),

    setSidebarView: (view) => set({ sidebarView: view }),

    setPreviewBreakpoint: (bp) => animated(() => set({ previewBreakpoint: bp }), 'all'),
  }
})

// The history recorder: every committed change to the canvas tree (that isn't
// an undo/redo/hydrate) pushes the *previous* state onto the undo stack and
// clears redo. Recording from a subscription rather than inside each action
// means new actions get undo for free. Edits to an unchanged structure that
// land within the coalesce window collapse into the step already recorded.
useGridStore.subscribe((s, prev) => {
  if (historyLock) return
  if (s.items === prev.items && s.containerSettings === prev.containerSettings) return
  const entry = toHistoryEntry(prev)
  const now = Date.now()
  const top = past[past.length - 1]
  const coalesce = !!top && now - lastRecordedAt < HISTORY_COALESCE_MS && top.ids === entry.ids
  if (!coalesce) {
    past.push(entry)
    if (past.length > HISTORY_CAP) past.shift()
  }
  lastRecordedAt = now
  future = []
  if (s.undoDepth !== past.length || s.redoDepth !== 0) {
    useGridStore.setState({ undoDepth: past.length, redoDepth: 0 })
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

/**
 * Selects an item anywhere on the hydrated page: drills into the child
 * canvases on the way (from the root), then selects it. No-op when absent.
 */
export function focusGridItem(itemId: string): void {
  const find = (items: GridItemData[], path: { itemId: string; canvasIndex: number }[]): { itemId: string; canvasIndex: number }[] | null => {
    for (const item of items) {
      if (item.id === itemId) return path
      for (const [i, c] of (item.childCanvases ?? []).entries()) {
        const hit = find(c.items, [...path, { itemId: item.id, canvasIndex: i }])
        if (hit) return hit
      }
    }
    return null
  }
  const store = useGridStore.getState()
  const path = find(store.items, [])
  if (!path) return
  store.exitToDepth(0)
  for (const step of path) useGridStore.getState().enterCanvas(step.itemId, step.canvasIndex)
  useGridStore.getState().selectItem(itemId)
}
