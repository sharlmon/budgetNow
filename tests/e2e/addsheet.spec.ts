import { expect, test, type Page } from '@playwright/test'
import { getState, keypad, openAdd, reset, sync } from './helpers'

const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('sv') }
const acct = (id: string, name: string, balance: number) => ({ t: 'accounts', op: 'put', row: { id, name, kind: 'mobile', balance, color: '#2fa05a' } })
const income = (id: string, amount: number, date = day(1), split?: any) => ({ t: 'incomes', op: 'put', row: { id, label: 'Salary', amount, date, split: split ?? { needs: amount * 0.5, wants: amount * 0.3, savings: amount * 0.2, debt: 0 } } })
const exp = (id: string, label: string, amount: number, date: string, o: any = {}) => ({ t: 'expenses', op: 'put', row: { id, label, amount, category: 'wants', date, ...o } })
const mode = (page: Page, name: 'Money in' | 'Expense') => page.locator('.seg2 button, .seg button').filter({ hasText: name }).first().click()
const screen = (page: Page) => page.locator('.screen')

test.beforeEach(async ({ request }) => { await reset(request) })

test('money in: a live ribbon shows how the pay will divide as you type, and your own rule before you do', async ({ page }) => {
  await page.goto('/home'); await openAdd(page)
  const legend = page.locator('.legend')
  await expect(legend).toContainText('Needs 50%'); await expect(legend).toContainText('Wants 30%'); await expect(legend).toContainText('Savings 20%') // the default rule, with no amount yet
  await keypad(page, '85000')
  await expect(legend).toContainText('Needs 42.5K'); await expect(legend).toContainText('Wants 25.5K'); await expect(legend).toContainText('Savings 17K'); await expect(legend).toContainText('Debt 0')
  await expect(page.getByRole('img', { name: /This would divide into Needs \$42,500, Wants \$25,500, Savings \$17,000, Debt \$0/ })).toBeVisible()
})

test('the live split reserves debt minimums first, like the real breakdown', async ({ page, request }) => {
  await sync(request, [{ t: 'debts', op: 'put', row: { id: 'd1', name: 'Loan', balance: 5000, minPayment: 1000 } }])
  await page.goto('/home'); await openAdd(page)
  await keypad(page, '11000')
  await expect(page.locator('.legend')).toContainText('Debt 1K')
  await expect(page.locator('.legend')).toContainText('Needs 5K') // 10,000 left x 50%
  await page.getByRole('button', { name: 'See my breakdown' }).click()
  const v = await page.locator('.panel .cat input.field').evaluateAll(els => els.map(e => Number((e as HTMLInputElement).value)))
  expect(v).toEqual([5000, 3000, 2000, 1000]) // the preview matched what the breakdown then shows
})

test('an expense shows how much of its budget is left after it, and how far over it goes', async ({ page, request }) => {
  await sync(request, [income('i1', 10000)]) // wants budget 3,000
  await page.goto('/home'); await openAdd(page); await mode(page, 'Expense')
  await page.getByRole('group', { name: 'Category' }).getByRole('button', { name: 'Wants' }).click()
  await expect(page.locator('.mtext').first()).toContainText('$3,000 left in Wants this month') // before typing
  await keypad(page, '1200')
  await expect(page.locator('.mtext').first()).toContainText('$1,800 left in Wants after this')
  await keypad(page, '0') // 12,000
  await expect(page.locator('.mtext').first()).toContainText('$9,000 over your Wants budget')
  await expect(page.locator('.meter')).toHaveClass(/over/)
})

test('with no budget for a category it says so instead of showing a meaningless meter', async ({ page }) => {
  await page.goto('/home'); await openAdd(page); await mode(page, 'Expense')
  await expect(page.locator('.mtext').first()).toContainText('No Needs budget yet')
  await expect(page.locator('.meter')).toHaveClass(/none/)
})

test('an expense dated today shows what it does to safe to spend today', async ({ page, request }) => {
  await sync(request, [income('i1', 100000, day(0))])
  await page.goto('/home'); await openAdd(page); await mode(page, 'Expense')
  await keypad(page, '500')
  await expect(page.locator('.mtext.soft')).toContainText('Safe to spend today:')
  await expect(page.locator('.mtext.soft')).toContainText('→')
  await page.locator('.datepill input').fill(day(3))
  await expect(page.locator('.mtext.soft')).toHaveCount(0) // only for something spent today
})

test('the header takes on the colour of what you are doing', async ({ page }) => {
  await page.goto('/home'); await openAdd(page)
  await expect(screen(page)).toHaveAttribute('style', /--g1: #13a186/) // money in is green
  await mode(page, 'Expense')
  await expect(screen(page)).toHaveAttribute('style', /--g1: #ea6f2b/) // Needs is the brand orange
  await page.getByRole('group', { name: 'Category' }).getByRole('button', { name: 'Wants' }).click()
  await expect(screen(page)).toHaveAttribute('style', /--g1: #cf7f00/)
  await page.getByRole('group', { name: 'Category' }).getByRole('button', { name: 'Savings' }).click()
  await expect(screen(page)).toHaveAttribute('style', /--g1: #1a9b6e/)
})

test('the 000 key makes thousands fast, and only where it makes sense', async ({ page }) => {
  await page.goto('/home'); await openAdd(page)
  const zeros = page.getByRole('button', { name: 'Add three zeros' })
  await expect(zeros).toBeDisabled() // nothing typed yet
  await keypad(page, '5')
  await zeros.click()
  await expect(page.locator('.amount')).toHaveText(/5,000/)
  await zeros.click(); await expect(page.locator('.amount')).toHaveText(/5,000,000$/)
  await zeros.click(); await expect(page.locator('.amount')).toHaveText(/5,000,000,000/) // exactly 10 digits
  await expect(zeros).toBeDisabled() // another three would pass the 10-digit limit
  await page.getByRole('button', { name: 'Delete' }).click(); await page.getByRole('button', { name: 'Delete' }).click(); await page.getByRole('button', { name: 'Delete' }).click()
  await page.locator('.keys button', { hasText: '.' }).click()
  await expect(zeros).toBeDisabled() // not after a decimal point
})

test('long amounts get a smaller type size and never wrap', async ({ page }) => {
  await page.goto('/home'); await openAdd(page)
  await keypad(page, '1234567890')
  const box = await page.locator('.amount').boundingBox()
  expect(box!.height).toBeLessThan(80) // one line
})

test.describe('quick picks', () => {
  const history = async (request: any) => sync(request, [
    acct('a', 'M-Pesa', 5000), acct('b', 'Equity', 9000), income('i1', 100000),
    exp('e1', 'Lunch', 450, day(1), { accountId: 'a' }), exp('e2', 'lunch ', 550, day(2), { accountId: 'a' }), exp('e3', 'Lunch', 500, day(3), { accountId: 'a' }),
    exp('e4', 'Supermarket', 3200, day(2), { category: 'needs', accountId: 'b' }),
  ])

  test('a new person has none, and someone with history sees their own habits with the usual amount', async ({ page, request }) => {
    await page.goto('/home'); await openAdd(page); await mode(page, 'Expense')
    await expect(page.getByRole('group', { name: 'Quick picks' })).toHaveCount(0)
    await history(request)
    await page.reload(); await openAdd(page); await mode(page, 'Expense')
    const picks = page.getByRole('group', { name: 'Quick picks' })
    await expect(picks.getByRole('button', { name: /Use Lunch, usually \$500/ })).toBeVisible() // the middle of 450, 550 and 500
    await expect(picks.getByRole('button', { name: /Use Supermarket/ })).toBeVisible()
  })

  test('tapping one fills the label, category, account and usual amount in one go', async ({ page, request }) => {
    await history(request)
    await page.goto('/home'); await openAdd(page); await mode(page, 'Expense')
    await page.getByRole('button', { name: /Use Supermarket/ }).click()
    await expect(page.getByPlaceholder('What was it for?')).toHaveValue('Supermarket')
    await expect(page.locator('.amount')).toHaveText(/3,200/)
    await expect(page.getByRole('group', { name: 'Category' }).getByRole('button', { name: 'Needs' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('group', { name: 'Account' }).getByRole('button', { name: /Equity/ })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Add Transaction', exact: true }).click()
    await expect.poll(async () => (await getState(request)).expenses.some((e: any) => e.label === 'Supermarket' && e.amount === 3200 && e.accountId === 'b' && e.category === 'needs' && e.date === day(0))).toBe(true)
  })

  test('it keeps an amount you already typed', async ({ page, request }) => {
    await history(request)
    await page.goto('/home'); await openAdd(page); await mode(page, 'Expense')
    await keypad(page, '75')
    await page.getByRole('button', { name: /Use Lunch/ }).click()
    await expect(page.locator('.amount')).toHaveText(/75/); await expect(page.locator('.amount')).not.toHaveText(/500/)
  })

  test('typing narrows them like autocomplete, and an exact match leaves nothing to suggest', async ({ page, request }) => {
    await history(request)
    await page.goto('/home'); await openAdd(page); await mode(page, 'Expense')
    const label = page.getByPlaceholder('What was it for?')
    await label.fill('lu')
    await expect(page.getByRole('button', { name: /Use Lunch/ })).toBeVisible(); await expect(page.getByRole('button', { name: /Use Supermarket/ })).toHaveCount(0)
    await label.fill('LUNCH ')
    await expect(page.getByRole('group', { name: 'Quick picks' })).toHaveCount(0)
    await label.fill('zzz')
    await expect(page.getByRole('group', { name: 'Quick picks' })).toHaveCount(0)
  })

  test('money in suggests your own past incomes, not your expenses', async ({ page, request }) => {
    await history(request)
    await page.goto('/home'); await openAdd(page)
    await expect(page.getByRole('button', { name: /Use Salary, usually \$100,000/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Use Lunch/ })).toHaveCount(0)
  })

  test('debt payments are not suggested as things to spend on', async ({ page, request }) => {
    await sync(request, [{ t: 'debts', op: 'put', row: { id: 'd1', name: 'Loan', balance: 500, minPayment: 50 } }, exp('x1', 'Payment: Loan', 100, day(1), { category: 'debt', debtId: 'd1' })])
    await page.goto('/home'); await openAdd(page); await mode(page, 'Expense')
    await expect(page.getByRole('button', { name: /Payment: Loan/ })).toHaveCount(0)
  })
})

test('the date shows Today, Yesterday or the date, and is saved with the entry', async ({ page, request }) => {
  await page.goto('/home'); await openAdd(page); await mode(page, 'Expense')
  await expect(page.locator('.datepill')).toContainText('Today')
  await page.locator('.datepill input').fill(day(1)); await expect(page.locator('.datepill')).toContainText('Yesterday')
  await page.locator('.datepill input').fill(day(5)); await expect(page.locator('.datepill')).not.toContainText(/Today|Yesterday/)
  await keypad(page, '40'); await page.getByPlaceholder('What was it for?').fill('Airtime')
  await page.getByRole('button', { name: 'Add Transaction', exact: true }).click()
  await expect.poll(async () => (await getState(request)).expenses[0]?.date).toBe(day(5))
})

test('account choices are chips with balances, and the last one used comes back next time', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 5000), acct('b', 'Equity', 9000)])
  await page.goto('/home'); await openAdd(page); await mode(page, 'Expense')
  const group = page.getByRole('group', { name: 'Account' })
  await expect(group.getByRole('button', { name: /Equity.*\$9,000/ })).toBeVisible()
  await group.getByRole('button', { name: /Equity/ }).click()
  await keypad(page, '100'); await page.getByRole('button', { name: 'Add Transaction', exact: true }).click()
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(1)
  await openAdd(page); await mode(page, 'Expense')
  await expect(page.getByRole('group', { name: 'Account' }).getByRole('button', { name: /Equity/ })).toHaveAttribute('aria-pressed', 'true')
})

test('on a small phone the main button stays in view and nothing scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await page.goto('/home'); await openAdd(page)
  await keypad(page, '12500')
  const btn = page.getByRole('button', { name: 'See my breakdown' })
  await expect(btn).toBeVisible()
  const b = await btn.boundingBox(); expect(b!.y + b!.height).toBeLessThanOrEqual(640)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})

test('the whole flow still works: money in, breakdown, confirm', async ({ page, request }) => {
  await page.goto('/home'); await openAdd(page)
  await keypad(page, '3200'); await page.getByPlaceholder('Label, e.g. October salary').fill('October salary')
  await page.getByRole('button', { name: 'See my breakdown' }).click()
  await page.getByRole('button', { name: 'Looks good, confirm' }).click()
  await expect.poll(async () => (await getState(request)).incomes[0]?.split).toEqual({ needs: 1600, wants: 960, savings: 640, debt: 0 })
})
