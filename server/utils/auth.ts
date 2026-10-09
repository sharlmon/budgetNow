import type { H3Event } from 'h3'

/**
 * The signed-in Clerk user id for this request, or a 401.
 * DEV_AUTH_BYPASS is honoured only by `nuxt dev` (import.meta.dev is false in every production build),
 * so it can never switch auth off on a deployed app.
 */
export function requireUser(event: H3Event): string {
  if (import.meta.dev && process.env.DEV_AUTH_BYPASS === '1') {
    return String(getHeader(event, 'x-dev-user') || 'dev-user').slice(0, 64)
  }
  const userId = event.context.auth?.()?.userId
  if (!userId) throw createError({ statusCode: 401, statusMessage: 'Sign in required' })
  return userId
}
