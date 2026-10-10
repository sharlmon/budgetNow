import { and, count, eq } from 'drizzle-orm'
import { pushSubscriptions } from '../../db/schema'
import { subscribeBody, readSmallJson } from '../../utils/pushBody'

const MAX_DEVICES = 10

/** Saves (or updates) this device's reminder subscription and choices. The user comes from the verified session, never from the body. */
export default defineEventHandler(async (event) => {
  const userId = requireUser(event)
  const db = await useDb()
  await enforceUserLimit(event, db, userId, 'push-subscribe', 30, 3600)
  const parsed = subscribeBody.safeParse(await readSmallJson(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid subscription' })
  const b = parsed.data

  const [known] = await db.select({ n: count() }).from(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, b.endpoint)))
  if (!Number(known?.n)) {
    const [mine] = await db.select({ n: count() }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))
    if (Number(mine?.n) >= MAX_DEVICES) throw createError({ statusCode: 409, statusMessage: 'Too many devices have reminders on. Turn some off first.' })
  }
  await db.insert(pushSubscriptions).values({ userId, endpoint: b.endpoint, p256dh: b.keys.p256dh, auth: b.keys.auth, timeZone: b.timeZone, daysBefore: b.daysBefore, detail: b.detail })
    .onConflictDoUpdate({ target: [pushSubscriptions.userId, pushSubscriptions.endpoint], set: { p256dh: b.keys.p256dh, auth: b.keys.auth, timeZone: b.timeZone, daysBefore: b.daysBefore, detail: b.detail, updatedAt: new Date() } })
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return { ok: true }
})
