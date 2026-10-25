/**
 * The recorded scenes (see narration.ts for what is said over each). Every
 * scene drives the real demo app and the real studio: the demo signed in as
 * the manager (APP), a second demo instance signed in as a clerk (CLERK_APP),
 * and `gummy studio` over demo/gummy (STUDIO). Marks name the moments the
 * narration lines start at; `hold(lineId)` keeps the action going until that
 * line has been spoken, so the picture never runs ahead of the voice.
 */
import { join } from 'node:path'
import type { Browser, BrowserContext, Page } from 'playwright-core'
import { SCENES, type Line } from './narration'
import { Actor, preparePage, Recording, VIEWPORT } from './recorder'

export const URLS = {
  app: process.env.APP_URL ?? 'http://localhost:3400',
  clerkApp: process.env.CLERK_APP_URL ?? 'http://localhost:3401',
  studio: process.env.STUDIO_URL ?? 'http://localhost:3398',
  api: process.env.API_URL ?? 'http://localhost:9100',
}

const PROJECT = '/p/bs-project-book-shop'

export type Captured = { file: string; marks: Record<string, number>; duration: number }
/** A split scene: two clips on one clock (left, right). */
export type CapturedSplit = { left: Captured; right: Captured }

type Ctx = { browser: Browser; work: string; durations: Record<string, number> }

async function newPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, colorScheme: 'light' })
  const page = await preparePage(context)
  return { context, page }
}

/** The director of one recording: marks, and holding until a line has been said. */
class Take {
  constructor(
    readonly rec: Recording,
    private lines: Line[],
    private durations: Record<string, number>,
  ) {}

  mark(name: string) {
    this.rec.mark(name)
  }

  /** Wait until line `id` (from its mark, or the end of the line before it) has been spoken, plus `tail` seconds. */
  async hold(id: string, tail = 0.4) {
    let end = 0
    for (const line of this.lines) {
      const anchor = line.at === 'start' ? 0 : this.rec.marks[line.at]
      if (anchor === undefined) throw new Error(`hold(${id}): mark "${line.at}" not set yet`)
      const start = Math.max(anchor, end)
      end = start + (this.durations[line.id] ?? 0) + 0.25
      if (line.id === id) break
    }
    const now = Date.now() / 1000 - this.rec.start
    const wait = end + tail - now
    if (wait > 0) await new Promise((r) => setTimeout(r, wait * 1000))
  }
}

async function record(ctx: Ctx, sceneId: string, page: Page, script: (take: Take, actor: Actor) => Promise<void>): Promise<Captured> {
  const scene = SCENES.find((s) => s.id === sceneId)!
  const rec = new Recording(page)
  await rec.begin()
  const take = new Take(rec, scene.lines, ctx.durations)
  await script(take, new Actor(page))
  await rec.finish()
  const file = join(ctx.work, `${sceneId}.mp4`)
  rec.write(file, join(ctx.work, `${sceneId}-frames`))
  return { file, marks: rec.marks, duration: rec.end - rec.start }
}

/** A row of the open select dropdown (the library's option rows are buttons in a `listbox-…` list). */
function option(page: Page, text?: string) {
  const rows = page.locator('[id^="listbox-"] button')
  return text ? rows.filter({ hasText: text }).first() : rows.first()
}

/** Wait for the app's data to settle (no spinners, a short quiet network). */
async function settle(page: Page, ms = 600) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(ms)
}

/* ------------------------------------------------------------- scene 2: the app */

export async function sceneDemo(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.app}/`)
  await settle(page, 1200)
  const result = await record(ctx, 's2-demo', page, async (take, actor) => {
    await actor.moveTo(page.getByText('Revenue', { exact: true }), 650)
    await actor.moveTo(page.getByText('Sales, last 30 days'), 500)
    await actor.click(page.locator('aside').getByRole('link', { name: 'Books' }), 550)
    await settle(page, 300)
    await actor.click(page.getByRole('button', { name: 'Filter' }), 550)
    await actor.click(page.getByText('Choose genre'), 400)
    await actor.click(option(page, 'Fantasy'), 400)
    await actor.click(page.getByText('Pick a genre first'), 400)
    await actor.click(option(page), 400)
    await actor.click(page.getByRole('button', { name: 'Apply' }), 450)
    await settle(page, 500)
    await actor.click(page.locator('main tbody tr').first().locator('td').nth(2), 550)
    await settle(page, 300)
    take.mark('bookPage')
    await actor.moveTo(page.locator('main h3').first(), 600)
    await actor.scroll(260, 1200)
    await take.hold('l2b', 0.6)
  })
  await context.close()
  return result
}

/* ---------------------------------------------------------- scene 3: the studio */

export async function sceneStudio(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.studio}/`)
  await settle(page, 900)
  const result = await record(ctx, 's3-studio', page, async (take, actor) => {
    await actor.moveTo(page.getByText('Gummy Books — a staff back office'), 900)
    await actor.click(page.getByText('Gummy Books — a staff back office'))
    await settle(page, 500)
    await page.goto(`${URLS.studio}${PROJECT}/pages/bs-page-books`)
    await settle(page, 500)
    await take.hold('l3a', 0)
    const table = page.locator('[data-grid-item="bs-item-books-table"]')
    await actor.click(table)
    const props = page.getByRole('button', { name: 'Props', exact: true })
    if (await props.isVisible()) await actor.click(props, 450)
    take.mark('tableSelected')
    await actor.moveTo(page.getByText('Data endpoint (API page)'), 800)
    await actor.moveTo(page.getByText('Server pagination', { exact: true }), 800)
    await actor.scroll(700, 1800)
    await actor.moveTo(page.getByText('Server filters (filter form → API)').first(), 700)
    await actor.scroll(500, 1400)
    await take.hold('l3b', 0)
    await actor.click(page.getByRole('button', { name: /^Preview/ }))
    await page.waitForTimeout(1200)
    take.mark('preview')
    const dialog = page.getByRole('dialog').first()
    const search = dialog.getByPlaceholder('Search all columns...')
    await search.waitFor({ timeout: 8000 }).catch(() => {})
    if (await search.isVisible()) await actor.type(search, 'salt', { delay: 130 })
    await page.waitForTimeout(1200)
    await take.hold('l3c', 0.8)
  })
  await context.close()
  return result
}

/* ------------------------------------------ scene 4: sign-in, a role condition, the menu */

export async function sceneSettings(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.studio}/library/auth`)
  await settle(page, 900)
  const result = await record(ctx, 's4-settings', page, async (take, actor) => {
    await actor.moveTo(page.getByText('Profile', { exact: true }).first(), 900)
    await actor.scroll(420, 1300)
    await take.hold('l4a', 0)
    await page.goto(`${URLS.studio}${PROJECT}/pages/bs-page-settings`)
    await settle(page, 500)
    await actor.click(page.locator('[data-grid-item="bs-item-settings-save"]'))
    const props = page.getByRole('button', { name: 'Props', exact: true })
    if (await props.isVisible()) await actor.click(props, 450)
    take.mark('condition')
    await actor.moveTo(page.getByText('Show when (page data)').first(), 800)
    await actor.moveTo(page.getByLabel('Comparison').first(), 900)
    await take.hold('l4b', 0)
    await page.goto(`${URLS.studio}${PROJECT}/menu`)
    await settle(page, 400)
    take.mark('menu')
    await actor.moveTo(page.getByText('App bar', { exact: true }).first(), 700)
    await actor.click(page.getByRole('button', { name: 'Play' }))
    await page.waitForTimeout(700)
    await actor.click(page.getByRole('button', { name: 'Play' }), 300)
    await take.hold('l4c', 0.6)
  })
  await context.close()
  return result
}

/* ------------------------------------------------ scene 5: a clerk, then the manager */

export async function sceneRoles(ctx: Ctx, orderId: string): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.clerkApp}/orders/${orderId}`)
  await settle(page, 900)
  const result = await record(ctx, 's5-roles', page, async (take, actor) => {
    await actor.moveTo(page.locator('main h2').first(), 800)
    await actor.scroll(900, 1600)
    await actor.moveTo(page.getByText('Waiting for a manager to approve this refund.'), 900)
    await take.hold('l5a', 0)
    await page.goto(`${URLS.app}/orders/${orderId}`)
    await settle(page, 500)
    take.mark('manager')
    await actor.scroll(900, 1400)
    await actor.type(page.locator('textarea[name="remark"]'), 'Damaged copy, refund approved.', { delay: 45 })
    await actor.click(page.getByRole('button', { name: 'Approve refund' }))
    await actor.click(page.getByRole('button', { name: 'Confirm' }))
    await settle(page, 600)
    take.mark('approved')
    await actor.moveTo(page.getByText('Refunded', { exact: true }).last(), 800)
    await take.hold('l5c', 0.8)
  })
  await context.close()
  return result
}

/* -------------------------------------------- scene 6: edit in the studio, app follows */

export async function sceneLive(ctx: Ctx): Promise<CapturedSplit> {
  const left = await newPage(ctx.browser)
  const right = await newPage(ctx.browser)
  await left.page.goto(`${URLS.studio}${PROJECT}/menu`)
  await right.page.goto(`${URLS.app}/books`)
  await settle(left.page, 700)
  await settle(right.page, 700)
  const scene = SCENES.find((s) => s.id === 's6-live')!
  const t0 = Date.now() / 1000
  const recL = new Recording(left.page)
  const recR = new Recording(right.page)
  await Promise.all([recL.begin(t0), recR.begin(t0)])
  const take = new Take(recL, scene.lines, ctx.durations)
  const actor = new Actor(left.page)
  const title = left.page.getByPlaceholder('Book shop')
  await actor.moveTo(title, 900)
  await take.hold('l6a', 0)
  take.mark('typing')
  await actor.type(title, 'Gummy Books · Bangkok', { delay: 95 })
  // The studio autosaves, the CLI writes project.json, Vite reloads the app.
  await right.page.waitForFunction(() => document.querySelector('header')?.textContent?.includes('Bangkok'), null, { timeout: 15000 }).catch(() => {})
  await new Actor(right.page).moveToPoint(260, 24, 700)
  await take.hold('l6b', 1.4)
  const t1 = Date.now() / 1000
  await Promise.all([recL.finish(t1), recR.finish(t1)])
  const files = { left: join(ctx.work, 's6-live-left.mp4'), right: join(ctx.work, 's6-live-right.mp4') }
  recL.write(files.left, join(ctx.work, 's6-left-frames'))
  recR.write(files.right, join(ctx.work, 's6-right-frames'))
  await left.context.close()
  await right.context.close()
  return {
    left: { file: files.left, marks: recL.marks, duration: t1 - t0 },
    right: { file: files.right, marks: recL.marks, duration: t1 - t0 },
  }
}

/** A refund the clerk and the manager can both open: the newest pending one. */
export async function pendingRefund(): Promise<string> {
  const res = await fetch(`${URLS.api}/api/orders?status=refund_requested&limit=1`)
  const json = (await res.json()) as { data: { _id: string }[] }
  if (!json.data[0]) throw new Error('No pending refund left — restart the mock API for fresh data.')
  return json.data[0]._id
}
