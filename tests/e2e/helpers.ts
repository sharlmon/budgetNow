import { expect, type APIRequestContext, type Page } from '@playwright/test'

const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`
const headers = () => ({ 'content-type': 'application/json', 'x-requested-with': 'budgetnow', 'x-forwarded-for': ip() })

export const getState = async (request: APIRequestContext) => {
  const res = await request.get('/api/state', { headers: { 'x-forwarded-for': ip() } })
  expect(res.ok(), `GET /api/state failed with ${res.status()}: ${(await res.text()).slice(0, 120)}`).toBeTruthy()
  return res.json()
}

export async function sync(request: APIRequestContext, ops: unknown[]) {
  const res = await request.post('/api/sync', { headers: headers(), data: { ops } })
  expect(res.ok(), `sync failed: ${res.status()}`).toBeTruthy()
  return res.json()
}

/** Empties the account through the normal sync route (the delete-account route is deliberately rate limited). */
export async function reset(request: APIRequestContext) {
  const s = await getState(request)
  const del = (t: string, rows: any[]) => rows.map(r => ({ t, op: 'del', id: r.id, rev: r.rev }))
  const ops = [...del('incomes', s.incomes), ...del('expenses', s.expenses), ...del('debts', s.debts), ...del('goals', s.goals), ...del('bills', s.bills), ...del('accounts', s.accounts ?? []),
    { t: 'profile', op: 'put', row: { currency: 'USD', name: '', split: { needs: 50, wants: 30, savings: 20 } } }]
  await sync(request, ops)
}

export const debt = (id: string, name: string, balance: number, minPayment: number, apr?: number) =>
  ({ t: 'debts', op: 'put', row: { id, name, balance, minPayment, ...(apr ? { apr } : {}) } })

/** Types an amount on the keypad (digits only) in the add-money sheet. */
export async function keypad(page: Page, digits: string, scope = '.screen') {
  for (const d of digits) await page.locator(`${scope} .keys button`).filter({ hasText: new RegExp(`^${d}$`) }).click()
}

/** Opens the "+" sheet. */
export const openAdd = (page: Page) => page.getByRole('button', { name: 'Add transaction', exact: true }).click()

export async function localKeys(page: Page) {
  return page.evaluate(() => Object.keys(localStorage))
}
