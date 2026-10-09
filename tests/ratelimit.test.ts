import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { beforeAll, describe, expect, it } from 'vitest'
import { dbRateLimit, pruneRateLimits } from '../server/utils/rateLimit'
import * as schema from '../server/db/schema'

let db: any
beforeAll(async () => {
  db = drizzle(new PGlite(), { schema })
  await migrate(db, { migrationsFolder: 'drizzle' }) // runs the real migrations, including the rate_limits table
})
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

describe('database-backed rate limit', () => {
  it('allows up to the limit, then refuses with a retry time', async () => {
    const results = []
    for (let i = 0; i < 5; i++) results.push(await dbRateLimit(db, 'k:basic', 3, 60))
    expect(results.map(r => r.ok)).toEqual([true, true, true, false, false])
    expect(results.map(r => r.count)).toEqual([1, 2, 3, 4, 5])
    expect(results[3]!.retryAfter).toBeGreaterThan(0)
    expect(results[3]!.retryAfter).toBeLessThanOrEqual(60)
  })

  it('keeps separate counters per key', async () => {
    for (let i = 0; i < 3; i++) await dbRateLimit(db, 'k:a', 2, 60)
    expect((await dbRateLimit(db, 'k:a', 2, 60)).ok).toBe(false)
    expect((await dbRateLimit(db, 'k:b', 2, 60)).ok).toBe(true)
  })

  it('starts a fresh window once the old one has expired', async () => {
    expect((await dbRateLimit(db, 'k:win', 1, 1)).ok).toBe(true)
    expect((await dbRateLimit(db, 'k:win', 1, 1)).ok).toBe(false)
    await sleep(1200)
    const r = await dbRateLimit(db, 'k:win', 1, 1)
    expect(r.ok).toBe(true)
    expect(r.count).toBe(1)
  })

  it('counts exactly even when many requests arrive at once', async () => {
    const results = await Promise.all(Array.from({ length: 40 }, () => dbRateLimit(db, 'k:burst', 10, 60)))
    expect(results.filter(r => r.ok)).toHaveLength(10)
    expect(results.filter(r => !r.ok)).toHaveLength(30)
    expect(new Set(results.map(r => r.count)).size).toBe(40) // every hit saw a distinct count: nothing double counted or lost
  })

  it('treats awkward keys as plain data', async () => {
    const key = "u:x'; DROP TABLE rate_limits;--:sync"
    expect((await dbRateLimit(db, key, 5, 60)).ok).toBe(true)
    expect((await dbRateLimit(db, 'k:still-works', 5, 60)).ok).toBe(true)
  })

  it('prunes only stale counters', async () => {
    await dbRateLimit(db, 'k:fresh', 5, 60)
    await db.execute(`INSERT INTO rate_limits (key, count, window_start) VALUES ('k:stale', 9, now() - interval '3 hours') ON CONFLICT (key) DO NOTHING`)
    await pruneRateLimits(db)
    const keys = (await db.select().from(schema.rateLimits)).map((r: any) => r.key)
    expect(keys).toContain('k:fresh')
    expect(keys).not.toContain('k:stale')
  })
})
