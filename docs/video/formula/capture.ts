/**
 * The formula walkthrough's recorded scenes (see narration.ts for what is said
 * over each): the example app's `/formula` and `/logic` pages (`example`, port
 * 3200, over `api`) and the dev studio (`studio`, port 3300) on its own seeded
 * workspace — a fresh browser context, so edits go nowhere. Each scene opens a
 * fresh context, so a formula the user keeps in the browser can't leak between
 * takes.
 */
import type { Locator, Page } from 'playwright-core'
import { newPage, record, settle, type Captured, type Ctx } from '../capture'
import { choose } from '../logic/capture'
import type { Actor } from '../recorder'
import { SCENES } from './narration'

export const URLS = {
  example: process.env.EXAMPLE_URL ?? 'http://localhost:3200',
  studio: process.env.LOGIC_STUDIO_URL ?? 'http://localhost:3300',
}

const PROJECT = '/p/seed-project-country'

const field = (page: Page, name: string) => page.locator(`input[name="${name}"]`)
const exact = (page: Page, text: string) => page.getByText(text, { exact: true }).first()

/** Before the take: put `target` at `top` px in the page's scroller, with no animation. */
async function jump(target: Locator, top = 110) {
  await target.evaluate((el, top) => {
    const main = el.closest('main')
    if (main) main.scrollTop += el.getBoundingClientRect().top - top
  }, top)
  await target.page().waitForTimeout(250)
}

/** During the take: wheel the page until `target` sits at `top` px. */
async function scrollTo(page: Page, actor: Actor, target: Locator, top = 110, ms = 900) {
  const box = await target.boundingBox()
  if (!box) throw new Error(`no box for ${target}`)
  await actor.moveToPoint(860, 470, 350)
  await actor.scroll(box.y - top, ms)
  await page.waitForTimeout(300)
}

/** Into a field and typing, with a short move: for the busier takes. */
async function quickType(actor: Actor, target: Locator, text: string, delay = 80) {
  await actor.click(target, 280)
  await target.fill('')
  await target.pressSequentially(text, { delay })
}

/** Scroll room past the page's end, so its last section can sit above the captions. */
const roomBelow = (page: Page) => page.addStyleTag({ content: 'main { padding-bottom: 200px !important }' })

async function openApp(ctx: Ctx, path: string) {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.example}${path}`)
  await settle(page, 1200)
  return { context, page }
}

async function openStudio(ctx: Ctx, path: string) {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.studio}${path}`)
  await settle(page, 2000)
  return { context, page }
}

/* ------------------------------------------------------------ f2: arithmetic */

export async function sceneArithmetic(ctx: Ctx): Promise<Captured> {
  const { context, page } = await openApp(ctx, '/formula')
  const result = await record(ctx, 'f2-arith', page, async (take, actor) => {
    await actor.type(field(page, 'quantity'), '12', { delay: 150 })
    await actor.type(field(page, 'price'), '1250', { delay: 130 })
    await actor.moveTo(exact(page, 'THB 15,000.00'), 600)
    await actor.type(field(page, 'discountPct'), '15', { delay: 170 })
    await actor.moveTo(exact(page, 'THB 2,250.00'), 600)
    await take.hold('f2a', 0.1)
    take.mark('round')
    await actor.moveTo(exact(page, 'THB 12,750.00'), 650)
    await page.waitForTimeout(900)
    await actor.moveTo(exact(page, 'THB 1,062.50'), 650)
    await take.hold('f2b', 0.3)
  }, SCENES)
  await context.close()
  return result
}

/* ------------------------------------------------------------------ f3: text */

export async function sceneText(ctx: Ctx): Promise<Captured> {
  const { context, page } = await openApp(ctx, '/formula')
  await jump(exact(page, 'Text'))
  const result = await record(ctx, 'f3-text', page, async (take, actor) => {
    await actor.type(field(page, 'firstName'), 'Ada', { delay: 150 })
    await actor.type(field(page, 'lastName'), 'Lovelace', { delay: 110 })
    await actor.moveTo(exact(page, 'Ada Lovelace'), 600)
    await actor.moveTo(exact(page, 'Hello, Ada!'), 600)
    await actor.moveTo(exact(page, '11'), 600)
    await take.hold('f3', 0.3)
  }, SCENES)
  await context.close()
  return result
}

/* ------------------------------------------- f4: MIN, MAX, ABS, TODAY, DAYS */

export async function sceneFunctions(ctx: Ctx): Promise<Captured> {
  const { context, page } = await openApp(ctx, '/formula')
  await jump(exact(page, 'Functions'))
  const result = await record(ctx, 'f4-functions', page, async (take, actor) => {
    await actor.type(field(page, 'low'), '40', { delay: 170 })
    await actor.type(field(page, 'high'), '95', { delay: 170 })
    await actor.moveTo(exact(page, '40'), 500)
    await actor.moveTo(exact(page, '95'), 500)
    await actor.moveTo(exact(page, '55'), 500)
    await take.hold('f4a', 0.1)
    take.mark('dates')
    await actor.moveTo(exact(page, '30 Oct 2026'), 650)
    await page.waitForTimeout(500)
    await actor.click(page.getByText('Pick a date').first(), 600)
    await page.waitForTimeout(450)
    await actor.click(page.locator('button').filter({ hasText: /^1$/ }).first(), 600)
    await page.waitForTimeout(500)
    await actor.moveTo(exact(page, '29'), 600)
    await take.hold('f4b', 0.3)
  }, SCENES)
  await context.close()
  return result
}

/* --------------------------------------------------------- f5: COUNT and SUM */

export async function sceneLists(ctx: Ctx): Promise<Captured> {
  const { context, page } = await openApp(ctx, '/formula')
  await jump(exact(page, 'Lists'), 180)
  const result = await record(ctx, 'f5-lists', page, async (take, actor) => {
    await actor.moveTo(exact(page, 'Lists'), 700)
    await page.waitForTimeout(500)
    await actor.moveTo(exact(page, 'COUNT($sales)'), 650)
    await take.hold('f5a', 0.1)
    take.mark('sum')
    await actor.moveTo(exact(page, '12'), 550)
    await page.waitForTimeout(1100)
    await actor.moveTo(exact(page, '2,960'), 600)
    await page.waitForTimeout(500)
    await actor.moveTo(exact(page, 'THB 1,662,638.91'), 600)
    await page.waitForTimeout(900)
    await actor.moveTo(exact(page, 'THB 138,553.24'), 650)
    await take.hold('f5b', 0.3)
  }, SCENES)
  await context.close()
  return result
}

/* -------------------------------------------------------- f6: blanks + errors */

export async function sceneBlanks(ctx: Ctx): Promise<Captured> {
  const { context, page } = await openApp(ctx, '/formula')
  const result = await record(ctx, 'f6-blanks', page, async (take, actor) => {
    await actor.type(field(page, 'price'), '1250', { delay: 130 })
    await actor.moveTo(exact(page, 'Subtotal = Quantity × Unit price'), 650)
    await page.waitForTimeout(300)
    await actor.moveTo(exact(page, 'Total = ROUND(Subtotal − Discount, 2)'), 650)
    await take.hold('f6a', 0.1)
    await actor.type(field(page, 'discountPct'), '0', { delay: 170 })
    take.mark('policy')
    await scrollTo(page, actor, exact(page, 'Blanks and errors'), 240)
    await actor.moveTo(exact(page, 'THB 0.00'), 650)
    await page.waitForTimeout(1200)
    await actor.moveTo(page.locator('.gummy-logic-error > *').first(), 650)
    await take.hold('f6b', 0.3)
  }, SCENES)
  await context.close()
  return result
}

/* ------------------------------- f7: fields, saved formulas, conditions, columns */

export async function sceneWhere(ctx: Ctx): Promise<Captured> {
  const { context, page } = await openApp(ctx, '/logic')
  await jump(field(page, 'qty'), 125)
  const result = await record(ctx, 'f7-where', page, async (take, actor) => {
    const code = field(page, 'discountCode')
    await actor.type(field(page, 'qty'), '12', { delay: 170 })
    await actor.type(field(page, 'unitPrice'), '250', { delay: 140 })
    await actor.moveTo(field(page, 'subtotal'), 650)
    await take.hold('f7a', 0.1)
    take.mark('cond')
    await scrollTo(page, actor, code, 380, 1000)
    await actor.moveTo(code, 600)
    await page.waitForTimeout(500)
    await actor.moveTo(page.getByText('Needs a subtotal of 5,000'), 600)
    await take.hold('f7b', 0.1)
    take.mark('saved')
    await scrollTo(page, actor, field(page, 'qty'), 125, 1000)
    await actor.type(field(page, 'qty'), '120', { delay: 170 })
    await actor.moveTo(field(page, 'subtotal'), 500)
    await actor.moveTo(exact(page, '10%'), 550)
    await page.waitForTimeout(700)
    await actor.moveTo(exact(page, 'THB 28,890.00'), 600)
    await take.hold('f7c', 0.1)
    take.mark('unlock')
    await scrollTo(page, actor, code, 380, 1000)
    await actor.type(code, 'GUMMY10', { delay: 90 })
    await take.hold('f7d', 0.1)
    take.mark('table')
    await scrollTo(page, actor, exact(page, 'Density'), 300, 900)
    await actor.moveTo(exact(page, 'Density'), 600)
    await page.waitForTimeout(500)
    await actor.moveTo(page.getByRole('cell', { name: '8,871.1' }).first(), 550)
    await page.waitForTimeout(800)
    await actor.moveTo(page.getByText('Member for').first(), 650)
    await take.hold('f7e', 0.3)
  }, SCENES)
  await context.close()
  return result
}

/* ------------------------------------------------- f8: the end user's formula */

export async function sceneOwn(ctx: Ctx): Promise<Captured> {
  const { context, page } = await openApp(ctx, '/formula')
  const heading = exact(page, 'Your own formula')
  await roomBelow(page)
  await jump(heading, 290)
  const result = await record(ctx, 'f8-own', page, async (take, actor) => {
    await actor.moveTo(heading, 700)
    await page.waitForTimeout(600)
    const scratch = page.getByText('Click to write a formula')
    await actor.moveTo(scratch, 800)
    await take.hold('f8a', -1.6)
    await actor.click(scratch, 450)
    await page.waitForTimeout(800)
    await take.hold('f8a', 0.1)
    take.mark('chips')
    const bar = page.getByLabel('Formula code')
    const type = async (text: string, delay = 100) => {
      await bar.pressSequentially(text, { delay })
      await page.waitForTimeout(250)
    }
    await actor.click(bar, 450)
    await type('sum')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    await quickType(actor, page.getByLabel('Search insertable'), 'sales', 70)
    await page.waitForTimeout(150)
    await actor.click(page.getByRole('button', { name: 'Insert sales', exact: true }), 350)
    await page.waitForTimeout(200)
    await page.getByLabel('Search insertable').fill('')
    await type(", 'revenue')", 45)
    await type(' × 7%', 90)
    await type(' ×', 110)
    await actor.moveTo(page.getByRole('alert'), 350)
    await page.waitForTimeout(450)
    await bar.press('Backspace', { delay: 100 })
    await bar.press('Backspace', { delay: 100 })
    await page.waitForTimeout(200)
    await actor.moveTo(page.getByTestId('formula-sample-result'), 350)
    await take.hold('f8b', 0.1)
    take.mark('showas')
    await actor.click(page.getByRole('radio', { name: 'Currency' }), 450)
    await page.waitForTimeout(250)
    await quickType(actor, page.getByLabel('Currency (ISO)'), 'THB', 110)
    await page.waitForTimeout(250)
    await actor.moveTo(page.getByTestId('formula-sample-result'), 400)
    await page.waitForTimeout(300)
    await actor.click(page.getByRole('button', { name: 'Done' }), 450)
    await page.waitForTimeout(500)
    await take.hold('f8c', 0.1)
    take.mark('keep')
    await page.reload()
    await settle(page, 900)
    await roomBelow(page)
    await scrollTo(page, actor, heading, 290, 900)
    const kept = exact(page, 'THB 116,384.72')
    await actor.moveTo(kept, 550)
    await take.hold('f8d', 0.1)
    await actor.click(kept, 400)
    await page.waitForTimeout(500)
    take.mark('reset')
    await actor.click(page.getByRole('button', { name: 'Reset', exact: true }), 450)
    await page.waitForTimeout(450)
    await actor.click(page.getByRole('button', { name: 'Done' }), 500)
    await page.waitForTimeout(500)
    await actor.moveTo(scratch, 550)
    await take.hold('f8e', 0.4)
  }, SCENES)
  await context.close()
  return result
}

/* --------------------------------------------------- f9: the studio's editor */

export async function sceneStudio(ctx: Ctx): Promise<Captured> {
  const { context, page } = await openStudio(ctx, `${PROJECT}/pages/seed-page-formula`)
  const tile = page.getByTitle(/A typography showing a formula/)
  await tile.scrollIntoViewIfNeeded()
  const result = await record(ctx, 'f9-studio', page, async (take, actor) => {
    await actor.moveTo(tile, 900)
    await page.waitForTimeout(1100)
    await actor.click(tile, 450)
    await page.waitForTimeout(800)
    await take.hold('f9a', 0.1)
    take.mark('insert')
    const list = page.getByRole('complementary', { name: 'Insert' }).locator('ul')
    const distance = await list.evaluate((el) => el.scrollHeight - el.clientHeight)
    await actor.moveTo(list, 400)
    await actor.scroll(distance + 40, 1100)
    await page.waitForTimeout(200)
    for (const fn of ['ROUND', 'MIN', 'MAX', 'ABS', 'LEN', 'TODAY', 'DAYS', 'COUNT', 'SUM']) {
      await actor.moveTo(page.getByRole('button', { name: `Insert ${fn}` }), 120)
    }
    await take.hold('f9b', 0.1)
    take.mark('bar')
    const bar = page.getByLabel('Formula code')
    await actor.click(bar, 550)
    const type = async (text: string) => {
      await bar.pressSequentially(text, { delay: 105 })
      await page.waitForTimeout(350)
    }
    await type('rou')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)
    await type('pri')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(250)
    await type(' ÷ dis')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(250)
    await type(', ')
    await page.waitForTimeout(350)
    await type('2)')
    await take.hold('f9c', 0.1)
    take.mark('try')
    await actor.click(page.getByRole('button', { name: /If an input is empty/ }), 450)
    await page.waitForTimeout(250)
    await choose(page, actor, page.getByLabel('Divide by 0'), 'error')
    await quickType(actor, page.getByLabel('Sample [price]'), '1250')
    await quickType(actor, page.getByLabel('Sample [discountPct]'), '0')
    await actor.moveTo(page.getByTestId('logic-sample-result'), 400)
    await take.hold('f9d', 0.1)
    // Under the dialog: the appended cell comes into view, above the captions, as it closes.
    const cell = page.locator('[data-grid-item]').last()
    await cell.evaluate((el) => {
      let scroller = el.parentElement
      while (scroller && !/auto|scroll/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
      if (scroller) scroller.style.paddingBottom = '220px'
      el.scrollIntoView({ block: 'center' })
    })
    take.mark('cell')
    await actor.click(page.getByRole('button', { name: 'Done' }), 500)
    await page.waitForTimeout(800)
    await actor.moveTo(cell.getByRole('button', { name: /editor/ }), 650)
    await take.hold('f9e', 0.4)
  }, SCENES)
  await context.close()
  return result
}

/* ------------------------------------------------------- f10: saved formulas */

export async function sceneSaved(ctx: Ctx): Promise<Captured> {
  const { context, page } = await openStudio(ctx, `${PROJECT}/logic?item=formula-seed-total`)
  await page.getByRole('button', { name: 'Insert', exact: true }).click()
  await page.waitForTimeout(300)
  const result = await record(ctx, 'f10-saved', page, async (take, actor) => {
    await actor.moveTo(page.getByLabel('Formula code'), 700)
    await actor.type(page.getByLabel('Sample [unitPrice]'), '250', { delay: 140 })
    await actor.type(page.getByLabel('Sample [qty]'), '120', { delay: 170 })
    await actor.moveTo(page.getByTestId('logic-sample-result'), 600)
    await take.hold('f10a', 0.1)
    take.mark('usedby')
    await actor.click(page.getByRole('tab', { name: /^Used by/ }), 650)
    await page.waitForTimeout(1200)
    await actor.click(page.getByRole('tab', { name: 'JSON' }), 650)
    await actor.moveTo(page.getByText('"Subtotal"').first(), 550)
    await take.hold('f10b', 1.6)
  }, SCENES)
  await context.close()
  return result
}
