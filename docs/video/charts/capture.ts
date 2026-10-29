/**
 * The charts preview's recorded scenes (see narration.ts for what is said
 * over each): the demo's **Charts showcase** project (`demo-charts`, port
 * 3405, over `demo-api`) and `gummy studio` over demo/gummy (`demo-studio`,
 * port 3398). Each scene opens a fresh browser context.
 *
 * A chart is one `<canvas>`, so the marks to hover or click are found by
 * sampling its pixels (`bars`, `colourPoint`) rather than by locators.
 */
import type { Page } from 'playwright-core'
import { newPage, record, settle, type Captured, type Ctx } from '../capture'
import { SCENES } from './narration'

export const URLS = {
  app: process.env.CHARTS_APP_URL ?? 'http://localhost:3405',
  studio: process.env.STUDIO_URL ?? 'http://localhost:3398',
}

const PROJECT = '/p/ch-project-charts'

type Point = { x: number; y: number }

const frame = (page: Page, name: string) => page.locator(`[data-chart="${name}"]`)
const legendPill = (page: Page, name: string, label: string) => frame(page, name).locator('[aria-label="Legend"] button').filter({ hasText: label }).first()

/**
 * The bars of a cartesian chart, left to right (top to bottom when horizontal): one point per
 * run of saturated pixels on the canvas row that crosses the most bars, nearest the baseline.
 */
async function bars(page: Page, name: string, horizontal = false): Promise<Point[]> {
  return page.evaluate(
    ([name, horizontal]) => {
      const cv = document.querySelector(`[data-chart="${name}"] canvas`) as HTMLCanvasElement | null
      if (!cv) return []
      const box = cv.getBoundingClientRect()
      const scale = cv.width / box.width
      const { data } = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height)
      const sat = (x: number, y: number) => {
        const i = (y * cv.width + x) * 4
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
        return a > 200 && Math.max(r, g, b) - Math.min(r, g, b) > 70
      }
      const runsOn = (fixed: number) => {
        const runs: [number, number][] = []
        const len = horizontal ? cv.height : cv.width
        let start = -1
        for (let i = 0; i <= len; i++) {
          const on = i < len && (horizontal ? sat(fixed, i) : sat(i, fixed))
          if (on && start < 0) start = i
          if (!on && start >= 0) {
            if (i - start >= 6) runs.push([start, i])
            start = -1
          }
        }
        return runs
      }
      let best: { fixed: number; runs: [number, number][] } = { fixed: 0, runs: [] }
      if (horizontal) {
        for (let x = 0; x < cv.width; x += 2) {
          const runs = runsOn(x)
          if (runs.length > best.runs.length) best = { fixed: x, runs }
        }
      } else {
        for (let y = cv.height - 1; y > 0; y -= 2) {
          const runs = runsOn(y)
          if (runs.length > best.runs.length) best = { fixed: y, runs }
        }
      }
      return best.runs.map(([a, b]) => {
        const mid = (a + b) / 2
        return horizontal
          ? { x: Math.round(box.x + (best.fixed + 12) / scale), y: Math.round(box.y + mid / scale) }
          : { x: Math.round(box.x + mid / scale), y: Math.round(box.y + (best.fixed - 24) / scale) }
      })
    },
    [name, horizontal] as const,
  )
}

/** A point on the chart painted in `css` (a legend dot's colour): the middle one of every match. */
async function colourPoint(page: Page, name: string, css: string): Promise<Point> {
  return page.evaluate(
    ([name, css]) => {
      const cv = document.querySelector(`[data-chart="${name}"] canvas`) as HTMLCanvasElement
      const box = cv.getBoundingClientRect()
      const scale = cv.width / box.width
      const [tr, tg, tb] = css.match(/\d+(\.\d+)?/g)!.map(Number)
      const { data } = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height)
      const hits: number[] = []
      for (let i = 0; i < data.length; i += 4) {
        if (Math.abs(data[i] - tr) + Math.abs(data[i + 1] - tg) + Math.abs(data[i + 2] - tb) < 24 && data[i + 3] > 240) hits.push(i / 4)
      }
      if (!hits.length) throw new Error(`no ${css} pixels on ${name}`)
      const p = hits[Math.floor(hits.length / 2)]
      return { x: Math.round(box.x + (p % cv.width) / scale), y: Math.round(box.y + Math.floor(p / cv.width) / scale) }
    },
    [name, css] as const,
  )
}

/** The canvas point at fractions of its box. */
async function at(page: Page, name: string, fx: number, fy: number): Promise<Point> {
  const box = await frame(page, name).locator('canvas').first().boundingBox()
  if (!box) throw new Error(`no canvas on ${name}`)
  return { x: Math.round(box.x + box.width * fx), y: Math.round(box.y + box.height * fy) }
}

async function clickPoint(page: Page, p: Point, ms = 650) {
  await page.evaluate(([x, y, ms]) => (window as any).__vid?.move(x, y, ms), [p.x, p.y, ms] as const)
  await page.mouse.move(p.x, p.y, { steps: 12 })
  await page.waitForTimeout(ms)
  await page.evaluate(([x, y]) => (window as any).__vid?.ripple(x, y), [p.x, p.y] as const)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(250)
}

/** Glide along a list of points, resting on each so its tooltip shows. */
async function hoverAlong(page: Page, points: Point[], ms = 420) {
  for (const p of points) {
    await page.evaluate(([x, y, ms]) => (window as any).__vid?.move(x, y, ms), [p.x, p.y, ms] as const)
    await page.mouse.move(p.x, p.y, { steps: 8 })
    await page.waitForTimeout(ms)
  }
}

async function open(ctx: Ctx, path: string) {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.app}${path}`)
  await settle(page, 1200)
  // The charts animate in on load: wait them out before sampling pixels.
  await page.waitForTimeout(700)
  return { context, page }
}

/* -------------------------------------------------------------- c2: sales */

export async function sceneSales(ctx: Ctx): Promise<Captured> {
  const { context, page } = await open(ctx, '/')
  const result = await record(ctx, 'c2-sales', page, async (take, actor) => {
    const weekly = await bars(page, 'weekly')
    await hoverAlong(page, [weekly[2], weekly[4], weekly[6]], 650)
    const target = await at(page, 'weekly', 0.9, 0.42)
    await actor.moveToPoint(target.x, target.y, 700)
    await take.hold('c2a', 0)
    take.mark('click')
    // The tallest week (28 Sep) — its row lands in `weeklySelected`.
    await clickPoint(page, weekly[9], 700)
    await page.waitForTimeout(400)
    await actor.moveTo(page.getByText('Week of', { exact: true }), 800)
    await take.hold('c2b', 0)
    take.mark('more')
    await page.mouse.move(1200, 700)
    await actor.scroll(420, 1000)
    await page.waitForTimeout(300)
    await hoverAlong(page, [await at(page, 'daily', 0.3, 0.5), await at(page, 'daily', 0.55, 0.5), await at(page, 'daily', 0.8, 0.5)], 600)
    await hoverAlong(page, [await at(page, 'monthly', 0.5, 0.5), await at(page, 'monthly', 0.9, 0.5)], 700)
    await take.hold('c2c', 0.5)
  }, SCENES)
  await context.close()
  return result
}

/* ---------------------------------------------------------------- c3: mix */

export async function sceneMix(ctx: Ctx): Promise<Captured> {
  const { context, page } = await open(ctx, '/mix')
  const result = await record(ctx, 'c3-mix', page, async (take, actor) => {
    const authors = await bars(page, 'topAuthors', true)
    await hoverAlong(page, authors.slice(0, 3), 500)
    await actor.moveTo(frame(page, 'pipeline').locator('canvas').first(), 700)
    await actor.click(legendPill(page, 'genreShare', 'Romance'), 650)
    await page.waitForTimeout(500)
    await actor.click(legendPill(page, 'genreShare', 'Children'), 500)
    await page.waitForTimeout(700)
    await take.hold('c3a', 0)
    take.mark('navigate')
    await actor.click(legendPill(page, 'genreShare', 'Romance'), 500)
    await actor.click(legendPill(page, 'genreShare', 'Children'), 450)
    await page.waitForTimeout(700)
    const dot = await legendPill(page, 'genreShare', 'Fantasy').locator('span').first().evaluate((el) => getComputedStyle(el).backgroundColor)
    const slice = await colourPoint(page, 'genreShare', dot)
    await hoverAlong(page, [slice], 700)
    await clickPoint(page, slice, 300)
    await page.waitForURL(/\/genre\//)
    await settle(page, 600)
    await actor.moveTo(page.locator('.datatable-container tbody tr').nth(1), 800)
    await take.hold('c3b', 0.6)
  }, SCENES)
  await context.close()
  return result
}

/* ------------------------------------------------------------ c4: compare */

export async function sceneCompare(ctx: Ctx): Promise<Captured> {
  const { context, page } = await open(ctx, '/compare')
  const result = await record(ctx, 'c4-compare', page, async (take, actor) => {
    const weeks = await bars(page, 'revenueOrders')
    await hoverAlong(page, [weeks[1], weeks[4], weeks[9], weeks[12]], 700)
    await actor.click(legendPill(page, 'revenueOrders', 'Revenue'), 600)
    await page.waitForTimeout(700)
    await actor.click(legendPill(page, 'revenueOrders', 'Revenue'), 500)
    await take.hold('c4a', 0)
    take.mark('bubble')
    await page.mouse.move(1200, 600)
    await actor.scroll(500, 1000)
    await page.waitForTimeout(300)
    await hoverAlong(page, [await at(page, 'booksScatter', 0.28, 0.2), await at(page, 'booksScatter', 0.52, 0.3)], 600)
    for (const genre of ['Mystery', 'History', 'Biography', 'Science Fiction', 'Cookery', 'Children']) {
      await actor.click(legendPill(page, 'booksScatter', genre), 260)
    }
    await page.waitForTimeout(900)
    await take.hold('c4b', 0.6)
  }, SCENES)
  await context.close()
  return result
}

/* ----------------------------------------------------------- c5: patterns */

export async function scenePatterns(ctx: Ctx): Promise<Captured> {
  const { context, page } = await open(ctx, '/patterns')
  const result = await record(ctx, 'c5-patterns', page, async (take, actor) => {
    await hoverAlong(page, [await at(page, 'orderHeat', 0.27, 0.28), await at(page, 'orderHeat', 0.53, 0.46), await at(page, 'orderHeat', 0.79, 0.53)], 750)
    await take.hold('c5a', 0)
    take.mark('radar')
    await page.mouse.move(1200, 600)
    await actor.scroll(480, 1000)
    await page.waitForTimeout(300)
    await hoverAlong(page, [await at(page, 'genreRadar', 0.32, 0.5)], 700)
    for (const genre of ['Fantasy', 'Science Fiction', 'Mystery', 'History', 'Biography', 'Cookery']) {
      await actor.click(legendPill(page, 'genreRadarCircle', genre), 240)
    }
    await page.waitForTimeout(900)
    await take.hold('c5b', 0.6)
  }, SCENES)
  await context.close()
  return result
}

/* --------------------------------------------------------------- c6: kpis */

export async function sceneKpis(ctx: Ctx): Promise<Captured> {
  const { context, page } = await open(ctx, '/kpis')
  const result = await record(ctx, 'c6-kpis', page, async (take, actor) => {
    await actor.moveTo(frame(page, 'fulfilment').locator('canvas').first(), 700)
    await actor.moveTo(frame(page, 'refunds').locator('canvas').first(), 700)
    await actor.moveTo(frame(page, 'rating').locator('canvas').first(), 700)
    await take.hold('c6a', 0)
    take.mark('dark')
    await actor.click(page.getByRole('button', { name: 'Switch to dark theme' }), 700)
    await page.waitForTimeout(900)
    await actor.click(page.getByRole('link', { name: 'Mix' }), 700)
    await settle(page, 900)
    await actor.moveToPoint(820, 450, 700)
    await actor.click(page.getByRole('link', { name: 'Compare' }), 600)
    await settle(page, 900)
    await actor.moveToPoint(820, 460, 600)
    await actor.click(page.getByRole('button', { name: 'Switch to light theme' }), 700)
    await page.waitForTimeout(600)
    await take.hold('c6b', 0.5)
  }, SCENES)
  await context.close()
  return result
}

/* ------------------------------------------------------------- c7: studio */

/**
 * Switches the weekly chart's type a few times on the canvas, then undoes every switch. The
 * autosave still writes `updatedAt` and an activity entry: `git checkout -- demo/gummy` and
 * restart `demo-studio` after a take.
 */
export async function sceneStudio(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.studio}${PROJECT}/pages/ch-page-sales`)
  await settle(page, 1500)
  let switches = 0
  const result = await record(ctx, 'c7-studio', page, async (take, actor) => {
    const item = page.locator('[data-grid-item="ch-item-sales-weekly"]')
    await actor.click(item, 800)
    const props = page.getByRole('button', { name: 'Props', exact: true })
    if (await props.isVisible()) await actor.click(props, 450)
    await page.waitForTimeout(400)
    const types = page.getByRole('radiogroup', { name: 'Chart type' })
    for (const label of ['Line', 'Area', 'Pie', 'Funnel', 'Bar']) {
      await actor.click(types.locator(`[role="radio"][title="${label}"]`), 520)
      switches++
      await page.waitForTimeout(650)
    }
    await take.hold('c7a', 0)
    take.mark('sections')
    for (const text of ['Series', 'Axes', 'Reference lines', 'Interaction']) {
      const target = page.getByText(text, { exact: true }).first()
      if (await target.count()) await actor.moveTo(target, 700)
    }
    await take.hold('c7b', 0.5)
  }, SCENES)
  // Off the record: undo the type switches (Cmd+Z), then give the autosave time to land.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  for (let i = 0; i < switches; i++) {
    await page.keyboard.press('Meta+z')
    await page.waitForTimeout(150)
  }
  await page.waitForTimeout(1500)
  await context.close()
  return result
}
