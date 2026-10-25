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
| `demo-clerk` | 3401 | the app again, signed in as a clerk (`VITE_AUTH_MOCK_EMAIL=pimchanok_s@banpu.co.th`) |
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
