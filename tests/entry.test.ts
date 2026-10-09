import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { ENTRY_BOOT_SCRIPT, LAST_USER_KEY } from '../app/utils/entry'

// Runs the head script against a fake browser and reports where it sent the page, if anywhere.
function run(path: string, search: string, stored: Record<string, string>, storageThrows = false) {
  let replaced: string | null = null
  runInNewContext(ENTRY_BOOT_SCRIPT, {
    location: { pathname: path, search, replace: (u: string) => { replaced = u } },
    localStorage: { getItem: (k: string) => { if (storageThrows) throw new Error('blocked'); return stored[k] ?? null } },
  })
  return replaced
}

describe('landing page entry script', () => {
  const user = { [LAST_USER_KEY]: 'user_123' }
  it('sends a returning user from the landing page straight to the dashboard', () => expect(run('/', '', user)).toBe('/home'))
  it('leaves first-time visitors on the landing page', () => expect(run('/', '', {})).toBeNull())
  it('lets a returning user still read the landing page with ?landing', () => expect(run('/', '?landing', user)).toBeNull())
  it('never touches other pages', () => {
    for (const p of ['/privacy', '/terms', '/guides/50-30-20-rule', '/sign-in', '/home']) expect(run(p, '', user), p).toBeNull()
  })
  it('does nothing if storage is blocked', () => expect(run('/', '', user, true)).toBeNull())
})
