import { createHash, timingSafeEqual } from 'node:crypto'

// Called once a day by Vercel Cron (see vercel.json), which sends "Authorization: Bearer <CRON_SECRET>". Nobody else may run it.
const digest = (s: string) => createHash('sha256').update(s).digest()

export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET
  if (!secret || secret.length < 16) throw createError({ statusCode: 503, statusMessage: 'Not configured' })
  const given = (getHeader(event, 'authorization') ?? '').replace(/^Bearer /i, '')
  if (!timingSafeEqual(digest(given), digest(secret))) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (!pushReady()) throw createError({ statusCode: 503, statusMessage: 'Reminders are not set up on the server yet' })

  const stats = await runReminders(await useDb(), { send: createSender() })
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return stats // counts only: nothing about who or what
})
