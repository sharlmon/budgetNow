// Run `npm run dev:local` first (API_URL defaults to its port). Uses the dev-only x-dev-user header to act as separate users.
const B = (process.env.API_URL || 'http://localhost:3000') + '/api'
// Each run uses its own fake client IP so the per-IP rate limiter never interferes between runs.
const RUN_IP = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`
let fails = 0
const ok = (c, m) => { if (!c) fails++; console.log(c ? 'ok  ' : 'FAIL', m) }
const call = async (path, user, body) => {
  const r = await fetch(B + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-dev-user': user, 'x-requested-with': 'budgetnow', 'x-forwarded-for': RUN_IP }, body: body ? JSON.stringify(body) : undefined })
  let j; try { j = await r.json() } catch { j = null }
  return { s: r.status, j }
}
const sync = (u, ops) => call('/sync', u, { ops })
const state = u => call('/state', u).then(r => r.j)
const alice = 'user_alice_' + Date.now(), bob = 'user_bob_' + Date.now()

const income = { id: 'i1', label: 'Salary', amount: 3200.5, date: '2026-10-01', split: { needs: 1500, wants: 900, savings: 640.5, debt: 160 } }
const expense = { id: 'e1', label: 'Rent', amount: 1200, category: 'needs', date: '2026-10-02', billId: 'b1' }
const debt = { id: 'd1', name: 'Loan', balance: 2400, original: 3000, minPayment: 160 }
const goal = { id: 'g1', name: 'Deposit', target: 1500, icon: 'house', color: '#5b8def', deadline: '2027-01-15', contributions: [{ id: 'c1', amount: 600, date: '2026-10-04' }, { id: 'c2', amount: -50, date: '2026-10-05' }] }
const bill = { id: 'b1', name: 'Rent', amount: 1200, category: 'needs', every: 'month', nextDue: '2026-11-01', anchorDay: 1, auto: true }

let r = await sync(alice, [
  { t: 'incomes', op: 'put', row: income }, { t: 'expenses', op: 'put', row: expense }, { t: 'debts', op: 'put', row: debt },
  { t: 'goals', op: 'put', row: goal }, { t: 'bills', op: 'put', row: bill }, { t: 'profile', op: 'put', row: { currency: 'ZAR', name: 'Alice' } },
])
ok(r.s === 200 && r.j.applied === 6, 'sync applies a mixed batch')
let s = await state(alice)
ok(JSON.stringify(s.incomes[0]) === JSON.stringify(income), 'income round-trips exactly (incl. decimals)')
ok(s.expenses[0].billId === 'b1' && s.expenses[0].debtId === undefined, 'expense optional fields map correctly')
ok(s.debts[0].original === 3000 && s.bills[0].every === 'month' && s.bills[0].auto === true, 'debt and bill round-trip')
ok(s.goals[0].contributions.length === 2 && s.goals[0].contributions.some(c => c.amount === -50) && s.goals[0].deadline === '2027-01-15', 'goal with contributions (incl. withdrawal) round-trips')
ok(s.profile.currency === 'ZAR' && s.profile.name === 'Alice', 'profile saved')

// update + idempotency
r = await sync(alice, [{ t: 'incomes', op: 'put', row: { ...income, label: 'Salary (edited)' } }, { t: 'goals', op: 'put', row: { ...goal, contributions: [{ id: 'c1', amount: 700, date: '2026-10-04' }] } }])
s = await state(alice)
ok(s.incomes.length === 1 && s.incomes[0].label === 'Salary (edited)', 'put updates in place, no duplicate')
ok(s.goals[0].contributions.length === 1 && s.goals[0].contributions[0].amount === 700, 'goal put replaces its contribution list')
const again = await sync(alice, [{ t: 'incomes', op: 'put', row: { ...income, label: 'Salary (edited)' } }])
ok(again.s === 200 && (await state(alice)).incomes.length === 1, 'repeating a put is harmless (idempotent)')

// isolation: bob uses the SAME ids
await sync(bob, [{ t: 'incomes', op: 'put', row: { ...income, label: 'BOB salary', amount: 1 , split: { needs: 1, wants: 0, savings: 0, debt: 0 } } }])
const sa = await state(alice), sb = await state(bob)
ok(sa.incomes[0].label === 'Salary (edited)' && sb.incomes[0].label === 'BOB salary', 'same ids for two users stay separate')
await sync(bob, [{ t: 'incomes', op: 'del', id: 'i1' }, { t: 'expenses', op: 'del', id: 'e1' }])
ok((await state(alice)).incomes.length === 1 && (await state(alice)).expenses.length === 1, "one user's deletes never touch another user's rows")
ok((await state(bob)).incomes.length === 0, 'delete removes own row')

// cascade
await sync(alice, [{ t: 'goals', op: 'del', id: 'g1' }])
s = await state(alice)
ok(s.goals.length === 0, 'goal deleted')
const contribLeft = await sync(alice, [{ t: 'goals', op: 'put', row: { ...goal, contributions: [] } }]); s = await state(alice)
ok(s.goals[0].contributions.length === 0, 'old contributions were cascaded away (re-created goal starts empty)')

// validation
const bad = async (m, op, code = 400) => { const x = await sync(alice, [op]); ok(x.s === code, `${m} -> ${x.s}`) }
await bad('rejects unknown category', { t: 'expenses', op: 'put', row: { ...expense, category: 'hax' } })
await bad('rejects negative amount', { t: 'expenses', op: 'put', row: { ...expense, amount: -5 } })
await bad('rejects bad date', { t: 'incomes', op: 'put', row: { ...income, date: '2026-13-45' } })
await bad('rejects SQL-ish id', { t: 'debts', op: 'put', row: { ...debt, id: "x'; DROP TABLE debts;--" } })
await bad('rejects zero goal target', { t: 'goals', op: 'put', row: { ...goal, target: 0 } })
await bad('rejects bad currency', { t: 'profile', op: 'put', row: { currency: 'zar', name: 'x' } })
await bad('rejects unknown table', { t: 'users', op: 'del', id: 'x' })
const huge = await sync(alice, Array.from({ length: 1001 }, (_, i) => ({ t: 'expenses', op: 'del', id: 'x' + i })))
ok(huge.s === 400, 'rejects more than 1000 ops in one request')
const atomic = await sync(alice, [{ t: 'debts', op: 'put', row: { ...debt, id: 'd-ok' } }, { t: 'debts', op: 'put', row: { ...debt, id: 'd-bad', balance: -1 } }])
ok(atomic.s === 400 && !(await state(alice)).debts.some(d => d.id === 'd-ok'), 'a batch with one bad row applies nothing (atomic)')

// bulk
const many = Array.from({ length: 450 }, (_, i) => ({ t: 'expenses', op: 'put', row: { id: 'bulk' + i, label: 'x', amount: 1, category: 'wants', date: '2026-10-03' } }))
const t0 = Date.now(); r = await sync(alice, many)
ok(r.s === 200 && (await state(alice)).expenses.length === 451, `450-row bulk upsert in ${Date.now() - t0}ms`)

// split rule
{
  const carol = 'user_carol_' + Date.now()
  const put = (split, extra = {}) => sync(carol, [{ t: 'profile', op: 'put', row: { currency: 'USD', name: 'C', ...(split ? { split } : {}), ...extra } }])
  ok((await state(carol)).profile.split.needs === 50 && (await state(carol)).profile.split.savings === 20, 'new account starts on 50/30/20')
  ok((await put({ needs: 60, wants: 20, savings: 20 })).s === 200, 'a valid split rule is saved')
  let sp = (await state(carol)).profile.split
  ok(sp.needs === 60 && sp.wants === 20 && sp.savings === 20, 'and read back exactly')
  for (const [m, bad] of [['totals 90', { needs: 50, wants: 20, savings: 20 }], ['totals 110', { needs: 60, wants: 30, savings: 20 }], ['negative share', { needs: -10, wants: 60, savings: 50 }], ['fractional', { needs: 50.5, wants: 29.5, savings: 20 }], ['over 100', { needs: 101, wants: 0, savings: -1 }], ['text', { needs: '60', wants: 20, savings: 20 }], ['missing field', { needs: 60, wants: 40 }]]) {
    ok((await put(bad)).s === 400, `split that ${m} is rejected`)
  }
  sp = (await state(carol)).profile.split
  ok(sp.needs === 60 && sp.wants === 20 && sp.savings === 20, 'rejected rules changed nothing')
  ok((await put(null, { name: 'Renamed' })).s === 200, 'a client that sends no split (older cached copy) is accepted')
  sp = (await state(carol)).profile.split
  ok(sp.needs === 60 && (await state(carol)).profile.name === 'Renamed', 'and does not reset the saved rule')
  ok((await put({ needs: 100, wants: 0, savings: 0 })).s === 200, 'an all-needs rule is allowed')
  await sync(carol, [{ t: 'profile', op: 'put', row: { currency: 'USD', name: '', split: { needs: 40, wants: 30, savings: 30 } } }])
  ok((await state('someone_else_' + Date.now())).profile.split.needs === 50, "one user's rule never leaks to another")
}

// account deletion: removes everything for that user only
const del = (u) => fetch(B + '/account', { method: 'DELETE', headers: { 'x-dev-user': u, 'x-requested-with': 'budgetnow', 'x-confirm': 'delete-my-account', 'x-forwarded-for': RUN_IP } }).then(r => r.status)
await sync(bob, [{ t: 'incomes', op: 'put', row: { ...income, id: 'bob-i', split: { needs: 1, wants: 0, savings: 0, debt: 0 }, amount: 1 } }, { t: 'goals', op: 'put', row: { ...goal, id: 'bob-g' } }, { t: 'profile', op: 'put', row: { currency: 'EUR', name: 'Bob' } }])
const before = await state(alice)
ok((await del(bob)) === 200, 'DELETE /api/account succeeds')
const sbDeleted = await state(bob)
ok(sbDeleted.incomes.length + sbDeleted.expenses.length + sbDeleted.debts.length + sbDeleted.goals.length + sbDeleted.bills.length === 0 && sbDeleted.profile.name === '', 'deleted user has no rows left (incl. goal contributions and profile)')
const after = await state(alice)
ok(JSON.stringify(after) === JSON.stringify(before), "deleting one account never touches another user's data")
ok((await del(bob)) === 200, 'deleting an already-empty account is harmless')

console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0)
