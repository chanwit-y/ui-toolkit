/**
 * Builds the data grid preview video (see ../README.md):
 *
 *   bun grid/build.ts                   narration → capture every scene → render
 *   bun grid/build.ts --render-only     re-render from the last capture
 *   bun grid/build.ts --only g5-grouping  re-capture one scene, keep the others
 *
 * Needs `demo-api` (9100), `demo-grid` (3404) and `demo-studio` (3398).
 * Writes grid/out/gummy-data-grid.mp4, grid/script.md and grid/captions.srt.
 */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildVideo } from '../pipeline'
import { RATE, SCENES, VOICE } from './narration'
import { sceneColumns, sceneExport, sceneFormats, sceneGrouping, sceneScroll, sceneSelection, sceneStudio } from './capture'

/** A table glyph for the title cards. */
const TABLE_ICON =
  '<svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>'

await buildVideo({
  dir: dirname(fileURLToPath(import.meta.url)),
  title: 'Gummy data grid preview',
  outFile: 'gummy-data-grid.mp4',
  scenes: SCENES,
  voice: VOICE,
  rate: RATE,
  cardIcon: TABLE_ICON,
  cardBackground: 'radial-gradient(1200px 700px at 30% 20%, rgba(255,255,255,.12), transparent 60%), linear-gradient(120deg,#042f2e 0%,#115e59 45%,#0d9488 100%)',
  capture: async (ctx, want, result) => {
    if (want('g2-formats')) result['g2-formats'] = await sceneFormats(ctx)
    if (want('g3-columns')) result['g3-columns'] = await sceneColumns(ctx)
    if (want('g4-selection')) result['g4-selection'] = await sceneSelection(ctx)
    if (want('g5-grouping')) result['g5-grouping'] = await sceneGrouping(ctx)
    if (want('g6-export')) result['g6-export'] = await sceneExport(ctx)
    if (want('g7-scroll')) result['g7-scroll'] = await sceneScroll(ctx)
    if (want('g8-studio')) result['g8-studio'] = await sceneStudio(ctx)
  },
})
