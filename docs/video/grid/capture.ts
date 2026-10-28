/**
 * The data grid preview's recorded scenes (see narration.ts for what is said
 * over each): the demo's **Data grid showcase** project (`demo-grid`, port
 * 3404, over `demo-api`) and `gummy studio` over demo/gummy (`demo-studio`,
 * port 3398). Each scene opens a fresh browser context, so no column layout
 * is remembered from an earlier take.
 */
import { readFileSync } from 'node:fs'
import type { Page } from 'playwright-core'
import { newPage, record, settle, type Captured, type Ctx } from '../capture'
import { SCENES } from './narration'

export const URLS = {
  app: process.env.GRID_APP_URL ?? 'http://localhost:3404',
  studio: process.env.STUDIO_URL ?? 'http://localhost:3398',
}

const PROJECT = '/p/dg-project-data-grid'

const table = (page: Page) => page.locator('.datatable-container').first()
const header = (page: Page, text: string) => table(page).locator('thead th').filter({ hasText: text }).first()

/** Drag `from` onto `to` with the visible cursor (dnd-kit needs real pointer moves). */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.evaluate(([x, y]) => (window as any).__vid?.move(x, y, 350), [from.x, from.y] as const)
  await page.mouse.move(from.x, from.y, { steps: 6 })
  await page.waitForTimeout(380)
  await page.mouse.down()
  await page.mouse.move(from.x, from.y + 6, { steps: 4 })
  for (let i = 1; i <= 16; i++) {
    const x = from.x + ((to.x - from.x) * i) / 16
    const y = from.y + ((to.y - from.y) * i) / 16
    await page.evaluate(([x, y]) => (window as any).__vid?.move(x, y, 40), [x, y] as const)
    await page.mouse.move(x, y)
    await page.waitForTimeout(40)
  }
  await page.waitForTimeout(200)
  await page.mouse.up()
  await page.waitForTimeout(400)
}

async function centre(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`no box for ${selector}`)
  return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
}

/* -------------------------------------------------- g2: formats and style rules */

export async function sceneFormats(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.app}/`)
  await settle(page, 1200)
  const result = await record(ctx, 'g2-formats', page, async (take, actor) => {
    await actor.moveTo(header(page, 'Price'), 700)
    await actor.moveTo(table(page).locator('tbody tr').nth(1).locator('td').nth(4), 700)
    await actor.moveTo(header(page, 'Published'), 700)
    await take.hold('g2a', 0)
    take.mark('rules')
    // A number column sorts descending first: twice for the empty shelves on top.
    await actor.click(header(page, 'Stock').locator('.datatable-sort-icon'), 600)
    await actor.click(header(page, 'Stock').locator('.datatable-sort-icon'), 400)
    await page.waitForTimeout(500)
    await actor.moveTo(table(page).locator('td[data-accent-color="red"]').first(), 700)
    // Out of stock fills the first page: show 20 rows to reach the low ones.
    const perPage = table(page).locator('.datatable-footer select')
    await actor.moveTo(perPage, 600)
    await perPage.selectOption('20')
    await page.waitForTimeout(500)
    await actor.moveTo(table(page).locator('td[data-accent-color="amber"]').first(), 800)
    // Top ratings (green) are among the twenty rows on screen.
    const green = table(page).locator('td[data-accent-color="grass"]')
    if (await green.count()) await actor.moveTo(green.first(), 800)
    await take.hold('g2b', 0.6)
  }, SCENES)
  await context.close()
  return result
}

/* ------------------------------------------------------------- g3: columns */

export async function sceneColumns(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.app}/columns`)
  await settle(page, 1200)
  const result = await record(ctx, 'g3-columns', page, async (take, actor) => {
    await actor.click(table(page).getByRole('button', { name: 'Columns' }), 700)
    await page.waitForTimeout(300)
    await actor.click(page.getByRole('checkbox', { name: 'Show Email' }), 600)
    await page.waitForTimeout(300)
    await drag(page, await centre(page, '[aria-label="Move Joined"]'), await centre(page, '[aria-label="Move City"]'))
    await page.waitForTimeout(300)
    await take.hold('g3a', 0)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    take.mark('reload')
    await page.reload()
    await settle(page, 700)
    await actor.moveTo(header(page, 'Email'), 700)
    await actor.moveTo(header(page, 'Joined'), 600)
    await actor.click(table(page).getByRole('button', { name: 'Columns' }), 600)
    await page.waitForTimeout(300)
    await actor.click(page.getByRole('button', { name: 'Reset' }), 600)
    await page.waitForTimeout(400)
    await page.keyboard.press('Escape')
    await actor.moveTo(header(page, 'City'), 600)
    await take.hold('g3b', 0.6)
  }, SCENES)
  await context.close()
  return result
}

/* ----------------------------------------------------------- g4: selection */

export async function sceneSelection(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.app}/selection`)
  await settle(page, 1200)
  const result = await record(ctx, 'g4-selection', page, async (take, actor) => {
    const boxes = table(page).locator('tbody [role="checkbox"]')
    await actor.click(boxes.nth(0), 550)
    await actor.click(boxes.nth(1), 450)
    await actor.click(boxes.nth(3), 450)
    await actor.click(table(page).locator('thead [role="checkbox"]'), 600)
    await page.waitForTimeout(400)
    await take.hold('g4a', 0)
    take.mark('bound')
    await actor.moveTo(page.getByText('Orders picked:'), 900)
    await page.waitForTimeout(600)
    await actor.click(page.getByRole('button', { name: 'Clear selection' }), 700)
    await page.waitForTimeout(500)
    await actor.click(boxes.nth(2), 500)
    await actor.moveTo(page.getByText('Orders picked:'), 700)
    await take.hold('g4b', 0.6)
  }, SCENES)
  await context.close()
  return result
}

/* ------------------------------------------------------------ g5: grouping */

export async function sceneGrouping(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.app}/grouping`)
  await settle(page, 1200)
  const result = await record(ctx, 'g5-grouping', page, async (take, actor) => {
    const toggles = () => table(page).locator('.datatable-group-toggle')
    await actor.click(toggles().first(), 700)
    await page.waitForTimeout(300)
    await actor.click(toggles().nth(1), 600)
    await page.waitForTimeout(300)
    await actor.moveTo(table(page).locator('tr.datatable-total-row td').nth(5), 800)
    await take.hold('g5a', 0)
    take.mark('regroup')
    await actor.click(table(page).getByRole('button', { name: 'Columns' }), 600)
    await page.waitForTimeout(300)
    await actor.click(page.getByRole('checkbox', { name: 'Group by City' }), 550)
    await actor.click(page.getByRole('checkbox', { name: 'Group by Handled by' }), 550)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    await actor.click(toggles().first(), 600)
    await page.waitForTimeout(300)
    await actor.moveTo(toggles().nth(1), 600)
    await take.hold('g5b', 0.6)
  }, SCENES)
  await context.close()
  return result
}

/* -------------------------------------------------------------- g6: export */

const CSV_PANEL = (name: string, csv: string) => `
(() => {
  const lines = ${JSON.stringify(csv)}.replace(/^\\uFEFF/, '').split(/\\r\\n/).filter(Boolean).slice(0, 13);
  const panel = document.createElement('div');
  panel.id = '__vid_csv';
  panel.style.cssText = 'position:fixed;right:32px;bottom:32px;width:760px;z-index:2147483640;border-radius:12px;overflow:hidden;box-shadow:0 18px 50px rgba(0,0,0,.35);font:13px/1.55 SF Mono,Menlo,monospace;background:#0f172a;color:#e2e8f0;opacity:0;transform:translateY(16px);transition:all .35s ease';
  const head = document.createElement('div');
  head.style.cssText = 'padding:10px 16px;background:#1e293b;color:#94a3b8;font:600 13px -apple-system,Helvetica Neue,sans-serif';
  head.textContent = '⬇ ' + ${JSON.stringify(name)} + '  ·  UTF-8 with BOM';
  const body = document.createElement('pre');
  body.style.cssText = 'margin:0;padding:12px 16px;white-space:pre;overflow:hidden';
  body.textContent = lines.join('\\n');
  panel.append(head, body);
  document.body.appendChild(panel);
  requestAnimationFrame(() => { panel.style.opacity = '1'; panel.style.transform = 'none'; });
})()`

export async function sceneExport(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.app}/export`)
  await settle(page, 1200)
  const result = await record(ctx, 'g6-export', page, async (take, actor) => {
    await actor.type(table(page).getByPlaceholder('Search all columns...'), 'Bangkok', { delay: 110 })
    await page.waitForTimeout(400)
    // Largest first (a number column sorts descending on the first click).
    await actor.click(header(page, 'Total').locator('.datatable-sort-icon'), 600)
    await page.waitForTimeout(400)
    const download = page.waitForEvent('download')
    await actor.click(table(page).getByRole('button', { name: 'Export' }), 700)
    const file = await download
    const csv = readFileSync((await file.path())!, 'utf8')
    await take.hold('g6a', 0)
    take.mark('csv')
    await page.evaluate(CSV_PANEL(file.suggestedFilename(), csv))
    await page.waitForTimeout(500)
    await actor.moveToPoint(1000, 520, 900)
    await take.hold('g6b', 1.2)
  }, SCENES)
  await context.close()
  return result
}

/* -------------------------------------------------------------- g7: scroll */

/** A corner badge counting the rows actually in the DOM, to show the virtualisation. */
const ROW_BADGE = `
(() => {
  const badge = document.createElement('div');
  badge.style.cssText = 'position:fixed;right:28px;top:76px;z-index:2147483640;padding:8px 14px;border-radius:9999px;background:#0f172a;color:#e2e8f0;font:600 14px -apple-system,Helvetica Neue,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25)';
  document.body.appendChild(badge);
  const tick = () => {
    const drawn = document.querySelectorAll('.datatable-container tbody tr:not(.datatable-virtual-spacer)').length;
    badge.textContent = 'Rows in the DOM: ' + drawn + ' of 300';
  };
  tick();
  setInterval(tick, 120);
})()`

export async function sceneScroll(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.app}/scroll`)
  await settle(page, 1200)
  await page.evaluate(ROW_BADGE)
  const result = await record(ctx, 'g7-scroll', page, async (take, actor) => {
    await actor.moveTo(table(page).locator('tbody tr').nth(4), 700)
    for (let i = 0; i < 4; i++) await actor.scroll(1600, 900)
    await take.hold('g7a', 0)
    take.mark('bottom')
    for (let i = 0; i < 6; i++) await actor.scroll(2400, 700)
    await page.waitForTimeout(400)
    await actor.scroll(-1800, 900)
    await take.hold('g7b', 0.6)
  }, SCENES)
  await context.close()
  return result
}

/* -------------------------------------------------------------- g8: studio */

export async function sceneStudio(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.studio}${PROJECT}/pages/dg-page-grouping`)
  await settle(page, 1500)
  const result = await record(ctx, 'g8-studio', page, async (take, actor) => {
    const item = page.locator('[data-grid-item="dg-item-grouping-orders"]')
    await actor.click(item, 800)
    const props = page.getByRole('button', { name: 'Props', exact: true })
    if (await props.isVisible()) await actor.click(props, 450)
    await page.waitForTimeout(400)
    await take.hold('g8a', 0)
    take.mark('sections')
    await actor.moveTo(page.getByText('Columns menu', { exact: true }).first(), 700)
    await actor.scroll(500, 1100)
    await actor.moveTo(page.getByText('Row selection', { exact: true }).first(), 600)
    await actor.scroll(500, 1100)
    await actor.moveTo(page.getByText('Grouping and totals', { exact: true }).first(), 700)
    await actor.scroll(600, 1200)
    await actor.moveTo(page.getByText('Export (CSV)', { exact: true }).first(), 600)
    await actor.scroll(400, 900)
    await take.hold('g8b', 0.6)
  }, SCENES)
  await context.close()
  return result
}
