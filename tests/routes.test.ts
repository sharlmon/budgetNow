import { describe, expect, it } from 'vitest'
import { isAuthPage, isOpenPath, needsVerifiedSession } from '../app/utils/routes'

describe('which pages are open to everyone', () => {
  it('the landing page, legal pages, guides and the sign-in forms', () => {
    for (const p of ['/', '/privacy', '/terms', '/guides', '/guides/50-30-20-rule', '/sign-in', '/sign-in/factor-one', '/sign-up', '/sign-up/verify']) expect(isOpenPath(p), p).toBe(true)
  })
  it('every private screen needs a sign-in', () => {
    for (const p of ['/home', '/activity', '/analytics', '/goals', '/bills', '/debts', '/accounts', '/settings', '/settings/budget', '/settings/account']) expect(isOpenPath(p), p).toBe(false)
  })
  it('does not treat a path that only starts with an open name as open', () => {
    for (const p of ['/privacy-secrets', '/termsx', '/guidesabc', '/sign-inn']) expect(isOpenPath(p), p).toBe(false)
  })
  it('only the landing page and the sign-in forms wait for a verified session', () => {
    for (const p of ['/', '/sign-in', '/sign-up/verify']) expect(needsVerifiedSession(p), p).toBe(true)
    for (const p of ['/home', '/privacy', '/guides/50-30-20-rule', '/accounts']) expect(needsVerifiedSession(p), p).toBe(false)
    expect(isAuthPage('/sign-in')).toBe(true); expect(isAuthPage('/home')).toBe(false)
  })
})
