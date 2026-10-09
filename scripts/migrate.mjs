// Applies database migrations (./drizzle). Runs before every build so a deploy never ships code that is ahead of its schema.
// Uses the direct (unpooled) connection when Neon provides one, since DDL does not belong on a pooled endpoint.
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!url) {
  console.log('[migrate] DATABASE_URL is not set, skipping migrations.')
  process.exit(0)
}

const client = postgres(url, { max: 1, connect_timeout: 15 })
try {
  await migrate(drizzle(client), { migrationsFolder: 'drizzle' })
  console.log('[migrate] database is up to date.')
} catch (e) {
  console.error('[migrate] failed:', e)
  process.exitCode = 1
} finally {
  await client.end()
}
