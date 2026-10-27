/**
 * Where the content is portaled. Normally `document.body`; but inside an open
 * Radix dialog (the library `Modal`, or a consumer's) the dialog's focus trap
 * pulls focus back from anything outside its content — a text field in a
 * body-portaled popover could be clicked but never typed into — so there the
 * content goes inside the dialog content, where the trap allows it.
 */
export function portalTargetFor(trigger: HTMLElement | null): HTMLElement {
  return trigger?.closest<HTMLElement>('[role="dialog"],[role="alertdialog"]') ?? document.body;
}

/** True when `el` is the containing block of its `position: fixed` descendants. */
function isFixedContainingBlock(el: HTMLElement): boolean {
  const cs = getComputedStyle(el);
  return (
    cs.transform !== 'none' ||
    cs.perspective !== 'none' ||
    cs.filter !== 'none' ||
    ((cs as CSSStyleDeclaration & { backdropFilter?: string }).backdropFilter ?? 'none') !== 'none' ||
    /transform|perspective|filter/.test(cs.willChange) ||
    /paint|layout|strict|content/.test(cs.contain)
  );
}

/**
 * The viewport offset of the box that `position: fixed` resolves against for
 * a child of `target`: (0, 0) for the viewport itself, else the padding box of
 * the nearest transformed ancestor (a centred modal's `translate(-50%, -50%)`).
 */
export function fixedOrigin(target: HTMLElement): { x: number; y: number } {
  for (let el: HTMLElement | null = target; el && el !== document.body; el = el.parentElement) {
    if (isFixedContainingBlock(el)) {
      const rect = el.getBoundingClientRect();
      return { x: rect.left + el.clientLeft, y: rect.top + el.clientTop };
    }
  }
  return { x: 0, y: 0 };
}
