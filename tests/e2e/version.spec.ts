import { expect, test, type Page } from '@playwright/test'
import { reset } from './helpers'
import { readFileSync } from 'node:fs'
import { RELEASES } from '../../shared/releases'

// Tests follow the release in package.json, so a version bump never breaks them.
const CURRENT: string = JSON.parse(readFileSync('package.json', 'utf8')).version
const NEWER = '99.0.0'

test.beforeEach(async ({ request }) => { await reset(request) })

const deployed = async (request: any) => (await request.get('/version.json')).json() as Promise<{ version: string; build: string }>
/** Pretends the server has deployed something else. */
const pretendDeployed = (page: Page, v: { version: string; build: string }) => page.route('**/version.json', r => r.fulfill({ json: v, headers: { 'cache-control': 'no-store' } }))

test('the server reports its version and is never cached', async ({ request }) => {
  const res = await request.get('/version.json')
  expect(res.ok()).toBeTruthy()
  expect(res.headers()['cache-control']).toContain('no-store')
  const j = await res.json()
  expect(j.version).toBe(CURRENT)
  expect(j.build).toMatch(/^[0-9a-f]{7}$|^\d{6,}$/)
  const sw = await (await request.get('/sw.js')).text()
  expect(sw).toContain('version.json') // the offline cache must never answer this
})

test('About shows the version, the build, and what is new', async ({ page }) => {
  await page.goto('/settings/about')
  const about = page.locator('#about')
  await expect(about).toContainText(`Version ${CURRENT}`)
  await expect(about).toContainText('build')
  await expect(about.locator('details').first()).toContainText(RELEASES[0]!.notes[0]!)
})

test('running the deployed build shows no update notice', async ({ page }) => {
  await page.goto('/home')
  await page.waitForTimeout(2500) // well past the test server's 400 ms check delay
  await expect(page.locator('.upd')).toHaveCount(0)
})

test('a newer version shows a notice with its number, and Update reloads into it', async ({ page }) => {
  await pretendDeployed(page, { version: NEWER, build: 'abc1234' })
  await page.goto('/home')
  const notice = page.locator('.upd')
  await expect(notice).toBeVisible({ timeout: 10_000 })
  await expect(notice).toContainText(`Version ${NEWER} is available`)
  await page.evaluate(() => { (window as any).__beforeUpdate = true })
  await notice.getByRole('button', { name: 'Update' }).click()
  await page.waitForFunction(() => (window as any).__beforeUpdate === undefined, null, { timeout: 15_000 }) // the page was reloaded
})

test('a redeploy without a version bump still says an update is available', async ({ page }) => {
  await pretendDeployed(page, { version: CURRENT, build: 'def5678' })
  await page.goto('/home')
  await expect(page.locator('.upd')).toContainText('An update is available', { timeout: 10_000 })
})

test('"Later" hides the notice and it stays hidden for that build', async ({ page }) => {
  await pretendDeployed(page, { version: NEWER, build: 'abc1234' })
  await page.goto('/home')
  await expect(page.locator('.upd')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Later' }).click()
  await expect(page.locator('.upd')).toHaveCount(0)
  await page.reload()
  await page.waitForTimeout(2500)
  await expect(page.locator('.upd')).toHaveCount(0)
})

test('Check for updates says so when you are current, and shows the notice when you are not', async ({ page, request }) => {
  await page.goto('/settings/about')
  await page.getByRole('button', { name: 'Check for updates' }).click()
  await expect(page.locator('.toast').filter({ hasText: `You're on the latest version (${CURRENT})` })).toBeVisible()

  await pretendDeployed(page, { version: '2.0.0', build: 'fff0000' })
  await page.getByRole('button', { name: 'Check for updates' }).click()
  await expect(page.locator('.upd')).toContainText('Version 2.0.0 is available')
})

test('checking while offline explains instead of failing silently', async ({ page, context }) => {
  await page.goto('/settings/about')
  await expect(page.locator('#about')).toBeVisible() // let the screen finish loading before the network goes away
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Check for updates' }).click()
  await expect(page.locator('.toast').filter({ hasText: "Couldn't check for updates" })).toBeVisible()
})

test('after an update, the first open says so once and links to what is new', async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('bn:last-version')) localStorage.setItem('bn:last-version', '0.9.0') })
  await page.goto('/home')
  const toast = page.locator('.toast').filter({ hasText: `Updated to version ${CURRENT}` })
  await expect(toast).toBeVisible({ timeout: 10_000 })
  await toast.getByRole('button', { name: "What's new" }).click()
  await expect(page).toHaveURL(/\/settings\/about$/)
  await expect(page.locator('#about')).toBeVisible()
  await page.goto('/home')
  await page.waitForTimeout(4000)
  await expect(page.locator('.toast').filter({ hasText: 'Updated to version' })).toHaveCount(0) // only once
})

test('a first-ever visit stays quiet', async ({ page }) => {
  await page.goto('/home')
  await page.waitForTimeout(4000)
  await expect(page.locator('.toast').filter({ hasText: 'Updated to version' })).toHaveCount(0)
})
