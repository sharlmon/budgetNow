import { expect, test } from '@playwright/test'
import { getState, reset, sync } from './helpers'

const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv') }
const thisMonth = () => day(0).slice(0, 7)
const acct = (id: string, name: string) => ({ t: 'accounts', op: 'put', row: { id, name, kind: 'mobile', balance: 100000, color: '#2fa05a' } })
const exp = (id: string, label: string, amount: number, date: string, o: any = {}) => ({ t: 'expenses', op: 'put', row: { id, label, amount, category: 'wants', date, ...o } })
const inc = (id: string, label: string, amount: number, date: string, o: any = {}) => ({ t: 'incomes', op: 'put', row: { id, label, amount, date, split: { needs: amount / 2, wants: amount * 0.3, savings: amount * 0.2, debt: 0 }, ...o } })
const rows = (page: any) => page.locator('.item')

test.beforeEach(async ({ request }) => { await reset(request) })

async function seed(request: any) {
  const d0 = day(0)
  await sync(request, [
    acct('a', 'M-Pesa'), acct('b', 'Equity'),
    inc('i1', 'Salary', 85000, `${thisMonth()}-01`, { accountId: 'b' }),
    exp('e1', 'Rent', 25000, `${thisMonth()}-02`, { category: 'needs', accountId: 'b' }),
    exp('e2', 'Lunch with Sam', 450, d0, { accountId: 'a' }),
    exp('e3', 'Supermarket', 3240, d0, { category: 'needs' }),
    exp('e4', 'Old rent', 25000, '2026-01-15', { category: 'needs', accountId: 'b' }),
  ])
}

test('opens on this month with its money in, spent and net, and only this month\'s entries', async ({ page, request }) => {
  await seed(request)
  await page.goto('/activity')
  const tiles = page.locator('.tiles')
  await expect(tiles).toContainText('$85,000')   // money in
  await expect(tiles).toContainText('$28,690')   // spent: 25,000 + 450 + 3,240
  await expect(tiles).toContainText('+$56,310')  // net
  await expect(rows(page)).toHaveCount(4)         // salary, rent, lunch, supermarket (not the January entry)
  await expect(page.getByText('Old rent')).toHaveCount(0)
})

test('the month can be stepped back and forward, but not past this month, and All time shows everything', async ({ page, request }) => {
  await seed(request)
  await page.goto('/activity')
  await expect(page.getByRole('button', { name: 'Next month' })).toBeDisabled()
  await page.getByRole('button', { name: 'Previous month' }).click()
  await expect(page.getByText('Nothing in', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Show all time' }).first().click()
  await expect(rows(page)).toHaveCount(5)
  await expect(page.getByText('All time', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Back to months' }).click()
  await expect(rows(page)).toHaveCount(4)
})

test('search finds by name, category, account and amount, needing every word', async ({ page, request }) => {
  await seed(request)
  await page.goto('/activity')
  const search = page.getByLabel('Search activity')
  await search.fill('lunch'); await expect(rows(page)).toHaveCount(1)
  await search.fill('needs'); await expect(rows(page)).toHaveCount(2)        // rent + supermarket
  await search.fill('equity'); await expect(rows(page)).toHaveCount(2)       // salary + rent, by account
  await search.fill('25,000'); await expect(rows(page)).toHaveCount(1)       // a typed comma still matches
  await search.fill('rent equity'); await expect(rows(page)).toHaveCount(1)
  await search.fill('rent lunch'); await expect(page.getByRole('heading', { name: 'Nothing matches' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).first().click()
  await expect(rows(page)).toHaveCount(4)
  await expect(search).toHaveValue('')
})

test('the kind, category and account filters combine, say how many are on, and clear together', async ({ page, request }) => {
  await seed(request)
  await page.goto('/activity')
  await page.getByRole('tab', { name: 'Expenses' }).click()
  await expect(rows(page)).toHaveCount(3)
  await page.getByRole('group', { name: 'Filter by category or account' }).getByRole('button', { name: 'Needs' }).click()
  await expect(rows(page)).toHaveCount(2)
  await page.getByRole('group', { name: 'Filter by category or account' }).getByRole('button', { name: 'Equity' }).click()
  await expect(rows(page)).toHaveCount(1)
  await expect(page.getByRole('status').filter({ hasText: '3 filters' })).toBeVisible()
  await page.getByRole('group', { name: 'Filter by category or account' }).getByRole('button', { name: 'No account' }).click()
  await expect(rows(page)).toHaveCount(1) // the supermarket entry used no account
  await expect(rows(page).first()).toContainText('Supermarket')
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(rows(page)).toHaveCount(4)
  await expect(page.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
})

test('a bar picks one day, and tapping it again lets go', async ({ page, request }) => {
  await seed(request)
  await page.goto('/activity')
  const bar = page.getByRole('button', { name: new RegExp(`spent \\$3,690`) }) // today: 450 + 3,240
  await bar.click()
  await expect(rows(page)).toHaveCount(2)
  await expect(page.getByRole('status')).toContainText('1 filter')
  await bar.click()
  await expect(rows(page)).toHaveCount(4)
})

test('each day shows its own net, and the headers stay in view while scrolling', async ({ page, request }) => {
  await seed(request)
  await page.goto('/activity')
  const first = page.locator('.dayhead').first()
  await expect(first).toContainText('−$3,690') // today: spent 450 + 3,240
  await expect(page.locator('.dayhead').last()).toContainText('+$85,000') // the 1st: salary
  const many = Array.from({ length: 30 }, (_, i) => exp('m' + i, 'Item ' + i, 10 + i, day(0)))
  await sync(request, many)
  await page.reload()
  await expect(first).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 700))
  await page.waitForTimeout(300)
  const top = await first.evaluate(el => Math.round(el.getBoundingClientRect().top))
  expect(top).toBeLessThanOrEqual(2); expect(top).toBeGreaterThanOrEqual(0) // pinned to the top of the screen
})

test('a long history shows a page at a time', async ({ page, request }) => {
  await sync(request, Array.from({ length: 95 }, (_, i) => exp('x' + i, 'Entry ' + i, 5 + i, `${thisMonth()}-${String(1 + (i % 9)).padStart(2, '0')}`)))
  await page.goto('/activity')
  await expect(rows(page)).toHaveCount(40)
  await page.getByRole('button', { name: /Show more · 55 left/ }).click()
  await expect(rows(page)).toHaveCount(80)
  await page.getByRole('button', { name: /Show more · 15 left/ }).click()
  await expect(rows(page)).toHaveCount(95)
  await expect(page.getByRole('button', { name: /Show more/ })).toHaveCount(0)
})

test('with no entries at all it invites the first one, and with no accounts there are no account chips', async ({ page }) => {
  await page.goto('/activity')
  await expect(page.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'No account' })).toHaveCount(0)
})

test('an entry opened from a filtered list can still be edited, and the list follows', async ({ page, request }) => {
  await seed(request)
  await page.goto('/activity')
  await page.getByLabel('Search activity').fill('lunch')
  await page.getByRole('button', { name: 'Edit Lunch with Sam' }).click()
  await page.getByRole('dialog', { name: 'Edit expense' }).getByLabel('What was it for?').fill('Dinner with Sam')
  await page.getByRole('dialog', { name: 'Edit expense' }).getByRole('button', { name: 'Save changes' }).click()
  await expect(rows(page)).toHaveCount(0) // no longer matches "lunch"
  await expect.poll(async () => (await getState(request)).expenses.some((e: any) => e.label === 'Dinner with Sam')).toBe(true)
})

test('the activity screen fits a 360px phone with many accounts', async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await seed(request)
  await sync(request, [acct('c', 'Savannah Bank savings account'), acct('d', 'PayPal'), acct('e', 'Cash')])
  await page.goto('/activity')
  await expect(page.locator('.tiles')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})
