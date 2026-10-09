import { API_MARKER, createRateLimiter, crossSiteReason } from '../../shared/security'

// Guards every /api route before any handler (or Clerk) runs.
//  - rate limits per client IP (in memory, so best effort per serverless instance; add a Vercel Firewall rule for a global limit)
//  - state-changing requests must come from our own pages: same-site checks plus a marker header that other sites cannot send
const anyApi = createRateLimiter(300, 60_000)
const writes = createRateLimiter(60, 60_000)
const destructive = createRateLimiter(3, 60_000)

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/')) return
  const method = event.method.toUpperCase()
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(method)
  // Behind Vercel the first X-Forwarded-For entry is the real client; Vercel overwrites anything the client sends.
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

  const limits = [anyApi.hit(`all:${ip}`), ...(isWrite ? [writes.hit(`w:${ip}`)] : []), ...(path === '/api/account' && isWrite ? [destructive.hit(`d:${ip}`)] : [])]
  const blocked = limits.find(l => !l.ok)
  if (blocked) {
    setResponseHeader(event, 'Retry-After', blocked.retryAfter)
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please slow down.' })
  }

  if (!isWrite) return
  const reason = crossSiteReason({ method, host: getRequestHost(event), origin: getHeader(event, 'origin'), fetchSite: getHeader(event, 'sec-fetch-site') })
  if (reason) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  if (getHeader(event, API_MARKER.name) !== API_MARKER.value) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  if (method === 'POST' && !(getHeader(event, 'content-type') ?? '').toLowerCase().startsWith('application/json')) {
    throw createError({ statusCode: 415, statusMessage: 'Unsupported media type' })
  }
})
