import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import type { PageTransition, PageTransitionType } from "../@types";

/**
 * Page-change animations (see the grilled design `page-transition`): the
 * page's content sits in one wrapper that is never re-keyed, and on a
 * pathname change the wrapper plays the enter keyframes through the Web
 * Animations API — so nothing remounts (no refetched loads, no lost drafts or
 * scroll). Enter-only, transform / opacity only, off under reduced motion.
 */

export const DEFAULT_PAGE_TRANSITION_DURATION = 250;
const EASINGS = new Set(["ease-out", "ease-in-out", "linear"]);

const KEYFRAMES: Record<Exclude<PageTransitionType, "none">, Keyframe[]> = {
  fade: [{ opacity: 0 }, { opacity: 1 }],
  "fade-up": [
    { opacity: 0, transform: "translateY(8px)" },
    { opacity: 1, transform: "none" },
  ],
  slide: [
    { opacity: 0, transform: "translateX(16px)" },
    { opacity: 1, transform: "none" },
  ],
  scale: [
    { opacity: 0, transform: "scale(0.98)" },
    { opacity: 1, transform: "none" },
  ],
};

/** The keyframes and timing of a transition; `null` for none / unknown / a zero duration. */
export function resolvePageTransition(
  t: PageTransition | undefined | null,
): { keyframes: Keyframe[]; options: KeyframeAnimationOptions } | null {
  if (!t || t.type === "none" || !(t.type in KEYFRAMES)) return null;
  const duration = Number.isFinite(t.duration) ? Math.min(Math.max(Number(t.duration), 0), 2000) : DEFAULT_PAGE_TRANSITION_DURATION;
  if (duration === 0) return null;
  const easing = t.easing && EASINGS.has(t.easing) ? t.easing : "ease-out";
  // No `fill`: the transform must not outlive the animation — a transformed
  // ancestor is the containing block of `position: fixed` dropdowns.
  return { keyframes: KEYFRAMES[t.type as keyof typeof KEYFRAMES], options: { duration, easing } };
}

/**
 * When to play, per router: never on the first page shown, never twice for
 * the same pathname (a re-render, StrictMode's double effect), always when
 * the pathname differs from the last one played or shown.
 */
export class PageEnterGate {
  private last: string | null = null;

  shouldPlay(pathname: string): boolean {
    if (this.last === null) {
      this.last = pathname;
      return false;
    }
    if (this.last === pathname) return false;
    this.last = pathname;
    return true;
  }
}

function reducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Plays a transition on `el` (cancelling one still running there); nothing under reduced motion. */
export function playPageTransition(el: HTMLElement | null, t: PageTransition | undefined | null): Animation | null {
  const resolved = resolvePageTransition(t);
  if (!el || !resolved || typeof el.animate !== "function" || reducedMotion()) return null;
  for (const running of el.getAnimations?.() ?? []) running.cancel();
  return el.animate(resolved.keyframes, resolved.options);
}

/** The shell's transition (`AppShell.pageTransition`), read by a `PageRouter` that has none of its own. */
export const PageTransitionContext = createContext<PageTransition | undefined>(undefined);

export function usePageTransition(own?: PageTransition): PageTransition | undefined {
  const fromShell = useContext(PageTransitionContext);
  return own ?? fromShell;
}

/**
 * The wrapper a routed page's content renders in (mounted after Suspense, so
 * a split page animates when its body arrives, not its spinner). Plays when
 * the gate says the pathname changed — on mount for a newly matched page, on
 * a `:param` change within the same one. Without a transition it renders the
 * content as is.
 */
export function PageEnter({ transition, gate, children }: { transition?: PageTransition; gate: PageEnterGate; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const active = !!resolvePageTransition(transition);
  useLayoutEffect(() => {
    if (!gate.shouldPlay(pathname) || !active) return;
    playPageTransition(ref.current, transition);
  }, [pathname, gate, active, transition]);
  if (!active) return <>{children}</>;
  return (
    <div ref={ref} className="gummy-page">
      {children}
    </div>
  );
}
