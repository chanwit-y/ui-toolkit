# Prompt: a 90-second intro video for Gummy Studio (with the Book shop demo)

> Grilled design, 2026-10-24 — **implemented the same day** in `docs/video/` (see its README).
> Deviations: Chromium records at 1440×810 CSS px and is upscaled to 1080p (the screencast delivers
> CSS-pixel frames); the result runs ~83 s; scene 5 shows the clerk first, then the manager; a
> second demo instance on port 3401 is signed in as the clerk. Memory: `intro-video`.

## Goal

A ~90-second product intro for people meeting Gummy for the first time: the Book shop running,
then how it was built in Gummy Studio, then roles and live editing. 1920×1080 MP4, English
narration, burned-in English captions.

## Decisions (the design tree, resolved)

1. **Audience and length:** a short product intro (~90 s) for teammates, stakeholders and teams
   that might adopt Gummy — not a developer walkthrough, not a silent teaser.
2. **Narration:** English, macOS `say -v Samantha`, captions burned in. The edit is timed to the
   narration lines, and the script ships with timestamps, so a human voice-over can replace the
   generated one later (one audio file per line, rebuild — no re-cut). No music.
3. **Storyboard (result first):**

   | # | Time | On screen | Narration (gist) |
   |---|---|---|---|
   | 1 | 0–6s | Title card "Gummy Studio" | Meet Gummy Books, a back office for a book shop. |
   | 2 | 6–18s | Demo: dashboard, Books with the genre → author filter, a book page | Dashboards, filtered tables, detail pages, forms, sign-in — none of these screens was hand-coded. |
   | 3 | 18–40s | Studio: Book shop project, Books page canvas, select the table, its properties, Live Preview | They were designed in Gummy Studio: drop in a component, point it at an endpoint, preview it for real. |
   | 4 | 40–55s | Studio: Sign-in library entry, a "Show when role is manager" condition, Menu tab app bar + page transition Play | Sign-in, roles, menus and themes are settings, not code. |
   | 5 | 55–72s | Demo: an order's refund approval as the manager, then the clerk's view of it | The same app behaves differently for a manager and a clerk, from one condition. |
   | 6 | 72–84s | Split screen: edit the app bar title in the studio, the running app updates | The studio saves plain JSON next to your code, and the app picks it up as you edit. |
   | 7 | 84–90s | End card "Design it in Gummy Studio · runs from JSON · `gummy studio`" | Gummy Studio. Build the screens, keep the code for what matters. |

4. **Capture:** fully scripted. Playwright (installed in the session scratchpad, using the cached
   Chromium) drives headless Chromium at 1920×1080 against the running demo (3400) and studio
   over `demo/gummy`, one clip per scene; an injected visible cursor glides to targets with a click
   ripple and natural-speed typing; scene 6 records two windows at once and composes them side by
   side. Clean state: restart the mock API before capture, use a fresh pending refund, and undo the
   live-edit scene's change to the Book shop files afterwards (regenerate, check against git).
5. **Look and files:** title / end cards in the Book shop's indigo gradient (#1e1b4b → #4f46e5),
   white text, the book icon; captions bottom-centred on a soft dark band, one line at a time;
   short crossfades and a subtle zoom on the area a scene talks about. In `docs/video/`: capture
   script, build script (`bun docs/video/build.ts` re-records and re-renders), narration script
   with timings, `.srt`. The MP4 (~20–30 MB) goes to `docs/video/out/`, gitignored, and is sent to
   the user when done.

## Out of scope

Background music, a human voice-over (the script is ready for one), a Thai version, a developer
walkthrough cut, committing the MP4 to git.
