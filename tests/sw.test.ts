import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

// Runs public/sw.js against a small fake browser so its caching choices can be checked without one.
function worker(opts: { windows?: any[]; cached?: Record<string, string>; network: (url: string) => Promise<{ ok: boolean; type: string; text: string }> }) {
  const store = new Map<string, any>(Object.entries(opts.cached ?? {}).map(([u, body]) => [u, { ok: true, type: 'basic', text: body, clone() { return this } }]))
  const listeners: Record<string, Function> = {}
  const fetched: string[] = []
  const caches = {
    open: async () => ({ put: async (req: any, res: any) => { store.set(req.url ?? req, res) }, add: async () => {}, addAll: async () => {} }),
    match: async (req: any) => store.get(typeof req === 'string' ? req : req.url),
    keys: async () => [], delete: async () => true,
  }
  const shown: { title: string; options: any }[] = []
  const windows: any[] = (opts as any).windows ?? []
  const opened: string[] = []
  const clients = {
    claim() {},
    matchAll: async () => windows,
    openWindow: async (u: string) => { opened.push(u) },
  }
  const self = { registration: { scope: 'https://weka.test/', showNotification: async (title: string, options: any) => { shown.push({ title, options }) } }, location: new URL('https://weka.test/'), addEventListener: (t: string, f: Function) => { listeners[t] = f }, skipWaiting() {}, clients }
  runInNewContext(readFileSync('public/sw.js', 'utf8'), { self, caches, URL, Promise, String, fetch: (r: any) => { fetched.push(r.url); return opts.network(r.url).then(x => ({ ...x, clone() { return this } })) } })
  /** The page's answer (as soon as the worker gives it) and a promise for everything the worker keeps doing afterwards. */
  function start(url: string) {
    let answer: Promise<any> | undefined; const waits: Promise<any>[] = []
    listeners.fetch!({ request: { method: 'GET', url, mode: 'navigate' }, respondWith: (p: any) => { answer = Promise.resolve(p) }, waitUntil: (p: any) => waits.push(p) })
    return { answer, finished: Promise.all(waits) }
  }
  async function navigate(url: string) { const { answer, finished } = start(url); const res = answer ? await answer : undefined; await finished; return res }
  /** Delivers a push message and waits for the worker to finish with it. */
  async function push(data: string | null) {
    const waits: Promise<any>[] = []
    listeners.push!({ data: data === null ? null : { json: () => JSON.parse(data), text: () => data }, waitUntil: (p: any) => waits.push(p) })
    await Promise.all(waits)
  }
  /** Taps a notification that carries `url` and waits for the worker. */
  async function tap(url?: unknown) {
    const waits: Promise<any>[] = []; let closed = false
    listeners.notificationclick!({ notification: { close: () => { closed = true }, data: url === undefined ? undefined : { url } }, waitUntil: (p: any) => waits.push(p) })
    await Promise.all(waits)
    return closed
  }
  return { navigate, start, push, tap, shown, opened, store, fetched }
}
const slow = (ms: number, text: string) => () => new Promise<any>(r => setTimeout(() => r({ ok: true, type: 'basic', text }), ms))

describe('service worker page loading', () => {
  it('opens a private screen from the saved copy without waiting for a slow network', async () => {
    const w = worker({ cached: { 'https://weka.test/home': 'OLD SHELL' }, network: slow(300, 'NEW SHELL') })
    const t = Date.now()
    const { answer, finished } = w.start('https://weka.test/home')
    const res = await answer
    expect(res.text).toBe('OLD SHELL')
    expect(Date.now() - t).toBeLessThan(100) // did not wait for the 300 ms network round trip
    await finished
    expect(Date.now() - t).toBeGreaterThanOrEqual(250) // the background refresh still ran to completion
    expect(w.store.get('https://weka.test/home').text).toBe('NEW SHELL')
  })
  it('refreshes the saved copy in the background for next time', async () => {
    const w = worker({ cached: { 'https://weka.test/home': 'OLD SHELL' }, network: slow(10, 'NEW SHELL') })
    await w.navigate('https://weka.test/home')
    expect(w.fetched).toContain('https://weka.test/home')
    expect(w.store.get('https://weka.test/home').text).toBe('NEW SHELL')
  })
  it('opens the Settings sub-screens from the saved copy too', async () => {
    const w = worker({ cached: { 'https://weka.test/settings/budget': 'OLD' }, network: slow(200, 'NEW') })
    const { answer } = w.start('https://weka.test/settings/budget')
    expect((await answer).text).toBe('OLD')
    const x = worker({ cached: { 'https://weka.test/settingsx': 'OLD' }, network: slow(5, 'NEW') })
    expect((await x.navigate('https://weka.test/settingsx')).text).toBe('NEW') // not a Settings screen: network first
  })
  it('uses the network the first time, when nothing is saved yet', async () => {
    const w = worker({ network: slow(10, 'FRESH') })
    expect((await w.navigate('https://weka.test/accounts')).text).toBe('FRESH')
  })
  it('falls back to the saved home screen when offline and the page was never saved', async () => {
    const w = worker({ cached: { 'https://weka.test/home': 'HOME SHELL' }, network: () => Promise.reject(new Error('offline')) })
    expect((await w.navigate('https://weka.test/goals')).text).toBe('HOME SHELL')
  })
  it('does not save an error page as the shell', async () => {
    const w = worker({ cached: { 'https://weka.test/home': 'GOOD' }, network: async () => ({ ok: false, type: 'basic', text: 'ERROR' }) })
    await w.navigate('https://weka.test/home')
    expect(w.store.get('https://weka.test/home').text).toBe('GOOD')
  })
  it('keeps the landing and legal pages network-first so updates arrive', async () => {
    const w = worker({ cached: { 'https://weka.test/': 'OLD LANDING' }, network: slow(10, 'NEW LANDING') })
    expect((await w.navigate('https://weka.test/')).text).toBe('NEW LANDING')
    const p = worker({ cached: { 'https://weka.test/privacy': 'OLD' }, network: slow(10, 'NEW') })
    expect((await p.navigate('https://weka.test/privacy')).text).toBe('NEW')
  })
  it('leaves API calls and sign-in handshakes alone', async () => {
    const w = worker({ network: slow(1, 'x') })
    expect(await w.navigate('https://weka.test/api/state')).toBeUndefined()
    expect(await w.navigate('https://weka.test/home?__clerk_handshake=abc')).toBeUndefined()
  })
})

describe('service worker bill reminders', () => {
  const net = { network: async () => ({ ok: true, type: 'basic', text: '' }) }
  it('shows a pushed reminder with its title, text and tag, and opens the Bills page when tapped', async () => {
    const w = worker(net)
    await w.push(JSON.stringify({ title: 'Rent is due today', body: 'Tap to mark it paid.', url: '/bills', tag: 'bill-reminders' }))
    expect(w.shown).toHaveLength(1)
    expect(w.shown[0]!.title).toBe('Rent is due today')
    expect(w.shown[0]!.options).toMatchObject({ body: 'Tap to mark it paid.', tag: 'bill-reminders', icon: 'https://weka.test/icons/icon-192.png', data: { url: 'https://weka.test/bills' } })
  })
  it('still shows a plain notification when the message is empty or unreadable (browsers require one)', async () => {
    for (const data of [null, 'not json at all', '42', 'null']) {
      const w = worker(net); await w.push(data)
      expect(w.shown, String(data)).toHaveLength(1)
      expect(w.shown[0]!.title).toBe('Weka')
    }
  })
  it('cuts overlong text so a bad message cannot fill the screen', async () => {
    const w = worker(net)
    await w.push(JSON.stringify({ title: 'T'.repeat(500), body: 'B'.repeat(2000), tag: 'x'.repeat(500) }))
    expect(w.shown[0]!.title.length).toBe(120); expect(w.shown[0]!.options.body.length).toBe(300); expect(w.shown[0]!.options.tag.length).toBe(60)
  })
  it('only ever opens a page on this site, whatever the message says', async () => {
    for (const evil of ['https://evil.example.com/steal', '//evil.example.com', 'javascript:alert(1)', 42, null]) {
      const w = worker(net)
      await w.push(JSON.stringify({ title: 'x', url: evil }))
      expect(w.shown[0]!.options.data.url, String(evil)).toMatch(/^https:\/\/weka\.test\//)
    }
    const w = worker(net); await w.tap('https://evil.example.com/x'); expect(w.opened).toEqual(['https://weka.test/home'])
  })
  it('closes the notification and opens the app when none is open', async () => {
    const w = worker(net)
    expect(await w.tap('https://weka.test/bills')).toBe(true)
    expect(w.opened).toEqual(['https://weka.test/bills'])
  })
  it('reuses a window that is already open on Weka instead of opening another', async () => {
    const calls: string[] = []
    const win = { url: 'https://weka.test/home', focus: async () => win, navigate: async (u: string) => { calls.push(u) } }
    const w = worker({ ...net, windows: [{ url: 'https://other.example/', focus: async () => { throw new Error('wrong window') } }, win] })
    await w.tap('https://weka.test/bills')
    expect(calls).toEqual(['https://weka.test/bills']); expect(w.opened).toEqual([])
  })
  it('falls back to the home screen when the notification carries no address', async () => {
    const w = worker(net); await w.tap(); expect(w.opened).toEqual(['https://weka.test/home'])
  })
})
