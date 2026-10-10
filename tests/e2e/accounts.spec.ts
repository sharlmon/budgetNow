import { expect, test } from '@playwright/test'
import { getState, reset, sync } from './helpers'

const acct = (id: string, name: string, kind: string, balance: number, color = '#2fa05a', rate?: number) =>
  ({ t: 'accounts', op: 'put', row: { id, name, kind, balance, color, ...(rate ? { rate } : {}) } })
const dialog = (page: any, name: RegExp | string) => page.getByRole('dialog', { name })

test.beforeEach(async ({ request }) => { await reset(request) })

test('with no accounts, the page invites you to add one, and a preset starts the form', async ({ page, request }) => {
  await page.goto('/accounts')
  await expect(page.getByRole('heading', { name: 'Where is your money?' })).toBeVisible()
  await page.getByRole('button', { name: 'M-Pesa', exact: true }).click()
  const sheet = dialog(page, 'Add an account')
  await expect(sheet.getByLabel('Name')).toHaveValue('M-Pesa')
  await sheet.getByLabel('Balance now').fill('5000')
  await sheet.getByRole('button', { name: 'Add account' }).click()
  await expect(page.getByRole('status')).toContainText('M-Pesa added')
  await expect(page.locator('.list')).toContainText('M-Pesa')
  await expect(page.locator('.front .amt')).toContainText('5,000')
  await expect.poll(async () => (await getState(request)).accounts.length).toBe(1)
  expect((await getState(request)).accounts[0]).toMatchObject({ name: 'M-Pesa', kind: 'mobile', balance: 5000, rev: 1 })
})

test('the total, and a tab on the stack, show the right balances', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 'mobile', 8000), acct('b', 'Equity', 'bank', 20000, '#3b6fe0')])
  await page.goto('/accounts')
  await expect(page.locator('.front .amt')).toContainText('28,000')
  // Tabs sit under the card; a thumb taps the visible strip along the top edge.
  await page.getByRole('button', { name: 'Show Equity', exact: true }).click({ position: { x: 120, y: 10 } })
  await expect(page.locator('.front .amt')).toContainText('20,000')
  await expect(page.locator('.front .lbl')).toContainText('Equity')
  await page.getByRole('button', { name: 'Show total' }).click()
  await expect(page.locator('.front .amt')).toContainText('28,000')
})

test('moving money updates both balances, counts the fee, can be undone, and saves', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 'mobile', 8000), acct('b', 'Equity', 'bank', 20000, '#3b6fe0')])
  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Move money' }).click()
  const sheet = dialog(page, 'Move money between accounts')
  await sheet.getByRole('group', { name: 'From' }).getByRole('button', { name: /Equity/ }).click()
  await sheet.getByRole('group', { name: 'To' }).getByRole('button', { name: /M-Pesa/ }).click()
  await sheet.getByLabel('Amount').fill('3000')
  await sheet.getByLabel('Fee (optional)').fill('25')
  await expect(sheet).toContainText('16,975') // Equity after: 20,000 - 3,000 - 25
  await expect(sheet).toContainText('11,000') // M-Pesa after
  await sheet.getByRole('button', { name: 'Record move' }).click()
  await expect(page.getByRole('status')).toContainText('Moved')
  await expect(page.locator('.list')).toContainText('16,975')
  await expect(page.locator('.list')).toContainText('11,000')
  await expect.poll(async () => (await getState(request)).accounts.map((a: any) => a.balance).sort()).toEqual([11000, 16975])

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator('.list')).toContainText('20,000')
  await expect.poll(async () => (await getState(request)).accounts.map((a: any) => a.balance).sort((x: number, y: number) => x - y)).toEqual([8000, 20000])
})

test('a move that the balance cannot cover is refused with the exact shortfall', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 'mobile', 1000), acct('b', 'Equity', 'bank', 20000, '#3b6fe0')])
  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Move money' }).click()
  const sheet = dialog(page, 'Move money between accounts')
  await sheet.getByRole('group', { name: 'From' }).getByRole('button', { name: /M-Pesa/ }).click()
  await sheet.getByRole('group', { name: 'To' }).getByRole('button', { name: /Equity/ }).click()
  await sheet.getByLabel('Amount').fill('1500')
  await expect(sheet.getByRole('alert')).toContainText('500 short')
  await expect(sheet.getByRole('button', { name: 'Record move' })).toBeDisabled()
  await sheet.getByRole('button', { name: 'All' }).click()
  await expect(sheet.getByLabel('Amount')).toHaveValue('1000')
  await expect(sheet.getByRole('button', { name: 'Record move' })).toBeEnabled()
})

test('with one account, moving money is disabled and says why', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 'mobile', 1000)])
  await page.goto('/accounts')
  await expect(page.getByRole('button', { name: 'Move money' })).toBeDisabled()
  await expect(page.getByText('Add a second account to move money between them.')).toBeVisible()
})

test('hiding amounts masks every balance and is remembered after a reload', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 'mobile', 8000)])
  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Hide amounts' }).click()
  await expect(page.locator('.front .amt')).toHaveText('••••••')
  await expect(page.locator('.list')).not.toContainText('8,000')
  await page.reload()
  await expect(page.locator('.front .amt')).toHaveText('••••••')
  await page.getByRole('button', { name: 'Show amounts' }).click()
  await expect(page.locator('.front .amt')).toContainText('8,000')
})

test('an investment shows expected earnings and a growth preview that follows the sliders', async ({ page, request }) => {
  await sync(request, [acct('f', 'Money market fund', 'invest', 100000, '#e6a321', 12)])
  await page.goto('/accounts')
  await expect(page.locator('.tint')).toContainText('12,000') // 12% of 100,000
  await page.locator('.list .item').first().click()
  const sheet = dialog(page, /Edit Money market fund/)
  await expect(sheet.getByLabel('Growth preview')).toBeVisible()
  await expect(sheet.getByLabel('Growth preview')).toContainText('60,000') // 5,000 x 12 months put in
  await sheet.getByRole('button', { name: '24 months' }).click()
  await expect(sheet.getByLabel('Growth preview')).toContainText('120,000')
  await expect(sheet.getByLabel('Growth preview')).toContainText('not a promise')
})

test('editing a balance saves; deleting asks nothing but can be undone', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 'mobile', 8000)])
  await page.goto('/accounts')
  await page.locator('.list .item').first().click()
  const sheet = dialog(page, /Edit M-Pesa/)
  await sheet.getByLabel('Balance now').fill('9250.5')
  await sheet.getByRole('button', { name: 'Save changes' }).click()
  await expect.poll(async () => (await getState(request)).accounts[0]?.balance).toBe(9250.5)
  expect((await getState(request)).accounts[0].rev).toBe(2)

  await page.locator('.list .item').first().click()
  await dialog(page, /Edit M-Pesa/).getByRole('button', { name: 'Delete this account' }).click()
  await expect.poll(async () => (await getState(request)).accounts.length).toBe(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect.poll(async () => (await getState(request)).accounts.length).toBe(1)
  expect((await getState(request)).accounts[0]).toMatchObject({ name: 'M-Pesa', balance: 9250.5 })
})

test('two accounts cannot share a name', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 'mobile', 8000)])
  await page.goto('/accounts')
  await page.getByRole('button', { name: 'Add account' }).click()
  const sheet = dialog(page, 'Add an account')
  await sheet.getByLabel('Name').fill('m-pesa')
  await expect(sheet.getByRole('alert')).toContainText('already have an account')
  await expect(sheet.getByRole('button', { name: 'Add account' })).toBeDisabled()
})

test('home shows the accounts card, and it opens the Accounts page', async ({ page, request }) => {
  await page.goto('/home')
  await page.getByRole('button', { name: 'Hide the setup guide' }).click() // the guide asks the same thing; with it hidden the prompt shows
  await expect(page.getByText('Where is your money?')).toBeVisible()
  await sync(request, [acct('a', 'M-Pesa', 'mobile', 8000), acct('b', 'Equity', 'bank', 20000, '#3b6fe0')])
  await page.reload()
  await expect(page.getByRole('region', { name: 'Accounts' })).toContainText('28,000')
  await page.getByRole('navigation', { name: 'Quick actions' }).getByRole('link', { name: 'Accounts' }).click()
  await expect(page).toHaveURL(/\/accounts$/)
})

test('the page never scrolls sideways on a small phone, even with long names and many accounts', async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await sync(request, [
    acct('a', 'M-Pesa', 'mobile', 8000), acct('b', 'Equity Bank savings account with a really long name', 'bank', 20000, '#3b6fe0'),
    acct('c', 'PayPal', 'paypal', 5000, '#1f3a8a'), acct('d', 'Cash', 'cash', 900, '#a67c2e'), acct('e', 'Fund', 'invest', 85000, '#e6a321', 14.1), acct('f', 'SACCO', 'invest', 12000, '#e6a321'),
  ])
  await page.goto('/accounts')
  await expect(page.locator('.front .amt')).toContainText('130,900')
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
  await page.getByRole('button', { name: 'Move money' }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})

test.describe('home layout', () => {
  /** Vertical position of each landmark, measured from the top of the page. */
  const tops = async (page: any, finders: any[]) => Promise.all(finders.map(async (f: any) => { const box = await f.boundingBox(); return box ? Math.round(box.y + await page.evaluate(() => scrollY)) : -1 }))

  test('accounts come first, then the quick actions, bills, safe to spend and the budget', async ({ page, request }) => {
    const d = new Date(); d.setDate(d.getDate() - 1)
    await sync(request, [
      acct('a', 'M-Pesa', 'mobile', 8000), acct('b', 'Equity', 'bank', 20000, '#3b6fe0'),
      { t: 'incomes', op: 'put', row: { id: 'i1', label: 'Salary', amount: 50000, date: new Date().toLocaleDateString('sv'), split: { needs: 25000, wants: 15000, savings: 10000, debt: 0 } } },
      { t: 'bills', op: 'put', row: { id: 'b1', name: 'Rent', amount: 10000, category: 'needs', every: 'month', nextDue: d.toLocaleDateString('sv'), anchorDay: d.getDate(), auto: false } },
    ])
    await page.goto('/home')
    await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible() // an overdue bill changes the heading
    const ys = await tops(page, [
      page.getByRole('region', { name: 'Accounts' }), page.getByRole('navigation', { name: 'Quick actions' }), page.getByRole('heading', { name: 'Needs attention' }),
      page.getByText('Safe to spend today'), page.getByRole('heading', { name: 'Monthly budget' }), page.getByRole('heading', { name: 'Savings goals' }), page.getByRole('heading', { name: 'Recent transactions' }),
    ])
    expect(ys.every((v: number) => v >= 0), JSON.stringify(ys)).toBe(true)
    expect([...ys].sort((p: number, q: number) => p - q), 'sections appear in this order').toEqual(ys)
  })

  test('the budget balance moved into the monthly budget card, and the old wallet card is gone', async ({ page, request }) => {
    await sync(request, [{ t: 'incomes', op: 'put', row: { id: 'i1', label: 'Salary', amount: 50000, date: new Date().toLocaleDateString('sv'), split: { needs: 25000, wants: 15000, savings: 10000, debt: 0 } } }])
    await page.goto('/home')
    await expect(page.locator('.budgetbal')).toContainText('50,000')
    await expect(page.getByText('Total Balance')).toHaveCount(0)
    await expect(page.getByText('Latest income')).toHaveCount(0)
  })

  test('the bill count shows on Pay bill, and Move is disabled until there are two accounts', async ({ page, request }) => {
    await sync(request, [
      acct('a', 'M-Pesa', 'mobile', 8000),
      { t: 'bills', op: 'put', row: { id: 'b1', name: 'Rent', amount: 100, category: 'needs', every: 'month', nextDue: new Date().toLocaleDateString('sv'), anchorDay: new Date().getDate(), auto: false } },
    ])
    await page.goto('/home')
    const actions = page.getByRole('navigation', { name: 'Quick actions' })
    await expect(actions.getByLabel('1 bill due')).toBeVisible()
    await expect(actions.getByRole('button', { name: 'Move' })).toBeDisabled()
    await sync(request, [acct('b', 'Equity', 'bank', 20000, '#3b6fe0')])
    await page.reload()
    await expect(actions.getByRole('button', { name: 'Move' })).toBeEnabled()
    await actions.getByRole('button', { name: 'Move' }).click()
    await expect(page.getByRole('dialog', { name: 'Move money between accounts' })).toBeVisible()
  })

  test('Add money opens the add sheet', async ({ page }) => {
    await page.goto('/home')
    const actions = page.getByRole('navigation', { name: 'Quick actions' })
    await actions.getByRole('button', { name: 'Add money' }).click()
    await expect(page.getByRole('button', { name: 'See my breakdown' })).toBeVisible()
  })
})
