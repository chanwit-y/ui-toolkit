import { measure } from './perf'

export const SMOOTH_DURATION_MS = 560
export const SMOOTH_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)'

export const ENTER_DURATION_MS = 420
export const ENTER_EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

export const GRID_LAYOUT_TRANSITION = [
  `grid-template-columns ${SMOOTH_DURATION_MS}ms ${SMOOTH_EASING}`,
  `gap ${SMOOTH_DURATION_MS}ms ${SMOOTH_EASING}`,
  `row-gap ${SMOOTH_DURATION_MS}ms ${SMOOTH_EASING}`,
  `column-gap ${SMOOTH_DURATION_MS}ms ${SMOOTH_EASING}`,
].join(', ')

export const GRID_ITEM_TRANSITION = [
  `grid-column ${SMOOTH_DURATION_MS}ms ${SMOOTH_EASING}`,
  `grid-row ${SMOOTH_DURATION_MS}ms ${SMOOTH_EASING}`,
  `order ${SMOOTH_DURATION_MS}ms ${SMOOTH_EASING}`,
].join(', ')

export type GridFlipSnapshot = {
  container: DOMRect | null
  items: Map<string, DOMRect>
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function playContentOpacityAnimation(itemEl: HTMLElement) {
  if (prefersReducedMotion()) return

  const content = itemEl.querySelector<HTMLElement>('[data-grid-item-content]')
  if (!content) return

  content.getAnimations().forEach((a) => a.cancel())
  content.animate(
    [
      { opacity: 1, offset: 0 },
      { opacity: 0, offset: 0.4 },
      { opacity: 1, offset: 1 },
    ],
    {
      duration: SMOOTH_DURATION_MS,
      easing: SMOOTH_EASING,
      fill: 'both',
    },
  )
}

export function playItemEnterAnimation(itemEl: HTMLElement) {
  if (prefersReducedMotion()) return

  itemEl.style.transformOrigin = 'center'
  const animation = itemEl.animate(
    [
      { transform: 'scale(0.4)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    {
      duration: ENTER_DURATION_MS,
      easing: ENTER_EASING,
      fill: 'both',
    },
  )

  animation.onfinish = () => {
    itemEl.style.transformOrigin = ''
  }
}

export function captureGridSnapshot(container: HTMLElement): GridFlipSnapshot {
  const items = new Map<string, DOMRect>()
  container.querySelectorAll<HTMLElement>('[data-grid-item]').forEach((el) => {
    const id = el.dataset.gridItem
    if (id) items.set(id, el.getBoundingClientRect())
  })
  return { container: container.getBoundingClientRect(), items }
}

// FLIP each item using positions measured RELATIVE to the grid container. Doing
// this relative to the container (instead of the viewport) means the animation
// stays correct even while the container itself is moving/resizing, e.g. while
// the preview frame is being re-centered during a breakpoint change.
function flipGridItems(
  container: HTMLElement,
  snapshot: GridFlipSnapshot,
  contentFadeId?: string | 'all',
) {
  const containerLast = container.getBoundingClientRect()
  const containerFirst = snapshot.container ?? containerLast

  const elements = Array.from(
    container.querySelectorAll<HTMLElement>('[data-grid-item]'),
  )

  for (const el of elements) {
    const id = el.dataset.gridItem
    if (!id) continue

    const shouldFade = contentFadeId === 'all' || contentFadeId === id

    el.getAnimations().forEach((a) => {
      if (a.effect instanceof KeyframeEffect && a.effect.target === el) {
        a.cancel()
      }
    })

    const last = el.getBoundingClientRect()
    const first = snapshot.items.get(id)

    if (!first) {
      playItemEnterAnimation(el)
      continue
    }

    const dx =
      first.left - containerFirst.left - (last.left - containerLast.left)
    const dy = first.top - containerFirst.top - (last.top - containerLast.top)
    const sx = last.width > 0 ? first.width / last.width : 1
    const sy = last.height > 0 ? first.height / last.height : 1

    const moved =
      Math.abs(dx) > 0.5 ||
      Math.abs(dy) > 0.5 ||
      Math.abs(sx - 1) > 0.005 ||
      Math.abs(sy - 1) > 0.005

    if (moved) {
      el.style.transformOrigin = 'top left'

      const animation = el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transform: 'none' },
        ],
        {
          duration: SMOOTH_DURATION_MS,
          easing: SMOOTH_EASING,
          fill: 'both',
        },
      )

      animation.onfinish = () => {
        el.style.transformOrigin = ''
      }
    }

    if (shouldFade) {
      playContentOpacityAnimation(el)
    }
  }
}

export function playGridFlipAnimation(
  container: HTMLElement,
  snapshot: GridFlipSnapshot,
  contentFadeId?: string | 'all',
  beforeMeasure?: () => void,
) {
  if (prefersReducedMotion()) return

  // Wait two frames so React has committed the new layout, run any caller setup
  // (freezing the grid width, starting the frame resize) right before we read
  // the final positions, then play the FLIP.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      beforeMeasure?.()
      measure(`flipGridItems(${snapshot.items.size} items)`, () =>
        flipGridItems(container, snapshot, contentFadeId),
      )
    }),
  )
}

// Smoothly animate the preview frame's width from its previous value to the new
// one. The grid inside is pinned to its final width while this runs, so the
// frame clips (overflow hidden) the already-final grid, revealing/concealing it
// in lockstep with the items' FLIP motion.
export function playFrameResizeAnimation(
  frameEl: HTMLElement,
  fromWidth: number,
): boolean {
  if (prefersReducedMotion()) return false

  const toWidth = frameEl.getBoundingClientRect().width
  if (Math.abs(fromWidth - toWidth) < 0.5) return false

  frameEl.getAnimations().forEach((a) => a.cancel())

  const prevOverflow = frameEl.style.overflow
  frameEl.style.overflow = 'hidden'
  const restore = () => {
    frameEl.style.overflow = prevOverflow
  }

  const animation = frameEl.animate(
    [{ width: `${fromWidth}px` }, { width: `${toWidth}px` }],
    {
      duration: SMOOTH_DURATION_MS,
      easing: SMOOTH_EASING,
    },
  )
  animation.onfinish = restore
  animation.oncancel = restore

  return true
}
