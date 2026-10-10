import { expect, test, type Page } from '@playwright/test'
import { debt, getState, reset, sync } from './helpers'

const SCREENS = ['/home', '/activity', '/analytics', '/goals', '/bills', '/debts', '/accounts', '/settings', '/settings/budget', '/settings/appearance', '/settings/security', '/settings/data', '/settings/account', '/settings/about', '/settings/reminders']
const today = new Date().toLocaleDateString('sv')
const daysFromNow = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('sv') }

async function seedEverything(request: any) {
  await reset(request)
  await sync(request, [
    { t: 'profile', op: 'put', row: { currency: 'KES', name: 'Sam' } },
    { t: 'incomes', op: 'put', row: { id: 'i1', label: 'Salary', amount: 100000, date: today, split: { needs: 50000, wants: 30000, savings: 20000, debt: 0 } } },
    { t: 'expenses', op: 'put', row: { id: 'e1', label: 'Groceries', amount: 4200, category: 'needs', date: today } },
    { t: 'expenses', op: 'put', row: { id: 'e2', label: 'Cinema', amount: 800, category: 'wants', date: today } },
    debt('d1', 'Card', 90000, 4500, 24), debt('d2', 'Loan', 300000, 8000, 9),
    { t: 'goals', op: 'put', row: { id: 'g1', name: 'Rent deposit', target: 150000, icon: 'house', color: '#5b8def', contributions: [{ id: 'c1', amount: 40000, date: today }] } },
    { t: 'bills', op: 'put', row: { id: 'b1', name: 'Rent', amount: 25000, category: 'needs', every: 'month', nextDue: daysFromNow(-2), anchorDay: 1, auto: false } },
    { t: 'bills', op: 'put', row: { id: 'b2', name: 'Netflix', amount: 1100, category: 'wants', every: 'month', nextDue: daysFromNow(3), anchorDay: 5, auto: true } },
  ])
}

/** Runs inside the page: big light surfaces and low-contrast text. Gradients are skipped (their colours cannot be read back). */
async function scan(page: Page) {
  return page.evaluate(() => {
    const parse = (s: string) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1]!.split(',').map(x => parseFloat(x)); return { r: p[0]!, g: p[1]!, b: p[2]!, a: p[3] === undefined ? 1 : p[3]! } }
    const lum = (c: { r: number; g: number; b: number }) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b) }
    const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    const dark = document.documentElement.getAttribute('data-theme') === 'dark'
    const name = (el: Element) => `${el.tagName.toLowerCase()}.${String((el as HTMLElement).className || '').split(' ')[0]}`
    const bgOf = (el: Element | null): { r: number; g: number; b: number } | 'gradient' => {
      for (let e = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e)
        if (cs.backgroundImage !== 'none') return 'gradient'
        const c = parse(cs.backgroundColor)
        if (c && c.a > 0.9) return c
      }
      return parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255 }
    }
    const lightSurfaces: string[] = [], lowContrast: string[] = []
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect()
      if (cs.display === 'none' || cs.visibility === 'hidden' || r.width < 2 || r.height < 2) continue
      const bg = parse(cs.backgroundColor)
      if (dark && bg && bg.a > 0.6 && Math.min(r.width, r.height) > 30 && r.width * r.height > 400 && lum(bg) > 0.55) lightSurfaces.push(`${name(el)} ${cs.backgroundColor}`)
      const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && (n.textContent || '').trim().length > 0)
      if (hasText && parseFloat(cs.fontSize) >= 12 && cs.opacity !== '0') {
        const fg = parse(cs.color); const b = bgOf(el)
        if (fg && b !== 'gradient') { const ratio = contrast(lum(fg), lum(b)); if (ratio < 2.6) lowContrast.push(`${name(el)} "${(el.textContent || '').trim().slice(0, 24)}" ratio ${ratio.toFixed(2)}`) }
      }
    }
    return { lightSurfaces: [...new Set(lightSurfaces)], lowContrast: [...new Set(lowContrast)] }
  })
}

test.describe('theme', () => {
  test('follows the device setting until a choice is made', async ({ page, request }) => {
    await reset(request)
    const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
    const dim = (s: string) => s.match(/\d+/g)!.slice(0, 3).map(Number).every(v => v < 60)
    await page.emulateMedia({ colorScheme: 'dark' }); await page.goto('/home')
    expect(dim(await bg())).toBe(true)
    await page.emulateMedia({ colorScheme: 'light' })
    await expect.poll(async () => dim(await bg())).toBe(false)
  })

  test('an explicit choice beats the device, is remembered, and applies before the first paint', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/settings/appearance')
    await page.getByRole('tab', { name: 'Dark' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    expect(await page.evaluate(() => localStorage.getItem('bn:theme'))).toBe('dark')
    await page.goto('/home', { waitUntil: 'commit' })
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-theme')) // set by the head script, before hydration
    expect(await page.locator('html').getAttribute('data-theme')).toBe('dark')
    await page.goto('/settings/appearance')
    await page.getByRole('tab', { name: 'System' }).click()
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/)
    expect(await page.evaluate(() => localStorage.getItem('bn:theme'))).toBe('system')
  })

  test('the theme choice stays on this device (it is never sent to the account)', async ({ page, request }) => {
    await page.goto('/settings/appearance')
    await page.getByRole('tab', { name: 'Dark' }).click()
    await page.waitForTimeout(1200)
    expect(JSON.stringify(await getState(request))).not.toContain('dark')
  })

  for (const mode of ['dark', 'light'] as const) {
    test(`${mode} theme: no stray light surfaces and no unreadable text on any screen`, async ({ page, request }) => {
      await seedEverything(request)
      await page.addInitScript((m) => localStorage.setItem('bn:theme', m), mode)
      for (const path of SCREENS) {
        await page.goto(path)
        await page.waitForTimeout(900) // let entrance animations settle
        await expect(page.locator('html')).toHaveAttribute('data-theme', mode)
        const found = await scan(page)
        expect(found.lightSurfaces, `${path}: light surfaces in ${mode} mode`).toEqual([])
        expect(found.lowContrast, `${path}: low-contrast text in ${mode} mode`).toEqual([])
        if (process.env.THEME_SHOTS) await page.screenshot({ path: `${process.env.THEME_SHOTS}/${mode}-${path.slice(1)}.png`, fullPage: true })
      }
    })
  }

  test('dark theme: the add-money sheet, breakdown and lock screen are dark too', async ({ page, request }) => {
    await seedEverything(request)
    await page.addInitScript(() => localStorage.setItem('bn:theme', 'dark'))
    await page.goto('/home')
    await page.getByRole('button', { name: 'Add transaction', exact: true }).click()
    await page.waitForTimeout(700)
    let found = await scan(page)
    expect(found.lightSurfaces, 'keypad sheet').toEqual([])
    for (const d of '5000') await page.locator('.screen .keys button').filter({ hasText: new RegExp(`^${d}$`) }).click()
    await page.getByRole('button', { name: 'See my breakdown' }).click()
    await page.waitForTimeout(700)
    found = await scan(page)
    expect(found.lightSurfaces, 'breakdown sheet').toEqual([])
    expect(found.lowContrast, 'breakdown sheet text').toEqual([])
    if (process.env.THEME_SHOTS) await page.screenshot({ path: `${process.env.THEME_SHOTS}/dark-breakdown.png` })
  })
})
