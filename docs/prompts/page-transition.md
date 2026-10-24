# Prompt: a page-change animation option

> Grilled design, 2026-10-24 — **implemented the same day** (see the Page transition bullet in
> `CLAUDE.md`). One deviation: no DOM test environment is installed, so "replays without a remount"
> is covered by the pure gate / player tests plus a browser check (the page's DOM nodes survive a
> `:param` change while `element.animate` is called once), instead of a client-rendered unit test.

## Goal

A project chooses how a page enters when the route changes — authored in the studio, carried in
the project JSON, applied by the engine — without remounting the page (no refetched loads, no lost
form drafts or scroll).

## Decisions (the design tree, resolved)

1. **Project-wide, in the shell settings.** `shell.pageTransition` in the project document; the
   studio edits it on the Menu tab's Layout section; `GummyApp` applies it; a `pageTransition` prop
   on `GummyApp` / `AppShell` overrides it from code. No per-page override in v1.
2. **A small enter-only set.** `type: "none" | "fade" | "fade-up" | "slide" | "scale"` (default
   `none`): fade = opacity; fade-up = opacity + 8px rise; slide = from the right (16px) + opacity;
   scale = from 0.98 + opacity — transform / opacity only. `duration` in ms (default 250),
   `easing: "ease-out" | "ease-in-out" | "linear"` (default `ease-out`). Off under
   `prefers-reduced-motion: reduce`. No exit animations, no custom class names.
3. **Replayed without remounting.** The page content sits in a wrapper that is never re-keyed; on
   a route change the wrapper runs the keyframes through the Web Animations API (`element.animate`),
   cancelling one still running. A "page change" is a **pathname** change (a `:param` change
   counts; a query-string-only change doesn't). No animation on the first render.
4. **The content animates once it is there.** The animator sits inside the routed page, after
   Suspense: an inline or already-loaded page animates at once, a split page when its file has
   arrived (the loading spinner shows without motion). It also replays on a pathname change within
   the same page (`/books/1` → `/books/2`).
5. **Studio + demos + proof.** Menu tab → Layout: Page transition select, Duration (ms), Easing,
   and a **Play** button animating a sample block. `ShellSettings.pageTransition?` (optional, no
   migration), exported only when not `none` (duration / easing only off their defaults); the Live
   Preview applies it. The Book shop uses `fade-up` 250 ms; the example app replaces its remounting
   `PageTransition` wrapper with the library option (`fade-up`, 350 ms). Tests: the keyframe /
   option resolution, and a library test that a pathname change replays the animation without a
   remount (the `coreStats()` construction count stays put).

## Out of scope

Exit / cross-fade transitions, per-page transitions, custom keyframes, holding the old page until
the new one is ready (`startTransition`), scroll restoration.
