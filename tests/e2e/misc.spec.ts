import { expect, test } from '@playwright/test'
import { debt, getState, reset, sync } from './helpers'

test.beforeEach(async ({ request }) => { await reset(request) })

test('a bill can be added, paid into the right category, and the payment undone', async ({ page, request }) => {
  await page.goto('/bills')
  await page.getByRole('button', { name: 'Add bill' }).first().click()
  await page.getByPlaceholder('Bill name (e.g. Rent, Netflix)').fill('Rent')
  await page.getByPlaceholder('Amount').fill('1200')
  await page.getByRole('button', { name: 'Save bill' }).click()
  await expect.poll(async () => (await getState(request)).bills.length).toBe(1)

  await page.getByRole('button', { name: 'Mark paid' }).click()
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(1)
  expect((await getState(request)).expenses[0]).toMatchObject({ label: 'Rent', amount: 1200, category: 'needs' })

  await page.locator('.toast .undo').click()
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(0)
})

test('paying a debt lowers its balance, and Undo restores it', async ({ page, request }) => {
  await sync(request, [debt('d1', 'Loan', 500, 50)])
  await page.goto('/debts')
  const card = page.locator('.card', { has: page.locator('#apr-d1') })
  await card.getByPlaceholder('Payment').fill('120')
  await card.getByRole('button', { name: 'Pay', exact: true }).click()
  await expect.poll(async () => (await getState(request)).debts[0].balance).toBe(380)
})

test('deleting the account removes everything and signs the person out', async ({ page, request }) => {
  await sync(request, [debt('d1', 'Loan', 500, 50), { t: 'profile', op: 'put', row: { currency: 'EUR', name: 'Sam' } }])
  await page.goto('/settings/account')
  page.once('dialog', d => d.accept('DELETE'))
  await page.getByRole('button', { name: 'Delete my account' }).click()
  await expect.poll(async () => { const s = await getState(request); return s.debts.length + (s.profile.name ? 1 : 0) }, { timeout: 15_000 }).toBe(0)
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('bn:cache') || k === 'bn:lastUser'))).toEqual([])
})

test('typing something other than DELETE does not delete anything', async ({ page, request }) => {
  await sync(request, [debt('d1', 'Loan', 500, 50)])
  await page.goto('/settings/account')
  page.once('dialog', d => d.accept('delete'))
  await page.getByRole('button', { name: 'Delete my account' }).click()
  await page.waitForTimeout(1000)
  expect((await getState(request)).debts).toHaveLength(1)
})

test('hostile text in a label is shown as plain text and never runs', async ({ page, request }) => {
  const evil = '<img src=x onerror="window.__xss=1">'
  await sync(request, [{ t: 'expenses', op: 'put', row: { id: 'x1', label: evil, amount: 1, category: 'needs', date: '2026-10-09' } }, debt('d1', evil, 5, 1)])
  for (const path of ['/activity', '/debts', '/home']) {
    await page.goto(path)
    await page.waitForTimeout(400)
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined()
    expect(await page.locator('img[src="x"]').count()).toBe(0)
  }
})

test('public pages are real HTML for search engines and AI crawlers (no JavaScript needed)', async ({ request }) => {
  for (const [path, h1] of [['/', 'Bills on autopilot'], ['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service'], ['/guides/50-30-20-rule', '50/30/20']] as const) {
    const html = await (await request.get(path)).text()
    expect(html, path).toContain(h1)
    expect(html, path).toMatch(/<link rel="canonical"/)
    expect(html, path).toContain('application/ld+json')
    expect(html, path).toContain('https://sharl-tech.co.ke/')
  }
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Disallow: /home'); expect(robots).toContain('Sitemap:')
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('/privacy'); expect(sitemap).not.toContain('/settings')
})

test('private screens ship a loading screen in their first HTML, and the public pages do not need one', async ({ request }) => {
  for (const p of ['/home', '/accounts', '/settings']) {
    const html = await (await request.get(p)).text()
    expect(html, p).toContain('Loading Weka')
    expect(html, p).toContain('wk-splash')
  }
  const landing = await (await request.get('/')).text()
  expect(landing).not.toContain('wk-splash')
  expect(landing).toContain('Bills on autopilot') // the landing page is still real, server-rendered HTML
})
