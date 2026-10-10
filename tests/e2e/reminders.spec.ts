import { expect, test, type Page } from '@playwright/test'
import { reset, sync } from './helpers'

const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`
const today = () => new Date().toLocaleDateString('sv')
const marker = { 'x-requested-with': 'budgetnow', 'content-type': 'application/json' }

const endpoints: string[] = []
test.beforeEach(async ({ request }) => { await reset(request) })
test.afterEach(async ({ request }) => {
  for (const e of endpoints.splice(0)) await request.post('/api/push/unsubscribe', { headers: { ...marker, 'x-forwarded-for': ip() }, data: { endpoint: e } })
})

/**
 * The test browser has no push service, so this installs a small stand-in with the same shape: a service worker registration with a
 * push manager, a Notification permission, and a subscription that survives a reload (kept in sessionStorage).
 */
async function fakePush(page: Page, o: { permission?: 'default' | 'granted' | 'denied'; existing?: boolean; apple?: boolean; noPush?: boolean } = {}) {
  await page.addInitScript((opts) => {
    if (opts.apple) Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' })
    if (opts.noPush) { delete (window as any).PushManager; return }
    const state: any = { sub: null, perm: opts.permission ?? 'default' }
    const make = (endpoint?: string) => ({
      endpoint: endpoint ?? 'https://fcm.googleapis.com/fcm/send/e2e-' + Math.random().toString(36).slice(2),
      toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' } } },
      async unsubscribe() { state.sub = null; sessionStorage.removeItem('e2e-sub'); return true },
    })
    const saved = sessionStorage.getItem('e2e-sub')
    if (saved || opts.existing) state.sub = make(saved ?? undefined)
    if (state.sub) sessionStorage.setItem('e2e-sub', state.sub.endpoint)
    const reg = { pushManager: { getSubscription: async () => state.sub, subscribe: async () => { state.sub = make(); sessionStorage.setItem('e2e-sub', state.sub.endpoint); return state.sub } } }
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: async () => reg, ready: Promise.resolve(reg) } })
    ;(window as any).PushManager = (window as any).PushManager || function () {}
    ;(window as any).Notification = class { static get permission() { return state.perm } static async requestPermission() { state.perm = 'granted'; return 'granted' } }
    ;(window as any).__push = state
  }, o)
}
const serverPrefs = async (request: any, page: Page) => {
  const endpoint = await page.evaluate(() => (window as any).__push?.sub?.endpoint ?? sessionStorage.getItem('e2e-sub'))
  if (endpoint) endpoints.push(endpoint)
  const r = await request.get('/api/push/subscription', { params: { endpoint }, headers: { 'x-forwarded-for': ip() } })
  return { status: r.status(), json: r.status() === 200 ? await r.json() : null, endpoint }
}
const toggle = (page: Page) => page.getByRole('switch', { name: 'Remind me about bills' })

test('where reminders cannot work, the screen says why instead of offering a switch that does nothing', async ({ page }) => {
  await page.goto('/settings/reminders') // no service worker in the test server
  await expect(page.getByText("Reminders aren't ready on this device yet")).toBeVisible({ timeout: 15_000 })
  await expect(toggle(page)).toHaveCount(0)

  await fakePush(page, { apple: true })
  await page.goto('/settings/reminders')
  await expect(page.getByText('Add Weka to your Home Screen first')).toBeVisible()
  await expect(toggle(page)).toHaveCount(0)
})

test('a browser without push says so, and so does a blocked permission', async ({ page }) => {
  await fakePush(page, { noPush: true })
  await page.goto('/settings/reminders')
  await expect(page.getByText("This browser can't show reminders")).toBeVisible()

  const p2 = await page.context().newPage()
  await fakePush(p2, { permission: 'denied' })
  await p2.goto('/settings/reminders')
  await expect(p2.getByText('Notifications are blocked for Weka')).toBeVisible()
  await expect(p2.getByRole('switch')).toHaveCount(0)
})

test('turning reminders on subscribes this device and saves its choices; they can be changed, tested and turned off', async ({ page, request }) => {
  await fakePush(page)
  await page.goto('/settings/reminders')
  await expect(toggle(page)).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByLabel('Remind me', { exact: true })).toHaveCount(0) // no options until it is on

  await toggle(page).click()
  await expect(toggle(page)).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('On for this device')).toBeVisible()
  let s = await serverPrefs(request, page)
  expect(s.status).toBe(200)
  expect(s.json).toMatchObject({ daysBefore: 1, detail: 'names' })
  expect(typeof s.json.timeZone).toBe('string')

  // the preview shows what would arrive, and follows the choices
  const preview = page.getByLabel('Preview of a reminder')
  await expect(preview).toContainText('2 bills need your attention')
  await expect(preview).toContainText('Rent due today')
  await expect(preview).not.toContainText('$')
  await page.getByLabel('What the lock screen shows').selectOption('full')
  await expect(preview).toContainText('$25,000')
  await page.getByLabel('What the lock screen shows').selectOption('basic')
  await expect(preview).not.toContainText('Rent')
  await expect(preview).not.toContainText('$')
  await page.getByLabel('Remind me', { exact: true }).selectOption('0')
  await expect(preview).toContainText('A bill needs your attention') // only the one due today
  await expect.poll(async () => (await serverPrefs(request, page)).json).toMatchObject({ daysBefore: 0, detail: 'basic' })

  await page.getByRole('button', { name: 'Send a test reminder' }).click()
  await expect(page.getByText('Sent. It should arrive in a few seconds.')).toBeVisible()

  await toggle(page).click()
  await expect(toggle(page)).toHaveAttribute('aria-checked', 'false')
  // the browser has forgotten its address by now, so ask the server about the one it had
  await expect.poll(async () => (await request.get('/api/push/subscription', { params: { endpoint: s.endpoint }, headers: { 'x-forwarded-for': ip() } })).status()).toBe(404)
})

test('the choices and the on state survive a reload, and Settings summarises them', async ({ page, request }) => {
  await fakePush(page)
  await page.goto('/settings/reminders')
  await toggle(page).click()
  await page.getByLabel('Remind me', { exact: true }).selectOption('2')
  await expect.poll(async () => (await serverPrefs(request, page)).json?.daysBefore).toBe(2)
  await page.reload()
  await expect(toggle(page)).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByLabel('Remind me', { exact: true })).toHaveValue('2')
  await page.goto('/settings')
  await expect(page.getByRole('link', { name: /Bill reminders/ })).toContainText('On · 2 days before')
})

test('a device the browser remembers but the server forgot is registered again on its own', async ({ page, request }) => {
  await fakePush(page, { existing: true })
  await page.goto('/settings/reminders')
  await expect(toggle(page)).toHaveAttribute('aria-checked', 'true')
  await expect.poll(async () => (await serverPrefs(request, page)).status).toBe(200)
})

test('the Bills page suggests reminders to someone with bills, and stops once they are on or dismissed', async ({ page, request }) => {
  await sync(request, [{ t: 'bills', op: 'put', row: { id: 'b1', name: 'Rent', amount: 100, category: 'needs', every: 'month', nextDue: today(), anchorDay: new Date().getDate(), auto: false } }])
  await fakePush(page)
  await page.goto('/bills')
  const prompt = page.getByRole('link', { name: 'Turn on bill reminders' })
  await expect(prompt).toBeVisible()
  await prompt.getByRole('button', { name: 'Not now' }).click()
  await expect(prompt).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Recurring bills' })).toBeVisible()
  await expect(prompt).toHaveCount(0) // dismissed for good

  // someone who turns reminders on never sees it either
  await page.evaluate(() => localStorage.removeItem('bn:reminders:prompt-dismissed'))
  await page.goto('/settings/reminders'); await toggle(page).click(); await expect(toggle(page)).toHaveAttribute('aria-checked', 'true')
  await serverPrefs(request, page)
  await page.goto('/bills')
  await expect(page.getByRole('heading', { name: 'Recurring bills' })).toBeVisible()
  await expect(prompt).toHaveCount(0)
})

test('no suggestion where reminders cannot work, or without any bills', async ({ page, request }) => {
  await fakePush(page, { noPush: true })
  await sync(request, [{ t: 'bills', op: 'put', row: { id: 'b1', name: 'Rent', amount: 100, category: 'needs', every: 'month', nextDue: today(), anchorDay: new Date().getDate(), auto: false } }])
  await page.goto('/bills')
  await expect(page.getByRole('heading', { name: 'Recurring bills' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Turn on bill reminders' })).toHaveCount(0)

  const p2 = await page.context().newPage(); await fakePush(p2); await reset(request)
  await p2.goto('/bills')
  await expect(p2.getByRole('heading', { name: 'Recurring bills' })).toBeVisible()
  await expect(p2.getByRole('link', { name: 'Turn on bill reminders' })).toHaveCount(0)
})

test('the reminders screen fits a 360px phone', async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await fakePush(page)
  await page.goto('/settings/reminders')
  await toggle(page).click()
  await expect(page.getByRole('button', { name: 'Send a test reminder' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
  await serverPrefs(request, page)
})
