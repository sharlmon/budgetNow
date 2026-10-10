import { expect, test } from '@playwright/test'
import { reset, sync } from './helpers'

test.beforeEach(async ({ request }) => { await reset(request) })

const menu = (page: any) => page.locator('.group')

test('Settings is a short menu: a profile card, three groups, each row with a one-line summary', async ({ page, request }) => {
  await sync(request, [
    { t: 'profile', op: 'put', row: { currency: 'KES', name: 'Sam', split: { needs: 60, wants: 20, savings: 20 } } },
    { t: 'accounts', op: 'put', row: { id: 'a', name: 'M-Pesa', kind: 'mobile', balance: 1000, color: '#2fa05a' } },
    { t: 'accounts', op: 'put', row: { id: 'b', name: 'Bank', kind: 'bank', balance: 4000, color: '#3b6fe0' } },
  ])
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Account and sync' })).toBeVisible() // the profile card
  for (const h of ['Your money', 'This device', 'Weka']) await expect(page.getByRole('heading', { name: h, exact: true })).toBeVisible()
  await expect(menu(page).getByRole('link', { name: /Accounts/ })).toContainText('2 accounts')
  await expect(menu(page).getByRole('link', { name: /Budget/ })).toContainText('KES · 60/20/20 split')
  await expect(menu(page).getByRole('link', { name: /Appearance/ })).toContainText('Follows your device')
  await expect(menu(page).getByRole('link', { name: /Security/ })).toContainText('App lock is off')
  await expect(menu(page).getByRole('link', { name: /Backup and data/ })).toContainText('Never backed up')
  await expect(menu(page).getByRole('link', { name: /About/ })).toContainText('Version ')
  // the clutter is gone from this screen: none of the detailed controls are here
  for (const t of ['Delete my account', 'Erase all data', 'Export', 'Check for updates', 'Default split']) await expect(page.getByText(t, { exact: true })).toHaveCount(0)
})

const screens: [label: string, link: RegExp, url: string, content: string][] = [
  ['Budget', /Budget/, '/settings/budget', 'Default split'],
  ['Appearance', /Appearance/, '/settings/appearance', 'System'],
  ['Security', /Security/, '/settings/security', 'App lock'],
  ['Backup and data', /Backup and data/, '/settings/data', 'Backup & restore'],
  ['About and what\'s new', /About and what/, '/settings/about', 'Check for updates'],
]
for (const [label, link, url, content] of screens) {
  test(`${label} opens its own screen and Back returns to the menu`, async ({ page }) => {
    await page.goto('/settings')
    await menu(page).getByRole('link', { name: link }).click()
    await expect(page).toHaveURL(url)
    await expect(page.getByText(content, { exact: true }).first()).toBeVisible()
    await page.getByRole('link', { name: 'Back to settings' }).click()
    await expect(page).toHaveURL('/settings')
  })
}

test('the profile card opens Account and sync, where sign out and delete now live', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('link', { name: 'Account and sync' }).click()
  await expect(page).toHaveURL(/\/settings\/account$/)
  for (const b of ['Sync', 'Manage', 'Sign out', 'Delete my account']) await expect(page.getByRole('button', { name: b })).toBeVisible()
})

test('Back on the menu goes home, and the Accounts row opens the Accounts page', async ({ page }) => {
  await page.goto('/settings')
  await menu(page).getByRole('link', { name: /Accounts/ }).click()
  await expect(page).toHaveURL(/\/accounts$/)
  await page.goto('/settings')
  await page.getByRole('link', { name: 'Back to home' }).click()
  await expect(page).toHaveURL(/\/home$/)
})

test('an available update puts a dot on the About row', async ({ page }) => {
  await page.route('**/version.json', r => r.fulfill({ json: { version: '99.0.0', build: 'zzz9999' } }))
  await page.goto('/settings')
  // the app checks for updates by itself shortly after opening
  await expect(menu(page).getByRole('img', { name: 'An update is available' })).toBeVisible({ timeout: 10_000 })
})

test('the menu and every sub-screen fit a 360px phone without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  for (const p of ['/settings', '/settings/budget', '/settings/appearance', '/settings/security', '/settings/data', '/settings/account', '/settings/about']) {
    await page.goto(p)
    await page.getByRole('heading').first().waitFor()
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), p).toBeLessThanOrEqual(0)
  }
})
