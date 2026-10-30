import type { Breakpoint } from './breakpoints'
import type { ComponentType } from './componentCatalog'
import { updateContainerBreakpoint, updateItemBreakpoint } from './gridSettings'
import {
  childCanvasCount,
  createChildCanvas,
  createDefaultApprovalLineConfig,
  createDefaultAutocompleteConfig,
  createDefaultAvatarConfig,
  createDefaultButtonItemConfig,
  createDefaultCardConfig,
  createDefaultCheckboxConfig,
  createDefaultContainerConfig,
  createDefaultCustomComponentConfig,
  createDefaultDataTableConfig,
  createDefaultDataTableEditableConfig,
  createDefaultDateConfig,
  createDefaultDividerConfig,
  createDefaultDrawerConfig,
  createDefaultFormListConfig,
  createDefaultHiddenConfig,
  createDefaultHtmlContentConfig,
  createDefaultItemSettings,
  createDefaultModalConfig,
  createDefaultMultiAutocompleteConfig,
  createDefaultPaperConfig,
  createDefaultPopoverConfig,
  createDefaultRadioConfig,
  createDefaultRepeaterConfig,
  createDefaultFileCollectionConfig,
  createDefaultChartConfig,
  createDefaultReplaceProfileConfig,
  createDefaultSelectFieldConfig,
  createDefaultSwitchConfig,
  createDefaultSwitchProfileConfig,
  createDefaultTabConfig,
  createDefaultTextareaConfig,
  createDefaultTextConfig,
  createDefaultTextFieldConfig,
  createDefaultTypographyConfig,
  createDefaultUploadFileConfig,
  createDefaultUploadImageConfig,
  createDefaultWorkflowEditorConfig,
  type ChildCanvas,
  type DataCondition,
  type GridContainerSettings,
  type GridItemData,
  type ItemBinding,
  type ShowWhen,
  type TabConfig,
} from './types'

/*
 * The canvas editing rules as pure functions over a canvas tree (see the
 * grilled design `mcp-server`): `gridStore` applies them to the live page and
 * the headless `gummy mcp` to a stored one, so both edit a page the same way.
 * Nothing here touches a store, the DOM or the animation layer.
 */

/**
 * One step of the drill-in path: which item's child canvas the editor is inside
 * (`canvasIndex` distinguishes a tab's canvases; it is 0 for the single-canvas
 * types). The root canvas is the empty path — see the grilled design: only one
 * flat canvas is ever active, so dnd-kit/selection/inspector work unchanged.
 */
export type PathSeg = { itemId: string; canvasIndex: number }

type ItemConfig = NonNullable<GridItemData['config']>

function createId(): string {
  return crypto.randomUUID()
}

/**
 * Walk `path` down from the root canvas, returning each step's canvas. Stops at
 * the first dangling segment (item removed / canvas gone), so callers can heal
 * by truncating to what resolved.
 */
export function resolvePath(
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
export function canvasAtPath(root: ChildCanvas, path: PathSeg[]): ChildCanvas {
  const { canvases } = resolvePath(root, path)
  return canvases[canvases.length - 1]
}

/**
 * Immutably apply `fn` to the canvas at `path`, rebuilding only the spine of
 * ancestors (untouched siblings keep their references, preserving the memoized
 * GridItem no-rerender behavior).
 */
export function updateCanvasAtPath(
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

/** Where an item lives: the path of the canvas holding it (`[]` = the root). */
export function locateItem(root: ChildCanvas, id: string): { item: GridItemData; path: PathSeg[] } | null {
  const walk = (canvas: ChildCanvas, path: PathSeg[]): { item: GridItemData; path: PathSeg[] } | null => {
    for (const item of canvas.items) {
      if (item.id === id) return { item, path }
      for (const [i, child] of (item.childCanvases ?? []).entries()) {
        const hit = walk(child, [...path, { itemId: item.id, canvasIndex: i }])
        if (hit) return hit
      }
    }
    return null
  }
  return walk(root, [])
}

/** `StatBadge` → `statBadge`: the item-name base for a declared custom component. */
function lowerFirst(s: string): string {
  return s ? s[0].toLowerCase() + s.slice(1) : s
}

/**
 * Each type's default config, named from the page's shared `fieldSeq` counter
 * when the type carries a binding name (`textField_3`); `undefined` for the
 * config-less types. A `Record` over every `ComponentType`, so a new type that
 * forgets its factory fails to compile.
 */
const DEFAULT_CONFIGS: Record<ComponentType, { prefix?: string; create: (name: string) => ItemConfig | undefined }> = {
  textfield: { prefix: 'textField', create: (n) => createDefaultTextFieldConfig(n) },
  textarea: { prefix: 'textArea', create: (n) => createDefaultTextareaConfig(n) },
  select: { prefix: 'select', create: (n) => createDefaultSelectFieldConfig(n) },
  autocomplete: { prefix: 'autocomplete', create: (n) => createDefaultAutocompleteConfig(n) },
  multiAutocomplete: { prefix: 'multiAutocomplete', create: (n) => createDefaultMultiAutocompleteConfig(n) },
  checkbox: { prefix: 'checkbox', create: (n) => createDefaultCheckboxConfig(n) },
  switch: { prefix: 'switch', create: (n) => createDefaultSwitchConfig(n) },
  radio: { prefix: 'radio', create: (n) => createDefaultRadioConfig(n) },
  datepicker: { prefix: 'datePicker', create: (n) => createDefaultDateConfig('date', n) },
  daterangepicker: { prefix: 'dateRange', create: (n) => createDefaultDateConfig('range', n) },
  datetimepicker: { prefix: 'dateTime', create: (n) => createDefaultDateConfig('datetime', n) },
  uploadimage: { prefix: 'uploadImage', create: (n) => createDefaultUploadImageConfig(n) },
  uploadfile: { prefix: 'uploadFile', create: (n) => createDefaultUploadFileConfig(n) },
  datatable: { prefix: 'dataTable', create: (n) => createDefaultDataTableConfig(n) },
  datatableeditable: { prefix: 'editableTable', create: (n) => createDefaultDataTableEditableConfig(n) },
  formlist: { prefix: 'formList', create: (n) => createDefaultFormListConfig(n) },
  repeater: { prefix: 'repeater', create: (n) => createDefaultRepeaterConfig(n) },
  filecollection: { prefix: 'fileCollection', create: (n) => createDefaultFileCollectionConfig(n) },
  chart: { prefix: 'chart', create: (n) => createDefaultChartConfig(n) },
  text: { create: () => createDefaultTextConfig() },
  typography: { create: () => createDefaultTypographyConfig() },
  avatar: { prefix: 'avatar', create: (n) => createDefaultAvatarConfig(n) },
  divider: { create: () => createDefaultDividerConfig() },
  button: { create: () => createDefaultButtonItemConfig() },
  hidden: { prefix: 'hidden', create: (n) => createDefaultHiddenConfig(n) },
  paper: { create: () => createDefaultPaperConfig() },
  card: { prefix: 'card', create: (n) => createDefaultCardConfig(n) },
  html: { prefix: 'html', create: (n) => createDefaultHtmlContentConfig(n) },
  custom: { prefix: 'custom', create: (n) => createDefaultCustomComponentConfig(n) },
  approvalline: { prefix: 'approval', create: (n) => createDefaultApprovalLineConfig(n) },
  switchprofile: { prefix: 'switchProfile', create: (n) => createDefaultSwitchProfileConfig(n) },
  replaceprofile: { prefix: 'replaceProfile', create: (n) => createDefaultReplaceProfileConfig(n) },
  workfloweditor: { prefix: 'workflow', create: (n) => createDefaultWorkflowEditorConfig(n) },
  tab: { create: () => createDefaultTabConfig() },
  modal: { prefix: 'modal', create: (n) => createDefaultModalConfig(n) },
  drawer: { prefix: 'drawer', create: (n) => createDefaultDrawerConfig(n) },
  popover: { create: () => createDefaultPopoverConfig() },
  container: { create: () => createDefaultContainerConfig() },
  empty: { create: () => undefined },
}

/** The binding-name prefix a type numbers its new items with (`textField`), if it has one. */
export function itemNamePrefix(type: ComponentType): string | undefined {
  return DEFAULT_CONFIGS[type].prefix
}

/** A type's default config under `name` (a config-less type ignores it). */
export function defaultItemConfig(type: ComponentType, name = ''): ItemConfig | undefined {
  return DEFAULT_CONFIGS[type].create(name)
}

// Default span (of 12) by component kind: a data table (and a divider — a rule
// reads edge to edge) is full-bleed, so it spans the full width at every
// breakpoint, as are the content-hosting containers (container/paper/tab — a
// nested layout needs room); uploads need room for their dropzone (lg 6); the
// common text-ish inputs (and standalone text/typography) read better a touch
// wider (lg 4); everything else — including the trigger-only modal/popover —
// falls back to the standard 2.
const FULL_BLEED = new Set<ComponentType>([
  'datatable', 'datatableeditable', 'formlist', 'repeater', 'divider', 'container', 'paper', 'card', 'html',
  'custom', 'approvalline', 'switchprofile', 'replaceprofile', 'workfloweditor', 'tab', 'chart',
])
const UPLOADS = new Set<ComponentType>(['uploadimage', 'uploadfile'])
// A file collection is a sidebar-shaped tree: a quarter of the row on desktop, half on a tablet.
const SIDEBARS = new Set<ComponentType>(['filecollection'])
const WIDE_INPUTS = new Set<ComponentType>([
  'textfield', 'textarea', 'select', 'autocomplete', 'multiAutocomplete', 'checkbox', 'switch', 'radio', 'text', 'typography',
])

/**
 * A new item of `type` as the palette drops it: default config (binding-named
 * types draw the next number from `fieldSeq`), empty child canvases for the
 * container-hosting types, the kind's default span within `columns`. Returns
 * the page's next `fieldSeq`.
 */
export function createItem(
  type: ComponentType,
  opts: {
    fieldSeq: number
    columns: GridContainerSettings['columns']
    label?: string
    /** `custom` only: the registry declaration the new item is mapped onto. */
    componentId?: string
    /** Used when no `label` is given: `Item <n>`. */
    siblingCount?: number
  },
): { item: GridItemData; fieldSeq: number } {
  const { prefix, create } = DEFAULT_CONFIGS[type]
  const fieldSeq = prefix ? opts.fieldSeq + 1 : opts.fieldSeq
  let config: ItemConfig | undefined
  if (type === 'custom') {
    // A tile for a declared component names the item after it (`statBadge_3`)
    // and maps it at once; the generic tile stays unmapped.
    const declared = opts.componentId
    const base = declared ? lowerFirst(opts.label ?? '') || 'custom' : 'custom'
    config = { ...createDefaultCustomComponentConfig(`${base}_${fieldSeq}`), ...(declared ? { componentId: declared } : {}) }
  } else {
    config = create(prefix ? `${prefix}_${fieldSeq}` : '')
  }

  // Container-hosting types start with their (empty) child canvases — one for
  // container/paper/modal/popover, one per starter tab for tab.
  const canvasCount = childCanvasCount(type, config)
  const childCanvases = canvasCount > 0 ? Array.from({ length: canvasCount }, () => createChildCanvas()) : undefined

  const bpCols = opts.columns
  const defaultLg = UPLOADS.has(type) ? 6 : WIDE_INPUTS.has(type) ? 4 : 2
  const colSpan = FULL_BLEED.has(type)
    ? { xs: bpCols.xs, sm: bpCols.sm, md: bpCols.md, lg: bpCols.lg }
    : SIDEBARS.has(type)
      ? { xs: bpCols.xs, sm: bpCols.sm, md: Math.min(3, bpCols.md), lg: Math.min(3, bpCols.lg) }
      : { xs: bpCols.xs, sm: Math.min(3, bpCols.sm), md: Math.min(2, bpCols.md), lg: Math.min(defaultLg, bpCols.lg) }
  const item: GridItemData = {
    id: createId(),
    label: opts.label ?? `Item ${(opts.siblingCount ?? 0) + 1}`,
    type,
    settings: createDefaultItemSettings({ colSpan }),
    config,
    ...(childCanvases ? { childCanvases } : {}),
  }
  return { item, fieldSeq }
}

/** Insert `items` at `index` (clamped; absent = append). */
export function insertItems(canvas: ChildCanvas, items: GridItemData[], index?: number): ChildCanvas {
  if (items.length === 0) return canvas
  const at = index == null ? canvas.items.length : Math.max(0, Math.min(index, canvas.items.length))
  const next = canvas.items.slice()
  next.splice(at, 0, ...items)
  return { ...canvas, items: next }
}

export function removeItem(canvas: ChildCanvas, id: string): ChildCanvas {
  return { ...canvas, items: canvas.items.filter((item) => item.id !== id) }
}

/** Apply `fn` to the item `id` of this canvas (other items keep their references). */
export function patchItem(canvas: ChildCanvas, id: string, fn: (item: GridItemData) => GridItemData): ChildCanvas {
  return { ...canvas, items: canvas.items.map((item) => (item.id === id ? fn(item) : item)) }
}

export function setItemLabel(canvas: ChildCanvas, id: string, label: string): ChildCanvas {
  return patchItem(canvas, id, (item) => ({ ...item, label }))
}

/** One breakpoint value of an item's layout (`colSpan`, `order`, …). */
export function setItemLayout(canvas: ChildCanvas, id: string, bp: Breakpoint, key: string, value: string): ChildCanvas {
  return patchItem(canvas, id, (item) => ({ ...item, settings: updateItemBreakpoint(item.settings, bp, key, value) }))
}

/** One breakpoint value of the canvas grid (`columns`, `gap`, …). */
export function setCanvasLayout(canvas: ChildCanvas, bp: Breakpoint, key: string, value: string): ChildCanvas {
  return { ...canvas, settings: updateContainerBreakpoint(canvas.settings, bp, key, value) }
}

/** Adding / editing visibility inside a data table's modal canvas; `always` is the absent default, stored as absence. */
export function setItemShowWhen(canvas: ChildCanvas, id: string, showWhen: ShowWhen): ChildCanvas {
  return patchItem(canvas, id, (item) => {
    const next: GridItemData = { ...item }
    delete next.showWhen
    return showWhen === 'always' ? next : { ...next, showWhen }
  })
}

/** Page-data wiring on the item itself: its `dataWhen` condition / field `initialValue` (`null` clears). */
export function setItemPageData(
  canvas: ChildCanvas,
  id: string,
  patch: { dataWhen?: DataCondition | null; initialValue?: ItemBinding },
): ChildCanvas {
  return patchItem(canvas, id, (item) => {
    const next = { ...item, ...patch }
    if (next.dataWhen === null) delete next.dataWhen
    if (next.initialValue === null) delete next.initialValue
    return next
  })
}

/** Shallow-merge `patch` into the item's config. No-op for a config-less item. */
export function mergeItemConfig(canvas: ChildCanvas, id: string, patch: Partial<ItemConfig>): ChildCanvas {
  return patchItem(canvas, id, (item) =>
    item.config
      ? // Spreading the config *union* widens shared keys (e.g. `dataType`, absent
        // on CheckboxConfig) to optional, so cast back to the union — the patch
        // only ever carries keys valid for this item's config.
        ({ ...item, config: { ...item.config, ...patch } as GridItemData['config'] } as GridItemData)
      : item,
  )
}

/** Move `activeId` to `overId`'s position (dnd-kit's arrayMove semantics). */
export function moveItemOver(canvas: ChildCanvas, activeId: string, overId: string): ChildCanvas {
  const from = canvas.items.findIndex((i) => i.id === activeId)
  const to = canvas.items.findIndex((i) => i.id === overId)
  if (from === -1 || to === -1) return canvas
  return moveItemTo(canvas, activeId, to)
}

/** Move `id` to `index` (clamped) within its canvas. */
export function moveItemTo(canvas: ChildCanvas, id: string, index: number): ChildCanvas {
  const from = canvas.items.findIndex((i) => i.id === id)
  if (from === -1) return canvas
  const to = Math.max(0, Math.min(index, canvas.items.length - 1))
  if (to === from) return canvas
  const items = canvas.items.slice()
  const [moved] = items.splice(from, 1)
  items.splice(to, 0, moved)
  return { ...canvas, items }
}

/** Append a tab header + its child canvas in one step (index-aligned). */
export function addTab(canvas: ChildCanvas, itemId: string): ChildCanvas {
  return patchItem(canvas, itemId, (item) => {
    if (item.type !== 'tab' || !item.config) return item
    const config = item.config as TabConfig
    const n = config.tabs.length + 1
    return {
      ...item,
      config: { ...config, tabs: [...config.tabs, { label: `Tab ${n}`, value: `tab_${n}` }] },
      childCanvases: [...(item.childCanvases ?? []), createChildCanvas()],
    }
  })
}

/** Remove a tab header + its child canvas together. */
export function removeTab(canvas: ChildCanvas, itemId: string, index: number): ChildCanvas {
  return patchItem(canvas, itemId, (item) => {
    if (item.type !== 'tab' || !item.config) return item
    const config = item.config as TabConfig
    return {
      ...item,
      config: { ...config, tabs: config.tabs.filter((_, i) => i !== index) },
      childCanvases: (item.childCanvases ?? []).filter((_, i) => i !== index),
    }
  })
}
