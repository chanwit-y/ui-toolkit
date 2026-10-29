/**
 * Builds the charts preview video (see ../README.md):
 *
 *   bun charts/build.ts                  narration → capture every scene → render
 *   bun charts/build.ts --render-only    re-render from the last capture
 *   bun charts/build.ts --only c3-mix    re-capture one scene, keep the others
 *
 * Needs `demo-api` (9100), `demo-charts` (3405) and `demo-studio` (3398).
 * Writes charts/out/gummy-charts.mp4, charts/script.md and charts/captions.srt.
 */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildVideo } from '../pipeline'
import { RATE, SCENES, VOICE } from './narration'
import { sceneCompare, sceneKpis, sceneMix, scenePatterns, sceneSales, sceneStudio } from './capture'

/** A bar-chart glyph for the title cards. */
const CHART_ICON =
  '<svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>'

await buildVideo({
  dir: dirname(fileURLToPath(import.meta.url)),
  title: 'Gummy charts preview',
  outFile: 'gummy-charts.mp4',
  scenes: SCENES,
  voice: VOICE,
  rate: RATE,
  cardIcon: CHART_ICON,
  cardBackground: 'radial-gradient(1200px 700px at 30% 20%, rgba(255,255,255,.12), transparent 60%), linear-gradient(120deg,#1e1b4b 0%,#3730a3 45%,#4f46e5 100%)',
  capture: async (ctx, want, result) => {
    if (want('c2-sales')) result['c2-sales'] = await sceneSales(ctx)
    if (want('c3-mix')) result['c3-mix'] = await sceneMix(ctx)
    if (want('c4-compare')) result['c4-compare'] = await sceneCompare(ctx)
    if (want('c5-patterns')) result['c5-patterns'] = await scenePatterns(ctx)
    if (want('c6-kpis')) result['c6-kpis'] = await sceneKpis(ctx)
    if (want('c7-studio')) result['c7-studio'] = await sceneStudio(ctx)
  },
})
