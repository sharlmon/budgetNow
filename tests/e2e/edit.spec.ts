import { expect, test } from '@playwright/test'
import { getState, reset, sync } from './helpers'

const today = () => new Date().toLocaleDateString('sv')
const acct = (id: string, name: string, balance: number) => ({ t: 'accounts', op: 'put', row: { id, name, kind: 'mobile', balance, color: '#2fa05a' } })
const expense = (id: string, label: string, amount: number, extra: any = {}) => ({ t: 'expenses', op: 'put', row: { id, label, amount, category: 'wants', date: today(), ...extra } })
const income = (id: string, label: string, amount: number, extra: any = {}) => ({ t: 'incomes', op: 'put', row: { id, label, amount, date: today(), split: { needs: amount / 2, wants: amount * 0.3, savings: amount * 0.2, debt: 0 }, ...extra } })
const balances = async (request: any) => Object.fromEntries((await getState(request)).accounts.map((a: any) => [a.id, a.balance]))
const sheet = (page: any) => page.getByRole('dialog', { name: /Edit (expense|income)/ })

test.beforeEach(async ({ request }) => { await reset(request) })

test('editing an expense changes it, corrects its account, bumps its revision and can be undone', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 1000), expense('x1', 'Lunch', 300, { accountId: 'a' })])
  await page.goto('/activity')
  await page.getByRole('button', { name: 'Edit Lunch' }).click()
  const s = sheet(page)
  await expect(s.getByRole('button', { name: 'Save changes' })).toBeDisabled() // nothing changed yet
  await s.getByLabel('What was it for?').fill('Lunch with Sam')
  await s.getByLabel('Amount').fill('450')
  await s.getByRole('button', { name: 'Needs' }).click()
  await s.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('status')).toContainText('Lunch with Sam updated')
  await expect.poll(async () => (await getState(request)).expenses[0].amount).toBe(450)
  const e = (await getState(request)).expenses[0]
  expect(e).toMatchObject({ label: 'Lunch with Sam', category: 'needs', accountId: 'a', rev: 2 })
  expect((await balances(request)).a).toBe(850) // the entry grew from 300 to 450, so only the extra 150 comes out of the account

  await page.waitForTimeout(1200)
  await page.locator('.toast .undo').click()
  await expect.poll(async () => (await getState(request)).expenses[0].amount).toBe(300)
  expect((await getState(request)).expenses[0]).toMatchObject({ label: 'Lunch', category: 'wants' })
  expect((await balances(request)).a).toBe(1000)
})

test('moving an expense to another account returns the money and takes it from the new one', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 1000), acct('b', 'Bank', 5000), expense('x1', 'Lunch', 300, { accountId: 'a' })])
  await page.goto('/activity')
  await page.getByRole('button', { name: 'Edit Lunch' }).click()
  await sheet(page).getByLabel('Paid from').selectOption('b')
  await sheet(page).getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(async () => (await balances(request)).b).toBe(4700)
  expect((await balances(request)).a).toBe(1300)
  expect((await getState(request)).expenses[0].accountId).toBe('b')
})

test('an amount the account cannot cover is refused with the shortfall, and nothing changes', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 100), expense('x1', 'Lunch', 300, { accountId: 'a' })])
  await page.goto('/activity')
  await page.getByRole('button', { name: 'Edit Lunch' }).click()
  await sheet(page).getByLabel('Amount').fill('500')
  await sheet(page).getByRole('button', { name: 'Save changes' }).click()
  await expect(sheet(page).getByRole('alert')).toContainText('M-Pesa is short by')
  await expect(sheet(page).getByRole('alert')).toContainText('100') // 100 + the 300 given back = 400, so 500 is 100 short
  expect((await getState(request)).expenses[0].amount).toBe(300)
  expect((await balances(request)).a).toBe(100)
})

test('editing an income rescales its split, adjusts its account, and can change the account', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 1000), acct('b', 'Bank', 5000), income('i1', 'Salary', 1000, { accountId: 'b' })])
  await page.goto('/activity')
  await page.getByRole('button', { name: 'Edit Salary' }).click()
  const s = sheet(page)
  await s.getByLabel('Amount').fill('2000')
  await expect(s).toContainText('split will scale')
  await s.getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(async () => (await getState(request)).incomes[0].amount).toBe(2000)
  const i = (await getState(request)).incomes[0]
  expect(i.split).toEqual({ needs: 1000, wants: 600, savings: 400, debt: 0 })
  expect((await balances(request)).b).toBe(6000)

  await page.getByRole('button', { name: 'Edit Salary' }).click()
  await sheet(page).getByLabel('Went into').selectOption('a')
  await sheet(page).getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(async () => (await balances(request)).a).toBe(3000)
  expect((await balances(request)).b).toBe(4000)
})

test('an income cannot be reduced if its account no longer has that money', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 100), income('i1', 'Salary', 5000, { accountId: 'a' })])
  await page.goto('/activity')
  await page.getByRole('button', { name: 'Edit Salary' }).click()
  await sheet(page).getByLabel('Amount').fill('1000')
  await sheet(page).getByRole('button', { name: 'Save changes' }).click()
  await expect(sheet(page).getByRole('alert')).toContainText('no longer has enough')
  expect((await getState(request)).incomes[0].amount).toBe(5000)
})

test('editing a debt payment adjusts the debt, and its category cannot be changed', async ({ page, request }) => {
  await sync(request, [{ t: 'debts', op: 'put', row: { id: 'd1', name: 'Loan', balance: 380, minPayment: 50 } }, expense('x1', 'Payment: Loan', 120, { category: 'debt', debtId: 'd1' })])
  await page.goto('/activity')
  await page.getByRole('button', { name: 'Edit Payment: Loan' }).click()
  const s = sheet(page)
  await expect(s).toContainText('payment towards Loan')
  await expect(s.getByRole('button', { name: 'Needs' })).toHaveCount(0)
  await s.getByLabel('Amount').fill('200')
  await s.getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(async () => (await getState(request)).debts[0].balance).toBe(300) // 80 more was paid
  await page.waitForTimeout(1200)
  await page.locator('.toast .undo').click()
  await expect.poll(async () => (await getState(request)).debts[0].balance).toBe(380)
})

test('the date can be changed, and an entry can be deleted from its sheet and brought back', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 1000), expense('x1', 'Lunch', 300, { accountId: 'a' })])
  await page.goto('/activity')
  await page.getByRole('button', { name: 'Edit Lunch' }).click()
  await sheet(page).getByLabel('Date').fill('2026-01-15')
  await sheet(page).getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(async () => (await getState(request)).expenses[0].date).toBe('2026-01-15')

  await page.getByRole('button', { name: 'Edit Lunch' }).click()
  await sheet(page).getByRole('button', { name: 'Delete this expense' }).click()
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(0)
  expect((await balances(request)).a).toBe(1300)
  await page.waitForTimeout(1200)
  await page.locator('.toast .undo').click()
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(1)
  expect((await balances(request)).a).toBe(1000)
})

test('entries on the home screen can be edited too, and an invalid amount cannot be saved', async ({ page, request }) => {
  await sync(request, [income('i1', 'Salary', 1000), expense('x1', 'Lunch', 300)])
  await page.goto('/home')
  await page.getByRole('button', { name: 'Edit Lunch' }).click()
  await sheet(page).getByLabel('Amount').fill('0')
  await expect(sheet(page).getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await sheet(page).getByLabel('Amount').fill('350')
  await sheet(page).getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(async () => (await getState(request)).expenses[0].amount).toBe(350)
})

test('the edit sheet fits a 360px phone', async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await sync(request, [acct('a', 'M-Pesa', 1000), expense('x1', 'A rather long description of what this was for, to test wrapping', 300, { accountId: 'a' })])
  await page.goto('/activity')
  await page.getByRole('button', { name: /^Edit A rather long/ }).click()
  await expect(sheet(page)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})
