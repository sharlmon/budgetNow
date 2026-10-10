import { z } from 'zod'
import { DETAIL_OPTIONS, isAllowedPushEndpoint, isValidTimeZone } from '../../shared/reminders'

const b64url = z.string().min(8).max(200).regex(/^[A-Za-z0-9_-]+={0,2}$/)
const endpoint = z.string().refine(isAllowedPushEndpoint, 'not a supported push address')

export const subscribeBody = z.object({
  endpoint,
  keys: z.object({ p256dh: b64url, auth: b64url }),
  timeZone: z.string().refine(isValidTimeZone, 'unknown time zone'),
  daysBefore: z.number().int().min(0).max(7),
  detail: z.enum(DETAIL_OPTIONS),
})
export const endpointBody = z.object({ endpoint })

/** Reads a small JSON body, refusing anything large or malformed. */
export async function readSmallJson(event: any, maxBytes = 4096): Promise<unknown> {
  const raw = (await readRawBody(event, 'utf8')) ?? ''
  if (raw.length > maxBytes) throw createError({ statusCode: 413, statusMessage: 'Request too large' })
  try { return JSON.parse(raw) } catch { throw createError({ statusCode: 400, statusMessage: 'Invalid JSON' }) }
}
