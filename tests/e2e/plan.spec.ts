import { expect, test } from '@playwright/test'
import { getState, reset, sync } from './helpers'

const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv') }
const acct = (id: string, name: string, balance: number, kind = 'mobile') => ({ t: 'accounts', op: 'put', row: { id, name, kind, balance, color: '#2fa05a' } })
const bill = (id: string, name: string, amount: number, inDays: number, extra: any = {}) => ({ t: 'bills', op: 'put', row: { id, name, amount, category: 'needs', every: 'month', nextDue: day(inDays), anchorDay: Number(day(inDays).slice(8)), auto: false, ...extra } })
const hero = (page: any) => page.getByRole('region', { name: /covered|short|tight|nothing due|add an account/i })

test.beforeEach(async ({ request }) => { await reset(request) })

test('covered: says so, what is left, and what each bill leaves behind', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 10000), bill('b1', 'Rent', 3000, 2), bill('b2', 'Internet', 1000, 8)])
  await page.goto('/plan')
  await expect(page.getByRole('heading', { name: "You're covered" })).toBeVisible()
  await expect(page.getByText("You'll have $6,000 left after $4,000 of bills.")).toBeVisible()
  const stats = page.locator('.stats')
  await expect(stats).toContainText('$10,000'); await expect(stats).toContainText('$4,000'); await expect(stats).toContainText('$6,000')
  await expect(page.locator('.aft', { hasText: '$7,000 left after' })).toBeVisible() // after Rent
  await expect(page.locator('.aft', { hasText: '$6,000 left after' })).toBeVisible() // after Internet
})

test('short: names the first bill the money does not cover and how far below zero it goes', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 1000), bill('b1', 'Rent', 800, 3), bill('b2', 'Electricity', 500, 6)])
  await page.goto('/plan')
  await expect(page.getByRole('heading', { name: 'Short by $300' })).toBeVisible()
  await expect(page.getByText(/Electricity on .* is the first bill your accounts will not cover/)).toBeVisible()
  await expect(page.getByText('Your accounts will not cover this')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Add money' })).toBeVisible()
  await page.getByRole('button', { name: 'Add money' }).click()
  await expect(page.getByRole('button', { name: 'See my breakdown' })).toBeVisible()
})

test('short offers Move money only when there is a second account to move from', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 100), bill('b1', 'Rent', 800, 3)])
  await page.goto('/plan')
  await expect(page.getByRole('button', { name: 'Move money' })).toHaveCount(0)
  await sync(request, [acct('b', 'Bank', 5000, 'bank')])
  await page.reload()
  await expect(page.getByRole('heading', { name: "You're covered" })).toBeVisible() // the second account's money counts too
})

test('tight: covered, but the lowest point is close to zero', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 10000), bill('b1', 'Rent', 9200, 3)])
  await page.goto('/plan')
  await expect(page.getByRole('heading', { name: 'Covered, but tight' })).toBeVisible()
  await expect(page.getByText(/Your lowest point is \$800 on/)).toBeVisible()
})

test('investments never count towards paying bills', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 100), acct('f', 'Fund', 500000, 'invest'), bill('b1', 'Rent', 800, 3)])
  await page.goto('/plan')
  await expect(page.getByRole('heading', { name: /Short by/ })).toBeVisible()
  await expect(page.locator('.stats')).toContainText('$100')
})

test('with no account to check against, it still lists the bills and points to Accounts', async ({ page, request }) => {
  await sync(request, [bill('b1', 'Rent', 800, 3)])
  await page.goto('/plan')
  await expect(page.getByRole('heading', { name: 'Add an account to check' })).toBeVisible()
  await expect(page.getByText('Rent', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Add your accounts' }).click()
  await expect(page).toHaveURL(/\/accounts$/)
})

test('nothing due: says so and offers to add a bill', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 100)])
  await page.goto('/plan')
  await expect(page.getByRole('heading', { name: 'Nothing due' })).toBeVisible()
  await page.getByRole('link', { name: 'Add a bill' }).click()
  await expect(page).toHaveURL(/\/bills\?add=1$/)
})

test('the window changes what is counted', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 10000), bill('b1', 'Soon', 100, 5), bill('b2', 'Later', 200, 20), bill('b3', 'Far', 400, 45)])
  await page.goto('/plan')
  await expect(page.getByText('Next 30 days')).toBeVisible()
  await expect(page.locator('.stats')).toContainText('$300')
  await page.getByRole('button', { name: '14', exact: true }).click()
  await expect(page.getByText('Next 14 days')).toBeVisible(); await expect(page.locator('.stats')).toContainText('$100')
  await page.getByRole('button', { name: '60', exact: true }).click()
  await expect(page.locator('.stats')).toContainText('$1,000') // monthly bills fall due twice: 2 x 100 + 2 x 200 + 400
})

test('a late bill is grouped as Late, can be paid from here, and the runway updates', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 1000), bill('b1', 'Rent', 600, -2, { every: 'year' }), bill('b2', 'Internet', 500, 4)]) // yearly, so it does not fall due a second time in the window
  await page.goto('/plan')
  await expect(page.getByRole('heading', { name: 'Short by $100' })).toBeVisible() // 600 + 500 is more than 1,000
  await expect(page.getByText('Late', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Pay', exact: true }).first().click() // the late bill comes first
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(1)
  expect((await getState(request)).expenses[0]).toMatchObject({ label: 'Rent', amount: 600 })
  await expect(page.getByRole('heading', { name: /covered/i })).toBeVisible() // only Internet is left to cover
  await expect(page.getByText('Late', { exact: true })).toHaveCount(0)
})

test('paying a bill from an account moves that account\'s money, and the runway follows', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 1000), bill('b1', 'Rent', 600, 2, { accountId: 'a' })])
  await page.goto('/plan')
  await expect(page.locator('.stats')).toContainText('$1,000')
  await page.getByRole('button', { name: 'Pay', exact: true }).click()
  await expect.poll(async () => (await getState(request)).accounts[0].balance).toBe(400)
  await expect(page.locator('.stats')).toContainText('$400')
})

test('a repeating bill shows each time it falls due, but only the next one can be paid', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 10000), bill('w', 'Gym', 100, 2, { every: 'week' })])
  await page.goto('/plan')
  await expect(page.getByText('Gym', { exact: true })).toHaveCount(5) // this week and the next four
  await expect(page.getByRole('button', { name: 'Pay', exact: true })).toHaveCount(1)
})

test('goal deadlines in the window are listed without taking money', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 10000), { t: 'goals', op: 'put', row: { id: 'g1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#64748b', deadline: day(10), contributions: [{ id: 'c1', amount: 400, date: day(-1) }] } }])
  await page.goto('/plan')
  await expect(page.getByText('Laptop', { exact: true })).toBeVisible()
  await expect(page.getByText('Goal deadline · $600 to go')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nothing due' })).toBeVisible() // a goal date is not a bill
})

test('the tab bar, the overview switch and the manage tiles all connect', async ({ page, request }) => {
  await sync(request, [acct('a', 'M-Pesa', 1000), bill('b1', 'Rent', 100, 2), { t: 'goals', op: 'put', row: { id: 'g1', name: 'Laptop', target: 1000, icon: 'laptop', color: '#64748b', contributions: [{ id: 'c1', amount: 250, date: day(-1) }] } }, { t: 'debts', op: 'put', row: { id: 'd1', name: 'Loan', balance: 900, minPayment: 50 } }])
  await page.goto('/home')
  await page.getByRole('link', { name: 'Plan', exact: true }).click()
  await expect(page).toHaveURL(/\/plan$/)
  await expect(page.getByRole('link', { name: 'Bills', exact: false }).filter({ hasText: '1 · about' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Goals/ }).filter({ hasText: '25% saved' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Debts/ }).filter({ hasText: '$900 owed' })).toBeVisible()
  await page.getByRole('link', { name: /Goals/ }).filter({ hasText: '25% saved' }).click()
  await expect(page).toHaveURL(/\/goals$/)
  await page.getByRole('tab', { name: 'Overview' }).click()
  await expect(page).toHaveURL(/\/plan$/)
})

test('the plan fits a 360px phone', async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await sync(request, [acct('a', 'M-Pesa', 1000), bill('b1', 'A rather long bill name to test wrapping on a narrow screen', 800, 3), bill('b2', 'Electricity', 500, 6)])
  await page.goto('/plan')
  await expect(page.getByRole('heading', { name: /Short by/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
})
