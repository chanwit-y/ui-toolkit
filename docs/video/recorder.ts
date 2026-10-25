/**
 * Records a page through the Chrome DevTools screencast (crisp JPEG frames
 * with timestamps), and drives it like a person: an injected cursor glides to
 * each target and ripples on clicks, text is typed at a natural speed.
 * Headless browsers draw no pointer of their own.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import type { BrowserContext, CDPSession, Locator, Page } from 'playwright-core'

/** CSS viewport; frames come at this size and are upscaled to 1920×1080 when rendered. */
export const VIEWPORT = { width: 1440, height: 810 }

/** The Chromium to drive: `CHROME`, else the newest headless shell in the Playwright cache. */
export function chromePath(): string {
  if (process.env.CHROME) return process.env.CHROME
  const cache = join(homedir(), 'Library', 'Caches', 'ms-playwright')
  const shells = existsSync(cache) ? readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell-')).sort() : []
  for (const dir of shells.reverse()) {
    for (const sub of ['chrome-headless-shell-mac-arm64', 'chrome-headless-shell-mac-x64', 'chrome-headless-shell-linux64']) {
      const exe = join(cache, dir, sub, 'chrome-headless-shell')
      if (existsSync(exe)) return exe
    }
  }
  throw new Error('No Chromium found: set CHROME, or run `bunx playwright install chromium-headless-shell`.')
}

/** The cursor, the click ripple and the hidden dev-only widgets — installed on every document. */
const CURSOR_SCRIPT = `
(() => {
  const install = () => {
    if (document.getElementById('__vid_cursor')) return;
    const style = document.createElement('style');
    style.textContent = \`
      #__vid_cursor { position: fixed; left: 0; top: 0; width: 26px; height: 26px; z-index: 2147483647; pointer-events: none;
        transition-property: transform; transition-timing-function: cubic-bezier(.45,.05,.25,1); will-change: transform; }
      #__vid_cursor svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,.35)); }
      .__vid_ripple { position: fixed; width: 36px; height: 36px; margin: -18px 0 0 -18px; border-radius: 9999px; z-index: 2147483646;
        pointer-events: none; background: rgba(79,70,229,.35); border: 2px solid rgba(79,70,229,.8); animation: __vid_ripple .55s ease-out forwards; }
      @keyframes __vid_ripple { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }
      button[aria-label="Open Tanstack query devtools"], .tsqd-open-btn-container { display: none !important; }
    \`;
    document.documentElement.appendChild(style);
    const c = document.createElement('div');
    c.id = '__vid_cursor';
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M3 2 L3 21 L8.2 16.4 L11.6 24 L15 22.5 L11.7 15 L18.5 15 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const saved = JSON.parse(sessionStorage.getItem('__vid_cursor') || '[720,405]');
    c.style.transform = 'translate(' + saved[0] + 'px,' + saved[1] + 'px)';
    document.documentElement.appendChild(c);
    window.__vid = {
      move(x, y, ms) {
        c.style.transitionDuration = ms + 'ms';
        c.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        sessionStorage.setItem('__vid_cursor', JSON.stringify([x, y]));
      },
      ripple(x, y) {
        const r = document.createElement('div');
        r.className = '__vid_ripple';
        r.style.left = x + 'px';
        r.style.top = y + 'px';
        document.documentElement.appendChild(r);
        setTimeout(() => r.remove(), 700);
      },
    };
  };
  if (document.documentElement) install();
  document.addEventListener('DOMContentLoaded', install);
})();
`

export async function preparePage(context: BrowserContext): Promise<Page> {
  await context.addInitScript(CURSOR_SCRIPT)
  return context.newPage()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** A person at the controls of one page: every move is visible in the recording. */
export class Actor {
  constructor(readonly page: Page) {}

  async pause(ms: number) {
    await this.page.waitForTimeout(ms)
  }

  private async centre(target: Locator): Promise<{ x: number; y: number }> {
    await target.scrollIntoViewIfNeeded()
    const box = await target.boundingBox()
    if (!box) throw new Error(`no box for ${target}`)
    return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
  }

  /** Glide the cursor to `target` (the real mouse follows, so hovers show). */
  async moveTo(target: Locator, ms = 650) {
    const { x, y } = await this.centre(target)
    await this.page.evaluate(([x, y, ms]) => (window as any).__vid?.move(x, y, ms), [x, y, ms] as const)
    await this.page.mouse.move(x, y, { steps: 12 })
    await sleep(ms)
  }

  async moveToPoint(x: number, y: number, ms = 650) {
    await this.page.evaluate(([x, y, ms]) => (window as any).__vid?.move(x, y, ms), [x, y, ms] as const)
    await this.page.mouse.move(x, y, { steps: 12 })
    await sleep(ms)
  }

  async click(target: Locator, ms = 650) {
    await this.moveTo(target, ms)
    const { x, y } = await this.centre(target)
    await this.page.evaluate(([x, y]) => (window as any).__vid?.ripple(x, y), [x, y] as const)
    await target.click()
    await sleep(250)
  }

  /** Click into a field, clear it and type like a person. */
  async type(target: Locator, text: string, { clear = true, delay = 75 } = {}) {
    await this.click(target)
    if (clear) await target.fill('')
    await target.pressSequentially(text, { delay })
  }

  async scroll(dy: number, ms = 900) {
    const steps = 18
    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, dy / steps)
      await sleep(ms / steps)
    }
  }
}

/** One screencast: frames with wall-clock timestamps, plus named marks on the same clock. */
export class Recording {
  private frames: { t: number; data: string }[] = []
  private session?: CDPSession
  readonly marks: Record<string, number> = {}
  start = 0
  end = 0

  constructor(private page: Page) {}

  async begin(t0 = Date.now() / 1000) {
    this.start = t0
    this.session = await this.page.context().newCDPSession(this.page)
    this.session.on('Page.screencastFrame', async (f) => {
      this.frames.push({ t: f.metadata.timestamp ?? Date.now() / 1000, data: f.data })
      await this.session?.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
    })
    await this.session.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: VIEWPORT.width, maxHeight: VIEWPORT.height })
  }

  /** A narration anchor: seconds since the clip started. */
  mark(name: string) {
    this.marks[name] = Date.now() / 1000 - this.start
  }

  async finish(t1 = Date.now() / 1000) {
    await this.session?.send('Page.stopScreencast').catch(() => {})
    this.end = t1
  }

  /**
   * Write the clip as a 30 fps, 1920×1080 H.264 file: each frame held until
   * the next one (the screencast only sends frames when something changes),
   * the first one from the clip's start, the last one until its end.
   */
  write(file: string, workDir: string) {
    if (this.frames.length === 0) throw new Error('no frames recorded')
    mkdirSync(workDir, { recursive: true })
    const frames = [...this.frames].sort((a, b) => a.t - b.t).filter((f) => f.t <= this.end)
    const lines: string[] = []
    frames.forEach((f, i) => {
      const name = join(workDir, `f${String(i).padStart(5, '0')}.jpg`)
      writeFileSync(name, Buffer.from(f.data, 'base64'))
      const from = i === 0 ? this.start : f.t
      const to = i + 1 < frames.length ? frames[i + 1].t : this.end
      lines.push(`file '${name}'`, `duration ${Math.max(to - from, 0.001).toFixed(4)}`)
    })
    lines.push(`file '${join(workDir, `f${String(frames.length - 1).padStart(5, '0')}.jpg`)}'`)
    writeFileSync(join(workDir, 'frames.txt'), lines.join('\n') + '\n')
    run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(workDir, 'frames.txt'),
      '-vf', 'scale=1920:1080:flags=lanczos,fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', file])
  }
}

export function run(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] })
  if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 6).join(' ')} … exited ${r.status}`)
}

export function probeDuration(file: string): number {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file])
  return Number(String(r.stdout).trim())
}
