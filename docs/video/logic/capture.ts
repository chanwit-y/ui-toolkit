/**
 * The logic preview's recorded scenes (see narration.ts for what is said over
 * each): the example app's `/logic` page (`example`, port 3200, over `api`),
 * the dev studio (`studio`, port 3300) on its own seeded workspace — a fresh
 * browser context, so edits go nowhere — and the Book shop (`demo`, port 3400,
 * over `demo-api`). Each scene opens a fresh browser context.
 */
import type { Locator, Page } from 'playwright-core'
import { newPage, record, settle, type Captured, type Ctx } from '../capture'
import type { Actor } from '../recorder'
import { SCENES } from './narration'

export const URLS = {
  example: process.env.EXAMPLE_URL ?? 'http://localhost:3200',
  studio: process.env.LOGIC_STUDIO_URL ?? 'http://localhost:3300',
  demo: process.env.DEMO_URL ?? 'http://localhost:3400',
  demoApi: process.env.DEMO_API_URL ?? 'http://localhost:9100',
}

const PROJECT = '/p/seed-project-country'
const LOGIC_PAGE = `${PROJECT}/pages/seed-page-logic`

/** A native select: the cursor goes there and the option lands (its popup isn't part of the screencast). */
export async function choose(page: Page, actor: Actor, select: Locator, value: string) {
  await actor.moveTo(select, 550)
  const box = await select.boundingBox()
  if (box) await page.evaluate(([x, y]) => (window as any).__vid?.ripple(x, y), [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)] as const)
  await select.selectOption(value)
  await page.waitForTimeout(450)
}

/** Open the operand picker, search, pick. */
async function pickOperand(page: Page, actor: Actor, search: string, name: string) {
  await actor.click(page.getByRole('button', { name: 'Compare', exact: true }).first(), 500)
  await page.getByLabel('Search Compare').pressSequentially(search, { delay: 90 })
  await page.waitForTimeout(350)
  await actor.click(page.getByRole('listbox', { name: 'Compare' }).getByRole('button').filter({ hasText: name }).first(), 450)
  await page.waitForTimeout(350)
}

async function selectItem(page: Page, actor: Actor, id: string) {
  await actor.click(page.locator(`[data-grid-item="${id}"]`), 700)
  const props = page.getByRole('tab', { name: 'Props', exact: true })
  if (await props.isVisible()) await actor.click(props, 350)
  await page.waitForTimeout(350)
}

const field = (page: Page, name: string) => page.locator(`input[name="${name}"]`)

/* ------------------------------------------------------------- l2: the form */

export async function sceneApp(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.example}/logic`)
  await settle(page, 1200)
  await field(page, 'qty').scrollIntoViewIfNeeded()
  const result = await record(ctx, 'l2-app', page, async (take, actor) => {
    await actor.type(field(page, 'qty'), '12', { delay: 140 })
    await page.waitForTimeout(250)
    await actor.type(field(page, 'unitPrice'), '250', { delay: 140 })
    await page.waitForTimeout(500)
    await actor.moveTo(field(page, 'subtotal'), 650)
    await take.hold('l2a', 0.2)
    take.mark('tier')
    await actor.type(field(page, 'qty'), '120', { delay: 140 })
    await page.waitForTimeout(400)
    await actor.moveTo(field(page, 'subtotal'), 600)
    await take.hold('l2b', 0.2)
    take.mark('business')
    const business = page.getByText('Business', { exact: true }).first()
    await actor.click(business, 650)
    await page.waitForTimeout(500)
    await actor.moveTo(field(page, 'company'), 600)
    await actor.moveTo(field(page, 'taxId'), 550)
    const accept = page.getByRole('switch').first()
    await actor.click(accept, 550)
    await actor.click(page.getByRole('button', { name: 'Save order' }), 600)
    await page.waitForTimeout(600)
    await actor.moveTo(field(page, 'taxId'), 550)
    await take.hold('l2c', 0.4)
  }, SCENES)
  await context.close()
  return result
}

/* ---------------------------------------------------- l3: the inspector slot */

export async function sceneSlot(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.studio}${LOGIC_PAGE}`)
  await settle(page, 2000)
  await page.locator('[data-grid-item="seed-item-logic-code"]').scrollIntoViewIfNeeded()
  const result = await record(ctx, 'l3-slot', page, async (take, actor) => {
    await selectItem(page, actor, 'seed-item-logic-code')
    await choose(page, actor, page.getByLabel('Show when mode'), 'custom')
    await pickOperand(page, actor, 'cust', 'customerType')
    await take.hold('l3a', 0.1)
    take.mark('typed')
    await choose(page, actor, page.locator('select[aria-label="Value"]').first(), 'Business')
    await page.waitForTimeout(500)
    await pickOperand(page, actor, 'qty', 'qty')
    await actor.moveTo(page.getByLabel('Comparison').first(), 500)
    await actor.moveTo(page.getByRole('spinbutton', { name: 'Value' }).first(), 500)
    await take.hold('l3b', 0.1)
    take.mark('saved')
    const mode = page.getByLabel('Show when mode')
    await choose(page, actor, mode, 'saved:rule-seed-business')
    await page.waitForTimeout(500)
    await take.hold('l3c', 0.4)
  }, SCENES)
  await context.close()
  return result
}

/* ---------------------------------------------------------- l4: the formula bar */

export async function sceneFormula(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.studio}${PROJECT}/logic`)
  await settle(page, 2000)
  const result = await record(ctx, 'l4-formula', page, async (take, actor) => {
    await actor.click(page.getByTitle('New formula'), 700)
    await page.waitForTimeout(500)
    await actor.moveTo(page.getByRole('button', { name: 'A × B' }), 600)
    await actor.moveTo(page.getByRole('button', { name: 'Days between two dates' }), 600)
    await take.hold('l4a', 0.1)
    take.mark('typing')
    const bar = page.getByLabel('Formula code')
    await actor.click(bar, 550)
    const type = async (text: string) => {
      await bar.pressSequentially(text, { delay: 130 })
      await page.waitForTimeout(450)
    }
    await type('rou')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    await type('qt')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(350)
    await type(' × uni')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(350)
    await type(', ')
    await page.waitForTimeout(600)
    await type('2)')
    await take.hold('l4b', 0.1)
    take.mark('showas')
    await actor.click(page.getByRole('button', { name: 'Currency', exact: true }), 600)
    await actor.type(page.getByPlaceholder('THB'), 'THB', { delay: 130 })
    await actor.type(page.getByLabel('Sample [qty]'), '12', { delay: 150 })
    await actor.type(page.getByLabel('Sample [unitPrice]'), '250', { delay: 150 })
    await actor.moveTo(page.getByTestId('logic-sample-result'), 600)
    await take.hold('l4c', 0.4)
  }, SCENES)
  await context.close()
  return result
}

/* --------------------------------------------------------------- l5: a rule */

export async function sceneRule(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.studio}${PROJECT}/logic?item=rule-seed-discount`)
  await settle(page, 2000)
  await page.getByRole('button', { name: 'Insert', exact: true }).click()
  await page.waitForTimeout(300)
  const result = await record(ctx, 'l5-rule', page, async (take, actor) => {
    await actor.moveTo(page.locator('.logic-card').nth(0), 700)
    await actor.moveTo(page.locator('.logic-card').nth(1), 700)
    await actor.moveTo(page.locator('.logic-card').nth(2), 700)
    await take.hold('l5a', 0.1)
    take.mark('try')
    const qty = page.getByLabel('Sample [qty]')
    await actor.type(page.getByLabel('Sample [unitPrice]'), '100', { delay: 140 })
    await actor.type(qty, '120', { delay: 170 })
    await page.waitForTimeout(800)
    await qty.fill('')
    await qty.pressSequentially('60', { delay: 170 })
    await page.waitForTimeout(800)
    await qty.fill('')
    await qty.pressSequentially('2', { delay: 170 })
    await page.waitForTimeout(600)
    await actor.moveTo(page.getByTestId('logic-sample-result'), 600)
    await take.hold('l5b', 0.4)
  }, SCENES)
  await context.close()
  return result
}

/* --------------------------------------------------- l6: used by + rename */

export async function sceneRename(ctx: Ctx): Promise<Captured> {
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.studio}${PROJECT}/logic?item=formula-seed-subtotal`)
  await settle(page, 2000)
  const result = await record(ctx, 'l6-rename', page, async (take, actor) => {
    await actor.click(page.getByRole('tab', { name: /^Used by/ }), 650)
    await page.waitForTimeout(450)
    await actor.moveTo(page.getByRole('button', { name: /go to item/ }).first(), 500)
    await actor.click(page.getByRole('button', { name: /go to item/ }).first(), 300)
    await settle(page, 700)
    await take.hold('l6a', 0.1)
    await page.locator('[data-grid-item="seed-item-logic-qty"]').scrollIntoViewIfNeeded()
    await selectItem(page, actor, 'seed-item-logic-qty')
    take.mark('rename')
    const name = page.getByText('Name (binding key)').locator('xpath=ancestor-or-self::*[.//input][1]').locator('input').first()
    await actor.type(name, 'quantity', { delay: 110 })
    await page.waitForTimeout(600)
    await take.hold('l6b', 0)
    await actor.click(page.getByRole('button', { name: 'Update to [quantity]' }), 700)
    await page.waitForTimeout(900)
  }, SCENES)
  await context.close()
  return result
}

/* -------------------------------------------------------------- l7: Book shop */

async function orderId(status: string, before?: string): Promise<string> {
  const res = await fetch(`${URLS.demoApi}/api/orders?status=${status}&limit=50`)
  const body = (await res.json()) as { items?: { _id: string; placedAt: string }[]; rows?: { _id: string; placedAt: string }[]; data?: { _id: string; placedAt: string }[] }
  const rows = body.items ?? body.rows ?? body.data ?? []
  const hit = before ? rows.find((r) => r.placedAt.slice(0, 10) < before) : rows[0]
  if (!hit) throw new Error(`no ${status} order`)
  return hit._id
}

export async function sceneBook(ctx: Ctx): Promise<Captured> {
  const refund = await orderId('refund_requested')
  const today = new Date().toISOString().slice(0, 10)
  const pending = await orderId('pending', today)
  const { context, page } = await newPage(ctx.browser)
  await page.goto(`${URLS.demo}/orders/${refund}`)
  await settle(page, 1500)
  const result = await record(ctx, 'l7-book', page, async (take, actor) => {
    await actor.moveTo(page.getByText('Next step'), 700)
    await actor.moveTo(page.getByText('days since it was placed'), 700)
    await take.hold('l7a', 0.1)
    take.mark('next')
    await page.evaluate((id) => {
      history.pushState({}, '', `/orders/${id}`)
      dispatchEvent(new PopStateEvent('popstate'))
    }, pending)
    await settle(page, 900)
    await actor.moveTo(page.getByText('Next step'), 700)
    await actor.moveTo(page.getByText('days since it was placed'), 600)
    await take.hold('l7b', 0.5)
  }, SCENES)
  await context.close()
  return result
}
