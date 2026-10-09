// Attacks a running server. Two modes:
//   dev  (default): `npm run dev:local` is running; exercises the authenticated path with the dev-only bypass.
//   prod (PROD=1):  a production build is running (fake or real Clerk keys); only unauthenticated attacks are possible.
const ORIGIN = process.env.API_URL || 'http://localhost:3000'
const PROD = process.env.PROD === '1'
let fails = 0
const ok = (c, m) => { if (!c) fails++; console.log(c ? 'ok  ' : 'FAIL', m) }
const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`
const MARK = { 'x-requested-with': 'budgetnow' }
const user = 'sec_user_' + Date.now()
const req = (path, { method = 'GET', headers = {}, body, ipaddr = ip(), dev = true } = {}) =>
  fetch(ORIGIN + path, { method, headers: { 'x-forwarded-for': ipaddr, ...(dev && !PROD ? { 'x-dev-user': user } : {}), ...headers }, body, redirect: 'manual' })
const json = (o) => JSON.stringify(o)
const J = { 'content-type': 'application/json' }
const income = (id, label = 'x') => ({ t: 'incomes', op: 'put', row: { id, label, amount: 1, date: '2026-10-01', split: { needs: 1, wants: 0, savings: 0, debt: 0 } } })

console.log(`mode: ${PROD ? 'production build' : 'dev server'} @ ${ORIGIN}\n`)

// ---------- headers ----------
{
  const r = await req('/', { dev: false })
  const h = (n) => r.headers.get(n) || ''
  ok(h('x-content-type-options') === 'nosniff', 'nosniff header')
  ok(/strict-origin/.test(h('referrer-policy')), 'referrer policy')
  ok(h('x-frame-options') === 'SAMEORIGIN', 'clickjacking protection (X-Frame-Options)')
  ok(/max-age=\d{7,}/.test(h('strict-transport-security')), 'HSTS')
  ok(/camera=\(\)/.test(h('permissions-policy')), 'permissions policy denies camera/mic/location')
  if (PROD) {
    const csp = h('content-security-policy')
    ok(/default-src 'self'/.test(csp) && /object-src 'none'/.test(csp) && /frame-ancestors 'self'/.test(csp) && /base-uri 'self'/.test(csp), 'CSP present with default-src self, no plugins, no framing, fixed base-uri')
    ok(!/script-src[^;]*\s\*(\s|;|$)/.test(csp), 'CSP has no wildcard script source')
  }
  const priv = await req('/home', { dev: false })
  ok(/noindex/.test(priv.headers.get('x-robots-tag') || ''), 'private app route is noindex')
  const api = await req('/api/state', { dev: !PROD })
  ok(/noindex/.test(api.headers.get('x-robots-tag') || ''), 'API responses are noindex')
}

// ---------- authentication (production) ----------
if (PROD) {
  for (const [name, path, method, extra] of [
    ['GET /api/state', '/api/state', 'GET', {}],
    ['POST /api/sync', '/api/sync', 'POST', { ...J, ...MARK }],
    ['DELETE /api/account', '/api/account', 'DELETE', { ...MARK, 'x-confirm': 'delete-my-account' }],
  ]) {
    const r = await req(path, { method, headers: extra, body: method === 'POST' ? json({ ops: [] }) : undefined, dev: false })
    ok(r.status === 401, `${name} without a session -> ${r.status} (want 401)`)
    ok(!/node_modules|\/Users\/|\/home\/|at async|"stack"/.test(await r.text()), `${name} 401 body leaks nothing`)
  }
  ok((await req('/api/state', { headers: { 'x-dev-user': 'attacker' }, dev: false })).status === 401, 'dev bypass header is ignored in production')
  ok((await req('/api/state', { headers: { authorization: 'Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEifQ.AAAA' }, dev: false })).status === 401, 'forged bearer token rejected')
  ok((await req('/api/state', { headers: { cookie: '__session=eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEifQ.AAAA; __client_uat=1' }, dev: false })).status === 401, 'forged session cookie rejected')
  ok((await req('/api/state?userId=user_victim', { dev: false })).status === 401, 'userId in the query string grants nothing')
}

// ---------- CSRF / cross-site (dev bypass lets us reach the guarded path) ----------
if (!PROD) {
  const body = json({ ops: [income('csrf1')] })
  const post = (headers) => req('/api/sync', { method: 'POST', headers, body })
  ok((await post({ ...J, ...MARK })).status === 200, 'a legitimate same-origin write works')
  ok((await post({ ...J })).status === 403, 'write without the request marker header -> 403')
  ok((await post({ ...J, ...MARK, origin: 'https://evil.example' })).status === 403, 'write with a foreign Origin -> 403')
  ok((await post({ ...J, ...MARK, origin: 'null' })).status === 403, 'write with Origin: null (sandboxed iframe) -> 403')
  ok((await post({ ...J, ...MARK, 'sec-fetch-site': 'cross-site' })).status === 403, 'browser-declared cross-site write -> 403')
  ok((await post({ ...J, ...MARK, 'sec-fetch-site': 'same-site' })).status === 403, 'sibling-subdomain write -> 403')
  ok((await post({ ...J, ...MARK, 'sec-fetch-site': 'same-origin' })).status === 200, 'browser-declared same-origin write allowed')
  ok((await post({ 'content-type': 'application/x-www-form-urlencoded', ...MARK })).status === 415, 'HTML-form style body -> 415')
  ok((await post({ 'content-type': 'text/plain', ...MARK })).status === 415, 'text/plain body (no-preflight trick) -> 415')
  ok((await req('/api/account', { method: 'DELETE', headers: { ...MARK } })).status === 400, 'DELETE /api/account without explicit confirmation -> 400')
  ok((await req('/api/account', { method: 'DELETE', headers: { 'x-confirm': 'delete-my-account' } })).status === 403, 'DELETE /api/account without request marker -> 403')
  ok((await req('/api/account', { method: 'DELETE', headers: { ...MARK, 'x-confirm': 'delete-my-account', 'sec-fetch-site': 'cross-site' } })).status === 403, 'cross-site DELETE /api/account -> 403')
  ok((await req('/api/state', { headers: { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' } })).status === 200, 'plain reads are not blocked by the write guard')
}

// ---------- injection / hostile data ----------
if (!PROD) {
  const send = (ops) => req('/api/sync', { method: 'POST', headers: { ...J, ...MARK }, body: json({ ops }) })
  const payloads = ["'; DROP TABLE incomes; --", '<img src=x onerror=alert(1)>', '</script><script>alert(1)</script>', '${7*7}{{7*7}}', '\u0000nul', '😀 unicode ✓ ñ', "Robert'); DELETE FROM expenses;--"]
  for (const [i, p] of payloads.entries()) {
    const r = await send([income('inj' + i, p)])
    if (p.includes('\u0000')) { ok(r.status === 400 || r.status === 200 || r.status === 500, 'NUL byte handled without crashing the server'); continue }
    ok(r.status === 200, `hostile label #${i} accepted as plain data`)
  }
  const back = await (await req('/api/state')).json()
  ok(payloads.filter(p => !p.includes('\u0000')).every(p => back.incomes.some(r => r.label === p)), 'hostile strings come back byte-for-byte unchanged (stored as data, never executed)')
  ok((await (await req('/api/state')).json()).incomes.length >= 6, 'tables survived the injection attempts')
  ok((await send([income('long1', 'x'.repeat(121))])).status === 400, 'label longer than 120 chars rejected')
  ok((await send([{ t: 'incomes', op: 'put', row: { ...income('pp1').row, '__proto__': { admin: true }, constructor: { prototype: { admin: true } } } }])).status === 200, 'prototype-pollution keys are ignored')
  ok((await send([income('pp2')])).status === 200 && (await (await req('/api/state')).json()).admin === undefined, 'server still behaves normally after prototype-pollution attempt')
  ok((await send([{ t: 'incomes', op: 'put', row: { ...income('mass1').row, userId: 'someone_else' } }])).status === 200 && !(await (await req('/api/state', { headers: { 'x-dev-user': 'someone_else' } })).json()).incomes.some(r => r.id === 'mass1'), 'a userId smuggled into a row cannot write into another account')
  ok((await send([{ t: 'incomes', op: 'put', row: { ...income('num1').row, amount: 1e300 } }])).status === 400, 'absurd amount rejected')
  ok((await send([{ t: 'incomes', op: 'put', row: { ...income('num2').row, amount: 'NaN' } }])).status === 400, 'non-numeric amount rejected')
  ok((await send([{ t: 'goals', op: 'put', row: { id: 'g1', name: 'n', target: 5, icon: 'i', color: 'red;}</style><script>', contributions: [] } }])).status === 400, 'CSS/HTML injection in a colour field rejected')
  const deep = (n) => { let o = { a: 1 }; for (let i = 0; i < n; i++) o = { a: o }; return o }
  ok([200, 400].includes((await send([{ t: 'incomes', op: 'put', row: { ...income('deep1').row, extra: deep(2000) } }])).status), 'very deeply nested JSON does not crash the server')
  ok((await req('/api/state')).status === 200, 'server healthy after hostile input')
}

// ---------- malformed requests, body size, methods, error hygiene ----------
{
  const hdr = PROD ? { ...J, ...MARK } : { ...J, ...MARK }
  if (!PROD) {
    const bad = await req('/api/sync', { method: 'POST', headers: hdr, body: '{not json' })
    ok(bad.status === 400, 'malformed JSON -> 400')
    const big = await req('/api/sync', { method: 'POST', headers: hdr, body: json({ ops: [income('big1', 'a'.repeat(100))], pad: 'z'.repeat(2_100_000) }) })
    ok(big.status === 413, `oversized body -> ${big.status} (want 413)`)
    ok((await req('/api/sync', { method: 'POST', headers: hdr, body: json({ ops: Array.from({ length: 1001 }, (_, i) => ({ t: 'incomes', op: 'del', id: 'd' + i })) }) })).status === 400, 'more than 1000 operations rejected')
    ok([404, 405].includes((await req('/api/sync', { method: 'PUT', headers: hdr, body: '{}' })).status), 'PUT /api/sync is not served')
    ok([404, 405].includes((await req('/api/sync')).status), 'GET /api/sync is not served')
  }
  const nf = await req('/api/nope', { dev: !PROD })
  ok(nf.status === 404, 'unknown API route -> 404')
  // Dev servers include stack traces on purpose; what matters is that a production build does not.
  if (PROD) ok(!/node_modules|\/Users\/|\/home\/|at async|"stack"/.test(await nf.text()), '404 body leaks no stack trace or file paths')
  ok((await req('/api/../.env', { dev: false })).status !== 200, 'path traversal to .env does not serve the file')
  for (const p of ['/.env', '/.git/config', '/drizzle/0000_init.sql', '/server/db/schema.ts', '/package.json']) {
    const r = await req(p, { dev: false })
    const t = r.status === 200 ? await r.text() : ''
    ok(!/postgres|DATABASE_URL|sk_test|CREATE TABLE|\[core\]|pgTable|"dependencies"/.test(t), `${p} does not expose source or secrets`)
  }
}

// ---------- rate limiting (last: it exhausts a window) ----------
{
  const myIp = ip()
  const statuses = []
  for (let i = 0; i < 80; i++) statuses.push((await req('/api/state', { ipaddr: myIp, dev: !PROD })).status)
  ok(!statuses.slice(0, 50).includes(429), 'normal use is never throttled')
  const wcount = []
  const wIp = ip()
  for (let i = 0; i < 70; i++) wcount.push((await req('/api/sync', { method: 'POST', headers: { ...J, ...MARK }, body: json({ ops: [] }), ipaddr: wIp, dev: !PROD })).status)
  ok(wcount.includes(429), 'a burst of 70 writes from one IP gets 429')
  const limited = await req('/api/sync', { method: 'POST', headers: { ...J, ...MARK }, body: json({ ops: [] }), ipaddr: wIp, dev: !PROD })
  ok(limited.status === 429 && Number(limited.headers.get('retry-after')) > 0, '429 includes Retry-After')
  ok((await req('/api/state', { ipaddr: ip(), dev: !PROD, headers: { 'x-dev-user': 'fresh_' + Date.now() } })).status !== 429, 'a different client IP (and user) is unaffected')
}

// ---------- per-user limit shared across IPs (database-backed) ----------
if (!PROD) {
  // The in-memory limiter is per IP. A user rotating IPs must still hit the per-user limit kept in the database.
  const rl = 'rl_user_' + Date.now()
  const hit = (path, init = {}) => fetch(ORIGIN + path, { ...init, headers: { 'x-forwarded-for': ip(), 'x-dev-user': rl, ...MARK, ...J, ...(init.headers || {}) } })
  const syncs = []
  for (let i = 0; i < 250; i++) syncs.push((await hit('/api/sync', { method: 'POST', body: json({ ops: [] }) })).status)
  ok(syncs.slice(0, 240).every(s => s === 200), 'first 240 writes in a minute are served, even from many IPs')
  ok(syncs.slice(240).includes(429), 'writes beyond 240/min for ONE user are refused even when the IP keeps changing')
  const blocked = await hit('/api/sync', { method: 'POST', body: json({ ops: [] }) })
  ok(blocked.status === 429 && Number(blocked.headers.get('retry-after')) > 0, 'refusal carries Retry-After')
  const other = await fetch(ORIGIN + '/api/sync', { method: 'POST', headers: { 'x-forwarded-for': ip(), 'x-dev-user': 'rl_other_' + Date.now(), ...MARK, ...J }, body: json({ ops: [] }) })
  ok(other.status === 200, "another user is not affected by someone else's limit")
  const reads = []
  for (let i = 0; i < 70; i++) reads.push((await hit('/api/state')).status)
  ok(reads.includes(429), 'state reads are limited per user too (60/min)')
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)
