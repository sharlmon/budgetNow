import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

// Runs public/sw.js against a small fake browser so its caching choices can be checked without one.
function worker(opts: { cached?: Record<string, string>; network: (url: string) => Promise<{ ok: boolean; type: string; text: string }> }) {
  const store = new Map<string, any>(Object.entries(opts.cached ?? {}).map(([u, body]) => [u, { ok: true, type: 'basic', text: body, clone() { return this } }]))
  const listeners: Record<string, Function> = {}
  const fetched: string[] = []
  const caches = {
    open: async () => ({ put: async (req: any, res: any) => { store.set(req.url ?? req, res) }, add: async () => {}, addAll: async () => {} }),
    match: async (req: any) => store.get(typeof req === 'string' ? req : req.url),
    keys: async () => [], delete: async () => true,
  }
  const self = { registration: { scope: 'https://weka.test/' }, location: new URL('https://weka.test/'), addEventListener: (t: string, f: Function) => { listeners[t] = f }, skipWaiting() {}, clients: { claim() {} } }
  runInNewContext(readFileSync('public/sw.js', 'utf8'), { self, caches, URL, Promise, fetch: (r: any) => { fetched.push(r.url); return opts.network(r.url).then(x => ({ ...x, clone() { return this } })) } })
  /** The page's answer (as soon as the worker gives it) and a promise for everything the worker keeps doing afterwards. */
  function start(url: string) {
    let answer: Promise<any> | undefined; const waits: Promise<any>[] = []
    listeners.fetch!({ request: { method: 'GET', url, mode: 'navigate' }, respondWith: (p: any) => { answer = Promise.resolve(p) }, waitUntil: (p: any) => waits.push(p) })
    return { answer, finished: Promise.all(waits) }
  }
  async function navigate(url: string) { const { answer, finished } = start(url); const res = answer ? await answer : undefined; await finished; return res }
  return { navigate, start, store, fetched }
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
