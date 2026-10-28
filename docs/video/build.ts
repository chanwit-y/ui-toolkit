/**
 * Builds the Gummy Studio intro video (see README.md):
 *
 *   bun build.ts                 narration → capture every scene → render
 *   bun build.ts --render-only   re-render from the last capture (.work/captures.json)
 *   bun build.ts --only s5-roles re-capture one scene, keep the others, render
 *
 * Writes out/gummy-studio-intro.mp4, and refreshes script.md (the narration
 * with its timings) and captions.srt beside this file. The pipeline itself is
 * shared with the data grid video (`pipeline.ts`).
 */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SCENES, RATE, VOICE } from './narration'
import { pendingRefund, sceneDemo, sceneLive, sceneRoles, sceneSettings, sceneStudio } from './capture'
import { buildVideo } from './pipeline'

await buildVideo({
  dir: dirname(fileURLToPath(import.meta.url)),
  title: 'Gummy Studio intro',
  outFile: 'gummy-studio-intro.mp4',
  scenes: SCENES,
  voice: VOICE,
  rate: RATE,
  capture: async (ctx, want, result) => {
    if (want('s2-demo')) result['s2-demo'] = await sceneDemo(ctx)
    if (want('s3-studio')) result['s3-studio'] = await sceneStudio(ctx)
    if (want('s4-settings')) result['s4-settings'] = await sceneSettings(ctx)
    if (want('s5-roles')) result['s5-roles'] = await sceneRoles(ctx, await pendingRefund())
    if (want('s6-live')) result['s6-live'] = await sceneLive(ctx)
  },
})
