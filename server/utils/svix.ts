import { createHmac, timingSafeEqual } from 'node:crypto'

export interface SvixInput {
  /** The endpoint signing secret from the Clerk dashboard ("whsec_" followed by base64). */
  secret: string
  id: string | undefined
  timestamp: string | undefined
  /** The `svix-signature` header: one or more space-separated "v1,<base64>" entries (several during key rotation). */
  signature: string | undefined
  /** The raw request body, exactly as received. */
  body: string
  now?: number
  toleranceSeconds?: number
}

/**
 * Verifies a webhook the way Svix (Clerk's webhook sender) signs it: HMAC-SHA256 over "<id>.<timestamp>.<body>"
 * with the base64-decoded secret. Rejects timestamps outside a window, which stops captured requests being replayed.
 */
export function verifySvix(i: SvixInput): boolean {
  if (!i.id || !i.timestamp || !i.signature) return false
  if (!/^\d{1,12}$/.test(i.timestamp)) return false
  const now = Math.floor((i.now ?? Date.now()) / 1000)
  if (Math.abs(now - Number(i.timestamp)) > (i.toleranceSeconds ?? 300)) return false

  const key = Buffer.from(i.secret.replace(/^whsec_/, ''), 'base64')
  if (key.length === 0) return false
  const expected = createHmac('sha256', key).update(`${i.id}.${i.timestamp}.${i.body}`).digest()

  for (const part of i.signature.split(' ')) {
    const [version, value] = part.split(',')
    if (version !== 'v1' || !value) continue
    const given = Buffer.from(value, 'base64')
    if (given.length === expected.length && timingSafeEqual(given, expected)) return true
  }
  return false
}
