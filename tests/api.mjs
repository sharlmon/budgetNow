// Run `npm run dev:local` first (API_URL defaults to its port). Uses the dev-only x-dev-user header to act as separate users.
const B = (process.env.API_URL || 'http://localhost:3000') + '/api'
// Every request uses its own fake client IP so the per-IP rate limiter (tested separately) never interferes here.
const ipAddr = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`
let fails = 0
const ok = (c, m) => { if (!c) fails++; console.log(c ? 'ok  ' : 'FAIL', m) }
const call = async (path, user, body) => {
  const r = await fetch(B + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-dev-user': user, 'x-requested-with': 'budgetnow', 'x-forwarded-for': ipAddr() }, body: body ? JSON.stringify(body) : undefined })
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
const { rev: incomeRev, ...incomeBack } = s.incomes[0]
ok(JSON.stringify(incomeBack) === JSON.stringify(income) && incomeRev === 1, 'income round-trips exactly (incl. decimals) and starts at revision 1')
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

// revisions and conflicts between two devices
{
  const zed = 'user_zed_' + Date.now()
  const inc = (id, label, rev) => ({ t: 'incomes', op: 'put', row: { id, label, amount: 10, date: '2026-10-01', split: { needs: 10, wants: 0, savings: 0, debt: 0 }, ...(rev ? { rev } : {}) } })
  const get = async (id) => (await state(zed)).incomes.find(r => r.id === id)
  let r = await sync(zed, [inc('r1', 'v1')])
  ok(r.j.revs?.incomes?.r1 === 1 && (await get('r1')).rev === 1, 'a new row is created at revision 1 and the server reports it')

  r = await sync(zed, [inc('r1', 'phone edit', 1)])
  ok(r.j.revs.incomes.r1 === 2 && (await get('r1')).label === 'phone edit' && r.j.conflicts.length === 0, 'an edit based on the current revision applies and moves it to revision 2')

  r = await sync(zed, [inc('r1', 'laptop edit', 1)])
  ok(r.s === 200 && r.j.conflicts.length === 1 && r.j.conflicts[0].id === 'r1' && r.j.conflicts[0].theirs.label === 'phone edit' && r.j.conflicts[0].theirs.rev === 2, 'a stale edit is refused and the current version is returned')
  ok((await get('r1')).label === 'phone edit' && (await get('r1')).rev === 2, 'and the newer data was NOT overwritten')

  r = await sync(zed, [inc('r1', 'phone edit', 1)])
  ok(r.j.conflicts.length === 0 && r.j.revs.incomes.r1 === 2 && (await get('r1')).rev === 2, 'repeating an edit that is already stored is a no-op, not a conflict (safe retry after a lost response)')

  r = await sync(zed, [inc('r1', 'old client edit')])
  ok(r.j.conflicts.length === 0 && (await get('r1')).label === 'old client edit' && (await get('r1')).rev === 3, 'a client that sends no revision still works (last write wins) and bumps the revision')

  r = await sync(zed, [inc('r1', 'forged', 999)])
  ok(r.j.conflicts.length === 1 && (await get('r1')).label === 'old client edit', 'a made-up revision number cannot force an overwrite')

  r = await sync(zed, [{ t: 'incomes', op: 'del', id: 'r1', rev: 2 }])
  ok(r.j.conflicts.length === 1 && !!(await get('r1')), 'deleting a row that was edited elsewhere since is refused')
  r = await sync(zed, [{ t: 'incomes', op: 'del', id: 'r1', rev: 3 }])
  ok(r.j.conflicts.length === 0 && !(await get('r1')), 'deleting with the current revision works')
  r = await sync(zed, [{ t: 'incomes', op: 'del', id: 'r1', rev: 3 }])
  ok(r.s === 200 && r.j.conflicts.length === 0, 'deleting something already deleted is harmless')

  r = await sync(zed, [inc('gone', 'x', 4)])
  ok(r.j.conflicts.length === 1 && r.j.conflicts[0].theirs === null && !(await get('gone')), 'editing a row another device deleted reports "deleted elsewhere" and does not resurrect it')

  r = await sync(zed, [inc('mix-a', 'a'), inc('mix-b', 'b'), inc('r1', 'recreate')])
  const stale = await sync(zed, [inc('mix-a', 'a2', 1), inc('mix-b', 'b2', 7), inc('mix-c', 'c')])
  ok(stale.j.conflicts.length === 1 && stale.j.conflicts[0].id === 'mix-b' && (await get('mix-a')).label === 'a2' && !!(await get('mix-c')), 'in one batch the good changes apply and only the conflicting one is returned')

  // two requests race on the same revision: exactly one may win
  await sync(zed, [inc('race', 'start')])
  const racers = await Promise.all([sync(zed, [inc('race', 'A', 1)]), sync(zed, [inc('race', 'B', 1)])])
  const wins = racers.filter(x => x.j.conflicts.length === 0).length
  ok(wins === 1 && racers.filter(x => x.j.conflicts.length === 1).length === 1 && (await get('race')).rev === 2, 'two simultaneous edits of the same revision: exactly one wins, the other gets a conflict')

  // goals carry their contributions
  const goal = (label, contribs, rev) => ({ t: 'goals', op: 'put', row: { id: 'gg', name: label, target: 100, icon: 'target', color: '#ef6a3a', contributions: contribs, ...(rev ? { rev } : {}) } })
  await sync(zed, [goal('Trip', [{ id: 'k1', amount: 10, date: '2026-10-01' }])])
  r = await sync(zed, [goal('Trip', [{ id: 'k1', amount: 10, date: '2026-10-01' }, { id: 'k2', amount: 5, date: '2026-10-02' }], 1)])
  let g = (await state(zed)).goals.find(x => x.id === 'gg')
  ok(r.j.conflicts.length === 0 && g.rev === 2 && g.contributions.length === 2, 'a goal edit with a new contribution applies')
  r = await sync(zed, [goal('Trip', [{ id: 'k1', amount: 10, date: '2026-10-01' }, { id: 'k3', amount: 99, date: '2026-10-03' }], 1)])
  g = (await state(zed)).goals.find(x => x.id === 'gg')
  ok(r.j.conflicts.length === 1 && g.contributions.map(c => c.id).sort().join() === 'k1,k2', 'a stale goal edit conflicts and leaves its contributions untouched')
  ok(r.j.conflicts[0].theirs.contributions.length === 2, 'the conflict carries the other version with its contributions')

  // debts and bills have revisions too
  await sync(zed, [{ t: 'debts', op: 'put', row: { id: 'dx', name: 'Card', balance: 100, minPayment: 5 } }, { t: 'bills', op: 'put', row: { id: 'bx', name: 'Rent', amount: 5, category: 'needs', every: 'month', nextDue: '2026-11-01', anchorDay: 1, auto: false } }])
  const d1 = await sync(zed, [{ t: 'debts', op: 'put', row: { id: 'dx', name: 'Card', balance: 90, minPayment: 5, rev: 1 } }])
  const d2 = await sync(zed, [{ t: 'debts', op: 'put', row: { id: 'dx', name: 'Card', balance: 80, minPayment: 5, rev: 1 } }])
  ok(d1.j.conflicts.length === 0 && d2.j.conflicts.length === 1 && d2.j.conflicts[0].theirs.balance === 90, 'debt balance: second device editing the same revision gets a conflict with the first one\'s balance')
  const b1 = await sync(zed, [{ t: 'bills', op: 'put', row: { id: 'bx', name: 'Rent', amount: 6, category: 'needs', every: 'month', nextDue: '2026-11-01', anchorDay: 1, auto: false, rev: 1 } }])
  ok(b1.j.revs.bills.bx === 2, 'bills are revisioned too')

  // another user is never affected
  const yan = 'user_yan_' + Date.now()
  await sync(yan, [inc('r1', 'yan')])
  const ry = await sync(yan, [inc('race', 'whatever', 5)])
  ok(ry.j.conflicts.length === 1 && ry.j.conflicts[0].theirs === null, "another user's rows are invisible: the same id is just 'not found' for them")
  ok((await get('race')).label !== 'whatever', "and cannot touch this user's row")
}

// debt interest rate
{
  const erin = 'user_erin_' + Date.now()
  const debt = (extra) => ({ t: 'debts', op: 'put', row: { id: 'dd', name: 'Card', balance: 1000, minPayment: 50, ...extra } })
  ok((await sync(erin, [debt({ apr: 19.9 })])).s === 200 && (await state(erin)).debts[0].apr === 19.9, 'a debt interest rate round-trips exactly (19.9)')
  ok((await sync(erin, [debt({ apr: 0 })])).s === 200 && (await state(erin)).debts[0].apr === 0, '0% is stored as 0, not dropped')
  ok((await sync(erin, [debt({ apr: 100 })])).s === 200, '100% is the allowed maximum')
  for (const [m, apr] of [['negative', -1], ['over 100', 100.01], ['text', '19.9'], ['an object', { rate: 5 }]]) ok((await sync(erin, [debt({ apr })])).s === 400, `interest rate that is ${m} is rejected`)
  ok((await state(erin)).debts[0].apr === 100, 'rejected rates changed nothing')
  ok((await sync(erin, [debt({})])).s === 200 && (await state(erin)).debts[0].apr === undefined, 'a debt with no rate has none (older clients still work)')
  ok((await sync(erin, [debt({ apr: null })])).s === 200, 'an explicit null rate is accepted')
}

// default currency
{
  const nia = 'user_nia_' + Date.now()
  ok((await state(nia)).profile.currency === 'KES', 'a brand-new account defaults to Kenyan shillings')
  ok((await sync(nia, [{ t: 'profile', op: 'put', row: { currency: 'USD', name: '' } }])).s === 200 && (await state(nia)).profile.currency === 'USD', 'a chosen currency is kept (USD)')
  ok((await sync(nia, [{ t: 'profile', op: 'put', row: { currency: 'KES', name: '' } }])).s === 200 && (await state(nia)).profile.currency === 'KES', 'and can be switched back to KES')
}

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
const del = (u) => fetch(B + '/account', { method: 'DELETE', headers: { 'x-dev-user': u, 'x-requested-with': 'budgetnow', 'x-confirm': 'delete-my-account', 'x-forwarded-for': ipAddr() } }).then(r => r.status)

// linked accounts
{
  const acct = { id: 'ac1', name: 'M-Pesa', kind: 'mobile', balance: 1250.75, color: '#2fa05a' }
  const fund = { id: 'ac2', name: 'Money market fund', kind: 'invest', balance: 85000, color: '#e6a321', rate: 14.1 }
  const carol = 'user_carol_' + Date.now()
  let x = await sync(carol, [{ t: 'accounts', op: 'put', row: acct }, { t: 'accounts', op: 'put', row: fund }])
  ok(x.s === 200 && x.j.revs.accounts.ac1 === 1, 'accounts are saved and start at revision 1')
  let cs = await state(carol)
  ok(cs.accounts.length === 2 && cs.accounts[0].balance === 1250.75 && cs.accounts[0].rate === undefined && cs.accounts[1].rate === 14.1, 'accounts round-trip (decimals, optional rate)')
  x = await sync(carol, [{ t: 'accounts', op: 'put', row: { ...acct, rev: 1, balance: 900 } }])
  cs = await state(carol)
  ok(x.s === 200 && cs.accounts[0].balance === 900 && cs.accounts[0].rev === 2, 'editing a balance bumps the revision')
  x = await sync(carol, [{ t: 'accounts', op: 'put', row: { ...acct, rev: 1, balance: 5 } }])
  ok(x.j.conflicts.length === 1 && (await state(carol)).accounts[0].balance === 900, 'a stale edit to an account is a conflict, not an overwrite')
  const badAcct = async (m, row) => { const y = await sync(carol, [{ t: 'accounts', op: 'put', row }]); ok(y.s === 400, `rejects ${m} -> ${y.s}`) }
  await badAcct('an unknown kind', { ...acct, id: 'x1', kind: 'crypto' })
  await badAcct('a negative balance', { ...acct, id: 'x2', balance: -1 })
  await badAcct('a rate over 100', { ...fund, id: 'x3', rate: 101 })
  await badAcct('a bad colour', { ...acct, id: 'x4', color: 'red' })
  await badAcct('an empty name', { ...acct, id: 'x5', name: '' })
  ok((await state(alice)).accounts.length === 0, "one user's accounts are not visible to another")
  await sync(carol, [{ t: 'accounts', op: 'del', id: 'ac2', rev: 1 }])
  ok((await state(carol)).accounts.length === 1, 'an account can be deleted')
  await del(carol)
  ok((await state(carol)).accounts.length === 0, 'deleting the account removes its linked accounts too')
}

await sync(bob, [{ t: 'incomes', op: 'put', row: { ...income, id: 'bob-i', split: { needs: 1, wants: 0, savings: 0, debt: 0 }, amount: 1 } }, { t: 'goals', op: 'put', row: { ...goal, id: 'bob-g' } }, { t: 'profile', op: 'put', row: { currency: 'EUR', name: 'Bob' } }])
const before = await state(alice)
ok((await del(bob)) === 200, 'DELETE /api/account succeeds')
const sbDeleted = await state(bob)
ok(sbDeleted.incomes.length + sbDeleted.expenses.length + sbDeleted.debts.length + sbDeleted.goals.length + sbDeleted.bills.length + sbDeleted.accounts.length === 0 && sbDeleted.profile.name === '', 'deleted user has no rows left (incl. goal contributions and profile)')
const after = await state(alice)
ok(JSON.stringify(after) === JSON.stringify(before), "deleting one account never touches another user's data")
ok((await del(bob)) === 200, 'deleting an already-empty account is harmless')

console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exit(fails ? 1 : 0)
