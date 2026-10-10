import { expect, test } from '@playwright/test'
import { getState, keypad, openAdd, reset, sync } from './helpers'

test.beforeEach(async ({ request }) => { await reset(request); await sync(request, [{ t: 'profile', op: 'put', row: { currency: 'KES', name: '' } }]) })

test('Kenyan shillings show as KSh on the keypad and everywhere, and switching currency updates every amount', async ({ page, request }) => {
  await page.goto('/home')
  await openAdd(page)
  await keypad(page, '15000')
  await expect(page.locator('.screen .amount')).toHaveText('KSh 15,000') // typed amount, with the symbol
  await page.getByRole('button', { name: 'See my breakdown' }).click()
  await page.getByRole('button', { name: 'Looks good, confirm' }).click()
  await expect(page.locator('.budgetbal')).toContainText('KSh')
  await expect(page.locator('.budgetbal')).toContainText('15,000')
  await expect(page.locator('body')).not.toContainText('KES')

  await page.goto('/settings')
  await page.locator('#cu').selectOption('USD')
  await expect.poll(async () => (await getState(request)).profile.currency).toBe('USD')
  await page.goto('/home')
  await expect(page.locator('.budgetbal')).toContainText('$15,000')
  await expect(page.locator('.budgetbal')).not.toContainText('KSh')

  await page.goto('/settings')
  await page.locator('#cu').selectOption('KES')
  await page.goto('/home')
  await expect(page.locator('.budgetbal')).toContainText('KSh')
})

test('the currency list starts with Kenyan shillings', async ({ page }) => {
  await page.goto('/settings')
  const first = await page.locator('#cu option').first().textContent()
  expect(first).toBe('KES')
  expect(await page.locator('#cu option').allTextContents()).toEqual(expect.arrayContaining(['TZS', 'UGX', 'USD']))
})
