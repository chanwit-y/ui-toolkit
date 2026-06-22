import { arrayMove } from '@dnd-kit/sortable'
import { create } from 'zustand'
import type { Breakpoint } from './breakpoints'
import type { ComponentType } from './componentCatalog'
import { ENTER_DURATION_MS, prefersReducedMotion } from './gridAnimation'
import { updateContainerBreakpoint, updateItemBreakpoint } from './gridSettings'
import { readSeedCount } from './perf'
import {
  createDefaultAutocompleteConfig,
  createDefaultCheckboxConfig,
  createDefaultDateConfig,
  createDefaultItemSettings,
  createDefaultMultiAutocompleteConfig,
  createDefaultRadioConfig,
  createDefaultSelectFieldConfig,
  createDefaultTextareaConfig,
  createDefaultTextFieldConfig,
  createDefaultUploadFileConfig,
  createDefaultUploadImageConfig,
  defaultContainerSettings,
  type CheckboxConfig,
  type DateConfig,
  type GridContainerSettings,
  type GridItemData,
  type MultiAutocompleteConfig,
  type RadioConfig,
  type SelectFieldConfig,
  type TextareaConfig,
  type TextFieldConfig,
  type UploadFileConfig,
  type UploadImageConfig,
} from './types'

/** A palette component being dropped onto the canvas. */
export type NewComponent = { type: ComponentType; label: string }

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
  // Grid data
  items: GridItemData[]
  containerSettings: GridContainerSettings
  // Monotonic counter for unique textfield binding names (textField_1, _2, …).
  fieldSeq: number

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
    >,
  ) => void
  moveItem: (activeId: string, overId: string) => void

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

  return [
    {
      id: createId(),
      label: 'Item 1',
      type: 'empty' as ComponentType,
      settings: createDefaultItemSettings(),
    },
    {
      id: createId(),
      label: 'Item 2',
      type: 'empty' as ComponentType,
      settings: createDefaultItemSettings({
        colSpan: { xs: 4, sm: 6, md: 4, lg: 4 },
      }),
    },
  ]
}

export const useGridStore = create<GridState>((set, get) => {
  /** Wrap a data mutation in a FLIP snapshot/animation so layout changes animate. */
  const animated = (mutate: () => void, changedItemId?: string | 'all') => {
    const { animator } = get()
    animator?.capture()
    mutate()
    animator?.schedule(changedItemId)
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
        const { items, containerSettings, fieldSeq } = get()
        const bpCols = containerSettings.columns
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
        }

        // Default lg span (of 12) by component kind: uploads need room for their
        // dropzone (6); the common text-ish inputs read better a touch wider (4);
        // everything else falls back to the standard 2.
        const isUpload = type === 'uploadimage' || type === 'uploadfile'
        const isWideInput =
          type === 'textfield' ||
          type === 'textarea' ||
          type === 'select' ||
          type === 'autocomplete' ||
          type === 'multiAutocomplete' ||
          type === 'checkbox' ||
          type === 'radio'
        const defaultLg = isUpload ? 6 : isWideInput ? 4 : 2
        const newItem: GridItemData = {
          id: createId(),
          label: component?.label ?? `Item ${items.length + 1}`,
          type,
          settings: createDefaultItemSettings({
            colSpan: {
              xs: bpCols.xs,
              sm: Math.min(3, bpCols.sm),
              md: Math.min(2, bpCols.md),
              lg: Math.min(defaultLg, bpCols.lg),
            },
          }),
          config,
        }
        const at =
          index == null ? items.length : Math.max(0, Math.min(index, items.length))
        const next = items.slice()
        next.splice(at, 0, newItem)

        // The new cell lands as a chip and upgrades to its live preview only once
        // the enter "pop" finishes — so the pop is byte-identical across types.
        const willEnter = canEnter()
        const enteringIds = willEnter
          ? new Set(get().enteringIds).add(newItem.id)
          : get().enteringIds
        set({ items: next, fieldSeq: nextSeq, enteringIds })
        if (willEnter) scheduleEnterClear(newItem.id)
      }),

    removeItem: (id) =>
      animated(() => {
        cancelEnter(id)
        set((s) => {
          const items = s.items.filter((item) => item.id !== id)
          if (!s.enteringIds.has(id)) return { items }
          const next = new Set(s.enteringIds)
          next.delete(id)
          return { items, enteringIds: next }
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
        set({
          containerSettings: updateContainerBreakpoint(
            get().containerSettings,
            bp,
            key,
            value,
          ),
        })
      if (animate) animated(run, 'all')
      else run()
    },

    updateItem: (id, bp, key, value, animate = true) => {
      const run = () =>
        set({
          items: get().items.map((item) =>
            item.id === id
              ? { ...item, settings: updateItemBreakpoint(item.settings, bp, key, value) }
              : item,
          ),
        })
      if (animate) animated(run, id)
      else run()
    },

    updateItemLabel: (id, label) =>
      set({
        items: get().items.map((item) =>
          item.id === id ? { ...item, label } : item,
        ),
      }),

    // Config edits change the cell's preview but never the grid layout, so they
    // skip the FLIP animation. No-op for items without a config (non-textfield).
    updateItemConfig: (id, patch) =>
      set({
        items: get().items.map((item) =>
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
      }),

    // dnd-kit already animates items to their preview slots during the drag and
    // lands the dragged item via the DragOverlay drop animation, so we only
    // commit the new order here (no custom FLIP animation).
    moveItem: (activeId, overId) => {
      const { items } = get()
      const oldIndex = items.findIndex((i) => i.id === activeId)
      const newIndex = items.findIndex((i) => i.id === overId)
      if (oldIndex === -1 || newIndex === -1) return
      set({ items: arrayMove(items, oldIndex, newIndex) })
    },

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

/** Selector helper for the currently selected item (or null). */
export function useSelectedItem(): GridItemData | null {
  return useGridStore(
    (s) => s.items.find((item) => item.id === s.selectedItemId) ?? null,
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
    (s) => (s.activeId ? s.items.find((item) => item.id === s.activeId) ?? null : null),
  )
}
