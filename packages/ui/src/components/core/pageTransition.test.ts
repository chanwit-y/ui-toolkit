import { describe, expect, test } from "bun:test";
import { DEFAULT_PAGE_TRANSITION_DURATION, PageEnterGate, playPageTransition, resolvePageTransition } from "./pageTransition";

describe("resolvePageTransition", () => {
  test("none, unknown types and a zero duration play nothing", () => {
    expect(resolvePageTransition(undefined)).toBeNull();
    expect(resolvePageTransition({ type: "none" })).toBeNull();
    expect(resolvePageTransition({ type: "spin" as never })).toBeNull();
    expect(resolvePageTransition({ type: "fade", duration: 0 })).toBeNull();
  });

  test("defaults: 250 ms, ease-out; keyframes end on the resting state", () => {
    const r = resolvePageTransition({ type: "fade-up" })!;
    expect(r.options).toEqual({ duration: DEFAULT_PAGE_TRANSITION_DURATION, easing: "ease-out" });
    expect(r.keyframes[0]).toEqual({ opacity: 0, transform: "translateY(8px)" });
    expect(r.keyframes[1]).toEqual({ opacity: 1, transform: "none" });
    // No fill: the transform must not outlive the animation.
    expect("fill" in r.options).toBe(false);
  });

  test("every type is transform / opacity only, with its own start", () => {
    const starts = (["fade", "fade-up", "slide", "scale"] as const).map((type) => resolvePageTransition({ type })!.keyframes[0]);
    for (const k of starts) for (const prop of Object.keys(k)) expect(["opacity", "transform"]).toContain(prop);
    expect(new Set(starts.map((k) => JSON.stringify(k))).size).toBe(4);
  });

  test("duration is clamped to 0–2000 ms, an unknown easing falls back", () => {
    expect(resolvePageTransition({ type: "fade", duration: 9000 })!.options.duration).toBe(2000);
    expect(resolvePageTransition({ type: "fade", duration: 350, easing: "linear" })!.options).toEqual({ duration: 350, easing: "linear" });
    expect(resolvePageTransition({ type: "fade", easing: "bounce" as never })!.options.easing).toBe("ease-out");
  });
});

describe("PageEnterGate", () => {
  test("silent on the first page, plays once per pathname change, never twice for one pathname", () => {
    const gate = new PageEnterGate();
    expect(gate.shouldPlay("/books")).toBe(false); // first render of the app
    expect(gate.shouldPlay("/books")).toBe(false); // a re-render / StrictMode's second effect
    expect(gate.shouldPlay("/books/b-001")).toBe(true); // another page
    expect(gate.shouldPlay("/books/b-001")).toBe(false);
    expect(gate.shouldPlay("/books/b-002")).toBe(true); // a :param change on the same page
    expect(gate.shouldPlay("/books")).toBe(true);
  });
});

describe("playPageTransition", () => {
  type Fake = { animate: (k: Keyframe[], o: KeyframeAnimationOptions) => { cancel: () => void }; getAnimations: () => { cancel: () => void }[] };

  function fakeElement() {
    const calls: { keyframes: Keyframe[]; options: KeyframeAnimationOptions }[] = [];
    let cancelled = 0;
    const running: { cancel: () => void }[] = [];
    const el: Fake = {
      animate: (keyframes, options) => {
        calls.push({ keyframes, options });
        const a = { cancel: () => void cancelled++ };
        running.push(a);
        return a;
      },
      getAnimations: () => running.splice(0),
    };
    return { el: el as unknown as HTMLElement, calls, cancelled: () => cancelled };
  }

  test("animates the wrapper, cancelling the one still running", () => {
    const { el, calls, cancelled } = fakeElement();
    playPageTransition(el, { type: "slide", duration: 300 });
    playPageTransition(el, { type: "slide", duration: 300 });
    expect(calls).toHaveLength(2);
    expect(calls[0].options).toEqual({ duration: 300, easing: "ease-out" });
    expect(cancelled()).toBe(1);
  });

  test("nothing without a transition or an element", () => {
    const { el, calls } = fakeElement();
    expect(playPageTransition(el, { type: "none" })).toBeNull();
    expect(playPageTransition(null, { type: "fade" })).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
