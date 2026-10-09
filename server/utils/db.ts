import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

type Db = ReturnType<typeof drizzlePg<typeof schema>>
let db: Db | undefined

/**
 * Production / Vercel: Neon Postgres through DATABASE_URL (use Neon's pooled connection string).
 * Local dev without DATABASE_URL: an in-process Postgres (PGlite) stored in .data/pglite, so no database is needed to try the app.
 */
export async function useDb(): Promise<Db> {
  if (db) return db
  const url = process.env.DATABASE_URL
  if (url) {
    // prepare:false keeps this compatible with pgbouncer-style pooled endpoints.
    db = drizzlePg(postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 }), { schema })
    return db
  }
  if (import.meta.dev) {
    const { PGlite } = await import('@electric-sql/pglite')
    const { drizzle } = await import('drizzle-orm/pglite')
    const { migrate } = await import('drizzle-orm/pglite/migrator')
    const dir = process.env.PGLITE_DIR ?? '.data/pglite'
    const { mkdirSync } = await import('node:fs')
    mkdirSync(dir, { recursive: true }) // PGlite won't create missing parent folders
    const local = drizzle(new PGlite(dir), { schema })
    await migrate(local, { migrationsFolder: 'drizzle' })
    // PGlite and postgres-js share the same query builder API, so the rest of the server treats them alike.
    db = local as unknown as Db
    return db
  }
  throw createError({ statusCode: 500, statusMessage: 'DATABASE_URL is not configured' })
}
