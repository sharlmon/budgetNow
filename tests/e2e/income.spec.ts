import { expect, test } from '@playwright/test'
import { getState, keypad, openAdd, reset } from './helpers'

test.beforeEach(async ({ request }) => { await reset(request) })

test('adding money in splits it, confirms, saves to the account and survives a reload', async ({ page, request }) => {
  await page.goto('/home')
  await expect(page.getByText("Let's plan your first pay")).toBeVisible()

  await openAdd(page)
  await keypad(page, '3200')
  await page.getByPlaceholder('Label, e.g. October salary').fill('October salary')
  await page.getByRole('button', { name: 'See my breakdown' }).click()

  const rows = page.locator('.panel .cat')
  await expect(rows).toHaveCount(4)
  const values = await rows.locator('input.field').evaluateAll(els => els.map(e => Number((e as HTMLInputElement).value)))
  expect(values).toEqual([1600, 960, 640, 0]) // 50/30/20 of 3200, no debts
  await page.getByRole('button', { name: 'Looks good, confirm' }).click()

  await expect(page.locator('.wallet')).toContainText('$3,200')
  await expect.poll(async () => (await getState(request)).incomes.length).toBe(1)
  const income = (await getState(request)).incomes[0]
  expect(income).toMatchObject({ label: 'October salary', amount: 3200, split: { needs: 1600, wants: 960, savings: 640, debt: 0 }, rev: 1 })

  await page.reload()
  await expect(page.locator('.wallet')).toContainText('$3,200')
})

test('dragging one category rebalances the others so the total never drifts', async ({ page }) => {
  await page.goto('/home')
  await openAdd(page)
  await keypad(page, '1000')
  await page.getByRole('button', { name: 'See my breakdown' }).click()
  const needs = page.locator('.panel .cat').first().locator('input.field')
  await needs.fill('700')
  const values = await page.locator('.panel .cat input.field').evaluateAll(els => els.map(e => Number((e as HTMLInputElement).value)))
  expect(values[0]).toBe(700)
  expect(Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100).toBe(1000)
})

test('an expense is counted against its category and can be removed with Undo', async ({ page, request }) => {
  await page.goto('/home')
  await openAdd(page); await keypad(page, '2000')
  await page.getByRole('button', { name: 'See my breakdown' }).click()
  await page.getByRole('button', { name: 'Looks good, confirm' }).click()

  await openAdd(page)
  await page.locator('.seg2 button, .seg button').filter({ hasText: 'Expense' }).first().click()
  await keypad(page, '45')
  await page.getByRole('button', { name: 'Add Transaction', exact: true }).click()
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(1)
  expect((await getState(request)).expenses[0]).toMatchObject({ amount: 45, category: 'needs' })

  await page.getByRole('link', { name: 'Activity' }).click()
  const minus45 = /[−-]\$45/ // the app prints a true minus sign
  const row = page.locator('.item', { hasText: minus45 })
  await row.getByRole('button', { name: 'Delete' }).click()
  await expect(row).toHaveCount(0)
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(0)
  await page.locator('.toast .undo').last().click()
  await expect(page.locator('.item', { hasText: minus45 })).toBeVisible()
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(1)
})
