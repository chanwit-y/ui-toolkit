# Gummy videos

Five narrated videos share this pipeline: the Studio intro below, `grid/`, `charts/`, `logic/`
(`bun logic/build.ts` → `logic/out/gummy-logic.mp4`, ~110 s, scenes `l1`–`l8`: formulas, rules and
conditions over `api` + `example` + `studio` + `demo-api` + `demo`; the studio runs on its own seed
in a fresh browser context, so unlike the others it writes nothing to `demo/gummy`) and `formula/`
(below).

# Gummy Studio intro video

A ~85-second product intro over the Book shop demo (plan: `docs/prompts/intro-video.md`). Every
scene is recorded from the real demo app and the real studio by a script, narrated with macOS
`say`, captioned and assembled with ffmpeg. The result is `out/gummy-studio-intro.mp4`
(1920×1080, H.264 + AAC, gitignored).

| File | What it is |
|---|---|
| `narration.ts` | the seven scenes and their narration lines, each anchored to a capture mark |
| `capture.ts` | the Playwright scripts, one per recorded scene |
| `recorder.ts` | the injected cursor, the CDP screencast recorder, ffmpeg helpers |
| `build.ts` | narration audio → title cards → capture → timeline → render |
| `script.md`, `captions.srt` | regenerated on every build: the narration with its timings, and the captions |

## Requirements

- macOS (`say`), `ffmpeg` with libx264 and libass, Bun.
- A Chromium headless shell from Playwright's cache (`~/Library/Caches/ms-playwright/chromium_headless_shell-*`),
  or `CHROME=/path/to/chrome`.
- `bun install` here (only `playwright-core`).

## Servers to start first

Launch entries from `.claude/launch.json`, or the same commands by hand:

| Entry | Port | What |
|---|---|---|
| `demo-api` | 9100 | the Book shop mock API — **restart it before a full build** (scene 5 approves a refund) |
| `demo` | 3400 | the app, signed in as the manager |
| `demo-clerk` | 3401 | the app again, signed in as a clerk (`VITE_AUTH_MOCK_EMAIL=pimchanok_s@gummay.co.th`) |
| `demo-studio` | 3398 | `gummy studio` over `demo/gummy` |

Close any other studio tab while recording; a second studio session would autosave over the first.

## Build

```bash
bun build.ts                  # capture every scene, then render
bun build.ts --only s3-studio # re-capture one scene, keep the others, render
bun build.ts --render-only    # re-render from the last capture (.work/captures.json)
```

Scene 6 types a new app bar title in the studio, which **writes the Book shop files**. Afterwards,
revert that change and restart `demo-studio`, since the CLI now holds the stale revision:

```bash
git checkout -- demo/gummy
```

## Swapping in a human voice

Record one file per narration line as `voice/<line id>.wav` (`l1`, `l2a`, … — see `script.md`)
and run `bun build.ts --render-only`. Each line still starts at its mark, and a longer take
pushes the lines after it and stretches its scene, so nothing needs re-cutting. `VOICE` and
`RATE` change the generated voice.

# Data grid preview video

A ~90-second preview of the data table's AG Grid-style features (formats and style rules, the
Columns menu, selection, grouping, export, scroll mode, then the studio panel), recorded on the
demo's **Data grid showcase** project. Same pipeline (`pipeline.ts`), its own script and captures:

| File | What it is |
|---|---|
| `grid/narration.ts` | the nine scenes (`g1`–`g9`) and their lines |
| `grid/capture.ts` | the recorded scenes |
| `grid/build.ts` | the build entry → `grid/out/gummy-data-grid.mp4` |

Servers: `demo-api` (9100), `demo-grid` (3404) and `demo-studio` (3398). Each scene opens a fresh
browser context, so no remembered column layout leaks between takes; nothing is written to
`demo/gummy`.

```bash
bun grid/build.ts                     # capture every scene, then render
bun grid/build.ts --only g5-grouping  # re-capture one scene, render
bun grid/build.ts --render-only       # re-render from the last capture
```

# Charts preview video

A ~100-second preview of the `chart` element (bars with a target read off the response and a
click into page data, line / stacked area, donut + legend toggles + click-through navigation,
ranked bars, funnel, bar + right-axis line, bubble scatter, heatmap, radars, gauges, a live
dark-mode flip, then the studio's type picker), recorded on the demo's **Charts showcase**
project:

| File | What it is |
|---|---|
| `charts/narration.ts` | the eight scenes (`c1`–`c8`) and their lines |
| `charts/capture.ts` | the recorded scenes; a chart is one `<canvas>`, so bars and slices are found by sampling its pixels |
| `charts/build.ts` | the build entry → `charts/out/gummy-charts.mp4` |

Servers: `demo-api` (9100), `demo-charts` (3405) and `demo-studio` (3398). Scene `c7-studio`
switches the weekly chart's type and undoes it, but the autosave still writes `updatedAt` and an
activity entry — afterwards run `git checkout -- demo/gummy` and restart `demo-studio`.

```bash
bun charts/build.ts                   # capture every scene, then render
bun charts/build.ts --only c3-mix     # re-capture one scene, render
bun charts/build.ts --render-only     # re-render from the last capture
```

# Formula walkthrough video

A ~3-minute tour of every formula function: the nine functions (`ROUND MIN MAX ABS LEN TODAY DAYS
COUNT SUM`), the five operators, output formats and blank / divide-by-zero policies on the example
app's **Formula** page; computed fields, conditions, saved formulas with a rule inside them and
computed columns on its **Logic** page; the end user's `formula` element; then the studio's Formula
tile, Insert list, formula bar, Try it, in-cell editor and Logic tab:

| File | What it is |
|---|---|
| `formula/narration.ts` | the eleven scenes (`f1`–`f11`) and their lines |
| `formula/capture.ts` | the recorded scenes |
| `formula/build.ts` | the build entry → `formula/out/gummy-formula.mp4` |

Servers: `api` (9000), `example` (3200) and `studio` (3300). The studio runs on its own seed in a
fresh browser context, so nothing is written to `demo/gummy`.

```bash
bun formula/build.ts                  # capture every scene, then render
bun formula/build.ts --only f5-lists  # re-capture one scene, render
bun formula/build.ts --render-only    # re-render from the last capture
```

Two things to know when changing a scene. A native `title` tooltip never reaches the screencast, so
show a formula's error reason where the page draws it (Try it), not by hovering the dash. And
`Actor` scrolls its target into view instantly, which reads as a jump cut: wheel to the target first
with `scrollTo`, so the move happens on camera.
