import { BREAKPOINTS, clampColumns, clampSpan } from './breakpoints'
import type { Breakpoint } from './breakpoints'
import { GRID_ITEM_TRANSITION, GRID_LAYOUT_TRANSITION } from './gridAnimation'
import { measure } from './perf'
import type { GridContainerSettings, GridItemData } from './types'
import { escapeClassName } from './utils'

function mediaQuery(minWidth: number): string {
  return minWidth > 0 ? `@media (min-width: ${minWidth}px)` : ''
}

function wrapMedia(minWidth: number, selector: string, rules: string): string {
  if (!rules.trim()) return ''
  const block = `${selector} {\n${rules}\n}`
  const query = mediaQuery(minWidth)
  return query ? `${query} {\n${block}\n}` : block
}

function pickNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const v of values) {
    if (v?.trim()) return v.trim()
  }
  return undefined
}

function containerRules(settings: GridContainerSettings, bp: Breakpoint): string {
  const columns = clampColumns(settings.columns[bp])
  const lines: string[] = [
    `grid-template-columns: repeat(${columns}, minmax(0, 1fr));`,
  ]

  const gap = pickNonEmpty(settings.gap[bp])
  const rowGap = pickNonEmpty(settings.rowGap[bp])
  const columnGap = pickNonEmpty(settings.columnGap[bp])
  if (gap) lines.push(`gap: ${gap};`)
  if (rowGap) lines.push(`row-gap: ${rowGap};`)
  if (columnGap) lines.push(`column-gap: ${columnGap};`)

  const justifyItems = pickNonEmpty(settings.justifyItems[bp])
  const alignItems = pickNonEmpty(settings.alignItems[bp])
  const justifyContent = pickNonEmpty(settings.justifyContent[bp])
  const alignContent = pickNonEmpty(settings.alignContent[bp])
  const gridAutoRows = pickNonEmpty(settings.gridAutoRows[bp])
  const gridAutoFlow = pickNonEmpty(settings.gridAutoFlow[bp])

  if (justifyItems) lines.push(`justify-items: ${justifyItems};`)
  if (alignItems) lines.push(`align-items: ${alignItems};`)
  if (justifyContent) lines.push(`justify-content: ${justifyContent};`)
  if (alignContent) lines.push(`align-content: ${alignContent};`)
  if (gridAutoRows) lines.push(`grid-auto-rows: ${gridAutoRows};`)
  if (gridAutoFlow) lines.push(`grid-auto-flow: ${gridAutoFlow};`)

  return lines.join('\n  ')
}

function itemRules(
  item: GridItemData,
  container: GridContainerSettings,
  bp: Breakpoint,
): string {
  const settings = item.settings
  const columns = clampColumns(container.columns[bp])
  const colStart = settings.colStart[bp]
  const colSpan = clampSpan(settings.colSpan[bp], columns)

  const lines: string[] = []

  if (colStart > 0) {
    lines.push(`grid-column: ${colStart} / span ${colSpan};`)
  } else {
    lines.push(`grid-column: span ${colSpan};`)
  }

  const rowSpan = settings.rowSpan[bp]
  if (rowSpan > 1) {
    lines.push(`grid-row: span ${rowSpan};`)
  }

  const gridArea = settings.gridArea[bp].trim()
  if (gridArea) lines.push(`grid-area: ${gridArea};`)

  const justifySelf = pickNonEmpty(settings.justifySelf[bp])
  const alignSelf = pickNonEmpty(settings.alignSelf[bp])
  const order = settings.order[bp].trim()

  if (justifySelf) lines.push(`justify-self: ${justifySelf};`)
  if (alignSelf) lines.push(`align-self: ${alignSelf};`)
  if (order) lines.push(`order: ${order};`)

  return lines.join('\n  ')
}

function rulesChanged(a: string, b: string): boolean {
  return a.trim() !== b.trim()
}

function containerBlock(containerClass: string, rules: string): string {
  return `.${containerClass} {
  display: grid;
  transition: ${GRID_LAYOUT_TRANSITION};
  ${rules}
}`
}

function itemBlock(itemClass: string, rules: string): string {
  return `.${itemClass} {\n  transition: ${GRID_ITEM_TRANSITION};\n  ${rules}\n}`
}

function reducedMotionBlock(containerClass: string): string {
  return `.${containerClass} .grid-item-cell {
  will-change: transform;
}
@media (prefers-reduced-motion: reduce) {
  .${containerClass},
  .${containerClass} .grid-item-cell {
    transition: none !important;
    animation: none !important;
    will-change: auto;
  }
}`
}

export function generateGridStyles(
  layoutId: string,
  container: GridContainerSettings,
  items: GridItemData[],
  previewBreakpoint?: Breakpoint,
): string {
  return measure(
    `generateGridStyles(${items.length} items${previewBreakpoint ? ', preview' : ', full'})`,
    () => generateGridStylesImpl(layoutId, container, items, previewBreakpoint),
  )
}

function generateGridStylesImpl(
  layoutId: string,
  container: GridContainerSettings,
  items: GridItemData[],
  previewBreakpoint?: Breakpoint,
): string {
  const containerClass = `gl-${escapeClassName(layoutId)}`

  // Preview mode: emit only the rules for the single chosen breakpoint so the
  // canvas reflects exactly how the grid looks at that size.
  if (previewBreakpoint) {
    const blocks = [
      containerBlock(containerClass, containerRules(container, previewBreakpoint)),
      reducedMotionBlock(containerClass),
      ...items.map((item) =>
        itemBlock(
          `gi-${escapeClassName(item.id)}`,
          itemRules(item, container, previewBreakpoint),
        ),
      ),
    ]
    return blocks.join('\n\n')
  }

  // Full responsive output: base (xs) rules plus min-width media queries that
  // only repeat the rules that actually change at each breakpoint.
  const blocks: string[] = [
    containerBlock(containerClass, containerRules(container, 'xs')),
    reducedMotionBlock(containerClass),
  ]

  let prevContainer = containerRules(container, 'xs')
  for (const bp of BREAKPOINTS.slice(1)) {
    const rules = containerRules(container, bp.key)
    if (rulesChanged(prevContainer, rules)) {
      blocks.push(wrapMedia(bp.minWidth, `.${containerClass}`, rules))
      prevContainer = rules
    }
  }

  for (const item of items) {
    const itemClass = `gi-${escapeClassName(item.id)}`
    const baseRules = itemRules(item, container, 'xs')
    blocks.push(itemBlock(itemClass, baseRules))

    let prevItem = baseRules
    for (const bp of BREAKPOINTS.slice(1)) {
      const rules = itemRules(item, container, bp.key)
      if (rulesChanged(prevItem, rules)) {
        blocks.push(wrapMedia(bp.minWidth, `.${itemClass}`, rules))
        prevItem = rules
      }
    }
  }

  return blocks.join('\n\n')
}
