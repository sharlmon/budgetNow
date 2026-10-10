import { expect, test } from '@playwright/test'
import { reset } from './helpers'

test.beforeEach(async ({ request }) => { await reset(request) })

const pad = async (page: any, scope: string, pin: string) => {
  for (const d of pin) await page.locator(`${scope} .keys button[aria-label="${d}"]`).click()
}

async function turnOnLock(page: any) {
  await page.goto('/settings/security')
  await page.locator('.lockcard [role=switch][aria-label="App lock"]').click()
  await pad(page, '.sheet', '1234')
  await expect(page.locator('.sheet h3')).toHaveText('Confirm your PIN')
  await pad(page, '.sheet', '1234')
  await expect(page.locator('.lockcard')).toContainText('On for this device')
}

test('a PIN lock starts locked, refuses a wrong PIN, and opens with the right one', async ({ page }) => {
  await turnOnLock(page)
  await page.reload()
  const lock = page.getByRole('dialog', { name: 'Weka is locked' })
  await expect(lock).toBeVisible()
  await expect(page.locator('.shell')).toHaveAttribute('inert', '')

  await pad(page, '.lock', '0000')
  await expect(lock).toContainText('Wrong PIN')
  await expect(lock).toBeVisible()

  await pad(page, '.lock', '1234')
  await expect(lock).toBeHidden()
  await expect(page.locator('.shell')).not.toHaveAttribute('inert', '')
})

test('the PIN is never stored, only a salted hash', async ({ page }) => {
  await turnOnLock(page)
  const stored = await page.evaluate(() => JSON.stringify(localStorage))
  expect(stored).not.toContain('1234')
  const cfg = await page.evaluate(() => JSON.parse(localStorage.getItem('bn:lock:dev-user')!))
  expect(cfg).toMatchObject({ v: 1, len: 4 })
  expect(cfg.salt.length).toBeGreaterThan(10); expect(cfg.hash.length).toBeGreaterThan(20)
})

test('five wrong guesses slow guessing down, even for the right PIN', async ({ page }) => {
  await turnOnLock(page)
  await page.reload()
  for (let i = 0; i < 5; i++) { await pad(page, '.lock', '1111'); await page.waitForTimeout(250) }
  await expect(page.locator('.lock')).toContainText('Too many tries')
  await pad(page, '.lock', '1234')
  await expect(page.locator('.lock')).toBeVisible()
})

test('Face ID / fingerprint unlocks, and stays locked when the device cannot verify you', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: false, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } })

  await turnOnLock(page)
  await page.locator('[role=switch][aria-label="Face ID or fingerprint"]').click()
  await expect(page.locator('.toast').filter({ hasText: 'Face ID or fingerprint is on' })).toBeVisible()

  await page.goto('/home')
  // This button is hidden from the accessibility tree while the app is locked, so it only appears once the device has unlocked it (no PIN typed).
  const lockNow = page.getByRole('button', { name: 'Lock the app now' })
  await expect(lockNow).toBeVisible({ timeout: 15_000 })

  await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: false })
  await lockNow.click()
  await expect(page.locator('.lock')).toBeVisible()
  await page.waitForTimeout(1500)
  await expect(page.locator('.lock')).toBeVisible() // a failed verification does not unlock
  await pad(page, '.lock', '1234')
  await expect(page.locator('.lock')).toBeHidden() // the PIN always works
})
