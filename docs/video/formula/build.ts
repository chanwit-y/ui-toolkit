/**
 * Builds the formula walkthrough (see ../README.md):
 *
 *   bun formula/build.ts                     narration → capture every scene → render
 *   bun formula/build.ts --render-only       re-render from the last capture
 *   bun formula/build.ts --only f5-lists     re-capture one scene, keep the others
 *
 * Needs `api` (9000), `example` (3200) and `studio` (3300). The studio runs on
 * its own seeded workspace in a fresh browser context, so nothing is written
 * to `demo/gummy`.
 * Writes formula/out/gummy-formula.mp4, formula/script.md and formula/captions.srt.
 */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildVideo } from '../pipeline'
import { RATE, SCENES, VOICE } from './narration'
import { sceneArithmetic, sceneBlanks, sceneFunctions, sceneLists, sceneOwn, sceneSaved, sceneStudio, sceneText, sceneWhere } from './capture'

/** A calculator for the title cards. */
const CALCULATOR_ICON =
  '<svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>'

await buildVideo({
  dir: dirname(fileURLToPath(import.meta.url)),
  title: 'Gummy formula walkthrough',
  outFile: 'gummy-formula.mp4',
  scenes: SCENES,
  voice: VOICE,
  rate: RATE,
  cardIcon: CALCULATOR_ICON,
  cardBackground: 'radial-gradient(1200px 700px at 30% 20%, rgba(255,255,255,.12), transparent 60%), linear-gradient(120deg,#431407 0%,#9a3412 50%,#be185d 100%)',
  capture: async (ctx, want, result) => {
    if (want('f2-arith')) result['f2-arith'] = await sceneArithmetic(ctx)
    if (want('f3-text')) result['f3-text'] = await sceneText(ctx)
    if (want('f4-functions')) result['f4-functions'] = await sceneFunctions(ctx)
    if (want('f5-lists')) result['f5-lists'] = await sceneLists(ctx)
    if (want('f6-blanks')) result['f6-blanks'] = await sceneBlanks(ctx)
    if (want('f7-where')) result['f7-where'] = await sceneWhere(ctx)
    if (want('f8-own')) result['f8-own'] = await sceneOwn(ctx)
    if (want('f9-studio')) result['f9-studio'] = await sceneStudio(ctx)
    if (want('f10-saved')) result['f10-saved'] = await sceneSaved(ctx)
  },
})
