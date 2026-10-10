import { expect, test } from '@playwright/test'
import { reset, sync } from './helpers'

/** YYYY-MM for `back` months ago (0 is this month). */
const month = (back: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - back); return d.toLocaleDateString('sv').slice(0, 7) }
const acct = (id: string, name: string, color = '#2fa05a') => ({ t: 'accounts', op: 'put', row: { id, name, kind: 'mobile', balance: 100000, color } })
const inc = (id: string, label: string, amount: number, m: string, split?: any) => ({ t: 'incomes', op: 'put', row: { id, label, amount, date: `${m}-05`, split: split ?? { needs: amount * 0.5, wants: amount * 0.3, savings: amount * 0.2, debt: 0 } } })
const exp = (id: string, label: string, amount: number, m: string, o: any = {}) => ({ t: 'expenses', op: 'put', row: { id, label, amount, category: 'wants', date: `${m}-10`, ...o } })
const goBack = async (page: any, n = 1) => { for (let i = 0; i < n; i++) await page.getByRole('button', { name: 'Previous month' }).click() }

test.beforeEach(async ({ request }) => { await reset(request) })

test('a finished month over budget says so plainly, with how far over', async ({ page, request }) => {
  const m = month(1)
  await sync(request, [inc('i1', 'Salary', 1000, m), exp('e1', 'Rent', 500, m, { category: 'needs' }), exp('e2', 'Fun', 400, m)]) // budget = 1000 - 200 saved = 800; spent 900
  await page.goto('/analytics'); await goBack(page)
  await expect(page.locator('#pace-h')).toHaveText('Over budget')
  await expect(page.getByText('You spent $900 of your $800 budget.')).toBeVisible()
  const mini = page.locator('.mini')
  await expect(mini).toContainText('Over by'); await expect(mini).toContainText('$100')
})

test('a finished month under budget says how much is left', async ({ page, request }) => {
  const m = month(1)
  await sync(request, [inc('i1', 'Salary', 1000, m), exp('e1', 'Rent', 400, m, { category: 'needs' })])
  await page.goto('/analytics'); await goBack(page)
  await expect(page.locator('#pace-h')).toHaveText('Under budget')
  await expect(page.locator('.mini')).toContainText('Left'); await expect(page.locator('.mini')).toContainText('$400')
})

test('Where it went shows each category with its share and how it changed from the month before', async ({ page, request }) => {
  const m = month(1), before = month(2)
  await sync(request, [
    inc('i1', 'Salary', 1000, m),
    exp('e1', 'Rent', 300, m, { category: 'needs' }), exp('e2', 'Fun', 100, m),
    exp('p1', 'Rent', 200, before, { category: 'needs' }), // needs: 200 -> 300 = up 50%; wants: nothing before = new
  ])
  await page.goto('/analytics'); await goBack(page)
  const needs = page.locator('.cats li', { hasText: 'Needs' })
  await expect(needs).toContainText('75% of spending'); await expect(needs).toContainText('$300'); await expect(needs).toContainText('▲ 50%')
  const wants = page.locator('.cats li', { hasText: 'Wants' })
  await expect(wants).toContainText('25% of spending'); await expect(wants).toContainText('New')
  await expect(page.locator('.cats li', { hasText: 'Savings' })).not.toContainText('▲')
})

test('Biggest spends adds up entries with the same name, however they are written', async ({ page, request }) => {
  const m = month(1)
  await sync(request, [inc('i1', 'Salary', 5000, m), exp('a', 'Lunch', 300, m), exp('b', ' lunch ', 200, m), exp('c', 'Rent', 1000, m, { category: 'needs' }), exp('d', 'Tea', 50, m)])
  await page.goto('/analytics'); await goBack(page)
  const rank = page.locator('.rank').first()
  await expect(rank.locator('li').first()).toContainText('Rent')
  await expect(rank.locator('li', { hasText: 'Lunch' })).toContainText('2 entries'); await expect(rank.locator('li', { hasText: 'Lunch' })).toContainText('$500')
})

test('spending by account appears only when accounts were used', async ({ page, request }) => {
  const m = month(1)
  await sync(request, [inc('i1', 'Salary', 5000, m), exp('a', 'Lunch', 300, m)])
  await page.goto('/analytics'); await goBack(page)
  await expect(page.getByRole('heading', { name: 'Where it left from' })).toHaveCount(0)
  await sync(request, [acct('m', 'M-Pesa'), acct('b', 'Equity', '#3b6fe0'), exp('b1', 'Fuel', 600, m, { accountId: 'm' }), exp('b2', 'Fees', 100, m, { accountId: 'b' })])
  await page.reload(); await goBack(page)
  const sec = page.locator('.card', { has: page.getByText('M-Pesa') })
  await expect(page.getByRole('heading', { name: 'Where it left from' })).toBeVisible()
  await expect(sec).toContainText('M-Pesa'); await expect(sec).toContainText('$600'); await expect(sec).toContainText('No account')
})

test('Worth knowing points out an over-budget category and what changed', async ({ page, request }) => {
  const m = month(1), before = month(2)
  await sync(request, [inc('i1', 'Salary', 1000, m, { needs: 500, wants: 100, savings: 200, debt: 200 }), exp('e1', 'Fun', 300, m), exp('p1', 'Fun', 100, before)]) // wants budget 100, spent 300
  await page.goto('/analytics'); await goBack(page)
  const notes = page.locator('.notes')
  await expect(notes).toContainText('Wants is over budget'); await expect(notes).toContainText('$200 past what you planned')
  await expect(notes).toContainText('Wants is up 200%')
  expect(await page.locator('.note').count()).toBeLessThanOrEqual(4)
})

test('this month shows the pace card with a chart and what was spent so far', async ({ page, request }) => {
  const m = month(0)
  await sync(request, [inc('i1', 'Salary', 100000, m), { t: 'expenses', op: 'put', row: { id: 'e1', label: 'Lunch', amount: 500, category: 'wants', date: new Date().toLocaleDateString('sv') } }])
  await page.goto('/analytics')
  await expect(page.getByText('This month so far')).toBeVisible()
  await expect(page.locator('.mini')).toContainText('$500')
  await expect(page.getByRole('img', { name: /Spending adding up through the month/ })).toBeVisible()
  await expect(page.locator('#pace-h')).toHaveText(/Early days|Under budget|On track|Over budget|Heading over budget/)
})

test('a month with nothing spent says so, and the next-month button stops at this month', async ({ page, request }) => {
  await sync(request, [inc('i1', 'Salary', 1000, month(0))])
  await page.goto('/analytics')
  await expect(page.getByRole('heading', { name: /Nothing spent in/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next month' })).toBeDisabled()
  await expect(page.getByRole('heading', { name: 'Where it went' })).toHaveCount(0)
})

test('with no income there is no budget to compare with, and it asks for the money in', async ({ page, request }) => {
  await sync(request, [exp('e1', 'Lunch', 50, month(1))])
  await page.goto('/analytics'); await goBack(page)
  await expect(page.locator('#pace-h')).toHaveText('No budget yet')
  await expect(page.locator('.notes')).toContainText('No money in this month')
})

test('the Income tab shows how pay was divided and where it came from', async ({ page, request }) => {
  const m = month(1)
  await sync(request, [inc('i1', 'Salary', 1000, m), inc('i2', 'Side job', 200, m)])
  await page.goto('/analytics'); await goBack(page)
  await page.getByRole('tab', { name: 'Income' }).click()
  await expect(page.locator('.cats li', { hasText: 'Needs' })).toContainText('$600') // 50% of 1,200
  await expect(page.locator('.cats li', { hasText: 'Needs' })).toContainText('50% of what came in')
  await expect(page.locator('.rank li', { hasText: 'Salary' })).toContainText('$1,000')
  await expect(page.locator('.chip')).toContainText('20%')
})

test('analytics fits a 360px phone with long names', async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  const m = month(1)
  await sync(request, [acct('m', 'A very long account name for an M-Pesa wallet'), inc('i1', 'A really long income description that goes on', 1234567, m), exp('e1', 'A very long expense description to test how this wraps on a small screen', 98765, m, { accountId: 'm' })])
  await page.goto('/analytics'); await goBack(page)
  await expect(page.locator('#pace-h')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})
