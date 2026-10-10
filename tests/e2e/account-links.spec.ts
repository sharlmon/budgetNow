import { expect, test } from '@playwright/test'
import { getState, keypad, openAdd, reset, sync } from './helpers'

const today = () => new Date().toLocaleDateString('sv')
const acct = (id: string, name: string, balance: number, kind = 'mobile', color = '#2fa05a') => ({ t: 'accounts', op: 'put', row: { id, name, kind, balance, color } })
const bill = (id: string, name: string, amount: number, accountId?: string, extra: any = {}) =>
  ({ t: 'bills', op: 'put', row: { id, name, amount, category: 'needs', every: 'month', nextDue: today(), anchorDay: new Date().getDate(), auto: false, ...(accountId ? { accountId } : {}), ...extra } })
const accountChip = (page: any, name: RegExp | string) => page.getByRole('group', { name: 'Account' }).getByRole('button', { name })
const balances = async (request: any) => Object.fromEntries((await getState(request)).accounts.map((a: any) => [a.id, a.balance]))

test.beforeEach(async ({ request }) => { await reset(request) })

test('income goes into the chosen account, and the choice is saved with it', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 1000), acct('b', 'Equity', 5000, 'bank', '#3b6fe0')])
  await page.goto('/home')
  await openAdd(page)
  await keypad(page, '2000')
  await accountChip(page, /Equity/).click()
  await expect(page.locator('.hint').filter({ hasText: 'Equity will have' })).toContainText('7,000')
  await page.getByRole('button', { name: 'See my breakdown' }).click()
  await page.getByRole('button', { name: 'Looks good, confirm' }).click()
  await expect(page.getByRole('status')).toContainText('added to Equity')
  await expect.poll(async () => (await balances(request)).b).toBe(7000)
  expect((await balances(request)).a).toBe(1000)
  expect((await getState(request)).incomes[0].accountId).toBe('b')
})

test('an expense comes out of the chosen account, and "No account" leaves balances alone', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 1000)])
  await page.goto('/home')
  await openAdd(page)
  await page.locator('.seg2 button, .seg button').filter({ hasText: 'Expense' }).first().click()
  await keypad(page, '250')
  await expect(accountChip(page, /M-Pesa/)).toHaveAttribute('aria-pressed', 'true') // a lone account is preselected
  await page.getByRole('button', { name: 'Add Transaction', exact: true }).click()
  await expect.poll(async () => (await balances(request)).a).toBe(750)
  expect((await getState(request)).expenses[0].accountId).toBe('a')

  await openAdd(page)
  await page.locator('.seg2 button, .seg button').filter({ hasText: 'Expense' }).first().click()
  await keypad(page, '100')
  await accountChip(page, 'No account').click()
  await page.getByRole('button', { name: 'Add Transaction', exact: true }).click()
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(2)
  expect((await balances(request)).a).toBe(750)
  expect((await getState(request)).expenses.find((e: any) => e.amount === 100).accountId).toBeUndefined()
})

test('an expense the account cannot cover is blocked until another account or none is chosen', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 100)])
  await page.goto('/home')
  await openAdd(page)
  await page.locator('.seg2 button, .seg button').filter({ hasText: 'Expense' }).first().click()
  await keypad(page, '250')
  await expect(page.getByRole('alert').filter({ hasText: 'short by' })).toContainText('150')
  await expect(page.getByRole('button', { name: 'Add Transaction', exact: true })).toBeDisabled()
  await accountChip(page, 'No account').click()
  await expect(page.getByRole('button', { name: 'Add Transaction', exact: true })).toBeEnabled()
})

test('paying a bill takes it from the bill’s account, and Undo gives it back', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 5000), bill('b1', 'Internet', 1500, 'a')])
  await page.goto('/bills')
  await expect(page.getByText('from M-Pesa')).toBeVisible()
  await page.getByRole('button', { name: 'Mark paid' }).click()
  await expect.poll(async () => (await balances(request)).a).toBe(3500)
  expect((await getState(request)).expenses[0]).toMatchObject({ billId: 'b1', accountId: 'a' })
  await page.waitForTimeout(1200)
  await page.locator('.toast .undo').click()
  await expect.poll(async () => (await balances(request)).a).toBe(5000)
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(0)
})

test('a bill its account cannot cover says so, and can still be logged without the account', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 500), bill('b1', 'Rent', 2000, 'a')])
  await page.goto('/bills')
  await page.getByRole('button', { name: 'Mark paid' }).click()
  await expect(page.locator('.toast')).toContainText('M-Pesa is short by')
  await expect(page.locator('.toast')).toContainText('1,500')
  expect((await getState(request)).expenses).toHaveLength(0) // nothing was logged yet
  await page.getByRole('button', { name: 'Log anyway' }).click()
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(1)
  expect((await balances(request)).a).toBe(500) // the account was not touched
  expect((await getState(request)).expenses[0].accountId).toBeUndefined()
})

test('a bill can be given an account from its details, and from the add form', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 5000), bill('b1', 'Internet', 1500)])
  await page.goto('/bills')
  await page.getByRole('button', { name: 'Show details' }).click()
  await page.getByLabel('Paid from').selectOption('a')
  await expect.poll(async () => (await getState(request)).bills[0].accountId).toBe('a')

  await page.getByRole('button', { name: 'Add bill' }).click()
  await page.getByPlaceholder('Bill name (e.g. Rent, Netflix)').fill('Water')
  await page.getByPlaceholder('Amount').fill('800')
  await page.locator('#bill-acct').selectOption('a')
  await page.getByRole('button', { name: 'Save bill' }).click()
  await expect.poll(async () => (await getState(request)).bills.find((b: any) => b.name === 'Water')?.accountId).toBe('a')
})

test('deleting an expense gives the money back to its account, and Undo takes it again', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 1000), { t: 'expenses', op: 'put', row: { id: 'x1', label: 'Lunch', amount: 300, category: 'wants', date: today(), accountId: 'a' } }])
  await page.goto('/activity')
  await page.getByRole('button', { name: 'Delete' }).first().click()
  await expect.poll(async () => (await balances(request)).a).toBe(1300)
  await page.waitForTimeout(1200)
  await page.locator('.toast .undo').click()
  await expect.poll(async () => (await balances(request)).a).toBe(1000)
  expect((await getState(request)).expenses[0].accountId).toBe('a')
})

test('Activity shows which account each entry used', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 1000), { t: 'expenses', op: 'put', row: { id: 'x1', label: 'Lunch', amount: 300, category: 'wants', date: today(), accountId: 'a' } }])
  await page.goto('/activity')
  await expect(page.locator('.item').first()).toContainText('M-Pesa')
})

test('a debt payment comes out of the chosen account and cannot overdraw it', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 400), { t: 'debts', op: 'put', row: { id: 'd1', name: 'Loan', balance: 1000, minPayment: 50 } }])
  await page.goto('/debts')
  const card = page.locator('.card', { has: page.locator('#apr-d1') })
  await card.getByPlaceholder('Payment').fill('600')
  await card.getByRole('button', { name: 'Pay', exact: true }).click()
  await expect(page.locator('.toast')).toContainText('short by')
  expect((await getState(request)).debts[0].balance).toBe(1000)
  await card.getByPlaceholder('Payment').fill('150')
  await card.getByRole('button', { name: 'Pay', exact: true }).click()
  await expect.poll(async () => (await balances(request)).a).toBe(250)
  expect((await getState(request)).debts[0].balance).toBe(850)
})

test('bills set to auto-log still log when their account is short, and leave that balance alone', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 100), bill('b1', 'Rent', 2000, 'a', { auto: true })])
  await page.goto('/home')
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(1)
  expect((await balances(request)).a).toBe(100)
  await expect(page.locator('.toast')).toContainText('could not be taken from its account')
})
