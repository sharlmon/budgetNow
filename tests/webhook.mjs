// Needs a dev server started with NUXT_CLERK_WEBHOOK_SIGNING_SECRET=<WEBHOOK_SECRET below>.
import { createHmac, randomBytes } from 'node:crypto'
const ORIGIN = process.env.API_URL || 'http://localhost:3000'
const SECRET = 'whsec_' + Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')
let fails = 0
const ok = (c, m) => { if (!c) fails++; console.log(c ? 'ok  ' : 'FAIL', m) }
const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`

// Signs the way Clerk/Svix does: HMAC-SHA256 over "<id>.<timestamp>.<body>" with the base64-decoded secret.
function signed(payload, { secret = SECRET, ts = Math.floor(Date.now() / 1000), id = 'msg_' + randomBytes(6).toString('hex'), body } = {}) {
  const raw = body ?? JSON.stringify(payload)
  const key = Buffer.from(secret.replace('whsec_', ''), 'base64')
  const sig = createHmac('sha256', key).update(`${id}.${ts}.${raw}`).digest('base64')
  return { raw, headers: { 'content-type': 'application/json', 'svix-id': id, 'svix-timestamp': String(ts), 'svix-signature': `v1,${sig}`, 'x-forwarded-for': ip() } }
}
const post = (s) => fetch(ORIGIN + '/api/webhooks/clerk', { method: 'POST', headers: s.headers, body: s.raw })
const api = (path, user, init = {}) => fetch(ORIGIN + path, { ...init, headers: { 'x-dev-user': user, 'x-requested-with': 'budgetnow', 'content-type': 'application/json', 'x-forwarded-for': ip(), ...(init.headers || {}) } })
const seed = (user, id) => api('/api/sync', user, { method: 'POST', body: JSON.stringify({ ops: [
  { t: 'incomes', op: 'put', row: { id, label: 'Pay', amount: 5, date: '2026-10-01', split: { needs: 5, wants: 0, savings: 0, debt: 0 } } },
  { t: 'goals', op: 'put', row: { id: 'g' + id, name: 'G', target: 5, icon: 'target', color: '#ef6a3a', contributions: [{ id: 'c' + id, amount: 1, date: '2026-10-02' }] } },
  { t: 'profile', op: 'put', row: { currency: 'EUR', name: 'Doomed' } } ] }) })
const count = async (user) => { const s = await (await api('/api/state', user)).json(); return s.incomes.length + s.goals.length + s.goals.reduce((n, g) => n + g.contributions.length, 0) + (s.profile.name ? 1 : 0) }

const victim = 'wh_victim_' + Date.now(), bystander = 'wh_bystander_' + Date.now()
await seed(victim, 'v1'); await seed(bystander, 'b1')
ok(await count(victim) === 4 && await count(bystander) === 4, 'two users with data (income, goal, contribution, profile)')

// --- forgeries must change nothing ---
const evt = { type: 'user.deleted', data: { id: victim, deleted: true, object: 'user' } }
let r = await post(signed(evt, { secret: 'whsec_' + Buffer.from('wrong-secret-wrong-secret-wrong!').toString('base64') }))
ok(r.status === 400, `signature made with the wrong secret -> ${r.status} (want 400)`)
r = await post(signed(evt, { ts: Math.floor(Date.now() / 1000) - 3600 }))
ok(r.status === 400, `valid signature but an hour old (replay) -> ${r.status} (want 400)`)
const good = signed(evt)
r = await post({ headers: good.headers, raw: good.raw.replace(victim, bystander) })
ok(r.status === 400, `body tampered after signing -> ${r.status} (want 400)`)
r = await post({ headers: { 'content-type': 'application/json', 'x-forwarded-for': ip() }, raw: good.raw })
ok(r.status === 400, `no signature headers at all -> ${r.status} (want 400)`)
r = await post({ headers: { ...good.headers, 'svix-signature': 'v1,AAAA' }, raw: good.raw })
ok(r.status === 400, `garbage signature -> ${r.status} (want 400)`)
r = await post({ headers: good.headers, raw: 'not json' })
ok(r.status === 400, `non-JSON body -> ${r.status} (want 400)`)
ok(await count(victim) === 4 && await count(bystander) === 4, 'after every forgery, nobody lost any data')
r = await fetch(ORIGIN + '/api/webhooks/clerk', { headers: { 'x-forwarded-for': ip() } })
ok(r.status === 404 || r.status === 405, `GET on the webhook is not served (${r.status})`)

// --- the real thing ---
r = await post(signed({ type: 'user.updated', data: { id: victim } }))
ok(r.status === 200 && (await r.json()).ignored === 'user.updated', 'other event types are acknowledged and ignored')
ok(await count(victim) === 4, 'an ignored event deletes nothing')
r = await post(signed(evt))
ok(r.status === 200 && (await r.json()).deleted === true, 'signed user.deleted is accepted')
ok(await count(victim) === 0, 'the deleted account has no data left (income, goal, contribution, profile)')
ok(await count(bystander) === 4, "another user's data is untouched")
r = await post(signed(evt))
ok(r.status === 200, 'Clerk retrying the same event is harmless')
r = await post(signed({ type: 'user.deleted', data: {} }))
ok(r.status === 200 && (await count(bystander)) === 4, 'a user.deleted with no id deletes nothing')

// the exemption is for this route only
r = await fetch(ORIGIN + '/api/sync', { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': bystander, 'x-forwarded-for': ip() }, body: '{"ops":[]}' })
ok(r.status === 403, 'other API routes still need the browser marker header (exemption is only for the webhook)')

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
