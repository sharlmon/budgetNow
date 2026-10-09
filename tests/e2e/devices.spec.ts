import { expect, test, type Browser } from '@playwright/test'
import { debt, getState, reset, sync } from './helpers'

test.beforeEach(async ({ request }) => { await reset(request); await sync(request, [debt('cd1', 'Card', 1000, 50)]) })

async function device(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL, viewport: { width: 430, height: 900 } }) // its own storage, like a separate phone
  const page = await context.newPage()
  await page.goto('/debts')
  await expect(page.locator('#apr-cd1')).toBeVisible()
  return { context, page }
}
const pay = async (page: any, amount: string) => {
  const card = page.locator('.card', { has: page.locator('#apr-cd1') })
  await card.getByPlaceholder('Payment').fill(amount)
  await card.getByRole('button', { name: 'Pay', exact: true }).click()
}

test('two payments to the same debt from two devices are combined, not lost', async ({ browser, request }, info) => {
  const baseURL = info.project.use.baseURL!
  const A = await device(browser, baseURL), B = await device(browser, baseURL)
  await B.context.setOffline(true)
  await pay(A.page, '100')
  await expect.poll(async () => (await getState(request)).debts[0].balance).toBe(900)
  await pay(B.page, '50') // B has not seen A's payment
  await B.context.setOffline(false)
  await expect.poll(async () => (await getState(request)).debts[0].balance, { timeout: 25_000 }).toBe(850)
  const s = await getState(request)
  expect(s.expenses.map((e: any) => e.amount).sort()).toEqual([100, 50])
  await B.page.goto('/home')
  await expect(B.page.locator('.clash')).toHaveCount(0) // merged on its own, nothing to ask
  await A.context.close(); await B.context.close()
})

test('when both devices change the same field, the user chooses', async ({ browser, request }, info) => {
  const baseURL = info.project.use.baseURL!
  const A = await device(browser, baseURL), B = await device(browser, baseURL)
  await B.context.setOffline(true)
  await A.page.locator('#apr-cd1').fill('10')
  await expect.poll(async () => (await getState(request)).debts[0].apr).toBe(10)
  await B.page.locator('#apr-cd1').fill('20')
  await B.context.setOffline(false)

  await expect(B.page.locator('#apr-cd1')).toHaveValue('10', { timeout: 25_000 }) // shows the other device's version
  expect((await getState(request)).debts[0].apr).toBe(10) // and did not overwrite it
  await B.page.goto('/home')
  await expect(B.page.locator('.clash')).toContainText('1 change')
  await B.page.getByRole('button', { name: 'Review' }).click()
  await expect(B.page.locator('.sheet')).toContainText('You: 20')
  await expect(B.page.locator('.sheet')).toContainText('Other device: 10')
  await B.page.getByRole('button', { name: 'Use mine' }).click()
  await expect.poll(async () => (await getState(request)).debts[0].apr, { timeout: 15_000 }).toBe(20)
  await A.context.close(); await B.context.close()
})

test('a debt deleted on one device and edited on another is kept, with a choice', async ({ browser, request }, info) => {
  const baseURL = info.project.use.baseURL!
  const A = await device(browser, baseURL), B = await device(browser, baseURL)
  await B.context.setOffline(true)
  await A.page.locator('#apr-cd1').fill('7')
  await expect.poll(async () => (await getState(request)).debts[0].apr).toBe(7)
  await B.page.getByRole('button', { name: 'Delete debt' }).click()
  await B.context.setOffline(false)
  await expect(B.page.locator('#apr-cd1')).toBeVisible({ timeout: 25_000 }) // it came back
  expect((await getState(request)).debts).toHaveLength(1)
  await B.page.goto('/home')
  await B.page.getByRole('button', { name: 'Review' }).click()
  await B.page.getByRole('button', { name: 'Delete anyway' }).click()
  await expect.poll(async () => (await getState(request)).debts.length, { timeout: 15_000 }).toBe(0)
  await A.context.close(); await B.context.close()
})
