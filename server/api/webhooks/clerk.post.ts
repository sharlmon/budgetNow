/**
 * Clerk calls this when something happens to an account. We only act on `user.deleted`: when someone deletes their
 * Clerk account anywhere (not just through our Delete account button), all of their budget data is removed too.
 *
 * Authentication is Clerk's Svix signature, checked against NUXT_CLERK_WEBHOOK_SIGNING_SECRET. There is no session
 * here, and the browser-origin checks do not apply because the caller is Clerk's server (see 01.security.ts).
 */
export default defineEventHandler(async (event) => {
  const secret = process.env.NUXT_CLERK_WEBHOOK_SIGNING_SECRET
  if (!secret) throw createError({ statusCode: 503, statusMessage: 'Webhook is not configured' })

  const body = (await readRawBody(event, 'utf8')) ?? ''
  if (body.length > 100_000) throw createError({ statusCode: 413, statusMessage: 'Payload too large' })
  const valid = verifySvix({
    secret, body,
    id: getHeader(event, 'svix-id'),
    timestamp: getHeader(event, 'svix-timestamp'),
    signature: getHeader(event, 'svix-signature'),
  })
  if (!valid) throw createError({ statusCode: 400, statusMessage: 'Invalid signature' })

  let payload: { type?: string; data?: { id?: string } }
  try { payload = JSON.parse(body) } catch { throw createError({ statusCode: 400, statusMessage: 'Invalid JSON' }) }

  if (payload.type === 'user.deleted' && typeof payload.data?.id === 'string' && payload.data.id) {
    await deleteUserData(await useDb(), payload.data.id)
    return { ok: true, deleted: true }
  }
  return { ok: true, ignored: payload.type ?? 'unknown' }
})
