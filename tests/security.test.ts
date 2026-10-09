import { describe, expect, it } from 'vitest'
import { buildCsp, clerkHostFromKey, createRateLimiter, crossSiteReason } from '../shared/security'

describe('clerkHostFromKey', () => {
  it('decodes the frontend API host', () => {
    expect(clerkHostFromKey('pk_test_' + btoa('example-app-1.clerk.accounts.dev$'))).toBe('example-app-1.clerk.accounts.dev')
    expect(clerkHostFromKey('pk_live_' + btoa('clerk.example.com$'))).toBe('clerk.example.com')
  })
  it('refuses anything that is not a clean hostname', () => {
    expect(clerkHostFromKey(undefined)).toBeNull()
    expect(clerkHostFromKey('nonsense')).toBeNull()
    expect(clerkHostFromKey('pk_test_' + btoa('evil.com; script-src *$'))).toBeNull()
    expect(clerkHostFromKey('pk_test_' + btoa("a.com' https://evil.com$"))).toBeNull()
    expect(clerkHostFromKey('pk_test_%%%')).toBeNull()
  })
})

describe('buildCsp', () => {
  const csp = buildCsp('clerk.example.com')
  const dir = (n: string) => csp.split('; ').find(d => d.startsWith(n + ' ')) ?? ''
  it('blocks plugins, base-URL tricks and framing', () => {
    expect(dir('object-src')).toBe("object-src 'none'")
    expect(dir('base-uri')).toBe("base-uri 'self'")
    expect(dir('frame-ancestors')).toBe("frame-ancestors 'self'")
    expect(dir('form-action')).toBe("form-action 'self'")
    expect(csp).toContain('upgrade-insecure-requests')
  })
  it('only allows own origin plus Clerk and its bot check', () => {
    expect(dir('default-src')).toBe("default-src 'self'")
    expect(dir('script-src')).toContain('https://clerk.example.com')
    expect(dir('script-src')).toContain('https://challenges.cloudflare.com')
    for (const d of ['script-src', 'connect-src', 'frame-src', 'img-src']) expect(dir(d)).not.toMatch(/\s\*(\s|$)/) // never a bare wildcard
    expect(dir('connect-src')).not.toContain('unsafe')
  })
  it('works without a Clerk host', () => expect(buildCsp(null)).toContain("default-src 'self'"))
})

describe('crossSiteReason (CSRF)', () => {
  const base = { method: 'POST', host: 'app.example.com' }
  it('allows our own pages and non-browser clients', () => {
    expect(crossSiteReason({ ...base, fetchSite: 'same-origin', origin: 'https://app.example.com' })).toBeNull()
    expect(crossSiteReason({ ...base })).toBeNull()
    expect(crossSiteReason({ ...base, fetchSite: 'none' })).toBeNull()
  })
  it('refuses other sites, including sibling subdomains', () => {
    expect(crossSiteReason({ ...base, fetchSite: 'cross-site' })).not.toBeNull()
    expect(crossSiteReason({ ...base, fetchSite: 'same-site' })).not.toBeNull()
    expect(crossSiteReason({ ...base, origin: 'https://evil.com' })).not.toBeNull()
    expect(crossSiteReason({ ...base, origin: 'https://app.example.com.evil.com' })).not.toBeNull()
    expect(crossSiteReason({ ...base, origin: 'null' })).not.toBeNull()
    expect(crossSiteReason({ ...base, origin: 'not a url' })).not.toBeNull()
  })
  it('does not interfere with reads', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) expect(crossSiteReason({ method, host: 'a.com', fetchSite: 'cross-site' })).toBeNull()
  })
  it('treats DELETE/PUT/PATCH as writes', () => {
    for (const method of ['DELETE', 'PUT', 'PATCH', 'post']) expect(crossSiteReason({ method, host: 'a.com', fetchSite: 'cross-site' })).not.toBeNull()
  })
})

describe('createRateLimiter', () => {
  it('allows up to the limit then refuses with a retry time', () => {
    const rl = createRateLimiter(3, 60_000)
    expect([1, 2, 3].map(() => rl.hit('ip', 1000).ok)).toEqual([true, true, true])
    const r = rl.hit('ip', 1000)
    expect(r.ok).toBe(false)
    expect(r.retryAfter).toBe(60)
  })
  it('tracks keys separately and resets after the window', () => {
    const rl = createRateLimiter(1, 1000)
    expect(rl.hit('a', 0).ok).toBe(true)
    expect(rl.hit('a', 10).ok).toBe(false)
    expect(rl.hit('b', 10).ok).toBe(true)
    expect(rl.hit('a', 1001).ok).toBe(true)
  })
  it('does not grow without bound', () => {
    const rl = createRateLimiter(1, 10, 100)
    for (let i = 0; i < 1000; i++) rl.hit('k' + i, i * 20)
    expect(rl.hit('fresh', 99_999).ok).toBe(true)
  })
})
