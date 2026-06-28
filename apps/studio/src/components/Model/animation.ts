import { prefersReducedMotion, SMOOTH_EASING } from '../Layout/gridAnimation'

/**
 * Subtle motion for the Model page — fade + a few px of slide, kept short so it
 * reads as "crisp" rather than showy. Reuses the grid builder's easing and
 * reduced-motion gate (see ../Layout/gridAnimation) so the whole app behaves
 * consistently and honors `prefers-reduced-motion`.
 */

export const ENTER_MS = 170
export const EXIT_MS = 160
export const FADE_MS = 130

/** Fade + slide a freshly mounted element into place. */
export function playEnter(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion()) return
  el.animate(
    [
      { opacity: 0, transform: 'translateY(-4px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: ENTER_MS, easing: SMOOTH_EASING, fill: 'both' },
  )
}

/** Quick opacity-only fade — used when a row swaps between display and edit. */
export function playFadeIn(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion()) return
  el.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: FADE_MS,
    easing: SMOOTH_EASING,
    fill: 'both',
  })
}

/**
 * Collapse + fade an element out, then run `onDone` (which performs the actual
 * store removal). React would otherwise unmount the node instantly, leaving no
 * frame to animate — so we keep it mounted, animate, and remove on finish. With
 * reduced motion we skip straight to removal.
 */
export function playExitThenRemove(
  el: HTMLElement | null,
  onDone: () => void,
): void {
  if (!el || prefersReducedMotion()) {
    onDone()
    return
  }
  const height = el.offsetHeight
  const cs = getComputedStyle(el)
  el.style.overflow = 'hidden'
  const anim = el.animate(
    [
      {
        height: `${height}px`,
        opacity: 1,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
      },
      {
        height: '0px',
        opacity: 0,
        marginTop: '0px',
        marginBottom: '0px',
      },
    ],
    { duration: EXIT_MS, easing: SMOOTH_EASING, fill: 'forwards' },
  )
  anim.onfinish = onDone
  anim.oncancel = onDone
}
