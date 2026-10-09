import { sql } from 'drizzle-orm'
import { rateLimits } from '../db/schema'

export interface DbLimitResult { ok: boolean; retryAfter: number; count: number }

/**
 * Counts one hit for `key` in a fixed window shared by every server instance.
 * One atomic statement: it starts a new window when the old one has expired, otherwise adds one.
 * `db` is any Drizzle database (Postgres in production, PGlite in dev and tests).
 */
export async function dbRateLimit(db: any, key: string, limit: number, windowSeconds: number): Promise<DbLimitResult> {
  const win = sql`make_interval(secs => ${windowSeconds}::double precision)`
  const expired = sql`${rateLimits.windowStart} < now() - ${win}`
  const [row] = await db.insert(rateLimits).values({ key, count: 1 }).onConflictDoUpdate({
    target: rateLimits.key,
    set: {
      count: sql`CASE WHEN ${expired} THEN 1 ELSE ${rateLimits.count} + 1 END`,
      windowStart: sql`CASE WHEN ${expired} THEN now() ELSE ${rateLimits.windowStart} END`,
    },
  }).returning({
    count: rateLimits.count,
    retry: sql<number>`EXTRACT(EPOCH FROM (${rateLimits.windowStart} + ${win} - now()))`,
  })
  const count = Number(row.count)
  return { ok: count <= limit, count, retryAfter: Math.max(1, Math.ceil(Number(row.retry))) }
}

/** Removes expired counters. Called occasionally so the table stays tiny. */
export async function pruneRateLimits(db: any) {
  await db.delete(rateLimits).where(sql`${rateLimits.windowStart} < now() - interval '1 hour'`)
}

/**
 * Per-user limit shared across all instances. Only call this after the user is authenticated, so anonymous
 * traffic can never cause database writes. If the counter table is unreachable it fails open: the in-memory
 * per-IP limiter in middleware still applies and a limiter outage must not take the app down.
 */
export async function enforceUserLimit(event: any, db: any, userId: string, bucket: string, limit: number, windowSeconds: number) {
  let r: DbLimitResult
  try {
    r = await dbRateLimit(db, `u:${userId}:${bucket}`, limit, windowSeconds)
    if (Math.random() < 0.02) pruneRateLimits(db).catch(() => {})
  } catch { return }
  if (!r.ok) {
    setResponseHeader(event, 'Retry-After', r.retryAfter)
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please slow down.' })
  }
}
