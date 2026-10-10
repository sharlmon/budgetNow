import { expect, test } from '@playwright/test'
import { getState, reset, sync } from './helpers'

test.beforeEach(async ({ request }) => { await reset(request) })

const today = () => new Date().toLocaleDateString('sv')

// Undo has to keep working after the app has saved to the server and pulled the result back, which can replace the
// objects the action was holding on to.
test('Undo of a paid bill still works after the payment has been saved', async ({ page, request }) => {
  await sync(request, [{ t: 'bills', op: 'put', row: { id: 'b1', name: 'Internet', amount: 3500, category: 'needs', every: 'month', nextDue: today(), anchorDay: new Date().getDate(), auto: false } }])
  await page.goto('/bills')
  await page.getByRole('button', { name: 'Mark paid' }).click()
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(1)
  const paidDue = (await getState(request)).bills[0].nextDue
  expect(paidDue).not.toBe(today())
  await page.waitForTimeout(1200) // let the pull after the push finish
  await page.locator('.toast .undo').click()
  await expect.poll(async () => (await getState(request)).expenses.length).toBe(0)
  await expect.poll(async () => (await getState(request)).bills[0].nextDue).toBe(today())
})

test('Undo of deleting a debt payment still re-applies it to the balance after saving', async ({ page, request }) => {
  await sync(request, [
    { t: 'debts', op: 'put', row: { id: 'd1', name: 'Loan', balance: 380, minPayment: 50 } },
    { t: 'expenses', op: 'put', row: { id: 'x1', label: 'Payment: Loan', amount: 120, category: 'debt', date: today(), debtId: 'd1' } },
  ])
  await page.goto('/activity')
  await page.getByRole('button', { name: 'Delete' }).first().click()
  await expect.poll(async () => (await getState(request)).debts[0].balance).toBe(500)
  await page.waitForTimeout(1200)
  await page.locator('.toast .undo').click()
  await expect.poll(async () => (await getState(request)).debts[0].balance).toBe(380)
  expect((await getState(request)).expenses).toHaveLength(1)
})
