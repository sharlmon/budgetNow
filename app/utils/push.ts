/** The browser wants the server's public key as bytes; keys are passed around as URL-safe base64 text. */
export function urlBase64ToBytes(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')
  const raw = atob(padded)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

/** True on iPhone and iPad, where reminders only work once the app is on the Home Screen. */
export const isAppleMobile = (ua: string, maxTouchPoints = 0) => /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)
