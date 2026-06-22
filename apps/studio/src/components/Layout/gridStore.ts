import { arrayMove } from '@dnd-kit/sortable'
import { create } from 'zustand'
import type { Breakpoint } from './breakpoints'
import type { ComponentType } from './componentCatalog'
import { updateContainerBreakpoint, updateItemBreakpoint } from './gridSettings'
import { readSeedCount } from './perf'
import {
  createDefaultAutocompleteConfig,
  createDefaultCheckboxConfig,
  createDefaultItemSettings,
  createDefaultMultiAutocompleteConfig,
  createDefaultRadioConfig,
  createDefaultSelectFieldConfig,
  createDefaultTextareaConfig,
  createDefaultTextFieldConfig,
  defaultContainerSettings,
  type CheckboxConfig,
  type GridContainerSettings,
  type GridItemData,
  type MultiAutocompleteConfig,
  type RadioConfig,
  type SelectFieldConfig,
  type TextareaConfig,
  type TextFieldConfig,
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

  return {
    items: createInitialItems(),
    containerSettings: defaultContainerSettings,
    fieldSeq: 0,

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
        }

        const newItem: GridItemData = {
          id: createId(),
          label: component?.label ?? `Item ${items.length + 1}`,
          type,
          settings: createDefaultItemSettings({
            colSpan: {
              xs: bpCols.xs,
              sm: Math.min(3, bpCols.sm),
              md: Math.min(2, bpCols.md),
              lg: Math.min(2, bpCols.lg),
            },
          }),
          config,
        }
        const at =
          index == null ? items.length : Math.max(0, Math.min(index, items.length))
        const next = items.slice()
        next.splice(at, 0, newItem)
        set({ items: next, fieldSeq: nextSeq })
      }),

    removeItem: (id) =>
      animated(() => {
        set({ items: get().items.filter((item) => item.id !== id) })
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

/** Selector helper for the item currently being dragged (or null). */
export function useActiveItem(): GridItemData | null {
  return useGridStore(
    (s) => (s.activeId ? s.items.find((item) => item.id === s.activeId) ?? null : null),
  )
}
