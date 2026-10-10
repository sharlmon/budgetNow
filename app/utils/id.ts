const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/** A short random id for a new record (8 characters from a-z and 0-9), drawn from the browser's secure random source. */
export function newId(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}
