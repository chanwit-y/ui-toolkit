/**
 * Builds the logic preview video (see ../README.md):
 *
 *   bun logic/build.ts                  narration → capture every scene → render
 *   bun logic/build.ts --render-only    re-render from the last capture
 *   bun logic/build.ts --only l5-rule   re-capture one scene, keep the others
 *
 * Needs `api` (9000), `example` (3200), `studio` (3300), `demo-api` (9100) and
 * `demo` (3400). The studio runs on its own seeded workspace in a fresh
 * browser context, so nothing is written to `demo/gummy`.
 * Writes logic/out/gummy-logic.mp4, logic/script.md and logic/captions.srt.
 */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildVideo } from '../pipeline'
import { RATE, SCENES, VOICE } from './narration'
import { sceneApp, sceneBook, sceneFormula, sceneRename, sceneRule, sceneSlot } from './capture'

/** A sigma for the title cards. */
const SIGMA_ICON =
  '<svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2"/></svg>'

await buildVideo({
  dir: dirname(fileURLToPath(import.meta.url)),
  title: 'Gummy logic preview',
  outFile: 'gummy-logic.mp4',
  scenes: SCENES,
  voice: VOICE,
  rate: RATE,
  cardIcon: SIGMA_ICON,
  cardBackground: 'radial-gradient(1200px 700px at 30% 20%, rgba(255,255,255,.12), transparent 60%), linear-gradient(120deg,#042f2e 0%,#0f766e 50%,#1d4ed8 100%)',
  capture: async (ctx, want, result) => {
    if (want('l2-app')) result['l2-app'] = await sceneApp(ctx)
    if (want('l3-slot')) result['l3-slot'] = await sceneSlot(ctx)
    if (want('l4-formula')) result['l4-formula'] = await sceneFormula(ctx)
    if (want('l5-rule')) result['l5-rule'] = await sceneRule(ctx)
    if (want('l6-rename')) result['l6-rename'] = await sceneRename(ctx)
    if (want('l7-book')) result['l7-book'] = await sceneBook(ctx)
  },
})
