import { and, eq } from 'drizzle-orm'
import { pushSubscriptions } from '../../db/schema'
import { endpointBody, readSmallJson } from '../../utils/pushBody'

/** Turns reminders off for one device. Only that person's own device can be removed. */
export default defineEventHandler(async (event) => {
  const userId = requireUser(event)
  const db = await useDb()
  await enforceUserLimit(event, db, userId, 'push-subscribe', 30, 3600)
  const parsed = endpointBody.safeParse(await readSmallJson(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid address' })
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, parsed.data.endpoint)))
  return { ok: true }
})
