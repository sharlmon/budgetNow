// Pure security helpers (no framework imports) so they can be unit tested.

/** The Clerk Frontend API host encoded in a publishable key (pk_test_/pk_live_ + base64 of "host$"). */
export function clerkHostFromKey(key: string | undefined): string | null {
  const m = /^pk_(?:test|live)_(.+)$/.exec(key ?? '')
  if (!m) return null
  try {
    const host = atob(m[1]!).replace(/\$$/, '')
    return /^[a-z0-9.-]+$/i.test(host) ? host : null
  } catch { return null }
}

/**
 * Content-Security-Policy for pages. Scripts allow 'unsafe-inline' because Nuxt writes its start-up data into the HTML;
 * everything else is locked down, nothing user-supplied is ever rendered as HTML, and framing/plugins/base-URL tricks are blocked.
 */
export function buildCsp(clerkHost: string | null): string {
  const clerk = ['https://*.clerk.accounts.dev', 'https://*.clerk.com', ...(clerkHost ? [`https://${clerkHost}`] : [])]
  const turnstile = 'https://challenges.cloudflare.com'
  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' ${clerk.join(' ')} ${turnstile}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com`,
    `font-src 'self' data:`,
    `connect-src 'self' ${clerk.join(' ')} https://clerk-telemetry.com`,
    `frame-src ${clerk.join(' ')} ${turnstile}`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ')
}

export interface CrossSiteInput { method: string; host: string; origin?: string; fetchSite?: string }

/**
 * Cookie-authenticated, state-changing requests must come from our own pages.
 * Browsers set Sec-Fetch-Site and Origin themselves and scripts on other sites cannot forge them.
 * Returns a reason when the request should be refused.
 */
export function crossSiteReason(r: CrossSiteInput): string | null {
  if (['GET', 'HEAD', 'OPTIONS'].includes(r.method.toUpperCase())) return null
  if (r.fetchSite && !['same-origin', 'none'].includes(r.fetchSite)) return `cross-site request (${r.fetchSite})`
  if (r.origin) {
    let host: string
    try { host = new URL(r.origin).host } catch { return 'invalid origin' }
    if (host !== r.host) return 'origin does not match'
  }
  return null
}

export interface LimitResult { ok: boolean; retryAfter: number }

/** Fixed-window counter per key, held in memory. Best effort on serverless (each instance counts for itself). */
export function createRateLimiter(limit: number, windowMs: number, maxKeys = 5000) {
  const hits = new Map<string, { count: number; reset: number }>()
  return {
    hit(key: string, now = Date.now()): LimitResult {
      if (hits.size > maxKeys) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k)
      let e = hits.get(key)
      if (!e || e.reset <= now) { e = { count: 0, reset: now + windowMs }; hits.set(key, e) }
      e.count++
      return e.count > limit ? { ok: false, retryAfter: Math.max(1, Math.ceil((e.reset - now) / 1000)) } : { ok: true, retryAfter: 0 }
    },
  }
}

/** Marker header our own pages send on every API write; other sites cannot add it without a CORS preflight we refuse. */
export const API_MARKER = { name: 'x-requested-with', value: 'budgetnow' } as const
export const DELETE_CONFIRM = { name: 'x-confirm', value: 'delete-my-account' } as const
export const MAX_BODY_BYTES = 2_000_000
