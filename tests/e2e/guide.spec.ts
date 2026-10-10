import { expect, test } from '@playwright/test'
import { keypad, reset, sync } from './helpers'

const today = () => new Date().toLocaleDateString('sv')
const guide = (page: any) => page.getByRole('region', { name: 'Get set up' })
const acct = { t: 'accounts', op: 'put', row: { id: 'a', name: 'M-Pesa', kind: 'mobile', balance: 1000, color: '#2fa05a' } }
const inc = { t: 'incomes', op: 'put', row: { id: 'i1', label: 'Salary', amount: 1000, date: today(), split: { needs: 500, wants: 300, savings: 200, debt: 0 } } }
const bill = { t: 'bills', op: 'put', row: { id: 'b1', name: 'Rent', amount: 100, category: 'needs', every: 'month', nextDue: today(), anchorDay: new Date().getDate(), auto: false } }

test.beforeEach(async ({ request }) => { await reset(request) })

test('a new person sees three steps, and the usual empty prompts step aside for them', async ({ page }) => {
  await page.goto('/home')
  await expect(guide(page)).toBeVisible()
  await expect(guide(page)).toContainText('0 of 3 done')
  for (const t of ['Add where your money is', 'Add your first pay', 'Add a bill']) await expect(guide(page)).toContainText(t)
  await expect(page.getByText('Where is your money?')).toHaveCount(0)
  await expect(page.getByText("Let's plan your first pay")).toHaveCount(0)
  await expect(guide(page).getByRole('button', { name: /Add account/ })).toHaveClass(/btn/) // the next step is the main button
})

test('each step opens the right thing, and finishing them ticks them off and ends the guide', async ({ page }) => {
  await page.goto('/home')

  await guide(page).getByRole('button', { name: /Add account/ }).click()
  const acctSheet = page.getByRole('dialog', { name: 'Add an account' })
  await acctSheet.getByRole('button', { name: 'M-Pesa', exact: true }).click()
  await acctSheet.getByLabel('Balance now').fill('2000')
  await acctSheet.getByRole('button', { name: 'Add account' }).click()
  await expect(guide(page)).toContainText('1 of 3 done')
  await expect(guide(page)).toContainText('1 account added')
  expect(await guide(page).locator('.bar i').evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(20) // the bar shows progress

  await guide(page).getByRole('button', { name: /Add pay/ }).click()
  await keypad(page, '5000')
  await page.getByRole('button', { name: 'See my breakdown' }).click()
  await page.getByRole('button', { name: 'Looks good, confirm' }).click()
  await expect(guide(page)).toContainText('2 of 3 done')

  await guide(page).getByRole('button', { name: /Add bill/ }).click()
  await expect(page).toHaveURL(/\/bills\?add=1$/)
  await page.getByPlaceholder('Bill name (e.g. Rent, Netflix)').fill('Rent')
  await page.getByPlaceholder('Amount').fill('800')
  await page.getByRole('button', { name: 'Save bill' }).click()

  await page.goto('/home')
  await expect(guide(page)).toHaveCount(0) // everything is done, so the guide is gone
})

test('finishing the last step says so, even though it happens on the Bills page', async ({ page, request }) => {
  await sync(request, [acct, inc])
  await page.goto('/home')
  await expect(guide(page)).toContainText('2 of 3 done')
  await guide(page).getByRole('button', { name: /Add bill/ }).click()
  await page.getByPlaceholder('Bill name (e.g. Rent, Netflix)').fill('Rent')
  await page.getByPlaceholder('Amount').fill('800')
  await page.getByRole('button', { name: 'Save bill' }).click()
  await expect(page.getByRole('status').filter({ hasText: "You're all set" })).toBeVisible()
})

test('hiding the guide is remembered, brings the usual prompts back, and Settings can show it again', async ({ page }) => {
  await page.goto('/home')
  await guide(page).getByRole('button', { name: 'Hide the setup guide' }).click()
  await expect(guide(page)).toHaveCount(0)
  await expect(page.getByText('Where is your money?')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Where is your money?')).toBeVisible()
  await expect(guide(page)).toHaveCount(0)

  await page.goto('/settings')
  await page.getByRole('link', { name: /Setup guide/ }).click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(guide(page)).toBeVisible()
})

test('"I\'ll do this later" also hides it', async ({ page }) => {
  await page.goto('/home')
  await guide(page).getByRole('button', { name: "I'll do this later" }).click()
  await expect(guide(page)).toHaveCount(0)
})

test('someone who already has everything set up never sees the guide, even on a fresh browser', async ({ page, request }) => {
  await sync(request, [acct, inc, bill])
  await page.goto('/home')
  await expect(page.getByRole('region', { name: 'Accounts' })).toContainText('1,000') // data has arrived
  await page.waitForTimeout(1500)
  await expect(guide(page)).toHaveCount(0)
})

test('someone with data on another device does not see the guide flash while it downloads', async ({ page, request }) => {
  await sync(request, [acct, inc, bill])
  const seen: boolean[] = []
  await page.exposeFunction('noteGuide', (v: boolean) => seen.push(v))
  await page.addInitScript(() => {
    new MutationObserver(() => { if (document.querySelector('[aria-labelledby="gs-h"]')) (window as any).noteGuide(true) }).observe(document, { childList: true, subtree: true })
  })
  await page.goto('/home')
  await expect(page.getByRole('region', { name: 'Accounts' })).toContainText('1,000')
  await page.waitForTimeout(1000)
  expect(seen).toEqual([])
})

test('the guide fits a 360px phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await page.goto('/home')
  await expect(guide(page)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})
