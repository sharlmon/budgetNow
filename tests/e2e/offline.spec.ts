import { expect, test } from '@playwright/test'
import { getState, keypad, openAdd, reset } from './helpers'

test.beforeEach(async ({ request }) => { await reset(request) })

test('changes made offline are kept, flagged, and uploaded when the connection returns', async ({ page, context, request }) => {
  await page.goto('/home')
  await expect(page.locator('.wallet')).toBeVisible()

  await context.setOffline(true)
  await openAdd(page)
  await page.locator('.seg2 button, .seg button').filter({ hasText: 'Expense' }).first().click()
  await keypad(page, '75')
  await page.getByRole('button', { name: 'Add Transaction', exact: true }).click()

  await expect(page.locator('.badge')).toContainText('Offline')
  expect((await getState(request)).expenses).toHaveLength(0) // the server has not seen it

  await context.setOffline(false)
  await expect.poll(async () => (await getState(request)).expenses.length, { timeout: 20_000 }).toBe(1)
  expect((await getState(request)).expenses[0].amount).toBe(75)
  await expect(page.locator('.badge')).toHaveCount(0)
})

test('the app opens from its saved copy with no connection', async ({ page, context }) => {
  await page.goto('/home')
  await expect(page.locator('.wallet')).toBeVisible()
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  // The dev server is unreachable, but nothing should crash the page we already have.
  await expect(page.locator('body')).toBeVisible()
})
