import { and, eq } from 'drizzle-orm'
import { pushSubscriptions } from '../../db/schema'

/** Sends a test notification to the signed-in person's own devices, so they can check reminders really arrive. */
export default defineEventHandler(async (event) => {
  const userId = requireUser(event)
  const db = await useDb()
  await enforceUserLimit(event, db, userId, 'push-test', 6, 3600)
  if (!pushReady()) throw createError({ statusCode: 503, statusMessage: 'Reminders are not set up on the server yet' })
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))
  const send = createSender()
  const payload = JSON.stringify({ title: 'Weka reminders are working', body: 'You will get a message like this when a bill is due.', url: '/settings/reminders', tag: 'weka-test' })
  let sent = 0, removed = 0, failed = 0
  for (const s of subs) {
    const r = await send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
    if (r === 'ok') sent++
    else if (r === 'gone') { removed++; await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, s.endpoint))) }
    else failed++
  }
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return { sent, removed, failed }
})
