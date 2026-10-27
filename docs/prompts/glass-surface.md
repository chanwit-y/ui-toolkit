# Glass surface — design (grilled 2026-10-27)

Add a **Glass** look to Gummy UI that applies to every component in a project,
in the engine, the studio and the MCP.

## Decisions

### 1. Glass is a surface style, not a third appearance

`surface: "flat" | "glass"` is a new global theme token orthogonal to
`appearance: "light" | "dark"`. Light-glass and dark-glass both exist; the
`dark` class on `<html>` and everything built on it stay untouched. Default
`flat` — no existing project changes.

### 2. The backdrop

Glass is only visible over something, so glass mode paints a backdrop:

- **Default**: a soft accent-tinted gradient with two or three blurred colour
  blobs drawn from `--accent-*` (`--accent-3`…`--accent-5` in light,
  `--accent-2`…`--accent-4` in dark), so it follows the accent and flips with
  appearance.
- **Override**: `theme.background` — any CSS `background` value (colour,
  gradient, `url(...)`), honoured only while `surface` is glass.
- **Where**: a `position: fixed` layer behind the content on the `AppShell`
  root (the `bg-[var(--color-background)]` element); with `shell={false}` on
  the `PageRouter` wrapper. It does not scroll with the page.

### 3. One surface token set (the mechanism)

`ThemeProvider` sets `data-surface="flat|glass"` on the Radix `Theme` root.
A new portable partial `packages/ui/src/styles/surface.css` (`@import`ed by
`styles.css` and the studio `index.css`) defines

```
--gummy-surface-bg | -border | -blur | -shadow          (panel tier)
--gummy-surface-strong-bg | -border                     (strong tier)
--gummy-surface-input-bg | -border | -blur              (input tier)
```

for flat (today's values, pixel-identical) and under `[data-surface="glass"]`
(glass values). Every surfaced component migrates its ad-hoc paint
(`bg-white dark:bg-gray-900`, `var(--color-panel-solid)`, hardcoded `white` /
`rgb(17 24 39)` in `datatable.css`) onto the shared classes
`gummy-surface` / `gummy-surface-strong` / `gummy-surface-input`. Anything on
those classes is glass for free; the three paint paths become one.

In glass mode the root also re-points Radix's own `--color-panel-solid` and
`--color-panel` to the translucent value and adds the blur to
`.rt-PopoverContent`, `.rt-SelectContent`, `.rt-DialogContent`, so Radix-drawn
chrome follows.

The glass panel colour is mixed from `--color-panel-solid` (not pure white /
black) so `--gray-12` text keeps its contrast against the panel's own colour.

### 4. Four tiers

| Tier | Class | Glass look | Members |
|---|---|---|---|
| Panel | `gummy-surface` | ~65% panel colour, `blur(16px) saturate(140%)`, hairline border, soft shadow | Paper / container `surface`, Card, Repeater item surface, DataTable frame, Popover, autocomplete + select dropdowns, date pickers, Modal + Drawer content, AppShell app bar (`variant: panel`) and sidebar, auth + profile cards, upload dropzone |
| Strong | `gummy-surface-strong` | ~92% panel colour, **no blur** | sticky table header, pinned cells, row-header cells, mobile drawer, tooltips |
| Input | `gummy-surface-input` | ~40% panel colour, `blur(8px)`, hairline | TextField, Textarea, Select trigger, Switch track, upload file rows |
| Untouched | — | — | buttons (contained stays solid accent), accent / custom painted app bar, a theme-coloured table header band, snackbars |

Why Strong has no blur: pinned cells exist to hide the cells scrolling under
them, and `backdrop-filter` on many sticky cells is a Chrome performance sink.
Why inputs are lighter: a field at the card's alpha vanishes into the card.

### 5. Config shape

```ts
type GummyThemeProps = ThemeProps & {
  surface?: "flat" | "glass";   // default flat
  background?: string;          // CSS background, glass only
};
```

Project JSON:

```json
"theme": { "theme": { "appearance": "light", "accentColor": "iris",
                      "surface": "glass", "background": "linear-gradient(…)" } }
```

`ThemeProvider` strips the two keys before Radix `<Theme>`. No blur / opacity
tunables in v1 (two CSS vars a consumer can override if ever needed).
`assertGummyProject` checks `surface` is one of the two values and
`background` is a string.

### 6. Fallbacks

Under `@media (prefers-reduced-transparency: reduce)`,
`@supports not (backdrop-filter: blur(1px))` and `@media print`, every tier
collapses to the **Strong** values (no blur, ~92%); the backdrop stays (white
in print). Three CSS blocks in `surface.css`, nothing in JS.

### 7. Studio

- `StudioThemeConfig.surface: 'flat' | 'glass'` and
  `background: { kind: 'default' | 'color' | 'gradient' | 'image'; color;
  gradient: { from, to, angle }; image }` (structured, like the app bar's
  paint). `toThemeObjects` lowers it to the one CSS string only when glass and
  kind ≠ default. Workspace `version: 54`, `migrateV53` fills `surface: 'flat'`
  + default background on every project.
- Theme page: a **Surface** segmented control (Flat | Glass) beside Panel
  background; a **Backdrop** sub-section shown only in glass — kind selector,
  then colour input / the gradient trio / image URL + Upload (300 KB `data:`
  limit, the app-bar logo precedent). The sample block previews it.
- Canvas frame (`designThemeStyle`'s target) and the Live Preview wrapper carry
  `data-surface` and paint the backdrop, so the real components in the cells go
  glass. Studio chrome stays on the ink tokens.
- MCP: `StudioThemeConfig` is already the `update_theme` schema root, so the
  fields flow through `bun scripts/gen-schemas.ts`; the `shell-theme` guide
  gains a paragraph; the drift test enforces the rest.

### 8. Demos and runtime switching

- `ThemeContext` gains `surface` / `setSurface` — a runtime override that is
  **not** persisted (the project config is the source of truth). `GummyApp`
  passes the project's value; nested providers (Modal / Drawer portals)
  inherit it like appearance.
- Demo **Gummy Portal** switches to `surface: glass` with the default backdrop.
  The **Book shop** stays flat.
- The example app keeps flat in config and gains a **Surface toggle** in its
  header beside the dark toggle, so every demo page can be checked in glass.

### 9. Done definition

Tests (`bun:test`):
- `ThemeProvider`: keys stripped before Radix, `data-surface` set, nested
  inheritance, default flat.
- `core/project.test.ts`: `surface` / `background` accepted, bad `surface`
  rejected.
- Studio: `toThemeObjects` per background kind (nothing emitted when flat or
  default), `migrateV53`, drift test green.
- Library grep test: no `bg-white`, `dark:bg-gray-900`, hardcoded `white` /
  `rgb(17 24 39)` surface paint left in `packages/ui/src` outside
  `surface.css`.

Browser checks (example app toggle, light + dark): pinned-column table
scrolled horizontally, a modal holding a table filter popover, a drawer, a
date-picker dropdown, the auth landing card, the Gummy Portal pill sidebar;
reduced-transparency emulation and the `@supports` fallback forced once.

Deliverables beside the code: this file, a CLAUDE.md bullet, a memory entry,
the MCP guide paragraph.

## As built (2026-10-27) — deviations from the plan above

- The backdrop inside `AppShell` is `position: absolute; z-index: -1` in the
  shell root (made `relative isolate`), not `fixed`: the root doesn't scroll
  (`<main>` does), so it stays put anyway, and a fixed layer would cover the
  viewport from inside the studio Live Preview modal. `GummyApp` with
  `shell={false}` renders it `fixed` (`<SurfaceBackdrop fixed>`); `PageRouter`
  is untouched — a hand-wired app without the shell mounts `SurfaceBackdrop`
  itself.
- The outermost `ThemeProvider` also mirrors glass as `html[data-surface]`:
  Radix Themes re-applies its own `.radix-themes` tokens on portaled selects
  and dropdowns, which the Theme root's `data-surface` never reaches.
- Flat stays pixel-identical in light; in dark the panels that used Tailwind's
  `gray-900` (`#111827`) now use Radix's `--gray-2` like the modal and shell
  already did — one panel colour instead of two.
- Disabled-state tints (`bg-gray-50 dark:bg-gray-800`) became
  `bg-[var(--gray-a3)]` so they layer over glass.
- `SurfaceToggle` (the `ThemeToggle` sibling) is a library export, used by the
  example header.
- The studio's `ColorInput` is exported from `MenuEditor` and reused by the
  Backdrop editor; the Theme page draws a `GlassPreview` with the real classes.
- Dialogs and drawers in glass sit on a lighter scrim (a thin tint, 4px blur) and
  their panel is 82% rather than the card's 65%: the flat scrim's dark blurred
  gradient drowned a translucent panel. The scrim rule goes through the `<html>`
  mirror (the overlay is portaled beside the Theme root).
- A configured backdrop is one string, but a pale light-mode gradient under the
  dark panels washed them out and left the page text (`--gray-12`) unreadable.
  Rather than a second string per appearance, the studio's colour and gradient
  backdrops gained optional dark counterparts (`darkColor`, `gradient.darkFrom`
  / `darkTo`; workspace v55) lowered to CSS `light-dark()` — the Radix theme
  root sets `color-scheme`, so the one `theme.background` flips by itself. The
  Glass showcase uses it (lavender → pink / deep indigo → plum); the engine's
  default backdrop already flipped through the accent scale. Images stay
  single-valued.
