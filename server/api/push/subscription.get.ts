import { and, eq } from 'drizzle-orm'
import { pushSubscriptions } from '../../db/schema'
import { endpointBody } from '../../utils/pushBody'

/** The reminder choices saved for one device, so Settings can show them. 404 when the server does not know that device. */
export default defineEventHandler(async (event) => {
  const userId = requireUser(event)
  const db = await useDb()
  await enforceUserLimit(event, db, userId, 'push-read', 60, 60)
  const parsed = endpointBody.safeParse({ endpoint: getQuery(event).endpoint })
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid address' })
  const [row] = await db.select().from(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, parsed.data.endpoint)))
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Not subscribed' })
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return { daysBefore: row.daysBefore, detail: row.detail, timeZone: row.timeZone }
})
