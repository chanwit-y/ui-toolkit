/**
 * Builds the Gummy Studio intro video (see README.md):
 *
 *   bun build.ts                 narration → capture every scene → render
 *   bun build.ts --render-only   re-render from the last capture (.work/captures.json)
 *   bun build.ts --only s5-roles re-capture one scene, keep the others, render
 *
 * Writes out/gummy-studio-intro.mp4, and refreshes script.md (the narration
 * with its timings) and captions.srt beside this file.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright-core'
import { SCENES, RATE, VOICE, type Card, type Scene } from './narration'
import { pendingRefund, sceneDemo, sceneLive, sceneRoles, sceneSettings, sceneStudio, type Captured, type CapturedSplit } from './capture'
import { chromePath, probeDuration, run } from './recorder'

const here = dirname(fileURLToPath(import.meta.url))
const work = join(here, '.work')
const out = join(here, 'out')
const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const renderOnly = args.includes('--render-only')

const FADE = 0.45
const FPS = 30

/* ---------------------------------------------------------------- narration */

function narrationAudio(): Record<string, { file: string; duration: number }> {
  const dir = join(work, 'tts')
  mkdirSync(dir, { recursive: true })
  const result: Record<string, { file: string; duration: number }> = {}
  for (const scene of SCENES) {
    for (const line of scene.lines) {
      const human = join(here, 'voice', `${line.id}.wav`)
      const wav = join(dir, `${line.id}.wav`)
      if (existsSync(human)) {
        run('ffmpeg', ['-y', '-loglevel', 'error', '-i', human, '-ar', '48000', '-ac', '1', wav])
      } else {
        const aiff = join(dir, `${line.id}.aiff`)
        const said = spawnSync('say', ['-v', VOICE, '-r', String(RATE), '-o', aiff, line.text])
        if (said.status !== 0) throw new Error(`say failed for ${line.id}`)
        run('ffmpeg', ['-y', '-loglevel', 'error', '-i', aiff, '-ar', '48000', '-ac', '1', wav])
      }
      result[line.id] = { file: wav, duration: probeDuration(wav) }
    }
  }
  return result
}

/* -------------------------------------------------------------------- cards */

const BOOK_ICON =
  '<svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>'

function cardHtml(card: Card): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:1920px;height:1080px;overflow:hidden}
    body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;
      background:radial-gradient(1200px 700px at 30% 20%, rgba(255,255,255,.10), transparent 60%), linear-gradient(120deg,#1e1b4b 0%,#312e81 45%,#4f46e5 100%);
      font-family:-apple-system,'Helvetica Neue',Inter,Arial,sans-serif;color:#fff}
    h1{margin:0;font-size:128px;font-weight:700;letter-spacing:-2px}
    p{margin:0;font-size:46px;font-weight:400;opacity:.9}
    .foot{position:absolute;bottom:90px;font-size:30px;opacity:.75;font-family:'SF Mono',Menlo,monospace;letter-spacing:.5px}
  </style></head><body>${BOOK_ICON}<h1>${esc(card.title)}</h1><p>${esc(card.subtitle)}</p>${card.footer ? `<div class="foot">${esc(card.footer)}</div>` : ''}</body></html>`
}

async function renderCards(): Promise<Record<string, string>> {
  const browser = await chromium.launch({ executablePath: chromePath() })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const files: Record<string, string> = {}
  for (const scene of SCENES) {
    if (scene.kind !== 'card') continue
    await page.setContent(cardHtml(scene.card))
    const file = join(work, `${scene.id}.png`)
    await page.screenshot({ path: file })
    files[scene.id] = file
  }
  await browser.close()
  return files
}

/* ------------------------------------------------------------------ capture */

type Captures = Record<string, Captured | CapturedSplit>

async function capture(durations: Record<string, number>): Promise<Captures> {
  const file = join(work, 'captures.json')
  const previous: Captures = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
  if (renderOnly) return previous
  const browser = await chromium.launch({ executablePath: chromePath() })
  const ctx = { browser, work, durations }
  const want = (id: string) => !only || only === id
  const result: Captures = { ...previous }
  try {
    if (want('s2-demo')) result['s2-demo'] = await sceneDemo(ctx)
    if (want('s3-studio')) result['s3-studio'] = await sceneStudio(ctx)
    if (want('s4-settings')) result['s4-settings'] = await sceneSettings(ctx)
    if (want('s5-roles')) result['s5-roles'] = await sceneRoles(ctx, await pendingRefund())
    if (want('s6-live')) result['s6-live'] = await sceneLive(ctx)
  } finally {
    await browser.close()
    writeFileSync(file, JSON.stringify(result, null, 2))
  }
  return result
}

/* ----------------------------------------------------------------- timeline */

type Timed = { id: string; text: string; start: number; end: number; audio: string }
type Placed = { scene: Scene; duration: number; lines: Timed[]; offset: number }

function timeline(captures: Captures, audio: Record<string, { file: string; duration: number }>): Placed[] {
  const placed: Placed[] = []
  let offset = 0
  for (const scene of SCENES) {
    const cap = captures[scene.id]
    const marks = !cap ? {} : 'left' in cap ? cap.left.marks : cap.marks
    const clipDuration = !cap ? 0 : 'left' in cap ? cap.left.duration : cap.duration
    const lines: Timed[] = []
    let end = 0
    for (const line of scene.lines) {
      const anchor = line.at === 'start' ? (scene.kind === 'card' ? 0.7 : 0.45) : (marks[line.at] ?? end)
      const start = Math.max(anchor, end + 0.25)
      const a = audio[line.id]
      lines.push({ id: line.id, text: line.text, start, end: start + a.duration, audio: a.file })
      end = start + a.duration
    }
    const duration = scene.kind === 'card' ? end + 1.3 : Math.max(clipDuration, end + 0.8)
    placed.push({ scene, duration, lines, offset })
    offset += duration - FADE
  }
  return placed
}

/* ------------------------------------------------------------------- render */

/** One scene as exactly `duration` seconds of 1920×1080 at 30 fps. */
function sceneClip(p: Placed, captures: Captures, cards: Record<string, string>): string {
  const file = join(work, `${p.scene.id}.fit.mp4`)
  const d = p.duration.toFixed(3)
  const enc = ['-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-an', file]
  if (p.scene.kind === 'card') {
    const frames = Math.ceil(p.duration * FPS)
    run('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', cards[p.scene.id], '-vf',
      `scale=3840:-1,zoompan=z='1+0.035*on/${frames}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1920x1080:fps=${FPS}`,
      '-t', d, ...enc])
    return file
  }
  const cap = captures[p.scene.id]
  if (!cap) throw new Error(`scene ${p.scene.id} has not been captured`)
  if ('left' in cap) {
    // Two windows side by side, labelled, on the cards' indigo.
    const label = (text: string, x: number) =>
      `drawtext=text='${text}':fontcolor=white:fontsize=34:x=${x}:y=200:font='Helvetica Neue'`
    run('ffmpeg', ['-y', '-loglevel', 'error', '-i', cap.left.file, '-i', cap.right.file, '-filter_complex',
      [
        `color=c=0x1e1b4b:s=1920x1080:r=${FPS}:d=${d}[bg]`,
        `[0:v]tpad=stop_mode=clone:stop_duration=30,trim=duration=${d},scale=920:518,setpts=PTS-STARTPTS[l]`,
        `[1:v]tpad=stop_mode=clone:stop_duration=30,trim=duration=${d},scale=920:518,setpts=PTS-STARTPTS[r]`,
        `[bg][l]overlay=x=30:y=260[a]`,
        `[a][r]overlay=x=970:y=260,${label('Gummy Studio', 30)},${label('Your app — demo', 970)}[v]`,
      ].join(';'),
      '-map', '[v]', '-t', d, ...enc])
    return file
  }
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', cap.file, '-vf', `tpad=stop_mode=clone:stop_duration=30,trim=duration=${d},setpts=PTS-STARTPTS`, '-t', d, ...enc])
  return file
}

function assTime(t: number): string {
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = (t % 60).toFixed(2).padStart(5, '0')
  return `${h}:${String(m).padStart(2, '0')}:${s}`
}

function srtTime(t: number): string {
  const ms = Math.round(t * 1000)
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor((ms % 3600000) / 60000))}:${pad(Math.floor((ms % 60000) / 1000))},${pad(ms % 1000, 3)}`
}

function render(placed: Placed[], captures: Captures, cards: Record<string, string>) {
  mkdirSync(out, { recursive: true })
  const clips = placed.map((p) => sceneClip(p, captures, cards))
  const total = placed[placed.length - 1].offset + placed[placed.length - 1].duration

  // Crossfaded picture.
  const video = join(work, 'video.mp4')
  const graph: string[] = []
  let last = '[0:v]'
  for (let i = 1; i < clips.length; i++) {
    const outLabel = i === clips.length - 1 ? '[v]' : `[x${i}]`
    graph.push(`${last}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${placed[i].offset.toFixed(3)}${outLabel}`)
    last = outLabel
  }
  run('ffmpeg', ['-y', '-loglevel', 'error', ...clips.flatMap((c) => ['-i', c]), '-filter_complex', graph.join(';'), '-map', '[v]',
    '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', video])

  // Narration on one track.
  const lines = placed.flatMap((p) => p.lines.map((l) => ({ ...l, start: p.offset + l.start, end: p.offset + l.end })))
  const audio = join(work, 'narration.wav')
  run('ffmpeg', ['-y', '-loglevel', 'error', ...lines.flatMap((l) => ['-i', l.audio]), '-filter_complex',
    lines.map((l, i) => `[${i}:a]adelay=${Math.round(l.start * 1000)}:all=1[a${i}]`).join(';') +
      `;${lines.map((_, i) => `[a${i}]`).join('')}amix=inputs=${lines.length}:normalize=0,apad=whole_dur=${total.toFixed(3)}[a]`,
    '-map', '[a]', '-ar', '48000', audio])

  // Captions: one narration line at a time, bottom centre, on a soft dark band.
  const ass = join(work, 'captions.ass')
  writeFileSync(ass, [
    '[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1920', 'PlayResY: 1080', 'WrapStyle: 0', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Caption,Helvetica Neue,44,&H00FFFFFF,&H00FFFFFF,&H64140E1E,&H64140E1E,0,0,0,0,100,100,0,0,3,18,0,2,260,260,64,1', '',
    '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...lines.map((l) => `Dialogue: 0,${assTime(l.start)},${assTime(Math.max(l.end + 0.35, l.start + 1.4))},Caption,,0,0,0,,${l.text}`),
  ].join('\n') + '\n')

  const final = join(out, 'gummy-studio-intro.mp4')
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', audio, '-vf', `ass=${ass}`, '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-shortest', final])

  // The script with its timings, and plain captions, beside this file.
  writeFileSync(join(here, 'captions.srt'), lines.map((l, i) => `${i + 1}\n${srtTime(l.start)} --> ${srtTime(l.end + 0.35)}\n${l.text}\n`).join('\n'))
  writeFileSync(join(here, 'script.md'), [
    '# Gummy Studio intro — narration and timings',
    '',
    `Generated by \`bun build.ts\` (voice: ${VOICE}, ${RATE} wpm). Total ${total.toFixed(1)} s. To use a human voice, record each line as \`voice/<id>.wav\` and rebuild with \`--render-only\`.`,
    '',
    '| Scene | Line | Starts | Ends | Text |',
    '|---|---|---|---|---|',
    ...placed.flatMap((p) => p.lines.map((l) => `| ${p.scene.id} | ${l.id} | ${(p.offset + l.start).toFixed(1)} s | ${(p.offset + l.end).toFixed(1)} s | ${l.text} |`)),
    '',
  ].join('\n'))
  console.log(`\n${final}\n${total.toFixed(1)} s, ${clips.length} scenes, ${lines.length} narration lines`)
}

/* --------------------------------------------------------------------- main */

if (!renderOnly && !only) rmSync(work, { recursive: true, force: true })
mkdirSync(work, { recursive: true })
const audio = narrationAudio()
const durations = Object.fromEntries(Object.entries(audio).map(([id, a]) => [id, a.duration]))
const captures = await capture(durations)
const cards = await renderCards()
render(timeline(captures, audio), captures, cards)
