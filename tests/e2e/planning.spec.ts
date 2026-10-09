import { expect, test } from '@playwright/test'
import { monthsFromNow, simulatePayoff } from '../../app/utils/payoff'
import { getState, keypad, openAdd, reset, sync, debt } from './helpers'

test.beforeEach(async ({ request }) => { await reset(request) })

test('a chosen split rule is used for new income and saved to the account', async ({ page, request }) => {
  await page.goto('/settings')
  await page.locator('.rule .chips button', { hasText: '60/20/20' }).click()
  await expect.poll(async () => (await getState(request)).profile.split).toEqual({ needs: 60, wants: 20, savings: 20 })

  await page.goto('/home')
  await openAdd(page); await keypad(page, '1000')
  await page.getByRole('button', { name: 'See my breakdown' }).click()
  const v = await page.locator('.panel .cat input.field').evaluateAll(els => els.map(e => Number((e as HTMLInputElement).value)))
  expect(v).toEqual([600, 200, 200, 0])
})

test('a custom split that does not total 100% cannot be saved', async ({ page }) => {
  await page.goto('/settings')
  await page.locator('.rule .chips button', { hasText: 'Custom' }).click()
  const f = page.locator('.rule .custom input.field')
  await f.nth(0).fill('70'); await f.nth(1).fill('20'); await f.nth(2).fill('20')
  await expect(page.locator('.rule .custom .btn')).toBeDisabled()
  await expect(page.locator('.rule .custom')).toContainText('110%')
  await f.nth(2).fill('10')
  await expect(page.locator('.rule .custom .btn')).toBeEnabled()
})

test('the payoff planner shows exactly what the calculation produces', async ({ page, request }) => {
  const debts = [
    { id: 'phone', name: 'Phone', balance: 400, apr: 0, minPayment: 40 },
    { id: 'loan', name: 'Loan', balance: 3000, apr: 8, minPayment: 80 },
    { id: 'card', name: 'Card', balance: 9000, apr: 25, minPayment: 270 },
  ]
  await sync(request, debts.map(d => debt(d.id, d.name, d.balance, d.minPayment, d.apr)))
  await page.goto('/debts')
  const plan = page.locator('.plan')
  await expect(plan).toBeVisible()

  const avalanche = simulatePayoff(debts, 0, 'avalanche')
  await expect(plan.locator('.when strong')).toHaveText(monthsFromNow(avalanche.months))

  await plan.getByRole('button', { name: '+$100' }).click(); await plan.getByRole('button', { name: '+$100' }).click()
  const withExtra = simulatePayoff(debts, 200, 'avalanche')
  await expect(plan.locator('.when strong')).toHaveText(monthsFromNow(withExtra.months))
  await expect(plan.locator('.stat strong').first()).toHaveText(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(withExtra.totalInterest))

  await plan.getByRole('tab', { name: 'Snowball' }).click()
  const snow = simulatePayoff(debts, 200, 'snowball')
  await expect(plan.locator('.when strong')).toHaveText(monthsFromNow(snow.months))
  await expect(plan.locator('.order li').first()).toContainText('Phone') // smallest balance first
})

test('a debt that can never be paid at its minimum gets a clear warning', async ({ page, request }) => {
  await sync(request, [debt('trap', 'Trap', 10000, 100, 24)])
  await page.goto('/debts')
  await expect(page.locator('.plan .warn')).toContainText('Trap')
  await page.locator('.plan input.field').fill('500')
  await expect(page.locator('.plan .warn')).toHaveCount(0)
})
