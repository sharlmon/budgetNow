// PIN hashing for the on-device app lock. The PIN itself is never stored, only a salted PBKDF2 hash.

export const PIN_ITERATIONS = 150_000

export interface LockConfig {
  v: 1
  salt: string
  hash: string
  iter: number
  /** Number of digits in the PIN (4 or 6), so the lock screen can submit automatically. */
  len: number
  /** Seconds away from the app before it locks again. 0 = as soon as you leave, -1 = only when reopened. */
  timeout: number
  /** Credential id for Face ID / fingerprint unlock, when the user has turned it on for this device. */
  bio?: string
}

const enc = new TextEncoder()
const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))

export const isValidPin = (pin: string) => /^\d{4}$|^\d{6}$/.test(pin)

export const randomSalt = () => toB64(crypto.getRandomValues(new Uint8Array(16)))

export async function hashPin(pin: string, salt: string, iterations = PIN_ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(salt), iterations }, key, 256)
  return toB64(new Uint8Array(bits))
}

/** Compares without bailing out at the first different character. */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

export async function createLock(pin: string, timeout: number): Promise<LockConfig> {
  const salt = randomSalt()
  return { v: 1, salt, hash: await hashPin(pin, salt), iter: PIN_ITERATIONS, len: pin.length, timeout }
}

export async function checkPin(pin: string, cfg: LockConfig): Promise<boolean> {
  return safeEqual(await hashPin(pin, cfg.salt, cfg.iter), cfg.hash)
}

/** Wrong-guess throttling: free for four mistakes, then 30s, 60s, 2m ... capped at 15 minutes. */
export function lockoutSeconds(failures: number): number {
  if (failures < 5) return 0
  return Math.min(900, 30 * 2 ** (failures - 5))
}
